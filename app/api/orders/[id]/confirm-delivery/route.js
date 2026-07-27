/**
 * POST /api/orders/[id]/confirm-delivery
 *
 * Buyer confirms they received the order. Sets buyer_confirmed_at, then
 * immediately attempts to release payouts for any vendor items that are
 * already marked "delivered". The payout stays pending for items the vendor
 * hasn't marked delivered yet — it will release when they do.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { attemptPayoutRelease } from "@/lib/payouts";

export async function POST(req, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: orderId } = await params;
    const admin = createAdminClient();

    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, buyer_id, status, payment_status, buyer_confirmed_at")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (order.buyer_confirmed_at) {
      return NextResponse.json({ message: "Already confirmed" });
    }
    if (order.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Cannot confirm delivery — payment has not been received yet." },
        { status: 422 }
      );
    }
    if (!["shipped", "delivered"].includes(order.status)) {
      return NextResponse.json(
        { error: "Order must be shipped or delivered before you can confirm receipt." },
        { status: 422 }
      );
    }

    // Stamp buyer confirmation
    const { error: updateErr } = await admin
      .from("orders")
      .update({ buyer_confirmed_at: new Date().toISOString() })
      .eq("id", orderId);

    if (updateErr) throw updateErr;

    // Attempt payout release — will release any vendor items already marked
    // "delivered", and silently no-op for items not yet delivered.
    let payoutResult = null;
    try {
      payoutResult = await attemptPayoutRelease(orderId);
      if (payoutResult.warnings?.length) {
        console.warn("[confirm-delivery] Payout warnings:", payoutResult.warnings);
      }
    } catch (payoutErr) {
      // Never fail the confirmation itself due to a payout error
      console.error("[confirm-delivery] Payout release error:", payoutErr.message);
    }

    return NextResponse.json({ success: true, payoutResult });
  } catch (err) {
    console.error("confirm-delivery error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
