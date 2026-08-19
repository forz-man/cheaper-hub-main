---
name: Integration security boundaries
description: Non-obvious authorization and outbound-network rules for privileged store integrations.
---

Privileged integration APIs must authorize from the server-controlled database profile role. Mutable auth user metadata may mirror the role for UI routing, but must never authorize service-role operations. Self-selected signup roles are limited to buyer/vendor; admin assignment is a separate trusted action.

**Why:** Auth user metadata is user-editable. Trusting it, or copying arbitrary metadata roles into the authoritative profile, enables buyer-to-vendor or user-to-admin escalation.

**How to apply:** Any route using a service-role client must load its authorization role from the protected profile row. Keep profile role insert/delete/update permissions unavailable to normal authenticated clients.

External store requests must resolve every hostname, reject any private/reserved result, pin the validated public IP for the TLS connection, preserve the original hostname for certificate/SNI checks, and reject cross-origin redirects.

**Why:** Resolving a hostname before a normal fetch leaves a DNS-rebinding gap, and forwarding provider authorization headers across origins leaks store credentials.

**How to apply:** Route all provider calls through the hardened integration request helper. Do not replace the pinned request with a DNS pre-check followed by an ordinary hostname fetch, and never permit credential-bearing redirects to another origin.