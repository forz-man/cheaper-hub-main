-- ── Payment hold & dual-confirmation release columns ─────────────────────────
-- Run in your Supabase SQL Editor. All statements are safe to re-run.

-- Buyer delivery confirmation timestamp (set when buyer taps "Confirm delivery")
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMPTZ;

-- Timestamp set when all vendor payouts for this order have been released
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payouts_released_at TIMESTAMPTZ;

-- Which payment processor handled this order ('stripe' | 'escrow')
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe'
    CHECK (payment_method IN ('stripe', 'escrow'));

-- Escrow.com transaction ID returned when creating the transaction
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS escrow_transaction_id TEXT;

-- The hosted URL Escrow.com gives us to redirect the buyer
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS escrow_redirect_url TEXT;

-- Index for fast webhook lookups by escrow transaction ID
CREATE INDEX IF NOT EXISTS orders_escrow_transaction_id_idx
  ON public.orders (escrow_transaction_id)
  WHERE escrow_transaction_id IS NOT NULL;

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
