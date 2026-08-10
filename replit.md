# Cheaper — Peer-to-Peer Marketplace

A full-stack Next.js 16 marketplace where vendors list products and buyers purchase them. Payments are captured by Stripe and only released to vendors when **both** the buyer and vendor confirm delivery.

## Stack

- **Frontend/Backend**: Next.js 16 App Router (JSX, server + client components)
- **Auth & DB**: Supabase (PostgreSQL with RLS, Auth, Realtime)
- **Payments**: Stripe Checkout + Stripe Connect for vendor payouts
- **Styling**: Tailwind CSS v4
- **Animation**: Framer Motion
- **Icons**: Lucide React

## Payment Architecture

### Stripe flow
1. Buyer checks out → Stripe Checkout Session captures card immediately to the platform balance
2. `payment_status` set to `paid`, `payout_status` on each `order_item` stays `pending`
3. Vendor marks item `delivered` via their dashboard
4. Buyer taps **"Confirm I received this order"** in their dashboard → `buyer_confirmed_at` set
5. When **both** conditions are met → `lib/payouts.js:attemptPayoutRelease()` fires automatically
   - Creates a Stripe Connect Transfer to the vendor's Express account (minus 10% platform fee)
   - Sets `order_items.payout_status = 'released'` and `orders.payouts_released_at`
   - If vendor hasn't connected Stripe, item is still marked released in DB for manual follow-up

## Key Files

| Path | Purpose |
|------|---------|
| `lib/payouts.js` | Auto-release payout when buyer + vendor both confirm |
| `lib/stripeClient.js` | Stripe client |
| `proxy.js` | Next.js middleware — auth guard + public route list |
| `app/api/checkout/session/route.js` | Creates the Stripe Checkout session |
| `app/api/orders/[id]/confirm-delivery/route.js` | Buyer confirms receipt → triggers payout |
| `app/api/orders/[id]/items/[itemId]/route.js` | Vendor updates fulfillment → triggers payout |
| `app/api/stripe/webhook/route.js` | Stripe Connect account updates + checkout completion |
| `supabase/schema.sql` | Full DB schema + RLS policies |
| `supabase/migrations/` | Incremental SQL migrations (run in Supabase SQL Editor) |

## Database Setup

Run all files in `supabase/migrations/` in the Supabase SQL Editor. They are all idempotent (`IF NOT EXISTS`). The latest is `payment_hold_release.sql`.

## Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server only) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SESSION_SECRET` | Used for session signing |

## Dev Server

```bash
npm run dev   # standard Node.js/Next.js dev server on port 5000
npm run build # production build used by Vercel
npm start     # serves the production build locally
```

## User Preferences

- Use `lib/supabaseAdmin.js` (service role) for all trusted server writes; never use the session client for payment/payout fields
- Public API routes (`/api/products`, `/api/reviews`) are listed in `proxy.js PUBLIC_ROUTES`
- All unauthenticated `/api/*` requests return JSON 401 (not HTML redirect)
- Platform commission: 10% (set in `lib/payouts.js PLATFORM_FEE_RATE`)
