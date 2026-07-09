// Server-only Stripe client. Fetches credentials from the Replit connection
// API each call (never cached) so rotated keys are always picked up.
// NOTE: this project stores its own product/order catalog in Supabase, so
// unlike a typical Stripe-as-source-of-truth setup we do NOT use
// stripe-replit-sync here — Checkout Sessions are created with ad-hoc
// `price_data` line items built from the Supabase product/cart data instead
// of synced Stripe Price objects.
import Stripe from "stripe";

async function getStripeCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Missing Replit environment variables. Ensure the Stripe integration is connected via the Integrations tab."
    );
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!resp.ok) {
    throw new Error(`Failed to fetch Stripe credentials: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  const settings = data.items?.[0]?.settings;

  if (!settings?.secret_key) {
    throw new Error(
      "Stripe integration not connected or missing secret key. Connect Stripe via the Integrations tab first."
    );
  }

  return { secretKey: settings.secret_key };
}

/** Returns a fresh authenticated Stripe client. */
export async function getUncachableStripeClient() {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}
