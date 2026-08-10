import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import dns from "dns";

export async function POST(request) {
  try {
    const { email, password, fullName, username, role, next } = await request.json();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { success: false, error: "Supabase environment variables are missing." },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();
    const trimmedKey = key.trim();

    const isValidUrl = trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://");
    const isValidKey = trimmedKey.length > 0;
    const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : null;
    const callbackUrl = new URL("/api/auth/callback", new URL(request.url).origin);
    if (safeNext) callbackUrl.searchParams.set("next", safeNext);
    callbackUrl.searchParams.set("signup", "1");
    if (role === "buyer" || role === "vendor") {
      callbackUrl.searchParams.set("role", role);
    }

    // Perform DNS lookup check to prevent unhandled fetch rejections for unresolvable domains
    try {
      const hostname = new URL(trimmedUrl).hostname;
      await dns.promises.lookup(hostname);
    } catch (dnsErr) {
      const errorPayload = { message: `getaddrinfo ENOTFOUND ${new URL(trimmedUrl).hostname}` };
      console.log("Supabase SignUp Raw Result:", { data: null, error: errorPayload });
      return NextResponse.json(
        { success: false, error: errorPayload.message },
        { status: 400 }
      );
    }

    const supabase = createClient(trimmedUrl, trimmedKey, {
      auth: { persistSession: false }
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username,
          role,
        },
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    console.log("Supabase SignUp Raw Result:", { data, error });

    if (error || !data?.user) {
      return NextResponse.json(
        { success: false, error: error?.message || "Failed to create user in Supabase" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[API Registration] Unhandled exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Database connection error" },
      { status: 400 }
    );
  }
}
