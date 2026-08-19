---
name: Public npm lockfiles
description: Keeping package-lock.json portable for Vercel rather than tied to Replit's internal package firewall.
---

When publishing or otherwise sharing this project outside Replit, `package-lock.json` must not contain `package-firewall.replit.local` tarball URLs.

**Why:** This workspace's npm default registry is Replit's internal package firewall. A routine lockfile refresh can preserve those URLs, which external hosts such as Vercel cannot resolve. A stale lockfile may also require a full public-registry install to repair optional dependency metadata before `npm ci` succeeds.

**How to apply:** Regenerate the lockfile from `package.json` against `https://registry.npmjs.org`, confirm it contains no internal Replit URLs, and validate with a clean `npm ci` before deploying.