import { NextResponse } from "next/server";
import { getUncachableStripeClient } from "@/lib/stripeClient";
import { createAdminClient } from "@/lib/supabaseAdmin";

// Confirms an order's payment status by asking Stripe directly for the truth
// (never trusts client-supplied status). Safe to call repeatedly — acts as
// the primary reconciliation path alongside the best-effort webhook.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");

  if (!sessionId || !orderId) {
    return NextResponse.json({ error: "Missing session_id or order_id." }, { status: 400 });
  }

  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.order_id !== orderId) {
      return NextResponse.json({ error: "Session does not match order." }, { status: 400 });
    }

    const paid = session.payment_status === "paid";
    const admin = createAdminClient();

    if (paid) {
      await admin
        .from("orders")
        .update({
          payment_status: "paid",
          stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
        })
        .eq("id", orderId);
    }

    const { data: order } = await admin
      .from("orders")
      .select("id, total, status, payment_status, buyer_name, order_items(product_name, qty, price)")
      .eq("id", orderId)
      .single();

    return NextResponse.json({ paid, order });
  } catch (err) {
    console.error("checkout/verify error:", err);
    return NextResponse.json({ error: err?.message || "Verification failed." }, { status: 500 });
  }
}
