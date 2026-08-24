import { getResend, EMAIL_FROM, SUPPORT_EMAIL } from "../resend";

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderContactSupportEmail({ name, email, subject, message, submittedAt }) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject || "Support Request");
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");
  const timestamp = submittedAt || new Date().toUTCString();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Contact Support Message</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E4E4E7;">
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <span style="font-size:22px;font-weight:700;color:#16A34A;">Cheaper</span>
              <span style="font-size:14px;color:#71717A;margin-left:8px;">Support Center</span>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 8px 32px;">
              <h1 style="margin:0;font-size:20px;line-height:1.3;color:#18181B;">New Support Inquiry</h1>
              <p style="margin:6px 0 0 0;font-size:13px;color:#71717A;">Received on ${timestamp}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:20px;">
                <tr>
                  <td style="padding-bottom:8px;font-size:13px;color:#64748B;width:100px;">From:</td>
                  <td style="padding-bottom:8px;font-size:14px;font-weight:600;color:#0F172A;">${safeName}</td>
                </tr>
                <tr>
                  <td style="padding-bottom:8px;font-size:13px;color:#64748B;">Email:</td>
                  <td style="padding-bottom:8px;font-size:14px;color:#0F172A;">
                    <a href="mailto:${safeEmail}" style="color:#16A34A;text-decoration:none;font-weight:500;">${safeEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748B;">Subject:</td>
                  <td style="font-size:14px;font-weight:500;color:#0F172A;">${safeSubject}</td>
                </tr>
              </table>

              <div style="background-color:#FFFFFF;border:1px solid #E4E4E7;border-radius:8px;padding:20px;">
                <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.5px;">Message:</p>
                <div style="font-size:14px;line-height:1.6;color:#18181B;white-space:pre-wrap;">${safeMessage}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px 32px;border-top:1px solid #F4F4F5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#A1A1AA;">
                Tip: You can reply directly to this email to respond to <strong>${safeName}</strong> at ${safeEmail}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendContactSupportNotification({ name, email, subject, message }) {
  const resend = getResend();
  const recipient = process.env.SUPPORT_EMAIL || SUPPORT_EMAIL || "support@cheaper.com";
  const fromAddress = process.env.RESEND_FROM_EMAIL || EMAIL_FROM || "Cheaper Support <support@cheaper.com>";
  const emailSubject = `[Cheaper Support] ${subject || "New inquiry from " + name}`;
  const submittedAt = new Date().toUTCString();

  const html = renderContactSupportEmail({
    name,
    email,
    subject,
    message,
    submittedAt,
  });

  const text = `New Support Inquiry from ${name} (${email})\nSubject: ${subject}\nTime: ${submittedAt}\n\nMessage:\n${message}`;

  return resend.emails.send({
    from: fromAddress,
    to: recipient,
    replyTo: email,
    subject: emailSubject,
    html,
    text,
  });
}
