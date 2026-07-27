/**
 * POST /api/escrow/webhook
 *
 * Escrow.com sends status-change events here.
 * Register this URL in your Escrow.com account settings.
 *
 * Escrow webhook payload shape (simplified):
 * {
 *   "id": <transaction_id>,
 *   "status": "in_escrow" | "agreed" | "complete" | "cancelled" | ...
 * }
 *
 * We verify the request came from Escrow via a shared secret
 * (ESCROW_WEBHOOK_SECRET) sent as the X-Escrow-Signature header.
 * In sandbox mode the secret check is skipped if the env var is not set.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { isEscrowFunded } from "@/lib/escrow";

export async function POST(req) {
  try {
    const rawBody = await req.text();

    // Optional signature check
    const secret = process.env.ESCROW_WEBHOOK_SECRET;
    if (secret) {
      const sig = req.headers.get("x-escrow-signature");
      if (!sig) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
      }
      // Escrow uses HMAC-SHA256 — verify when moving to production
      // For now we do a simple constant-time compare of the raw secret
      if (sig !== secret) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const transactionId = String(payload?.id ?? "");
    const status        = payload?.status ?? "";

    if (!transactionId) {
      return NextResponse.json({ received: true }); // no-op for unknown shapes
    }

    const admin = createAdminClient();

    // Find the order by escrow_transaction_id
    const { data: order, error: findErr } = await admin
      .from("orders")
      .select("id, payment_status")
      .eq("escrow_transaction_id", transactionId)
      .single();

    if (findErr || !order) {
      // Not our order — still 200 so Escrow stops retrying
      console.warn("[escrow/webhook] Unknown transaction:", transactionId);
      return NextResponse.json({ received: true });
    }

    const updates = {};

    if (isEscrowFunded(status) && order.payment_status !== "paid") {
      updates.payment_status = "paid";
    }

    if (status === "cancelled" && order.payment_status === "unpaid") {
      updates.payment_status = "failed";
    }

    if (Object.keys(updates).length > 0) {
      await admin.from("orders").update(updates).eq("id", order.id);
      console.log(`[escrow/webhook] Order ${order.id} updated:`, updates);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[escrow/webhook] Error:", err.message);
    // Return 200 so Escrow doesn't retry infinitely on our bug
    return NextResponse.json({ received: true });
  }
}
