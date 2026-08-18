// EXAMPLE: adapt this to wherever your password/email update logic lives.
// Key point: call these AFTER Supabase confirms success, inside a server
// action or API route (not client-side), so the send is reliable and your
// Resend key never reaches the browser.

"use server";

import { createClient } from "@/lib/supabase/server"; // your existing server client
import { sendPasswordChangedEmail } from "@/lib/emails/password-changed";
import { sendEmailChangedNotification } from "@/lib/emails/email-changed";

export async function updatePassword(newPassword: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not authenticated");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;

  await sendPasswordChangedEmail({
    email: user.email,
    changedAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
    resetPasswordUrl: "https://yourdomain.com/reset-password",
  });
}

export async function updateEmail(newEmail: string) {
  const supabase = await createClient();

  // Capture the OLD email before calling updateUser — Supabase overwrites
  // user.email once the change is confirmed, so grab it now or you lose it.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not authenticated");
  const oldEmail = user.email;

  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;

  // Note: Supabase requires confirming the new email via a link before the
  // change actually takes effect. If you want the notification to fire only
  // once the change is CONFIRMED (not just requested), move this call into
  // your /api/auth/callback route instead, gated on the email-change type.
  await sendEmailChangedNotification({
    oldEmail,
    newEmail,
    changedAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
  });
}
