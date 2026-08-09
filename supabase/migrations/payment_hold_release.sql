-- ── Payment hold & dual-confirmation release columns ─────────────────────────
-- Run in your Supabase SQL Editor. All statements are safe to re-run.

-- Buyer delivery confirmation timestamp (set when buyer taps "Confirm delivery")
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMPTZ;

-- Timestamp set when all vendor payouts for this order have been released
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payouts_released_at TIMESTAMPTZ;

-- Per-item payout tracking (already added in earlier migrations — safe to re-run)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'processing'
    CHECK (fulfillment_status IN ('processing', 'shipped', 'delivered', 'cancelled'));

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'released'));

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS payout_amount NUMERIC(10,2);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS payout_released_at TIMESTAMPTZ;

-- Stripe Transfer ID once a vendor's payout has been sent via Connect
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;
