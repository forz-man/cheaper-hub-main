import { createAdminClient } from "@/lib/supabaseAdmin";
import { getStripeClient } from "@/lib/stripeClient";
export {
  PLATFORM_FEE_RATE,
  calculateVendorPayoutCents,
  isPayoutAccountReady,
} from "./payouts/amounts.mjs";
import {
  calculateVendorPayoutCents,
  isPayoutAccountReady,
} from "./payouts/amounts.mjs";

function paymentIntentChargeId(paymentIntent) {
  return typeof paymentIntent?.latest_charge === "string"
    ? paymentIntent.latest_charge
    : paymentIntent?.latest_charge?.id || null;
}

/**
 * Record a verified, successful Stripe PaymentIntent and immediately send each
 * vendor's share. Both the Checkout webhook and the buyer's verified success
 * page call this function, so it must be safe to call repeatedly.
 *
 * Stripe idempotency keys, not a database-only check, are the final duplicate
 * protection if the webhook and verification path race each other.
 */
export async function markOrderPaidAndSendPayouts({
  orderId,
  paymentIntentId,
  vendorId,
  adminClient = createAdminClient(),
  stripeClient = getStripeClient(),
}) {
  if (!orderId || !paymentIntentId) {
    return { paid: false, transferred: false, retryRequired: false, reason: "Missing order or payment intent", transferredCount: 0, transfers: [], warnings: [] };
  }

  const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status !== "succeeded") {
    return {
      paid: false,
      transferred: false,
      retryRequired: false,
      reason: `Payment intent is ${paymentIntent.status}`,
      transferredCount: 0,
      transfers: [],
      warnings: [],
    };
  }

  const chargeId = paymentIntentChargeId(paymentIntent);
  if (!chargeId) {
    return {
      paid: false,
      transferred: false,
      retryRequired: false,
      reason: "Payment intent has no successful charge",
      transferredCount: 0,
      transfers: [],
      warnings: [],
    };
  }

  const { error: orderUpdateError } = await adminClient
    .from("orders")
    .update({
      payment_status: "paid",
      stripe_payment_intent: paymentIntent.id,
    })
    .eq("id", orderId);

  if (orderUpdateError) throw orderUpdateError;

  const payoutResult = await sendImmediateVendorPayouts({
    orderId,
    chargeId,
    vendorId,
    adminClient,
    stripeClient,
  });

  return { paid: true, ...payoutResult };
}

/**
 * Creates an immediate Stripe Connect transfer for every pending order item.
 * A failed or unavailable payout account remains pending with an error saved
 * for audit/retry; it is never marked as paid out without a Stripe transfer.
 */
export async function sendImmediateVendorPayouts({
  orderId,
  chargeId,
  vendorId,
  adminClient = createAdminClient(),
  stripeClient = getStripeClient(),
}) {
  const admin = adminClient;
  const warnings = [];

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, payment_status, stripe_payment_intent, payouts_released_at")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    return { transferred: false, retryRequired: false, reason: "Order not found", transferredCount: 0, transfers: [], warnings };
  }
  if (order.payment_status !== "paid") {
    return { transferred: false, retryRequired: false, reason: "Order not paid", transferredCount: 0, transfers: [], warnings };
  }

  let pendingItemsQuery = admin
    .from("order_items")
    .select("id, vendor_id, subtotal, payout_status")
    .eq("order_id", orderId)
    .eq("payout_status", "pending");
  if (vendorId) pendingItemsQuery = pendingItemsQuery.eq("vendor_id", vendorId);
  const { data: items, error: itemsErr } = await pendingItemsQuery;

  if (itemsErr) {
    console.error("[payouts] Failed to fetch items:", itemsErr.message);
    return { transferred: false, retryRequired: false, reason: itemsErr.message, transferredCount: 0, transfers: [], warnings };
  }

  if (!items?.length) {
    return { transferred: false, retryRequired: false, reason: "No pending vendor transfers", transferredCount: 0, transfers: [], warnings };
  }

  const transfers = [];
  const transferredItemIds = [];
  const vendorIds = [...new Set(items.map((item) => item.vendor_id).filter(Boolean))];
  const { data: profiles, error: profilesErr } = await admin
    .from("profiles")
    .select("id, stripe_account_id, stripe_payouts_enabled")
    .in("id", vendorIds);

  if (profilesErr) throw profilesErr;
  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));

  for (const item of items) {
    const attemptedAt = new Date().toISOString();
    try {
      const profile = profilesById.get(item.vendor_id);
      if (!isPayoutAccountReady(profile)) {
        const message = "Vendor payout account is no longer ready.";
        warnings.push(`Item ${item.id}: ${message}`);
        await admin
          .from("order_items")
          .update({ payout_attempted_at: attemptedAt, payout_error: message })
          .eq("id", item.id);
        continue;
      }

      const payoutCents = calculateVendorPayoutCents(item.subtotal);
      if (payoutCents < 1) {
        const message = "Vendor payout amount must be at least one cent.";
        warnings.push(`Item ${item.id}: ${message}`);
        await admin
          .from("order_items")
          .update({ payout_attempted_at: attemptedAt, payout_error: message })
          .eq("id", item.id);
        continue;
      }

      const transfer = await stripeClient.transfers.create(
        {
          amount: payoutCents,
          currency: "usd",
          destination: profile.stripe_account_id,
          source_transaction: chargeId,
          transfer_group: orderId,
          metadata: {
            order_id: orderId,
            order_item_id: item.id,
            vendor_id: item.vendor_id,
          },
        },
        { idempotencyKey: `payout-item-${item.id}` }
      );

      const itemUpdate = {
        payout_status: "released",
        payout_amount: payoutCents / 100,
        payout_released_at: attemptedAt,
        payout_attempted_at: attemptedAt,
        payout_error: null,
        stripe_transfer_id: transfer.id,
      };

      const { error: itemUpdateError } = await admin.from("order_items").update(itemUpdate).eq("id", item.id);
      if (itemUpdateError) throw itemUpdateError;
      transfers.push(transfer.id);
      transferredItemIds.push(item.id);
    } catch (err) {
      const message = err?.message || "Stripe transfer failed.";
      warnings.push(`Item ${item.id}: ${message}`);
      console.error(`[payouts] Immediate transfer failed for item ${item.id}:`, message);
      await admin
        .from("order_items")
        .update({ payout_attempted_at: attemptedAt, payout_error: message })
        .eq("id", item.id);
    }
  }

  if (transferredItemIds.length > 0) {
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
    `[payouts] Order ${orderId}: sent ${transferredItemIds.length} immediate vendor transfer(s).`
  );

  return {
    transferred: transferredItemIds.length > 0,
    transferredCount: transferredItemIds.length,
    transfers,
    warnings,
    retryRequired: warnings.length > 0,
  };
}
