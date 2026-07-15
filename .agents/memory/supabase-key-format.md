---
name: Supabase new-format API keys
description: How to tell Supabase anon vs service-role keys apart in the new key format, to avoid silently broken admin operations.
---

Newer Supabase projects issue keys with explicit prefixes instead of opaque JWTs:
- `sb_publishable_...` — the anon/public key (safe for browser use, subject to RLS).
- `sb_secret_...` — the service-role key (bypasses RLS, server-only).

Older projects instead issue long `eyJ...` JWTs for both roles, distinguishable only by decoding the `role` claim (`anon` vs `service_role`).

**Why:** A user asked for `SUPABASE_SERVICE_ROLE_KEY` and pasted the publishable key instead. Every service-role-only operation (e.g. creating a storage bucket via `POST /storage/v1/bucket`) failed with a generic RLS violation (403) rather than an obviously-wrong-key error, because the request was accepted but treated as a normal (non-privileged) user.

**How to apply:** Before relying on a service-role key for privileged operations (storage bucket admin, bypassing RLS, etc.), check its prefix (or decode the JWT `role` claim for older projects) inside a `"use impure"` block — print only the prefix/role, never the full key — and confirm it says `secret`/`service_role`. If it doesn't, ask the user to re-copy the correct key from Supabase Settings → API Keys.
