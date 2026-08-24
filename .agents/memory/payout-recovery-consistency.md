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