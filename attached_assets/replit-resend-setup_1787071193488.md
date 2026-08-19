# Cheaper — Resend Email Setup (for Replit)

Implement transactional/notification emails using Resend. Supabase SMTP (for "Confirm signup" and "Reset password") is already configured separately in the Supabase dashboard — this doc covers the two emails Supabase can't send: **Password changed** and **Email address changed**. These are sent directly from app code via the Resend API.

## 1. Install dependency

```bash
npm install resend
```

## 2. Environment variable

Add to Replit Secrets (not committed to code):

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

Get this from Resend → API Keys → Create API key (Sending access is enough).

## 3. Create `lib/resend.ts`

```ts
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY environment variable");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = "Cheaper <noreply@yourdomain.com>";
```

Replace `yourdomain.com` with the real domain — it must be verified in Resend (SPF + DKIM DNS records added) or sends will fail/land in spam.

## 4. Create `lib/emails/password-changed.ts`

```ts
import { resend, EMAIL_FROM } from "../resend";

type PasswordChangedProps = {
  email: string;
  changedAt: string;
  resetPasswordUrl: string;
};

export function renderPasswordChangedEmail({
  email,
  changedAt,
  resetPasswordUrl,
}: PasswordChangedProps) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:32px 32px 0 32px;"><span style="font-size:20px;font-weight:700;color:#16A34A;">Cheaper</span></td></tr>
          <tr><td style="padding:24px 32px 8px 32px;"><h1 style="margin:0;font-size:22px;line-height:1.3;color:#18181B;">Your password was changed</h1></td></tr>
          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#71717A;">
                The password for your Cheaper account (<strong style="color:#18181B;">${email}</strong>) was successfully changed on ${changedAt}.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px 32px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#18181B;background-color:#F4F4F5;border-radius:8px;padding:16px;">
                Wasn't you? <a href="${resetPasswordUrl}" style="color:#16A34A;font-weight:600;text-decoration:none;">Reset your password</a> right away and contact support.
              </p>
            </td>
          </tr>
          <tr><td style="padding:16px 32px 32px 32px;border-top:1px solid #F4F4F5;"><p style="margin:0;font-size:12px;line-height:1.6;color:#A1A1AA;">This is an automated security notification from Cheaper.</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordChangedEmail(props: PasswordChangedProps) {
  return resend.emails.send({
    from: EMAIL_FROM,
    to: props.email,
    subject: "Your Cheaper password was changed",
    html: renderPasswordChangedEmail(props),
  });
}
```

## 5. Create `lib/emails/email-changed.ts`

```ts
import { resend, EMAIL_FROM } from "../resend";

type EmailChangedProps = {
  oldEmail: string;
  newEmail: string;
  changedAt: string;
};

export function renderEmailChangedEmail({
  oldEmail,
  newEmail,
  changedAt,
}: EmailChangedProps) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:32px 32px 0 32px;"><span style="font-size:20px;font-weight:700;color:#16A34A;">Cheaper</span></td></tr>
          <tr><td style="padding:24px 32px 8px 32px;"><h1 style="margin:0;font-size:22px;line-height:1.3;color:#18181B;">Your email address was changed</h1></td></tr>
          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#71717A;">
                The email address on your Cheaper account was changed from
                <strong style="color:#18181B;">${oldEmail}</strong> to
                <strong style="color:#18181B;">${newEmail}</strong> on ${changedAt}.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px 32px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#18181B;background-color:#F4F4F5;border-radius:8px;padding:16px;">
                Wasn't you? Contact <a href="mailto:support@yourdomain.com" style="color:#16A34A;font-weight:600;text-decoration:none;">support@yourdomain.com</a> immediately.
              </p>
            </td>
          </tr>
          <tr><td style="padding:16px 32px 32px 32px;border-top:1px solid #F4F4F5;"><p style="margin:0;font-size:12px;line-height:1.6;color:#A1A1AA;">This is an automated security notification from Cheaper.</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmailChangedNotification(props: EmailChangedProps) {
  const html = renderEmailChangedEmail(props);
  const subject = "Your Cheaper email address was changed";

  // Notify both addresses: the old one (in case this wasn't the account owner)
  // and the new one (confirming this is now where notifications go).
  return Promise.all([
    resend.emails.send({ from: EMAIL_FROM, to: props.oldEmail, subject, html }),
    resend.emails.send({ from: EMAIL_FROM, to: props.newEmail, subject, html }),
  ]);
}
```

## 6. Wire into the existing auth logic

Find where the app currently calls `supabase.auth.updateUser({ password: ... })` and `supabase.auth.updateUser({ email: ... })`. Call the new senders right after each succeeds, server-side only (never call Resend from the client — the API key must stay server-side).

```ts
import { sendPasswordChangedEmail } from "@/lib/emails/password-changed";
import { sendEmailChangedNotification } from "@/lib/emails/email-changed";

// After a successful password update:
await sendPasswordChangedEmail({
  email: user.email,
  changedAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
  resetPasswordUrl: "https://yourdomain.com/reset-password",
});

// After a successful email update — capture oldEmail BEFORE calling
// updateUser({ email }), since Supabase overwrites user.email:
await sendEmailChangedNotification({
  oldEmail,
  newEmail: user.email,
  changedAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
});
```

**Important:** Supabase's email-change flow requires the user to click a confirmation link before the change actually takes effect — `updateUser({ email })` only starts that process. If the notification should fire only once the change is confirmed (not just requested), send it from the `/api/auth/callback` route instead, gated on the email-change confirmation type, rather than immediately after `updateUser()`.

## 7. Test

1. Trigger a password change from the app UI → confirm the email arrives at the account's address, sent from `noreply@yourdomain.com`.
2. Trigger an email change → confirm both the old and new addresses receive a notification.
3. Check spam folders on first send — new sending patterns from a domain can get flagged until reputation builds.

## Checklist

- [ ] `resend` package installed
- [ ] `RESEND_API_KEY` set in Replit Secrets
- [ ] Domain verified in Resend with SPF + DKIM records added
- [ ] `lib/resend.ts` created with real domain in `EMAIL_FROM`
- [ ] `lib/emails/password-changed.ts` created
- [ ] `lib/emails/email-changed.ts` created
- [ ] Both senders wired into the password/email update code paths, server-side
- [ ] Password-change email tested end to end
- [ ] Email-change notification tested end to end (both old + new address)
