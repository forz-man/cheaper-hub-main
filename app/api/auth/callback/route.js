import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveUserRole, destinationForRole } from "@/lib/auth";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host");

  let origin;
  if (forwardedHost && !forwardedHost.includes("0.0.0.0")) {
    origin = `${forwardedProto}://${forwardedHost}`;
  } else if (host && !host.includes("0.0.0.0") && !host.includes("localhost")) {
    origin = `${forwardedProto}://${host}`;
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  } else {
    origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  }

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const cookieStore = await cookies();

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
          });
        },
      },
    }
  );

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth/callback] Exchange error:", exchangeError.message);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, origin)
    );
  }

  const user = data?.session?.user;
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  // Role the user chose before OAuth (encoded in the redirectTo URL)
  const pendingRole = requestUrl.searchParams.get("role");

  let role = resolveUserRole(user, null);

  if (!role) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      role = resolveUserRole(user, profile?.role);
    } catch {}
  }

  // Brand-new OAuth user with no role yet — apply the one they chose
  if (!role && pendingRole) {
    try {
      await supabase.auth.updateUser({ data: { role: pendingRole } });
      await supabase
        .from("profiles")
        .upsert({ id: user.id, role: pendingRole }, { onConflict: "id" });
      role = pendingRole;
    } catch (err) {
      console.error("[auth/callback] Failed to apply pending role:", err);
    }
  }

  return NextResponse.redirect(new URL(destinationForRole(role), origin));
}
