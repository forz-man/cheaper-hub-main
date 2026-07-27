/**
 * POST /api/orders/[id]/confirm-delivery
 * Buyer confirms they received the order.
 * Sets buyer_confirmed_at — admin can then release vendor payouts.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

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
    if (!["shipped", "delivered"].includes(order.status)) {
      return NextResponse.json(
        { error: "Order must be shipped or delivered before you can confirm receipt." },
        { status: 422 }
      );
    }

    const { error: updateErr } = await admin
      .from("orders")
      .update({ buyer_confirmed_at: new Date().toISOString() })
      .eq("id", orderId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("confirm-delivery error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
