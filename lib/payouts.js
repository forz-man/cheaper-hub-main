/**
 * Payout release logic — called after EITHER the vendor marks their item
 * delivered OR the buyer confirms receipt. When BOTH conditions are met for
 * a vendor's items the payout is automatically released.
 *
 * For Stripe orders: a Stripe Connect Transfer is created from the platform
 * balance to the vendor's Express account. If the vendor hasn't connected
 * Stripe yet, the item is still marked "released" in our DB so it shows up
 * as owed and can be retried once they connect.
 *
 */

import { createAdminClient } from "@/lib/supabaseAdmin";
import { getStripeClient } from "@/lib/stripeClient";

/** Platform commission taken before paying vendors (10%). */
const PLATFORM_FEE_RATE = 0.10;

/**
 * Attempt to release payouts for all eligible items in an order.
 *
 * Eligibility per item:
 *   - order.payment_status = 'paid'
 *   - order.buyer_confirmed_at IS NOT NULL  (buyer tapped "Confirm delivery")
 *   - item.fulfillment_status = 'delivered' (vendor marked their item shipped+delivered)
 *   - item.payout_status = 'pending'        (not already released)
 *
 * Safe to call multiple times — already-released items are skipped.
 *
 * @param {string} orderId
 * @returns {{ released: boolean, releasedCount: number, transfers: string[], warnings: string[] }}
 */
export async function attemptPayoutRelease(orderId) {
  const admin = createAdminClient();
  const warnings = [];

  // ── 1. Fetch order ────────────────────────────────────────────────────────
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select(
      "id, buyer_confirmed_at, payment_status, stripe_payment_intent, payouts_released_at"
    )
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    return { released: false, reason: "Order not found", releasedCount: 0, transfers: [], warnings };
  }

  // Buyer must have confirmed before we release anything
  if (!order.buyer_confirmed_at) {
    return { released: false, reason: "Awaiting buyer confirmation", releasedCount: 0, transfers: [], warnings };
  }

  if (order.payment_status !== "paid") {
    return { released: false, reason: "Order not paid", releasedCount: 0, transfers: [], warnings };
  }

  // ── 2. Find items ready for payout ────────────────────────────────────────
  const { data: items, error: itemsErr } = await admin
    .from("order_items")
    .select("id, vendor_id, subtotal, fulfillment_status, payout_status")
    .eq("order_id", orderId)
    .eq("payout_status", "pending")
    .eq("fulfillment_status", "delivered");

  if (itemsErr) {
    console.error("[payouts] Failed to fetch items:", itemsErr.message);
    return { released: false, reason: itemsErr.message, releasedCount: 0, transfers: [], warnings };
  }

  if (!items?.length) {
    return { released: false, reason: "No items ready for payout", releasedCount: 0, transfers: [], warnings };
  }

  // ── 3. Release each item ──────────────────────────────────────────────────
  const transfers = [];
  const releasedItemIds = [];

  for (const item of items) {
    try {
      let transferId = null;
      const payoutAmount = +(Number(item.subtotal) * (1 - PLATFORM_FEE_RATE)).toFixed(2);

      if (order.stripe_payment_intent && item.vendor_id) {
        // Look up vendor's Stripe Connect account
        const { data: profile } = await admin
          .from("profiles")
          .select("stripe_account_id, stripe_payouts_enabled")
          .eq("id", item.vendor_id)
          .single();

        if (profile?.stripe_account_id && profile?.stripe_payouts_enabled) {
          try {
            const stripe = getStripeClient();
            const transfer = await stripe.transfers.create(
              {
                amount: Math.round(payoutAmount * 100), // cents
                currency: "usd",
                destination: profile.stripe_account_id,
                transfer_group: orderId,
                metadata: {
                  order_id: orderId,
                  order_item_id: item.id,
                  vendor_id: item.vendor_id,
                },
              },
              { idempotencyKey: `payout-item-${item.id}` }
            );
            transferId = transfer.id;
            transfers.push(transferId);
          } catch (stripeErr) {
            // Log but don't block — still mark released in DB so admin can retry
            warnings.push(
              `Stripe transfer failed for item ${item.id}: ${stripeErr.message}`
            );
            console.error("[payouts] Stripe transfer error:", stripeErr.message);
          }
        } else {
          warnings.push(
            `Vendor ${item.vendor_id} has not connected Stripe — payout marked released but bank transfer skipped.`
          );
          console.warn("[payouts] Vendor missing Stripe Connect:", item.vendor_id);
        }
      }
      // Update order_item
      const itemUpdate = {
        payout_status: "released",
        payout_amount: payoutAmount,
        payout_released_at: new Date().toISOString(),
      };
      if (transferId) itemUpdate.stripe_transfer_id = transferId;

      await admin.from("order_items").update(itemUpdate).eq("id", item.id);

      releasedItemIds.push(item.id);
    } catch (err) {
      warnings.push(`Failed to process item ${item.id}: ${err.message}`);
      console.error(`[payouts] Error releasing item ${item.id}:`, err.message);
    }
  }

  // ── 4. Stamp payouts_released_at if all items are now released ────────────
  if (releasedItemIds.length > 0) {
    const { data: remaining } = await admin
      .from("order_items")
      .select("id")
      .eq("order_id", orderId)
      .eq("payout_status", "pending");

    if (!remaining?.length) {
      await admin
        .from("orders")
        .update({ payouts_released_at: new Date().toISOString() })
        .eq("id", orderId);
    }
  }

  console.log(
    `[payouts] Order ${orderId}: released ${releasedItemIds.length} item(s), ${transfers.length} Stripe transfer(s).`
  );

  return {
    released: releasedItemIds.length > 0,
    releasedCount: releasedItemIds.length,
    transfers,
    warnings,
  };
}
