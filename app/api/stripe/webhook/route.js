import { NextResponse } from "next/server";
import { getUncachableStripeClient } from "@/lib/stripeClient";
import { createAdminClient } from "@/lib/supabaseAdmin";

// Best-effort webhook: we don't verify a signing secret here (no managed
// webhook is registered for this ad-hoc Checkout Sessions setup). Instead,
// on any checkout.session.completed event we re-fetch the session from
// Stripe by ID and only trust that server-to-server response — a forged
// request can at most trigger us to check real Stripe data for a session id
// the attacker supplies, it cannot forge a "paid" result.
export async function POST(req) {
  try {
    const event = await req.json();

    if (event?.type === "checkout.session.completed") {
      const sessionId = event.data?.object?.id;
      if (!sessionId) return NextResponse.json({ received: true });

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const orderId = session.metadata?.order_id;

      if (orderId && session.payment_status === "paid") {
        const admin = createAdminClient();
        await admin
          .from("orders")
          .update({
            payment_status: "paid",
            stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
          })
          .eq("id", orderId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("stripe webhook error:", err);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 400 });
  }
}
