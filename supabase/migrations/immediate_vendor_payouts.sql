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

-- ── Refund/dispute payout recovery ────────────────────────────────────────────
-- Stripe keeps the charge on the platform balance, so every vendor transfer
-- must be reversed when a related refund or chargeback reduces that balance.
-- The event and adjustment/item uniqueness constraints make webhook retries
-- safe. Service-role code is the only writer; vendors see the item status
-- through the existing order_items vendor select policy.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_issue_status TEXT DEFAULT 'none'
    CHECK (payment_issue_status IN ('none', 'partially_refunded', 'refunded', 'disputed', 'dispute_won', 'dispute_lost', 'needs_support'));
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS disputed_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS payout_recovery_status TEXT DEFAULT 'none'
    CHECK (payout_recovery_status IN ('none', 'pending', 'recovered', 'reinstated', 'needs_support'));
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS payout_recovered_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS payout_recovered_at TIMESTAMPTZ;
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS payout_recovery_error TEXT;

CREATE TABLE IF NOT EXISTS public.stripe_payment_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_adjustment_id TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'needs_support', 'ignored')),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS stripe_payment_events_order_idx
  ON public.stripe_payment_events(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stripe_payment_events_adjustment_idx
  ON public.stripe_payment_events(stripe_adjustment_id);

CREATE TABLE IF NOT EXISTS public.payout_recovery_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_event_id TEXT NOT NULL,
  stripe_adjustment_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('refund', 'dispute')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  stripe_transfer_id TEXT NOT NULL,
  stripe_transfer_reversal_id TEXT,
  stripe_reinstatement_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'recovered', 'reinstated', 'needs_support', 'not_applicable')),
  attempt_token UUID,
  attempt_started_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (stripe_event_id, order_item_id),
  UNIQUE (stripe_adjustment_id, order_item_id)
);

