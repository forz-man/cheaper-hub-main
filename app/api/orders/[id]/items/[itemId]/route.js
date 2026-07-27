import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { attemptPayoutRelease } from "@/lib/payouts";

const VALID_TRANSITIONS = {
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

// PATCH /api/orders/[id]/items/[itemId]   { fulfillment_status: "shipped" | "delivered" | "cancelled" }
//
// When a vendor marks their item "delivered" AND the buyer has already
// confirmed receipt, payouts are released automatically via attemptPayoutRelease().
// If the buyer hasn't confirmed yet, the payout stays pending until they do.
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
    // Allow re-running "delivered" on an already-delivered item whose payout
    // is still pending so a failed transfer can be retried.
    const isPayoutRetry =
      newStatus === "delivered" &&
      currentStatus === "delivered" &&
      item.payout_status !== "released";

    if (!allowed.includes(newStatus) && !isPayoutRetry) {
      return NextResponse.json(
        { error: `Cannot move from "${currentStatus}" to "${newStatus}"` },
        { status: 422 }
      );
    }

    // If marking delivered, confirm the order is paid before proceeding
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
          { error: "Cannot mark delivered — this order has not been paid yet." },
          { status: 422 }
        );
      }
    }

    // Update fulfillment status
    const { data: updated, error: updateErr } = await admin
      .from("order_items")
      .update({ fulfillment_status: newStatus })
      .eq("id", itemId)
      .select("id, fulfillment_status, payout_status, payout_amount, payout_released_at, stripe_transfer_id")
      .single();

    if (updateErr) {
      console.error("order item status update error:", updateErr);
      return NextResponse.json({ error: updateErr.message || "Failed to update item" }, { status: 500 });
    }

    let payoutResult = null;
    let warning = null;

    // When the vendor marks delivered, attempt to release payout immediately.
    // attemptPayoutRelease will no-op if the buyer hasn't confirmed yet.
    if (newStatus === "delivered" || isPayoutRetry) {
      payoutResult = await attemptPayoutRelease(orderId);
      if (payoutResult.released) {
        // Re-fetch the updated item so the caller sees the new payout_status
        const { data: refreshed } = await admin
          .from("order_items")
          .select("id, fulfillment_status, payout_status, payout_amount, payout_released_at, stripe_transfer_id")
          .eq("id", itemId)
          .single();
        if (refreshed) Object.assign(updated, refreshed);
      } else if (payoutResult.reason === "Awaiting buyer confirmation") {
        warning = "Marked as delivered. Payout will be released automatically once the buyer confirms receipt.";
      }
      if (payoutResult.warnings?.length) {
        console.warn("[items/route] Payout warnings:", payoutResult.warnings);
      }
    }

    return NextResponse.json({ item: updated, payoutResult, ...(warning ? { warning } : {}) });
  } catch (err) {
    console.error("PATCH /api/orders/[id]/items/[itemId] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
