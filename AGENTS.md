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

## Auth & routing

- **Middleware** (`proxy.js`) protects all non-public routes. PUBLIC_ROUTES: `/`, `/login`, `/register`, `/select-role`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/callback`, `/contact`. API and static assets pass through.
- **Roles**: `buyer`, `vendor`, `admin` (`lib/roles.js`). Resolved via `user_metadata.role` → `app_metadata.role` → profiles table; **never defaults** — missing role → `/select-role`.
- **Dashboard routing**: buyer → `/dashboard/buyer`, vendor/admin → `/dashboard/vendor` (`lib/auth.js:74`).
- **Idle session expiry**: 7 days without opening app (`lib/auth-context.jsx:12`).
- **Cart** persisted in localStorage under key `cheaper_cart` (`lib/cart-context.jsx`).

## Database (Supabase)

- Schema: `supabase/schema.sql` (safe to re-run, uses `IF NOT EXISTS`)
- Tables: `products`, `orders`, `order_items`, `profiles`, `conversations`, `messages`, `store_connections`, `contact_messages`
- **RLS quirks**: Stripe Connect columns on `profiles` are revoked from `authenticated`/`anon` (line 335). Vendors can only UPDATE `orders.status`, not other columns (line 325).
- **Contact messages**: public insert, client cannot read/update/delete.
- **Realtime**: enabled on `messages` and `conversations`.

## Layout

- Global Navbar/Footer suppressed on `/checkout`, `/order-success`, and `/products/*` (see `components/ConditionalLayout.jsx:11`).
- Authenticated users on `/` are redirected to `/dashboard` (`app/page.js:28-31`).

## Existing instruction sources

- `CLAUDE.md` just re-includes `AGENTS.md`
- `.agents/memory/` contains repo-specific notes on Supabase schema changes, Stripe checkout, and Connect payouts
