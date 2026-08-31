---
name: Auth email redirect integrity
description: Security and status rules for account emails that contain authentication callbacks.
---

Email confirmation and recovery redirect URLs must be built only from a configured canonical HTTPS origin. Never derive an emailed auth callback from `Host`, `X-Forwarded-Host`, or similar request headers. Treat an email provider's successful API response as accepted or queued, not delivered.

**Why:** An attacker-influenced host can turn an emailed authorization callback into a session-exposure path. Email API acceptance also does not prove inbox delivery, so claiming delivery hides failures and misleads users.

**How to apply:** Use this rule for email changes, password recovery, magic links, invitations, and any future Supabase auth email flow. Fail closed when no trusted canonical origin is configured, and reserve “delivered” for webhook-confirmed delivery events.