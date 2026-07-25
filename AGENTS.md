<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Cheaper Hub — two-sided marketplace

## Commands

- `npm run dev` → `next dev -H 0.0.0.0 -p 5000` (port 5000, not 3000)
- `npm run lint` uses flat config (`eslint.config.mjs`), not `.eslintrc.*`
- No test framework configured

## Project structure

- **No TypeScript** — all JS/JSX. Path alias `@/` → root (`jsconfig.json`)
- **Tailwind v4** — uses `@import "tailwindcss"` and `@theme` directive (NOT `@tailwind` directives or `tailwind.config.*`)
- **React Compiler** enabled (`next.config.mjs`: `reactCompiler: true`)
- **Supabase SSR** — browser: `createBrowserClient` (`lib/supabase.js`), server: `createServerClient` (`lib/server.js`), admin: service-role (`lib/supabaseAdmin.js`, server-only)
- **Stripe** — server-only client (`lib/stripeClient.js`). Checkout uses ad-hoc `price_data`, not synced Price objects. Connect for vendor payouts.
- **Flat ESLint** config via `eslint.config.mjs` (imports `eslint-config-next/core-web-vitals`)
- **Fonts**: Inter (sans, `--font-inter`) and Hanken Grotesk (display, `--font-hanken`) via `next/font/google` (`app/layout.js:7-18`)

## Auth & routing

- **Middleware** (`proxy.js`) protects all non-public routes. PUBLIC_ROUTES: `/`, `/login`, `/register`, `/select-role`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/callback`, `/contact`. ADMIN_ROUTES: `/dashboard/admin`, `/api/admin`, `/admin`. API and static assets pass through.
- **Roles**: `buyer`, `vendor`, `admin` (`lib/roles.js`). Resolved via `user_metadata.role` → `app_metadata.role` → profiles table; **never defaults** — missing role → `/select-role` (see `lib/auth.js:60-72` `resolveUserRole`).
- **Dashboard routing**: buyer → `/dashboard/buyer`, vendor → `/dashboard/vendor`, admin → `/dashboard/admin` (`lib/auth.js:76-81` `destinationForRole`).
- **Idle session expiry**: 7 days without opening app (`lib/auth-context.jsx:12`). Tracked via `ch_last_seen` localStorage key.
- **Cart** persisted in localStorage under key `cheaper_cart` (`lib/cart-context.jsx`).
- **Auth context** lives in `lib/auth-context.jsx` (AuthProvider). `hooks/useAuth.js` is a thin re-export — don't add per-component getUser() calls.

## Database (Supabase)

- Schema: `supabase/schema.sql` (safe to re-run, uses `IF NOT EXISTS`)
- Tables: `products`, `orders`, `order_items`, `profiles`, `conversations`, `messages`, `store_connections`, `contact_messages`, `notifications`, `activity_logs`, `reviews`, `settings`
- **RLS quirks**: Stripe Connect columns on `profiles` are revoked from `authenticated`/`anon` (line 360-361). Vendors can only UPDATE `orders.status`, not other columns (line 350-351). Vendors cannot update `products.approval_status` (line 67-72).
- **Contact messages**: public insert, client cannot read/update/delete.
- **Realtime**: enabled on `messages`, `conversations`, and `notifications`.
- **New-format Supabase keys**: `sb_publishable_...` = anon key, `sb_secret_...` = service-role key. Swapping them silently breaks admin ops (403). Old projects use `eyJ...` JWTs — decode to check the `role` claim.

## Admin API pattern

- `lib/admin-auth.js`: `requireAdmin(req)` returns `{ error, supabase, admin, user }`. Route handlers check `if (error) return error` immediately. Also exports `validateUUID`, `sanitizeSearchTerm`, `parsePagination`.
- `lib/audit.js`: `logActivity({ actor_id, action, entity_type, entity_id, description, metadata })` — best-effort, never blocks the main operation.
- `lib/rate-limit.js`: in-memory `rateLimit({ interval, maxRequests })` — resets on server restart.
- `lib/secure-headers.js`: `withSecurityHeaders(response)` — sets standard security headers.

## Layout

- Global Navbar/Footer suppressed on `/checkout`, `/order-success`, and `/products/*` (see `components/ConditionalLayout.jsx:11`).
- Authenticated users on `/` are redirected to `/dashboard` (`app/page.js:28-31`).

## Environment

Required variables (see `.env` example):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon/publishable key)
- `SUPABASE_SERVICE_ROLE_KEY` (secret/private key — server-only)
- `STRIPE_SECRET_KEY` (Stripe secret key)

## Existing instruction sources

- `CLAUDE.md` just re-includes `AGENTS.md`
- `.agents/memory/` contains repo-specific notes on Supabase schema changes, Stripe checkout, Connect payouts, and Supabase key format
