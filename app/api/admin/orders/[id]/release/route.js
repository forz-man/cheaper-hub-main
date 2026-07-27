/**
 * POST /api/admin/orders/[id]/release
 * Admin manually releases vendor payouts for a fully-confirmed order.
 *
 * Requirements before releasing:
 *   - order.payment_status = "paid"  (card was charged at checkout)
 *   - order.buyer_confirmed_at IS NOT NULL  (buyer confirmed receipt)
 *   - At least one vendor item has fulfillment_status = "delivered"
 *
 * For each delivered item whose payout is still pending, this creates a
 * Stripe Transfer to the vendor's Connect account and marks it "released".
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getStripeClient } from "@/lib/stripeClient";

export async function POST(req, { params }) {
  try {
    const { error: authErr, admin } = await requireAdmin();
    if (authErr) return authErr;

    const { id: orderId } = await params;

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, payment_status, stripe_payment_intent, buyer_confirmed_at, payouts_released_at, order_items(id, vendor_id, subtotal, fulfillment_status, payout_status, stripe_transfer_id)")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.payment_status !== "paid") {
      return NextResponse.json({ error: "Order has not been paid yet." }, { status: 422 });
    }
    if (!order.buyer_confirmed_at) {
      return NextResponse.json({ error: "Buyer has not confirmed delivery yet." }, { status: 422 });
    }
    if (!order.stripe_payment_intent) {
      return NextResponse.json({ error: "No payment intent on record for this order." }, { status: 422 });
    }

    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent);
    const chargeId = typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id;

    const itemsToRelease = (order.order_items || []).filter(
      (i) => i.fulfillment_status === "delivered" && i.payout_status !== "released"
    );

    if (itemsToRelease.length === 0) {
      return NextResponse.json({ message: "No pending payouts to release.", released: 0 });
    }

    // Look up vendor Stripe accounts in one query
    const vendorIds = [...new Set(itemsToRelease.map((i) => i.vendor_id).filter(Boolean))];
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, stripe_account_id, stripe_payouts_enabled")
      .in("id", vendorIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const PLATFORM_FEE_PCT = 0;
    const results = [];
    const warnings = [];

    for (const item of itemsToRelease) {
      const vendor = profileMap.get(item.vendor_id);
      const payoutAmount = +(Number(item.subtotal) * (1 - PLATFORM_FEE_PCT / 100)).toFixed(2);

      if (!vendor?.stripe_account_id || !vendor?.stripe_payouts_enabled) {
        warnings.push(`Item ${item.id}: vendor not onboarded — payout skipped.`);
        continue;
      }

      try {
        const transfer = await stripe.transfers.create(
          {
            amount: Math.round(payoutAmount * 100),
            currency: "usd",
            destination: vendor.stripe_account_id,
            transfer_group: orderId,
            ...(chargeId ? { source_transaction: chargeId } : {}),
          },
          { idempotencyKey: `payout-item-${item.id}` }
        );

        await admin
          .from("order_items")
          .update({
            payout_status: "released",
            payout_amount: payoutAmount,
            payout_released_at: new Date().toISOString(),
            stripe_transfer_id: transfer.id,
          })
          .eq("id", item.id);

        results.push({ itemId: item.id, transferId: transfer.id, amount: payoutAmount });
      } catch (err) {
        console.error(`Transfer failed for item ${item.id}:`, err.message);
        warnings.push(`Item ${item.id}: transfer failed — ${err.message}`);
      }
    }

    // Mark the order as having payouts released if at least one went through
    if (results.length > 0) {
      await admin
        .from("orders")
        .update({ payouts_released_at: new Date().toISOString() })
        .eq("id", orderId);
    }

    return NextResponse.json({ released: results.length, transfers: results, warnings });
  } catch (err) {
    console.error("admin release error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