CREATE INDEX IF NOT EXISTS payout_recovery_events_order_idx
  ON public.payout_recovery_events(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payout_recovery_events_vendor_idx
  ON public.payout_recovery_events(vendor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.stripe_payment_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  stripe_adjustment_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL CHECK (event_type IN ('refund', 'dispute')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_payment_adjustments_order_idx
  ON public.stripe_payment_adjustments(order_id, created_at DESC);

ALTER TABLE public.stripe_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_recovery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_payment_adjustments ENABLE ROW LEVEL SECURITY;

-- Upgrade installations that already received the initial recovery columns.
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_payout_recovery_status_check;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_payout_recovery_status_check
    CHECK (payout_recovery_status IN ('none', 'pending', 'recovered', 'reinstated', 'needs_support'));
ALTER TABLE public.payout_recovery_events
  ADD COLUMN IF NOT EXISTS stripe_reinstatement_transfer_id TEXT;
ALTER TABLE public.payout_recovery_events
  DROP CONSTRAINT IF EXISTS payout_recovery_events_status_check;
ALTER TABLE public.payout_recovery_events
  ADD CONSTRAINT payout_recovery_events_status_check
    CHECK (status IN ('pending', 'processing', 'recovered', 'reinstated', 'needs_support', 'not_applicable'));

ALTER TABLE public.payout_recovery_events
  ADD COLUMN IF NOT EXISTS attempt_token UUID;
ALTER TABLE public.payout_recovery_events
  ADD COLUMN IF NOT EXISTS attempt_started_at TIMESTAMPTZ;

DROP FUNCTION IF EXISTS public.claim_payout_recovery(UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, TEXT);
CREATE OR REPLACE FUNCTION public.claim_payout_recovery(
  p_order_id UUID,
  p_order_item_id UUID,
  p_vendor_id UUID,
  p_stripe_event_id TEXT,
  p_stripe_adjustment_id TEXT,
  p_event_type TEXT,
  p_requested_amount_cents INTEGER,
  p_stripe_transfer_id TEXT,
  p_attempt_token UUID
) RETURNS public.payout_recovery_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_recovery public.payout_recovery_events;
  payout_cents INTEGER;
  already_claimed_cents INTEGER;
  claim_cents INTEGER;
  created_recovery public.payout_recovery_events;
BEGIN
  PERFORM 1 FROM public.order_items
  WHERE id = p_order_item_id
    AND order_id = p_order_id
    AND vendor_id IS NOT DISTINCT FROM p_vendor_id
    AND stripe_transfer_id = p_stripe_transfer_id
    AND payout_status = 'released'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order item % was not found', p_order_item_id; END IF;

  -- Recheck only after the item lock. A concurrent delivery may have created
  -- the canonical recovery while this call was waiting for that lock.
  -- A processing reservation is intentionally never stolen: a slow worker may
  -- still be inside Stripe. Stripe errors and request timeouts move it to
  -- needs_support, which is safe for a later delivery to retry.
  SELECT * INTO existing_recovery
  FROM public.payout_recovery_events
  WHERE stripe_adjustment_id = p_stripe_adjustment_id
    AND order_item_id = p_order_item_id;
  IF FOUND THEN
    IF existing_recovery.status IN ('pending', 'needs_support') THEN
      UPDATE public.payout_recovery_events
      SET status = 'processing',
          attempt_token = p_attempt_token,
          attempt_started_at = now(),
          error = NULL,
          resolved_at = NULL
      WHERE id = existing_recovery.id
      RETURNING * INTO existing_recovery;
    END IF;
    RETURN existing_recovery;
  END IF;

  SELECT COALESCE(round(payout_amount * 100)::INTEGER, 0) INTO payout_cents
  FROM public.order_items WHERE id = p_order_item_id;
  SELECT COALESCE(sum(amount_cents), 0) INTO already_claimed_cents
  FROM public.payout_recovery_events
  WHERE order_item_id = p_order_item_id
    AND status IN ('pending', 'processing', 'recovered', 'needs_support');

  claim_cents := greatest(0, least(COALESCE(p_requested_amount_cents, 0), payout_cents - already_claimed_cents));
  INSERT INTO public.payout_recovery_events (
    order_id, order_item_id, vendor_id, stripe_event_id, stripe_adjustment_id,
    event_type, amount_cents, stripe_transfer_id, status, attempt_token, attempt_started_at
  ) VALUES (
    p_order_id, p_order_item_id, p_vendor_id, p_stripe_event_id, p_stripe_adjustment_id,
    p_event_type, claim_cents, p_stripe_transfer_id,
    CASE WHEN claim_cents > 0 THEN 'processing' ELSE 'not_applicable' END,
    CASE WHEN claim_cents > 0 THEN p_attempt_token ELSE NULL END,
    CASE WHEN claim_cents > 0 THEN now() ELSE NULL END
  ) RETURNING * INTO created_recovery;

  IF claim_cents > 0 THEN
    UPDATE public.order_items SET payout_recovery_status = 'pending' WHERE id = p_order_item_id;
  END IF;
  RETURN created_recovery;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_stripe_payment_adjustment(
  p_order_id UUID,
  p_stripe_adjustment_id TEXT,
  p_event_type TEXT,
  p_amount_cents INTEGER
) RETURNS TABLE(amount_cents INTEGER, is_new BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_adjustment public.stripe_payment_adjustments;
BEGIN
  IF p_event_type NOT IN ('refund', 'dispute') THEN
    RAISE EXCEPTION 'Invalid payment adjustment type';
  END IF;
  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order % was not found', p_order_id; END IF;
  SELECT * INTO existing_adjustment
  FROM public.stripe_payment_adjustments
  WHERE stripe_adjustment_id = p_stripe_adjustment_id;
  IF FOUND THEN
    RETURN QUERY SELECT existing_adjustment.amount_cents, false;
    RETURN;
  END IF;

  INSERT INTO public.stripe_payment_adjustments (
    order_id, stripe_adjustment_id, event_type, amount_cents
  ) VALUES (
    p_order_id, p_stripe_adjustment_id, p_event_type, greatest(0, COALESCE(p_amount_cents, 0))
  );
  IF p_event_type = 'refund' THEN
    UPDATE public.orders
    SET refunded_amount = refunded_amount + (greatest(0, COALESCE(p_amount_cents, 0))::NUMERIC / 100),
        payment_status = CASE
          WHEN refunded_amount + (greatest(0, COALESCE(p_amount_cents, 0))::NUMERIC / 100) >= total THEN 'refunded'
          WHEN payment_status = 'unpaid' THEN 'paid'
          ELSE payment_status
        END,
        payment_issue_status = CASE
          WHEN payment_issue_status = 'needs_support' THEN 'needs_support'
          WHEN refunded_amount + (greatest(0, COALESCE(p_amount_cents, 0))::NUMERIC / 100) >= total THEN 'refunded'
          ELSE 'partially_refunded'
        END
    WHERE id = p_order_id;
  ELSE
    UPDATE public.orders
    SET disputed_amount = disputed_amount + (greatest(0, COALESCE(p_amount_cents, 0))::NUMERIC / 100)
    WHERE id = p_order_id;
  END IF;
  RETURN QUERY SELECT greatest(0, COALESCE(p_amount_cents, 0)), true;
END;
$$;

DROP FUNCTION IF EXISTS public.finalize_payout_recovery(UUID, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.finalize_payout_recovery(
  p_recovery_id UUID,
  p_attempt_token UUID,
  p_status TEXT,
  p_stripe_transfer_reversal_id TEXT,
  p_error TEXT
) RETURNS public.payout_recovery_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recovery public.payout_recovery_events;
  recovered_cents INTEGER;
  has_support BOOLEAN;
BEGIN
  IF p_status NOT IN ('recovered', 'needs_support') THEN
    RAISE EXCEPTION 'Invalid payout recovery status';
  END IF;
  SELECT * INTO recovery FROM public.payout_recovery_events WHERE id = p_recovery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout recovery % was not found', p_recovery_id; END IF;
  IF recovery.status <> 'processing' OR recovery.attempt_token IS DISTINCT FROM p_attempt_token THEN
    RETURN recovery;
  END IF;
  PERFORM 1 FROM public.order_items WHERE id = recovery.order_item_id FOR UPDATE;
  UPDATE public.payout_recovery_events
  SET status = p_status,
      stripe_transfer_reversal_id = CASE WHEN p_status = 'recovered' THEN p_stripe_transfer_reversal_id ELSE stripe_transfer_reversal_id END,
      error = CASE WHEN p_status = 'recovered' THEN NULL ELSE p_error END,
      attempt_token = NULL,
      attempt_started_at = NULL,
      resolved_at = now()
  WHERE id = p_recovery_id
  RETURNING * INTO recovery;
  SELECT COALESCE(sum(amount_cents), 0) INTO recovered_cents
  FROM public.payout_recovery_events
  WHERE order_item_id = recovery.order_item_id AND status = 'recovered';
  SELECT EXISTS(
    SELECT 1 FROM public.payout_recovery_events
    WHERE order_item_id = recovery.order_item_id AND status = 'needs_support'
  ) INTO has_support;
  UPDATE public.order_items
  SET payout_recovered_amount = recovered_cents::NUMERIC / 100,
      payout_recovered_at = CASE WHEN p_status = 'recovered' THEN now() ELSE payout_recovered_at END,
      payout_recovery_status = CASE WHEN has_support THEN 'needs_support' WHEN recovered_cents > 0 THEN 'recovered' ELSE 'none' END,
      payout_recovery_error = CASE WHEN has_support THEN p_error ELSE NULL END
  WHERE id = recovery.order_item_id;
  RETURN recovery;
END;
$$;

-- A worker can be interrupted after it reserves a recovery but before it
-- records Stripe's response. Webhook redelivery first checks Stripe for the
-- deterministic reversal; this RPC then either records that result or makes
-- the abandoned claim retryable. It never takes over a live reservation.
CREATE OR REPLACE FUNCTION public.reconcile_stale_payout_recovery(
  p_recovery_id UUID,
  p_stale_after_seconds INTEGER,
  p_stripe_transfer_reversal_id TEXT,
  p_error TEXT
) RETURNS public.payout_recovery_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recovery public.payout_recovery_events;
  recovered_cents INTEGER;
  has_support BOOLEAN;
  next_status TEXT;
BEGIN
  IF p_stale_after_seconds < 1 THEN
    RAISE EXCEPTION 'Stale recovery threshold must be positive';
  END IF;
  SELECT * INTO recovery FROM public.payout_recovery_events WHERE id = p_recovery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout recovery % was not found', p_recovery_id; END IF;
  IF recovery.status <> 'processing'
    OR recovery.attempt_started_at IS NULL
    OR recovery.attempt_started_at > now() - make_interval(secs => p_stale_after_seconds) THEN
    RETURN recovery;
  END IF;

  PERFORM 1 FROM public.order_items WHERE id = recovery.order_item_id FOR UPDATE;
  next_status := CASE WHEN p_stripe_transfer_reversal_id IS NOT NULL THEN 'recovered' ELSE 'needs_support' END;
  UPDATE public.payout_recovery_events
  SET status = next_status,
      stripe_transfer_reversal_id = CASE
        WHEN next_status = 'recovered' THEN p_stripe_transfer_reversal_id
        ELSE stripe_transfer_reversal_id
      END,
      error = CASE WHEN next_status = 'recovered' THEN NULL ELSE p_error END,
      attempt_token = NULL,
      attempt_started_at = NULL,
      resolved_at = now()
  WHERE id = p_recovery_id
  RETURNING * INTO recovery;

  SELECT COALESCE(sum(amount_cents), 0) INTO recovered_cents
  FROM public.payout_recovery_events
  WHERE order_item_id = recovery.order_item_id AND status = 'recovered';
  SELECT EXISTS(
    SELECT 1 FROM public.payout_recovery_events
    WHERE order_item_id = recovery.order_item_id AND status = 'needs_support'
  ) INTO has_support;
  UPDATE public.order_items
  SET payout_recovered_amount = recovered_cents::NUMERIC / 100,
      payout_recovered_at = CASE WHEN next_status = 'recovered' THEN now() ELSE payout_recovered_at END,
      payout_recovery_status = CASE WHEN has_support THEN 'needs_support' WHEN recovered_cents > 0 THEN 'recovered' ELSE 'none' END,
      payout_recovery_error = CASE WHEN has_support THEN p_error ELSE NULL END
  WHERE id = recovery.order_item_id;
  RETURN recovery;
END;
$$;

CREATE OR REPLACE FUNCTION public.reinstate_payout_recovery(
  p_recovery_id UUID,
  p_stripe_reinstatement_transfer_id TEXT
) RETURNS public.payout_recovery_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recovery public.payout_recovery_events;
  recovered_cents INTEGER;
  has_support BOOLEAN;
BEGIN
  SELECT * INTO recovery FROM public.payout_recovery_events WHERE id = p_recovery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout recovery % was not found', p_recovery_id; END IF;
  PERFORM 1 FROM public.order_items WHERE id = recovery.order_item_id FOR UPDATE;
  UPDATE public.payout_recovery_events
  SET status = 'reinstated',
      stripe_reinstatement_transfer_id = p_stripe_reinstatement_transfer_id,
      error = NULL,
      resolved_at = now()
  WHERE id = p_recovery_id
  RETURNING * INTO recovery;
  SELECT COALESCE(sum(amount_cents), 0) INTO recovered_cents
  FROM public.payout_recovery_events
  WHERE order_item_id = recovery.order_item_id AND status = 'recovered';
  SELECT EXISTS(
    SELECT 1 FROM public.payout_recovery_events
    WHERE order_item_id = recovery.order_item_id AND status = 'needs_support'
  ) INTO has_support;
  UPDATE public.order_items
  SET payout_recovered_amount = recovered_cents::NUMERIC / 100,
      payout_recovery_status = CASE WHEN has_support THEN 'needs_support' WHEN recovered_cents > 0 THEN 'recovered' ELSE 'reinstated' END,
      payout_recovery_error = NULL
  WHERE id = recovery.order_item_id;
  RETURN recovery;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_payout_reinstatement_failure(
  p_recovery_id UUID,
  p_error TEXT
) RETURNS public.payout_recovery_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recovery public.payout_recovery_events;
BEGIN
  SELECT * INTO recovery FROM public.payout_recovery_events WHERE id = p_recovery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout recovery % was not found', p_recovery_id; END IF;
  IF recovery.status <> 'recovered' THEN
    RAISE EXCEPTION 'Only recovered payouts can be reinstated';
  END IF;
  PERFORM 1 FROM public.order_items WHERE id = recovery.order_item_id FOR UPDATE;
  UPDATE public.payout_recovery_events
  SET error = p_error
  WHERE id = p_recovery_id
  RETURNING * INTO recovery;
  UPDATE public.order_items
  SET payout_recovery_status = 'needs_support',
      payout_recovery_error = p_error
  WHERE id = recovery.order_item_id;
  RETURN recovery;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_payout_recovery(UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, UUID) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_stripe_payment_adjustment(UUID, TEXT, TEXT, INTEGER) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_payout_recovery(UUID, UUID, TEXT, TEXT, TEXT) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_stale_payout_recovery(UUID, INTEGER, TEXT, TEXT) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reinstate_payout_recovery(UUID, TEXT) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_payout_reinstatement_failure(UUID, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payout_recovery(UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_stripe_payment_adjustment(UUID, TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_payout_recovery(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_stale_payout_recovery(UUID, INTEGER, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reinstate_payout_recovery(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_payout_reinstatement_failure(UUID, TEXT) TO service_role;

COMMENT ON TABLE public.stripe_payment_events IS
  'Auditable Stripe refund/dispute webhook records. Written by the service role.';
COMMENT ON TABLE public.payout_recovery_events IS
  'One idempotent Stripe transfer reversal attempt per refund/dispute and vendor order item.';