import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { markOrderPaidAndSendPayouts } from "@/lib/payouts";

// POST /api/orders/[id]/retry-payout
// Lets the vendor retry only their own pending Stripe transfer. This is a
// recovery action for an exceptional failed transfer, not a delivery-gated
// payout release.
export async function POST(_request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: orderId } = await params;
    const admin = createAdminClient();
    const { data: vendorItem, error: vendorItemErr } = await admin
      .from("order_items")
      .select("id")
      .eq("order_id", orderId)
      .eq("vendor_id", user.id)
      .eq("payout_status", "pending")
      .limit(1);

    if (vendorItemErr || !vendorItem?.length) {
      return NextResponse.json({ error: "No pending payout for this vendor and order." }, { status: 404 });
    }

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("payment_status, stripe_payment_intent")
      .eq("id", orderId)
      .single();
    if (orderErr || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.payment_status !== "paid" || !order.stripe_payment_intent) {
      return NextResponse.json({ error: "The order has no confirmed payment to transfer." }, { status: 422 });
    }

    const payoutResult = await markOrderPaidAndSendPayouts({
      orderId,
      paymentIntentId: order.stripe_payment_intent,
      vendorId: user.id,
      adminClient: admin,
    });

    if (!payoutResult.paid) {
      return NextResponse.json({ error: payoutResult.reason || "Unable to verify the payment." }, { status: 422 });
    }

    return NextResponse.json({ payoutResult });
  } catch (err) {
    console.error("retry payout error:", err);
    return NextResponse.json({ error: err.message || "Unable to retry the payout." }, { status: 500 });
  }
}