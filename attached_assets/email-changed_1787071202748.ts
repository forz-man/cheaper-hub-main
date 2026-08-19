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
