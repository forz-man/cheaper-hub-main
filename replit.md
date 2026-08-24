# Cheaper — Peer-to-Peer Marketplace

A full-stack Next.js 16 marketplace where vendors list products and buyers purchase them. Payments are captured by Stripe and vendor shares are transferred immediately after a successful checkout.

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
2. A verified successful PaymentIntent sets `payment_status` to `paid`
3. `lib/payouts.js:markOrderPaidAndSendPayouts()` creates an idempotent Stripe Connect Transfer per vendor item (minus the 10% platform fee)
4. Successful transfers set `order_items.payout_status = 'released'`; failed transfers remain pending with an audit error for reconciliation
5. Vendor fulfillment updates and buyer receipt confirmation track delivery only; they do not delay payment

## Key Files

| Path | Purpose |
|------|---------|
| `lib/payouts.js` | Verify payment and immediately send vendor transfers |
| `lib/stripeClient.js` | Stripe client |
| `proxy.js` | Next.js middleware — auth guard + public route list |
| `app/api/checkout/session/route.js` | Creates the Stripe Checkout session |
| `app/api/orders/[id]/confirm-delivery/route.js` | Buyer confirms receipt for order tracking |
| `app/api/orders/[id]/items/[itemId]/route.js` | Vendor updates fulfillment |
| `app/api/stripe/webhook/route.js` | Stripe Connect account updates + checkout completion |
| `supabase/schema.sql` | Full DB schema + RLS policies |
| `supabase/migrations/` | Incremental SQL migrations (run in Supabase SQL Editor) |

## Database Setup

Run all files in `supabase/migrations/` in the Supabase SQL Editor. They are all idempotent (`IF NOT EXISTS`). The latest is `immediate_vendor_payouts.sql`.

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
