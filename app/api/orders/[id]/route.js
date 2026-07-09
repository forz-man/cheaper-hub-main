import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

const VALID_TRANSITIONS = {
  processing: ["shipped", "cancelled"],
  shipped:    ["delivered", "cancelled"],
  delivered:  [],          // terminal — cannot be changed
  cancelled:  [],          // terminal — cannot be changed
};

// PATCH /api/orders/[id]   { status: "shipped" | "delivered" | "cancelled" }
export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { status: newStatus } = await request.json();

    // Validate the requested status value
    const ALL_STATUSES = ["processing", "shipped", "delivered", "cancelled"];
    if (!ALL_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${ALL_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Confirm this vendor actually has an item in this order
    const { data: ownerCheck, error: ownerErr } = await supabase
      .from("order_items")
      .select("order_id")
      .eq("order_id", id)
      .eq("vendor_id", user.id)
      .limit(1);

    if (ownerErr || !ownerCheck?.length) {
      return NextResponse.json(
        { error: "Order not found or does not belong to this vendor" },
        { status: 403 }
      );
    }

    // Read current status to validate the transition
    const { data: currentOrder } = await supabase
      .from("orders")
      .select("status")
      .eq("id", id)
      .single();

    if (currentOrder) {
      const allowed = VALID_TRANSITIONS[currentOrder.status] || [];
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          { error: `Cannot move from "${currentOrder.status}" to "${newStatus}"` },
          { status: 422 }
        );
      }
    }

    // Perform the update (requires orders_vendor_update RLS policy)
    const { data: updated, error: updateErr } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id)
      .select("id, status")
      .single();

    if (updateErr) {
      console.error("order status update error:", updateErr);
      return NextResponse.json(
        { error: updateErr.message || "Failed to update order status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ order: updated });
  } catch (err) {
    console.error("PATCH /api/orders/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
