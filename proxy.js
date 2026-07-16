import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Routes anyone can access without being logged in
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

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Always pass through API routes and static assets
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  // Public routes — no auth required
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Everything else needs a valid session
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static files.
     * The proxy function itself filters to the right subset.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
