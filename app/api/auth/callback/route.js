import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveUserRole, destinationForRole } from "@/lib/auth";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  console.log("[auth/callback] GET", {
    code: code ? code.slice(0, 8) + "..." : null,
    error,
    errorDescription,
    url: request.url.slice(0, 120),
  });

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host");

  let origin;
  if (forwardedHost && !forwardedHost.includes("0.0.0.0")) {
    origin = `${forwardedProto}://${forwardedHost}`;
  } else if (host && !host.includes("0.0.0.0") && !host.includes("localhost")) {
    origin = `${forwardedProto}://${host}`;
  } else if (process.env.NEXT_PUBLIC_SITE_URL) {
    origin = process.env.NEXT_PUBLIC_SITE_URL;
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  } else {
    origin = requestUrl.origin;
  }

  console.log("[auth/callback] Origin resolved:", origin);

  if (error) {
    console.error("[auth/callback] OAuth error from provider:", errorDescription || error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, origin)
    );
  }

  if (!code) {
    console.warn("[auth/callback] No code in URL query params");
    return NextResponse.redirect(new URL("/login", origin));
  }

  const cookieStore = await cookies();
  const setCookies = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            setCookies.push({ name, value, options });
          });
        },
      },
    }
  );

  console.log("[auth/callback] Exchanging code for session...");
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth/callback] Exchange error:", exchangeError.message);
    const response = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, origin)
    );
    return response;
  }

  console.log("[auth/callback] Exchange succeeded:", {
    hasUser: !!data?.session?.user,
    userId: data?.session?.user?.id?.slice(0, 8) + "...",
    email: data?.session?.user?.email,
  });

  const user = data?.session?.user;
  if (!user) {
    console.warn("[auth/callback] No user in session after exchange");
    const response = NextResponse.redirect(new URL("/login", origin));
    return response;
  }

  // Role the user chose before OAuth (encoded in the redirectTo URL)
  const pendingRole = requestUrl.searchParams.get("role");

  let role = resolveUserRole(user, null);
  console.log("[auth/callback] Resolved role from user metadata:", role);

  if (!role) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      role = resolveUserRole(user, profile?.role);
      console.log("[auth/callback] Resolved role from DB profile:", role);
    } catch {
      console.log("[auth/callback] No profile found in DB");
    }
  }

  // Brand-new OAuth user with no role yet — apply the one they chose
  if (!role && pendingRole) {
    try {
      console.log("[auth/callback] Applying pending role:", pendingRole);
      await supabase.auth.updateUser({ data: { role: pendingRole } });
      await supabase
        .from("profiles")
        .upsert({ id: user.id, role: pendingRole }, { onConflict: "id" });
      role = pendingRole;
    } catch (err) {
      console.error("[auth/callback] Failed to apply pending role:", err);
    }
  }

  const dest = destinationForRole(role);
  console.log("[auth/callback] Redirecting to:", dest, "role:", role);

  const response = NextResponse.redirect(new URL(dest, origin));

  // CRITICAL: Apply session cookies set by exchangeCodeForSession to the
  // redirect response. In Next.js Route Handlers, cookieStore.set() sets
  // cookies on the implicit response, but NextResponse.redirect() creates
  // a brand-new response that doesn't carry those. Without this, the
  // session cookies never reach the browser and every subsequent request
  // is unauthenticated.
  setCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
