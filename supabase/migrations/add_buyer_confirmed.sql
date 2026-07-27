-- ── Buyer delivery confirmation ───────────────────────────────────────────────
-- Run in Supabase SQL Editor. Safe to re-run.

-- Timestamp set when the buyer taps "Confirm delivery"
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMPTZ;

-- Timestamp set when admin releases the vendor payouts
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payouts_released_at TIMESTAMPTZ;
