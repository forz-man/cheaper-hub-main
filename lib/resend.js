import { Resend } from "resend";

export function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY environment variable");
  }

  return new Resend(process.env.RESEND_API_KEY);
}

export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || "Cheaper <noreply@cheaper.com>";
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@cheaper.com";
