# Cheaper — Peer-to-Peer Marketplace

A full-stack Next.js 16 marketplace where vendors list products and buyers purchase them. Payments are held in escrow (either internally via Stripe or externally via Escrow.com) and only released to vendors when **both** the buyer and vendor confirm delivery.

## Stack

- **Frontend/Backend**: Next.js 16 App Router (JSX, server + client components)
- **Auth & DB**: Supabase (PostgreSQL with RLS, Auth, Realtime)
- **Payments (small orders < $500)**: Stripe Checkout + Stripe Connect for vendor payouts
- **Payments (large orders ≥ $500)**: Escrow.com hosted redirect flow
- **Styling**: Tailwind CSS v4
- **Animation**: Framer Motion
- **Icons**: Lucide React

## Payment & Escrow Architecture

### Stripe flow (orders < $500)
1. Buyer checks out → Stripe Checkout Session captures card immediately to the platform balance
2. `payment_status` set to `paid`, `payout_status` on each `order_item` stays `pending`
3. Vendor marks item `delivered` via their dashboard
4. Buyer taps **"Confirm I received this order"** in their dashboard → `buyer_confirmed_at` set
5. When **both** conditions are met → `lib/payouts.js:attemptPayoutRelease()` fires automatically
   - Creates a Stripe Connect Transfer to the vendor's Express account (minus 10% platform fee)
   - Sets `order_items.payout_status = 'released'` and `orders.payouts_released_at`
   - If vendor hasn't connected Stripe, item is still marked released in DB for manual follow-up

### Escrow.com flow (orders ≥ $500)
1. Buyer redirected to Escrow.com hosted checkout
2. Escrow.com holds funds; buyer inspects item (3-day window)
3. Status polled via `/api/escrow/status` and pushed via `/api/escrow/webhook`
4. Escrow.com releases funds directly to platform on completion

## Key Files

| Path | Purpose |
|------|---------|
| `lib/payouts.js` | Auto-release payout when buyer + vendor both confirm |
| `lib/escrow.js` | Escrow.com API client |
| `lib/stripeClient.js` | Stripe client |
| `proxy.js` | Next.js middleware — auth guard + public route list |
| `app/api/checkout/session/route.js` | Creates Stripe session or Escrow transaction |
| `app/api/orders/[id]/confirm-delivery/route.js` | Buyer confirms receipt → triggers payout |
| `app/api/orders/[id]/items/[itemId]/route.js` | Vendor updates fulfillment → triggers payout |
| `app/api/stripe/webhook/route.js` | Stripe Connect account updates + checkout completion |
| `app/api/escrow/webhook/route.js` | Escrow.com status change notifications |
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
| `ESCROW_EMAIL` | Escrow.com account email |
| `ESCROW_API_KEY` | Escrow.com API key |
| `ESCROW_PLATFORM_EMAIL` | Escrow.com seller-side email (platform account) |
| `ESCROW_THRESHOLD` | Dollar amount above which Escrow.com is used (default: 500) |
| `ESCROW_ENV` | Set to `production` to switch from sandbox |
| `SESSION_SECRET` | Used for session signing |

## Dev Server

```bash
npm run dev   # starts on port 5000
```

## User Preferences

- Use `lib/supabaseAdmin.js` (service role) for all trusted server writes; never use the session client for payment/payout fields
- Public API routes (`/api/products`, `/api/reviews`) are listed in `proxy.js PUBLIC_ROUTES`
- All unauthenticated `/api/*` requests return JSON 401 (not HTML redirect)
- Platform commission: 10% (set in `lib/payouts.js PLATFORM_FEE_RATE`)
