import { createAdminClient } from "./supabaseAdmin.js";
import { getStripeClient } from "./stripeClient.js";
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

const REFUND_EVENT_TYPES = new Set(["charge.refunded", "refund.created", "refund.updated"]);
const DISPUTE_EVENT_TYPES = new Set(["charge.dispute.created", "charge.dispute.closed"]);

function amountToCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

function stripeAmountToCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
}

function stripeObjectId(value) {
  return typeof value === "string" ? value : value?.id || null;
}

/**
 * Distribute a refund/chargeback across the vendor transfers that were
 * actually sent. Weighting by transfer amount means the platform commission,
 * shipping, and tax never cause a seller to be debited for more than their
 * original payout. Largest-remainder allocation keeps rounding deterministic.
 */
export function allocatePayoutRecoveryCents(items, amountCents) {
  const requested = Math.max(0, Math.floor(Number(amountCents) || 0));
  const candidates = (items || []).map((item) => ({
    ...item,
    originalPayoutCents: amountToCents(item.payout_amount ?? item.subtotal),
    previousRecoveredCents: amountToCents(item.payout_recovered_amount),
  })).map((item) => ({
    ...item,
    payoutCents: Math.max(0, item.originalPayoutCents - item.previousRecoveredCents),
  })).filter((item) => item.payoutCents > 0 && item.stripe_transfer_id);

  const totalPayoutCents = candidates.reduce((sum, item) => sum + item.payoutCents, 0);
  const target = Math.min(requested, totalPayoutCents);
  if (!target || !totalPayoutCents) return [];

  const allocations = candidates.map((item) => {
    const exact = (target * item.payoutCents) / totalPayoutCents;
    return { ...item, recoveryCents: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remainder = target - allocations.reduce((sum, item) => sum + item.recoveryCents, 0);
  allocations
    .sort((a, b) => b.remainder - a.remainder || String(a.id).localeCompare(String(b.id)))
    .forEach((item) => {
      if (remainder > 0) {
        item.recoveryCents += 1;
        remainder -= 1;
      }
    });

  return allocations
    .filter((item) => item.recoveryCents > 0)
    .map(({ id, vendor_id, stripe_transfer_id, payoutCents, originalPayoutCents, previousRecoveredCents, recoveryCents }) => ({
      id,
      vendor_id,
      stripe_transfer_id,
      payoutCents,
      originalPayoutCents,
      previousRecoveredCents,
      recoveryCents,
    }));
}

async function findOrderForStripePayment({ object, admin }) {
  const metadataOrderId = object?.metadata?.order_id;
  if (metadataOrderId) {
    const { data } = await admin
      .from("orders")
      .select("id, payment_status, total, refunded_amount, disputed_amount, payment_issue_status")
      .eq("id", metadataOrderId)
      .maybeSingle();
    if (data) return data;
  }

  const paymentIntentId = stripeObjectId(object?.payment_intent);
  if (paymentIntentId) {
    const { data } = await admin
      .from("orders")
      .select("id, payment_status, total, refunded_amount, disputed_amount, payment_issue_status")
      .eq("stripe_payment_intent", paymentIntentId)
      .maybeSingle();
    if (data) return data;
  }

  return null;
}

async function claimPaymentEvent({ event, order, admin }) {
  const object = event.data?.object || {};
  const paymentIntentId = stripeObjectId(object.payment_intent);
  const chargeId = stripeObjectId(object.charge) || (event.type.startsWith("charge.") ? object.id : null);
  const adjustmentId =
    REFUND_EVENT_TYPES.has(event.type) && event.type !== "charge.refunded"
      ? object.id
      : DISPUTE_EVENT_TYPES.has(event.type)
        ? object.id
        : `${chargeId || paymentIntentId || "unknown"}:${event.type}:${event.id}`;

  const payload = {
    stripe_event_id: event.id,
    event_type: event.type,
    stripe_payment_intent_id: paymentIntentId,
    stripe_charge_id: chargeId,
    stripe_adjustment_id: adjustmentId,
    order_id: order?.id || null,
    status: order ? "processing" : "ignored",
    amount_cents: stripeAmountToCents(object.amount),
    currency: object.currency || "usd",
    payload: object,
  };

  const { data: inserted, error: insertError } = await admin
    .from("stripe_payment_events")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (!insertError && inserted) return { record: inserted, isNew: true };
  if (insertError && !/duplicate|unique/i.test(insertError.message || "")) throw insertError;

  const { data: existing, error: existingError } = await admin
    .from("stripe_payment_events")
    .select("*")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  if (existingError) throw existingError;
  return { record: existing, isNew: false };
}

async function createOrReuseRecoveryEvent({ eventRecord, allocation, order, event, admin }) {
  const { data, error } = await admin.rpc("claim_payout_recovery", {
    p_order_id: order.id,
    p_order_item_id: allocation.id,
    p_vendor_id: allocation.vendor_id,
    p_stripe_event_id: eventRecord.stripe_event_id,
    p_stripe_adjustment_id: eventRecord.stripe_adjustment_id,
    p_event_type: event.type.startsWith("refund") || event.type === "charge.refunded" ? "refund" : "dispute",
    p_requested_amount_cents: allocation.recoveryCents,
    p_stripe_transfer_id: allocation.stripe_transfer_id,
  }).single();
  if (error) throw error;
  return data;
}

async function claimStripePaymentAdjustment({ eventRecord, order, eventType, amountCents, admin }) {
  const { data, error } = await admin.rpc("claim_stripe_payment_adjustment", {
    p_order_id: order.id,
    p_stripe_adjustment_id: eventRecord.stripe_adjustment_id,
    p_event_type: eventType,
    p_amount_cents: Math.max(0, Math.floor(amountCents || 0)),
  }).single();
  if (error) throw error;
  return data;
}

async function finalizePayoutRecovery({ recoveryId, status, stripeTransferReversalId = null, errorMessage = null, admin }) {
  const { data, error } = await admin.rpc("finalize_payout_recovery", {
    p_recovery_id: recoveryId,
    p_status: status,
    p_stripe_transfer_reversal_id: stripeTransferReversalId,
    p_error: errorMessage,
  }).single();
  if (error) throw error;
  return data;
}

async function markPayoutReinstatementFailure({ recoveryId, errorMessage, admin }) {
  const { data, error } = await admin.rpc("mark_payout_reinstatement_failure", {
    p_recovery_id: recoveryId,
    p_error: errorMessage,
  }).single();
  if (error) throw error;
  return data;
}

async function reinstateDisputePayouts({ eventRecord, order, stripeClient, admin }) {
  const { data: recoveries, error: recoveryError } = await admin
    .from("payout_recovery_events")
    .select("id, order_item_id, vendor_id, amount_cents")
    .eq("stripe_adjustment_id", eventRecord.stripe_adjustment_id)
    .eq("event_type", "dispute")
    .eq("status", "recovered");
  if (recoveryError) throw recoveryError;

  const warnings = [];
  let reinstatedCount = 0;
  for (const recovery of recoveries || []) {
    try {
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", recovery.vendor_id)
        .single();
      if (profileError || !profile?.stripe_account_id) throw profileError || new Error("Seller Stripe account is unavailable.");

      const transfer = await stripeClient.transfers.create(
        {
          amount: recovery.amount_cents,
          currency: "usd",
          destination: profile.stripe_account_id,
          transfer_group: order.id,
          metadata: {
            order_id: order.id,
            order_item_id: recovery.order_item_id,
            payout_recovery_event_id: recovery.id,
            recovery_type: "dispute_reinstatement",
          },
        },
        { idempotencyKey: `payout-dispute-reinstatement-${eventRecord.stripe_adjustment_id}-${recovery.order_item_id}` }
      );

      const { error: reinstateError } = await admin.rpc("reinstate_payout_recovery", {
        p_recovery_id: recovery.id,
        p_stripe_reinstatement_transfer_id: transfer.id,
      }).single();
      if (reinstateError) throw reinstateError;
      reinstatedCount += 1;
    } catch (err) {
      const message = err?.message || "Seller payout could not be reinstated.";
      warnings.push(`Item ${recovery.order_item_id}: ${message}`);
      await markPayoutReinstatementFailure({
        recoveryId: recovery.id,
        errorMessage: message,
        admin,
      });
    }
  }
  return { reinstatedCount, warnings };
}

async function setPaymentEventStatus(admin, eventId, status, errorMessage = null) {
  const { error } = await admin
    .from("stripe_payment_events")
    .update({
      status,
      error: errorMessage,
      processed_at: status === "processing" ? null : new Date().toISOString(),
    })
    .eq("id", eventId);
  if (error) throw error;
}

/**
 * Reverses the vendor share for a successful Stripe refund or chargeback.
 * The recovery ledger is unique per Stripe adjustment and order item, while
 * Stripe idempotency keys protect the external reversal if webhook delivery
 * races with itself. A failed reversal is deliberately visible as
 * needs_support rather than being silently treated as recovered.
 */
export async function processStripeRefundOrDispute({
  event,
  adminClient = createAdminClient(),
  stripeClient = getStripeClient(),
}) {
  if (!event?.id || (!REFUND_EVENT_TYPES.has(event.type) && !DISPUTE_EVENT_TYPES.has(event.type))) {
    return { processed: false, retryRequired: false, reason: "Unsupported payment event", recoveredCount: 0, warnings: [] };
  }

  const admin = adminClient;
  const object = event.data?.object || {};
  const order = await findOrderForStripePayment({ object, admin });
  const { record: eventRecord } = await claimPaymentEvent({ event, order, admin });

  if (!eventRecord) {
    return { processed: false, retryRequired: true, reason: "Payment event could not be recorded", recoveredCount: 0, warnings: [] };
  }
  if (eventRecord.status === "processed") {
    return { processed: true, retryRequired: false, orderId: order?.id, recoveredCount: 0, warnings: [] };
  }
  if (!order) {
    await setPaymentEventStatus(admin, eventRecord.id, "ignored", "No matching order found for Stripe payment event.");
    return { processed: false, retryRequired: false, reason: "No matching order", recoveredCount: 0, warnings: [] };
  }

  const isRefund = REFUND_EVENT_TYPES.has(event.type);
  const disputeClosed = event.type === "charge.dispute.closed";
  const disputeLost = disputeClosed && object.status === "lost";
  const disputeWon = disputeClosed && object.status === "won";
  if (isRefund && event.type !== "charge.refunded" && object.status !== "succeeded") {
    await setPaymentEventStatus(admin, eventRecord.id, "ignored", `Refund status is ${object.status || "unknown"}; waiting for confirmation.`);
    return { processed: false, retryRequired: false, orderId: order.id, recoveredCount: 0, warnings: [] };
  }
  let adjustmentCents = stripeAmountToCents(object.amount);

  // charge.refunded carries the cumulative amount. The webhook normalizes it
  // into individual refund.updated events, but this remains a safe fallback.
  if (event.type === "charge.refunded") {
    adjustmentCents = stripeAmountToCents(object.amount_refunded);
  }
  if (disputeWon || (disputeClosed && !disputeLost)) adjustmentCents = 0;
  if (event.type === "refund.updated" && object.status && object.status !== "succeeded") adjustmentCents = 0;

  const adjustmentClaim = await claimStripePaymentAdjustment({
    eventRecord,
    order,
    eventType: isRefund ? "refund" : "dispute",
    amountCents: adjustmentCents,
    admin,
  });
  adjustmentCents = adjustmentClaim.amount_cents;
  if (disputeWon) adjustmentCents = 0;

  const { data: items, error: itemsError } = await admin
    .from("order_items")
    .select("id, vendor_id, payout_amount, payout_status, stripe_transfer_id, payout_recovered_amount")
    .eq("order_id", order.id)
    .eq("payout_status", "released");
  if (itemsError) throw itemsError;

  const allocations = allocatePayoutRecoveryCents(items || [], adjustmentCents);
  const warnings = [];
  let recoveredCount = 0;

  if (disputeWon) {
    const reinstatement = await reinstateDisputePayouts({ eventRecord, order, stripeClient, admin });
    recoveredCount += reinstatement.reinstatedCount;
    warnings.push(...reinstatement.warnings);
  }

  for (const allocation of allocations) {
    const recovery = await createOrReuseRecoveryEvent({ eventRecord, allocation, order, event, admin });
    if (!recovery) {
      warnings.push(`Item ${allocation.id}: recovery record could not be created.`);
      continue;
    }
    if (["recovered", "reinstated", "not_applicable"].includes(recovery.status)) continue;

    try {
      const reversal = await stripeClient.transfers.createReversal(
        recovery.stripe_transfer_id,
        {
          amount: recovery.amount_cents,
          metadata: {
            order_id: order.id,
            order_item_id: allocation.id,
            stripe_event_id: event.id,
            recovery_type: recovery.event_type,
          },
        },
        { idempotencyKey: `payout-recovery-${eventRecord.stripe_adjustment_id}-${allocation.id}` }
      );

      await finalizePayoutRecovery({
        recoveryId: recovery.id,
        status: "recovered",
        stripeTransferReversalId: reversal.id,
        admin,
      });
      recoveredCount += 1;
    } catch (err) {
      const message = err?.message || "Stripe transfer reversal failed.";
      warnings.push(`Item ${allocation.id}: ${message}`);
      await finalizePayoutRecovery({
        recoveryId: recovery.id,
        status: "needs_support",
        errorMessage: message,
        admin,
      });
    }
  }

  const nextOrderValues = isRefund
    ? (warnings.length > 0 ? { payment_issue_status: "needs_support" } : {})
    : {
        payment_issue_status: warnings.length > 0 ? "needs_support" : disputeWon ? "dispute_won" : disputeLost ? "dispute_lost" : "disputed",
      };

  if (Object.keys(nextOrderValues).length > 0) {
    const { error: orderUpdateError } = await admin
      .from("orders")
      .update(nextOrderValues)
      .eq("id", order.id);
    if (orderUpdateError) throw orderUpdateError;
  }

  const eventStatus = warnings.length > 0 ? "needs_support" : "processed";
  await setPaymentEventStatus(admin, eventRecord.id, eventStatus, warnings.join(" ") || null);
  await admin.from("activity_logs").insert({
    actor_id: null,
    action: isRefund ? "stripe_refund_processed" : "stripe_dispute_processed",
    entity_type: "order",
    entity_id: order.id,
    description: warnings.length
      ? `${event.type} recorded; seller payout recovery needs support.`
      : `${event.type} recorded and seller payout recovery completed.`,
    metadata: {
      stripe_event_id: event.id,
      stripe_adjustment_id: eventRecord.stripe_adjustment_id,
      recovered_count: recoveredCount,
      warnings,
    },
  });

  return {
    processed: warnings.length === 0,
    retryRequired: warnings.length > 0,
    orderId: order.id,
    recoveredCount,
    warnings,
  };
}
