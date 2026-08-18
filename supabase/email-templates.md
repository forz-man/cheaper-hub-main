# Supabase Auth email setup

Cheaper uses Supabase Auth for account confirmation and password recovery. The
application already sends users to the correct routes:

- Sign-up confirmation: `/api/auth/callback`
- Password reset: `/reset-password`

## Recommended SMTP provider: Resend

Use Resend as the custom SMTP provider in Supabase:

| Supabase setting | Value |
| --- | --- |
| SMTP host | `smtp.resend.com` |
| SMTP port | `465` (SSL) or `587` (STARTTLS) |
| SMTP username | `resend` |
| SMTP password | A Resend API key with sending permission |
| Sender email | A verified address such as `noreply@yourdomain.com` |
| Sender name | `Cheaper` |

Before using the sender address, verify the sending domain in Resend and add
the SPF/DKIM DNS records Resend provides. The SMTP password should be entered
directly into Supabase; never commit it to this repository or paste it into
chat.

## Templates to configure now

In Supabase, open **Authentication → Email Templates** and use the following.
The `{{ .ConfirmationURL }}` variable must remain exactly as written.

### Confirm sign up

**Subject**

```text
Confirm your Cheaper account
```

**Body**

```html
<div style="margin:0;background:#f5f3ef;padding:40px 20px;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2ddd6;border-radius:16px;padding:40px;">
    <div style="font-size:22px;font-weight:700;margin-bottom:28px;">Cheaper</div>
    <h1 style="font-size:26px;line-height:1.2;margin:0 0 14px;">Confirm your email</h1>
    <p style="font-size:15px;line-height:1.6;color:#666;margin:0 0 28px;">
      Thanks for creating a Cheaper account. Confirm your email address to finish setting up your account.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;border-radius:10px;padding:14px 22px;font-size:14px;font-weight:700;">
      Confirm email address
    </a>
    <p style="font-size:12px;line-height:1.5;color:#999;margin:28px 0 0;">
      If you did not create a Cheaper account, you can safely ignore this email.
    </p>
  </div>
</div>
```

### Reset password

**Subject**

```text
Reset your Cheaper password
```

**Body**

```html
<div style="margin:0;background:#f5f3ef;padding:40px 20px;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2ddd6;border-radius:16px;padding:40px;">
    <div style="font-size:22px;font-weight:700;margin-bottom:28px;">Cheaper</div>
    <h1 style="font-size:26px;line-height:1.2;margin:0 0 14px;">Reset your password</h1>
    <p style="font-size:15px;line-height:1.6;color:#666;margin:0 0 28px;">
      We received a request to reset your Cheaper password. Use the button below to choose a new one.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;border-radius:10px;padding:14px 22px;font-size:14px;font-weight:700;">
      Reset password
    </a>
    <p style="font-size:12px;line-height:1.5;color:#999;margin:28px 0 0;">
      If you did not request a password reset, you can safely ignore this email.
    </p>
  </div>
</div>
```

## Security notification templates

These are recommended because they help users detect account changes. They
are not required for sign-up or password recovery.

### Password changed

**Subject**

```text
Your Cheaper password was changed
```

**Body**

```html
<div style="margin:0;background:#f5f3ef;padding:40px 20px;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2ddd6;border-radius:16px;padding:40px;">
    <div style="font-size:22px;font-weight:700;margin-bottom:28px;">Cheaper</div>
    <h1 style="font-size:26px;line-height:1.2;margin:0 0 14px;">Password changed</h1>
    <p style="font-size:15px;line-height:1.6;color:#666;margin:0;">
      The password for your Cheaper account was just changed. If you did not make this change, reset your password immediately and contact support.
    </p>
  </div>
</div>
```

### Email address changed

**Subject**

```text
Your Cheaper email address was changed
```

**Body**

```html
<div style="margin:0;background:#f5f3ef;padding:40px 20px;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2ddd6;border-radius:16px;padding:40px;">
    <div style="font-size:22px;font-weight:700;margin-bottom:28px;">Cheaper</div>
    <h1 style="font-size:26px;line-height:1.2;margin:0 0 14px;">Email address changed</h1>
    <p style="font-size:15px;line-height:1.6;color:#666;margin:0;">
      The email address for your Cheaper account was changed. If you did not make this change, contact support immediately.
    </p>
  </div>
</div>
```

## Leave these templates disabled for now

The current app does not use these flows:

- Invite user
- Magic link or OTP
- Reauthentication
- Phone number changed
- Sign-in method linked or removed
- MFA method added or removed

If passwordless login, team invitations, MFA, or account email changes are
added later, configure those templates before enabling the corresponding UI.