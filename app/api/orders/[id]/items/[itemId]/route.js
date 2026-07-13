import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getStripeClient } from "@/lib/stripeClient";
import { NextResponse } from "next/server";

// Percentage the platform keeps from each vendor's item before releasing
// their payout. 0 until a real fee is decided.
const PLATFORM_FEE_PCT = 0;

const VALID_TRANSITIONS = {
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

// PATCH /api/orders/[id]/items/[itemId]   { fulfillment_status: "shipped" | "delivered" | "cancelled" }
//
// Money stays in the platform's own Stripe balance from checkout onward
// (no Stripe Connect destination charges are used). This route only updates
// bookkeeping: once a vendor marks their item "delivered" on a paid order,
// their share is marked payout_status = "released" so it shows up as owed
// to them. Actual bank transfer to the vendor happens outside this app
// until a payout method (e.g. Stripe Connect) is wired up.
export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: orderId, itemId } = await params;
    const { fulfillment_status: newStatus } = await request.json();

    const ALL_STATUSES = ["processing", "shipped", "delivered", "cancelled"];
    if (!ALL_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${ALL_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: item, error: itemErr } = await admin
      .from("order_items")
      .select("id, order_id, vendor_id, subtotal, fulfillment_status, payout_status")
      .eq("id", itemId)
      .eq("order_id", orderId)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: "Order item not found" }, { status: 404 });
    }
    if (item.vendor_id !== user.id) {
      return NextResponse.json({ error: "This item does not belong to you" }, { status: 403 });
    }

    const currentStatus = item.fulfillment_status || "processing";
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    // Special case: allow re-running "delivered" on an already-delivered item
    // whose payout is still pending, so a failed/held transfer can be retried
    // without faking a fulfillment status change.
    const isPayoutRetry = newStatus === "delivered" && currentStatus === "delivered" && item.payout_status !== "released";
    if (!allowed.includes(newStatus) && !isPayoutRetry) {
      return NextResponse.json(
        { error: `Cannot move from "${currentStatus}" to "${newStatus}"` },
        { status: 422 }
      );
    }

    const update = { fulfillment_status: newStatus };
    let payoutWarning = null;

    if (newStatus === "delivered") {
      const { data: order, error: orderErr } = await admin
        .from("orders")
        .select("payment_status, stripe_payment_intent")
        .eq("id", orderId)
        .single();

      if (orderErr || !order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      if (order.payment_status !== "paid") {
        return NextResponse.json(
          { error: "Cannot release payout — this order has not been paid yet." },
          { status: 422 }
        );
      }

      const payoutAmount = +(Number(item.subtotal) * (1 - PLATFORM_FEE_PCT / 100)).toFixed(2);

      // Try to actually move the money via Stripe Connect. If the vendor
      // hasn't finished onboarding, or the transfer fails for any reason,
      // we still let the item be marked delivered (shipment already
      // happened) but leave payout_status as "pending" so it's obviously
      // still owed rather than silently lost.
      const { data: vendorProfile } = await admin
        .from("profiles")
        .select("stripe_account_id, stripe_payouts_enabled")
        .eq("id", item.vendor_id)
        .single();

      if (!vendorProfile?.stripe_account_id || !vendorProfile.stripe_payouts_enabled) {
        payoutWarning = "Item marked delivered, but this vendor hasn't finished connecting their bank account yet — payout is still held.";
      } else if (!order.stripe_payment_intent) {
        payoutWarning = "Item marked delivered, but no payment record was found for this order — payout was not sent.";
      } else {
        try {
          const stripe = getStripeClient();
          const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent);
          const chargeId = typeof paymentIntent.latest_charge === "string"
            ? paymentIntent.latest_charge
            : paymentIntent.latest_charge?.id;

          // Idempotency key keyed on the item id: if this request is retried
          // (client retry, network blip, or a concurrent duplicate call),
          // Stripe returns the original transfer instead of creating a
          // second one — this is what actually prevents double-payouts,
          // since a DB-only guard can't close the race on its own.
          const transfer = await stripe.transfers.create(
            {
              amount: Math.round(payoutAmount * 100),
              currency: "usd",
              destination: vendorProfile.stripe_account_id,
              transfer_group: orderId,
              ...(chargeId ? { source_transaction: chargeId } : {}),
            },
            { idempotencyKey: `payout-item-${item.id}` }
          );

          update.payout_status = "released";
          update.payout_amount = payoutAmount;
          update.payout_released_at = new Date().toISOString();
          update.stripe_transfer_id = transfer.id;
        } catch (transferErr) {
          console.error("stripe transfer error:", transferErr);
          payoutWarning = `Item marked delivered, but the payout transfer failed (${transferErr.message}). It's still held — you can retry once resolved.`;
        }
      }
    }

    const { data: updated, error: updateErr } = await admin
      .from("order_items")
      .update(update)
      .eq("id", itemId)
      .select("id, fulfillment_status, payout_status, payout_amount, payout_released_at, stripe_transfer_id")
      .single();

    if (updateErr) {
      // If a Stripe transfer already went out, this is now a reconciliation
      // problem, not a normal failure — money moved but our record of it
      // didn't save. Log loudly with the transfer id so it can be found and
      // fixed manually instead of silently disappearing.
      if (update.stripe_transfer_id) {
        console.error(
          `CRITICAL: Stripe transfer ${update.stripe_transfer_id} for order_item ${itemId} succeeded but failed to save to the database:`,
          updateErr
        );
      } else {
        console.error("order item status update error:", updateErr);
      }
      return NextResponse.json({ error: updateErr.message || "Failed to update item" }, { status: 500 });
    }

    return NextResponse.json({ item: updated, warning: payoutWarning });
  } catch (err) {
    console.error("PATCH /api/orders/[id]/items/[itemId] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
