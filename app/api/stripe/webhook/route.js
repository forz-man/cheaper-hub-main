import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripeClient";
import { createAdminClient } from "@/lib/supabaseAdmin";

// Verifies the Stripe signature (STRIPE_WEBHOOK_SECRET) so only genuine
// Stripe requests are processed. As a second layer of defense, we still
// re-fetch the session from Stripe by ID rather than trusting the event
// payload's embedded object — belt-and-suspenders against a compromised or
// misconfigured signing secret.
export async function POST(req) {
  try {
    const stripe = getStripeClient();
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    if (webhookSecret) {
      // Secret is configured: signature is mandatory. Missing/invalid
      // signature must hard-fail, never silently fall back to the raw body.
      if (!signature) {
        console.error("stripe webhook rejected: missing stripe-signature header");
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
      }
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err) {
        console.error("stripe webhook signature verification failed:", err.message);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else {
      // No webhook secret configured yet — fall back to parsing the body.
      // Still safe because we re-verify via a live Stripe API call below.
      event = JSON.parse(rawBody);
    }

    if (event?.type === "checkout.session.completed") {
      const sessionId = event.data?.object?.id;
      if (!sessionId) return NextResponse.json({ received: true });

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
