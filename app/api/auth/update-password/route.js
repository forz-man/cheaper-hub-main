import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sendPasswordChangedEmail } from "@/lib/emails/password-changed";

export async function POST(request) {
  const { password } = await request.json();

  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Invalid password." }, { status: 400 });
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Fire the security notification email — non-blocking, never fails the request.
  const changedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "");
  const resetPasswordUrl = `${origin}/reset-password`;

  sendPasswordChangedEmail({ email: user.email, changedAt, resetPasswordUrl }).catch(
    (err) => console.error("[update-password] Failed to send email:", err.message)
  );

  return NextResponse.json({ success: true });
}
