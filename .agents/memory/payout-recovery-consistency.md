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

A recovery attempt that is actively calling Stripe must be a non-stealable
reservation. Do not reclaim it just because its start time is old.

**Why:** a database token cannot fence an already-issued third-party request.
Reassigning a timed lease can make two workers call the same reversal endpoint
while the first is merely slow, creating a webhook storm even though Stripe's
idempotency key protects the money movement.

**How to apply:** only the token owner calls Stripe and finalizes the ledger.
Set a bounded request timeout; when that request returns an error or timeout,
the owner changes the recovery to `needs_support`, making a later delivery safe
to claim and retry with the same deterministic Stripe idempotency key.