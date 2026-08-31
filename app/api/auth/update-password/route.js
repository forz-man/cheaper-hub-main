import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sendPasswordChangedEmail } from "@/lib/emails/password-changed";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { hasPasswordIdentity, validatePasswordChangeInput } from "@/lib/account-settings.mjs";

export async function POST(request) {
  const { currentPassword, password } = await request.json();

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

  if (!hasPasswordIdentity(user)) {
    return NextResponse.json(
      {
        error: "This account signs in with Google. Use the password setup link instead.",
        code: "OAUTH_ONLY",
      },
      { status: 409 }
    );
  }

  const validationError = validatePasswordChangeInput({ currentPassword, password });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

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

  let notificationStored = false;
  let emailAccepted = false;
  try {
    const { error: notificationError } = await createAdminClient()
      .from("notifications")
      .insert({
        user_id: user.id,
        type: "system",
        title: "Password changed",
        body: `Your account password was changed on ${changedAt}.`,
        link: "/settings?section=security",
        data: { event: "password_changed" },
        is_read: false,
      });
    if (notificationError) throw notificationError;
    notificationStored = true;
  } catch (notificationError) {
    console.error("[update-password] Failed to store notification:", notificationError.message);
  }

  try {
    const emailResult = await sendPasswordChangedEmail({
      email: user.email,
      changedAt,
      resetPasswordUrl,
    });
    if (emailResult?.error) throw new Error(emailResult.error.message);
    emailAccepted = true;
  } catch (emailError) {
    console.error("[update-password] Failed to send email:", emailError.message);
  }

  return NextResponse.json({
    success: true,
    notificationStored,
    emailAccepted,
    warning: !emailAccepted
      ? "Your password changed, but the security email could not be queued."
      : !notificationStored
        ? "Your password changed, but the in-app notification could not be stored."
        : null,
  });
}
