-- ── Escrow.com integration columns ───────────────────────────────────────────
-- Run this in your Supabase SQL Editor.
-- All statements are safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

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

-- Index for fast webhook lookups by transaction ID
CREATE INDEX IF NOT EXISTS orders_escrow_transaction_id_idx
  ON public.orders (escrow_transaction_id)
  WHERE escrow_transaction_id IS NOT NULL;
