---
name: Stripe + Escrow dual-rail payout flow
description: How the hold-until-both-confirm payout system works after the July 2026 implementation
---

## Rule
Vendor payouts are NOT released at checkout. They are held in the platform's Stripe balance (Stripe orders) or by Escrow.com (Escrow orders) until **both** vendor marks item delivered AND buyer confirms receipt.

## How it works (Stripe)
1. Checkout creates a Stripe Checkout Session with `mode: "payment"` + `payment_intent_data: { transfer_group: orderId }` — money captured to platform balance immediately.
2. `order_items.payout_status` starts as `"pending"`.
3. Vendor calls `PATCH /api/orders/[id]/items/[itemId]` with `{ fulfillment_status: "delivered" }`.
4. Buyer calls `POST /api/orders/[id]/confirm-delivery`.
5. Either of the above calls `lib/payouts.js:attemptPayoutRelease(orderId)` which:
   - Checks `order.buyer_confirmed_at IS NOT NULL` AND `item.fulfillment_status = 'delivered'` AND `item.payout_status = 'pending'`
   - Creates a Stripe Connect Transfer to the vendor's Express account (10% platform fee deducted)
   - Updates `order_items.payout_status = 'released'` and stamps `orders.payouts_released_at`

## Idempotency
- Each transfer uses `idempotencyKey: payout-item-${item.id}` — safe to retry.
- If vendor hasn't connected Stripe Connect, item is still marked "released" in DB with a warning logged. Actual transfer skipped.

## Escrow orders (≥ $500)
- Money held by Escrow.com, not the platform.
- `payout_status` is still updated in our DB when Escrow releases (via webhook/polling).
- `attemptPayoutRelease` for Escrow orders skips the Stripe Transfer and just marks DB.

**Why:** Buyers need protection — sellers can't receive money before the buyer confirms goods arrived. Escrow.com handles this natively; Stripe does not, so we built it manually.

**How to apply:** Any new fulfillment endpoint that transitions an item to "delivered" MUST call `attemptPayoutRelease`. Any buyer confirmation endpoint MUST also call it.
