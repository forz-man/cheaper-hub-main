import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripeClient";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { markOrderPaidAndSendPayouts, processStripeRefundOrDispute } from "@/lib/payouts";

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
      console.error("stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 });
    }

    if (event?.type === "account.updated") {
      const account = event.data?.object;
      if (account?.id) {
        const admin = createAdminClient();
        await admin
          .from("profiles")
          .update({
            stripe_charges_enabled: !!account.charges_enabled,
            stripe_payouts_enabled: !!account.payouts_enabled,
            stripe_details_submitted: !!account.details_submitted,
          })
          .eq("stripe_account_id", account.id);
      }
      return NextResponse.json({ received: true });
    }

    if (event?.type === "checkout.session.completed") {
      const sessionId = event.data?.object?.id;
      if (!sessionId) return NextResponse.json({ received: true });

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const orderId = session.metadata?.order_id;

      if (orderId && session.payment_status === "paid") {
        const admin = createAdminClient();
        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;
        const payoutResult = await markOrderPaidAndSendPayouts({
          orderId,
          paymentIntentId,
          adminClient: admin,
          stripeClient: stripe,
        });
        if (payoutResult.retryRequired) {
          throw new Error(`Vendor transfers incomplete for order ${orderId}; requesting Stripe retry.`);
        }
      }
    }

    if (event?.type === "charge.refunded") {
      const chargeId = event.data?.object?.id;
      const refunds = chargeId ? await stripe.refunds.list({ charge: chargeId, limit: 100 }) : { data: [] };
      for (const refund of refunds.data || []) {
        if (refund.status !== "succeeded") continue;
        const recoveryResult = await processStripeRefundOrDispute({
          event: {
            ...event,
            id: `${event.id}:${refund.id}`,
            type: "refund.updated",
            data: { object: refund },
          },
          adminClient: createAdminClient(),
          stripeClient: stripe,
        });
        if (recoveryResult.retryRequired) {
          throw new Error(`Seller payout recovery incomplete for order ${recoveryResult.orderId || "unknown"}; requesting Stripe retry.`);
        }
      }
    } else if (
      event?.type === "refund.created" ||
      event?.type === "refund.updated" ||
      event?.type === "charge.dispute.created" ||
      event?.type === "charge.dispute.closed"
    ) {
      const recoveryResult = await processStripeRefundOrDispute({
        event,
        adminClient: createAdminClient(),
        stripeClient: stripe,
      });
      if (recoveryResult.retryRequired) {
        throw new Error(`Seller payout recovery incomplete for order ${recoveryResult.orderId || "unknown"}; requesting Stripe retry.`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("stripe webhook error:", err);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 400 });
  }
}
