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
  "/api/auth/callback",
  "/api/auth/register",
  "/contact",
  "/sustainability",
  "/api/products",
  "/api/reviews",
]);

// Only these user-owned pages are auth-gated. Marketplace, product detail,
// search, filters, deals, contact, and sustainability remain public.
const AUTH_ROUTES = [
  "/checkout",
  "/messages",
  "/wishlist",
  "/dashboard",
  "/settings",
  "/vendor-profile",
  "/notifications",
];

const ADMIN_ROUTES = [
  "/dashboard/admin",
  "/api/admin",
  "/admin",
];

function isAdminRoute(pathname) {
  return ADMIN_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

function isAuthRoute(pathname) {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

function isPublicApiRoute(pathname) {
  return pathname === "/api/products" || pathname === "/api/reviews" || pathname === "/api/contact";
}

const isPlaceholder =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  if (
    PUBLIC_ROUTES.has(pathname) ||
    (!pathname.startsWith("/api/") && !isAuthRoute(pathname) && !isAdminRoute(pathname)) ||
    isPublicApiRoute(pathname)
  ) {
    return NextResponse.next();
  }

  console.log("[middleware] Pathname:", pathname, "IsPublic:", PUBLIC_ROUTES.has(pathname));

  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  let user = null;
  if (isPlaceholder) {
    const mockSessionCookie = request.cookies.get("cheaper_mock_session")?.value;
    if (mockSessionCookie) {
      try {
        const session = JSON.parse(decodeURIComponent(mockSessionCookie));
        user = session?.user || null;
      } catch (err) {
        console.error("[middleware] parse mock session cookie failed:", err);
      }
    }
  } else {
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user || null;
    } catch (err) {
      console.error("[middleware] getUser failed:", err);
    }
    if (!user) {
      const mockSessionCookie = request.cookies.get("cheaper_mock_session")?.value;
      if (mockSessionCookie) {
        try {
          const session = JSON.parse(decodeURIComponent(mockSessionCookie));
          user = session?.user || null;
        } catch (err) {
          console.error("[middleware] parse mock session cookie in real mode failed:", err);
        }
      }
    }
  }

  console.log("[middleware] User:", user?.email || "none");

  if (user && !user.email_confirmed_at) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/settings") || pathname.startsWith("/vendor-profile")) {
      const verifyUrl = new URL("/verify-email", request.url);
      verifyUrl.searchParams.set("email", user.email || "");
      return NextResponse.redirect(verifyUrl);
    }
  }

  if (!user) {
    // API routes always get a JSON error, never an HTML redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    // Preserve the complete path, query, and filters for exact return.
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Admin route role check
  if (isAdminRoute(pathname)) {
    if (isPlaceholder) {
      const userRole = user?.user_metadata?.role || user?.app_metadata?.role;
      if (userRole !== "admin") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ message: "Admin access required" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } else {
      try {
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
      } catch (err) {
        console.error("[middleware] admin check failed:", err);
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
