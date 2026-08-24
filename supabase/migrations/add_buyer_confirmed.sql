-- ── Buyer delivery confirmation (legacy payout metadata) ──────────────────────
-- Buyer confirmation remains useful for order tracking; it no longer controls
-- vendor payment. Run in Supabase SQL Editor. Safe to re-run.

-- Timestamp set when the buyer taps "Confirm delivery"
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMPTZ;

-- Legacy payout timestamp retained for existing records.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payouts_released_at TIMESTAMPTZ;
