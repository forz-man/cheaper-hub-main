---
name: Payout recovery consistency
description: Durable rules for safely reversing immediate Stripe Connect transfers after refunds and disputes.
---

Model each Stripe refund or dispute as one canonical adjustment, independent of
individual webhook event IDs. Stripe can send overlapping lifecycle events for
the same adjustment, and a charge-level event can bundle multiple refunds.

**Why:** transfer reversals are external, irreversible money movements. A
database-only "already processed" check without a unique adjustment record and
row locks can double-reverse a seller transfer, lose a concurrent aggregate
update, or mislabel a fully refunded order as paid.

**How to apply:** claim the canonical adjustment and update order totals under
an order lock, reserve each item’s remaining recovery capacity under an item
lock before calling Stripe, and derive the seller-visible aggregate from the
ledger under the same lock. Keep security-definer payment RPCs service-role
only and validate all order/item/vendor/transfer relationships inside them.

For a ledger row that is unique per adjustment and item, perform the
already-exists lookup only after acquiring the item lock, then return the
canonical record when it exists.

**Why:** a pre-lock lookup can miss another delivery that is about to insert
the same row. Once the waiting delivery acquires the lock, it must recheck or
it can fail at the uniqueness constraint instead of treating the webhook as a
safe retry.

**How to apply:** keep the relationship validation and `FOR UPDATE` together,
then read the unique recovery key before calculating capacity or inserting.

An active recovery attempt must not be stolen. A stale attempt may be
reconciled only after its bounded Stripe request window plus a safety buffer.

**Why:** a server can die after Stripe accepts a reversal but before it saves
the result, leaving a permanent `processing` row. Reclaiming blindly can race a
slow worker, so reconciliation must first find the deterministic reversal in
Stripe and record it; only an absent result becomes retryable with the same
idempotency key.

**How to apply:** only the current token owner calls Stripe and finalizes the
ledger. On redelivery, leave fresh `processing` rows alone. For stale rows,
lock and recheck them, query the original transfer's reversals by adjustment
metadata, then either mark the found reversal recovered or move the claim to
`needs_support` before retrying with the unchanged Stripe idempotency key.