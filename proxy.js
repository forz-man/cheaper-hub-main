import { NextResponse } from "next/server";

export async function proxy(request) {
  const response = NextResponse.next();

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cheaper-admin/:path*",
  ],
};