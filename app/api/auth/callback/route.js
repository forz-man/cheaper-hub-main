import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeRole, resolveUserRole, destinationForRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabaseAdmin";

function isSafeReturnTo(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

function loginRedirect(origin, next, error) {
  const params = new URLSearchParams();
  if (isSafeReturnTo(next)) params.set("next", next);
  if (error) params.set("error", error);
  const query = params.toString();
  return new URL(`/login${query ? `?${query}` : ""}`, origin);
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next");

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
      loginRedirect(origin, next, errorDescription || error)
    );
  }

  if (!code) {
    console.warn("[auth/callback] No code in URL query params");
    return NextResponse.redirect(loginRedirect(origin, next));
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
      loginRedirect(origin, next, exchangeError.message)
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
    const response = NextResponse.redirect(loginRedirect(origin, next));
    return response;
  }

  // A signup flow sends the selected role in the callback URL. Only allow
  // known roles, and never let an OAuth provider's default metadata override
  // the user's explicit buyer/vendor choice for a new profile.
  const pendingRole = normalizeRole(requestUrl.searchParams.get("role"));
  const isSignup = requestUrl.searchParams.get("signup") === "1";

  let profileRole = null;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    profileRole = normalizeRole(profile?.role);
  } catch {
    console.log("[auth/callback] No profile found in DB");
  }

  let role = resolveUserRole(user, profileRole);
  console.log("[auth/callback] Resolved existing role:", role, "profileRole:", profileRole);

  // New OAuth signup: the selected role is authoritative when no profile
  // exists, before the callback persists that role.
  if (!profileRole && isSignup && (pendingRole === "buyer" || pendingRole === "vendor")) {
    try {
      console.log("[auth/callback] Applying selected signup role:", pendingRole);
      const { error: updateError } = await supabase.auth.updateUser({
        data: { role: pendingRole },
      });
      if (updateError) throw updateError;

      role = pendingRole;
      const { error: profileError } = await createAdminClient()
        .from("profiles")
        .upsert({ id: user.id, role: pendingRole }, { onConflict: "id" });
      if (profileError) {
        console.warn("[auth/callback] Profile role upsert failed:", profileError.message);
      }
    } catch (err) {
      console.error("[auth/callback] Failed to persist selected signup role:", err);
      role = null;
    }
  }

  const defaultDestination = role === "vendor" && isSignup
    ? "/vendor/profile?verify=1"
    : destinationForRole(role);
  const dest = isSafeReturnTo(next) ? next : defaultDestination;
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
