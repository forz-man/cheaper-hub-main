/**
 * GET /api/escrow/status?order_id=<uuid>
 *
 * Polling endpoint used by the order-success page to check whether
 * an Escrow transaction has been funded. Falls back gracefully if
 * Escrow credentials are not configured (sandbox not set up yet).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getEscrowTransaction, isEscrowFunded } from "@/lib/escrow";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, buyer_id, payment_status, payment_method, escrow_transaction_id, total, buyer_name, order_items(product_name, qty, price)")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If we already know it's paid, return immediately
    if (order.payment_status === "paid") {
      return NextResponse.json({ paid: true, order });
    }

    // If no escrow transaction, nothing to poll
    if (!order.escrow_transaction_id) {
      return NextResponse.json({ paid: false, order });
    }

    // Ask Escrow.com directly for the current status
    let escrowStatus = null;
    try {
      const tx = await getEscrowTransaction(order.escrow_transaction_id);
      escrowStatus = tx?.status;
    } catch (err) {
      console.warn("[escrow/status] Could not reach Escrow API:", err.message);
      // Return what we have in DB — don't fail the whole request
      return NextResponse.json({ paid: false, order, escrowStatus: null });
    }

    const funded = isEscrowFunded(escrowStatus);

    if (funded && order.payment_status !== "paid") {
      await admin
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", orderId);
      order.payment_status = "paid";
    }

    return NextResponse.json({ paid: funded, order, escrowStatus });
  } catch (err) {
    console.error("[escrow/status] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
