import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
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
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot move from "${currentStatus}" to "${newStatus}"` },
        { status: 422 }
      );
    }

    const update = { fulfillment_status: newStatus };

    if (newStatus === "delivered") {
      const { data: order, error: orderErr } = await admin
        .from("orders")
        .select("payment_status")
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

      update.payout_status = "released";
      update.payout_amount = +(Number(item.subtotal) * (1 - PLATFORM_FEE_PCT / 100)).toFixed(2);
      update.payout_released_at = new Date().toISOString();
    }

    const { data: updated, error: updateErr } = await admin
      .from("order_items")
      .update(update)
      .eq("id", itemId)
      .select("id, fulfillment_status, payout_status, payout_amount, payout_released_at")
      .single();

    if (updateErr) {
      console.error("order item status update error:", updateErr);
      return NextResponse.json({ error: updateErr.message || "Failed to update item" }, { status: 500 });
    }

    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("PATCH /api/orders/[id]/items/[itemId] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
