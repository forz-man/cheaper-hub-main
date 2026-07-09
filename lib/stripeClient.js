// Server-only Stripe client, backed by the user's own Stripe account secret
// key (STRIPE_SECRET_KEY), not the Replit-managed Stripe connector.
// NOTE: this project stores its own product/order catalog in Supabase, so
// unlike a typical Stripe-as-source-of-truth setup we do NOT use
// stripe-replit-sync here — Checkout Sessions are created with ad-hoc
// `price_data` line items built from the Supabase product/cart data instead
// of synced Stripe Price objects.
import Stripe from "stripe";

let client = null;

/** Returns an authenticated Stripe client using STRIPE_SECRET_KEY. */
export function getStripeClient() {
  if (client) return client;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set. Add it in the Secrets pane to enable payments.");
  }

  client = new Stripe(secretKey);
  return client;
}

// Kept as an async function for backward compatibility with existing call
// sites that `await` it.
export async function getUncachableStripeClient() {
  return getStripeClient();
}
