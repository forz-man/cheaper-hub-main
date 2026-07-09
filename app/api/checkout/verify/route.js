import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
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
    // Only the buyer who placed the order may verify/view it.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: existingOrder, error: fetchErr } = await admin
      .from("orders")
      .select("id, buyer_id, stripe_session_id, total, status, payment_status, buyer_name, order_items(product_name, qty, price)")
      .eq("id", orderId)
      .single();

    if (fetchErr || !existingOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (existingOrder.buyer_id !== user.id) {
      return NextResponse.json({ error: "Not authorized to view this order." }, { status: 403 });
    }
    if (existingOrder.stripe_session_id !== sessionId) {
      return NextResponse.json({ error: "Session does not match order." }, { status: 400 });
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.order_id !== orderId) {
      return NextResponse.json({ error: "Session does not match order." }, { status: 400 });
    }

    const paid = session.payment_status === "paid";

    if (paid && existingOrder.payment_status !== "paid") {
      await admin
        .from("orders")
        .update({
          payment_status: "paid",
          stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
        })
        .eq("id", orderId);
    }

    return NextResponse.json({
      paid,
      order: { ...existingOrder, payment_status: paid ? "paid" : existingOrder.payment_status },
    });
  } catch (err) {
    console.error("checkout/verify error:", err);
    return NextResponse.json({ error: err?.message || "Verification failed." }, { status: 500 });
  }
}
