import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/register",
  "/select-role",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/callback",
  "/contact",
]);

const ADMIN_ROUTES = [
  "/dashboard/admin",
  "/api/admin",
  "/admin",
];

function isAdminRoute(pathname) {
  return ADMIN_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (isAdminRoute(pathname)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ message: "Authentication required" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin route role check
  if (isAdminRoute(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ message: "Admin access required" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
