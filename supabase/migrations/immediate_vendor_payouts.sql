-- ── Immediate Stripe Connect vendor payouts ────────────────────────────────────
-- Run in the Supabase SQL Editor after the earlier payment migrations.
-- This migration is safe to re-run and deliberately does not auto-transfer
-- historical pending rows. Existing records stay auditable for reconciliation.

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS payout_attempted_at TIMESTAMPTZ;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS payout_error TEXT;

CREATE INDEX IF NOT EXISTS order_items_pending_payout_idx
  ON public.order_items(order_id, vendor_id)
  WHERE payout_status = 'pending';

COMMENT ON COLUMN public.order_items.payout_status IS
  'pending until a successful Stripe Connect transfer; released after it is sent.';
COMMENT ON COLUMN public.order_items.payout_error IS
  'Most recent immediate Stripe Connect transfer error. A non-null error leaves payout_status pending.';