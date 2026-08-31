import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sendEmailChangedNotification } from "@/lib/emails/email-changed";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getCanonicalAuthOrigin } from "@/lib/account-settings.mjs";

export async function POST(request) {
  const { email: newEmail } = await request.json();

  if (!newEmail || typeof newEmail !== "string" || !newEmail.includes("@")) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
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

  if (newEmail.toLowerCase() === user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "New email is the same as your current email." },
      { status: 400 }
    );
  }

  const oldEmail = user.email;
  const origin = getCanonicalAuthOrigin({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    replitDevDomain: process.env.REPLIT_DEV_DOMAIN,
  });
  if (!origin) {
    return NextResponse.json(
      { error: "Email changes are temporarily unavailable because the canonical site URL is not configured." },
      { status: 503 }
    );
  }
  const callbackUrl = new URL("/api/auth/callback", origin);
  callbackUrl.searchParams.set("next", "/settings?section=security");

  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: callbackUrl.toString() }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const changedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  let notificationStored = false;
  let emailAccepted = false;
  try {
    const { error: notificationError } = await createAdminClient()
      .from("notifications")
      .insert({
        user_id: user.id,
        type: "system",
        title: "Email change requested",
        body: `Confirm ${newEmail} before it becomes your account email.`,
        link: "/settings?section=security",
        data: { event: "email_change_requested" },
        is_read: false,
      });
    if (notificationError) throw notificationError;
    notificationStored = true;
  } catch (notificationError) {
    console.error("[update-email] Failed to store notification:", notificationError.message);
  }

  try {
    const emailResults = await sendEmailChangedNotification({ oldEmail, newEmail, changedAt });
    const deliveryError = emailResults?.find((result) => result?.error)?.error;
    if (deliveryError) throw new Error(deliveryError.message);
    emailAccepted = true;
  } catch (emailError) {
    console.error("[update-email] Failed to send notification:", emailError.message);
  }

  return NextResponse.json({
    success: true,
    notificationStored,
    emailAccepted,
    warning: !emailAccepted
      ? "Supabase accepted the email change, but Cheaper's separate security email could not be queued."
      : !notificationStored
        ? "The email change was requested, but the in-app notification could not be stored."
        : null,
  });
}
