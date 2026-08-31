import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { sendPasswordChangedEmail } from "@/lib/emails/password-changed";

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const changedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "");
  let notificationStored = false;
  let emailAccepted = false;

  try {
    const { error } = await createAdminClient().from("notifications").insert({
      user_id: user.id,
      type: "system",
      title: "Password changed",
      body: `Your account password was changed on ${changedAt}.`,
      link: "/settings?section=security",
      data: { event: "password_changed", source: "recovery" },
      is_read: false,
    });
    if (error) throw error;
    notificationStored = true;
  } catch (error) {
    console.error("[password-change-notification] Database notification failed:", error.message);
  }

  try {
    const result = await sendPasswordChangedEmail({
      email: user.email,
      changedAt,
      resetPasswordUrl: `${origin}/forgot-password`,
    });
    if (result?.error) throw new Error(result.error.message);
    emailAccepted = true;
  } catch (error) {
    console.error("[password-change-notification] Email queue failed:", error.message);
  }

  return NextResponse.json({ success: true, notificationStored, emailAccepted });
}