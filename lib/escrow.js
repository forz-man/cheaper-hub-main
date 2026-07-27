/**
 * Escrow.com API client — sandbox by default.
 *
 * Env vars required:
 *   ESCROW_API_KEY   — API key from app.escrow-sandbox.com
 *   ESCROW_EMAIL     — Email address of the Escrow.com account
 *   ESCROW_PLATFORM_EMAIL — Email that acts as "seller" on Escrow (the platform)
 *
 * To switch to production, set ESCROW_ENV=production.
 * Threshold for auto-routing to Escrow (default $500):
 *   ESCROW_THRESHOLD=500
 */

const SANDBOX_BASE = "https://api.escrow-sandbox.com/2017-09-01";
const PROD_BASE    = "https://api.escrow.com/2017-09-01";

function baseUrl() {
  return process.env.ESCROW_ENV === "production" ? PROD_BASE : SANDBOX_BASE;
}

function authHeader() {
  const email  = process.env.ESCROW_EMAIL;
  const apiKey = process.env.ESCROW_API_KEY;
  if (!email || !apiKey) {
    throw new Error(
      "Escrow.com credentials missing. Set ESCROW_EMAIL and ESCROW_API_KEY."
    );
  }
  const encoded = Buffer.from(`${email}:${apiKey}`).toString("base64");
  return `Basic ${encoded}`;
}

async function escrowFetch(path, options = {}) {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    const message =
      json?.message || json?.error || json?.raw || `Escrow API error ${res.status}`;
    throw new Error(message);
  }
  return json;
}

/**
 * Create a hosted Escrow.com transaction.
 *
 * @param {object} opts
 * @param {string} opts.orderId       - Your internal order UUID
 * @param {string} opts.buyerEmail    - Buyer's email address
 * @param {string} opts.description   - Human-readable order description
 * @param {number} opts.amount        - Total amount in USD (dollars, not cents)
 * @param {string} opts.returnUrl     - Where Escrow redirects the buyer when done
 * @returns {{ transactionId: string, redirectUrl: string }}
 */
export async function createEscrowTransaction({
  orderId,
  buyerEmail,
  description,
  amount,
  returnUrl,
}) {
  const platformEmail =
    process.env.ESCROW_PLATFORM_EMAIL ||
    process.env.ESCROW_EMAIL; // fall back to same account in sandbox

  const body = {
    currency: "usd",
    description: `Cheaper Marketplace — Order ${orderId}`,
    return_url: returnUrl,
    parties: [
      { role: "buyer",  customer: buyerEmail },
      { role: "seller", customer: platformEmail },
    ],
    items: [
      {
        title: description,
        description,
        type: "general_merchandise",
        inspection_period: 3,   // buyer has 3 days to inspect
        quantity: 1,
        schedule: [
          {
            amount,
            payer_customer: buyerEmail,
            beneficiary_customer: platformEmail,
          },
        ],
      },
    ],
  };

  const data = await escrowFetch("/transaction", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    transactionId: String(data.id),
    redirectUrl: data.redirect_url || data.url,
  };
}

/**
 * Fetch the current status of an Escrow transaction.
 * Statuses: created → in_escrow → agreed → complete | cancelled
 */
export async function getEscrowTransaction(transactionId) {
  return escrowFetch(`/transaction/${transactionId}`);
}

/**
 * Returns true when the buyer has funded the escrow (money is held).
 * This is the point we treat as "paid" for our orders table.
 */
export function isEscrowFunded(status) {
  return ["in_escrow", "agreed", "complete"].includes(status?.toLowerCase?.());
}

/**
 * Dollar threshold above which checkout auto-routes to Escrow.
 * Set ESCROW_THRESHOLD env var to override (default 500).
 */
export function escrowThreshold() {
  const raw = process.env.ESCROW_THRESHOLD;
  const parsed = raw ? parseFloat(raw) : NaN;
  return isNaN(parsed) ? 500 : parsed;
}

export function shouldUseEscrow(totalUsd) {
  return totalUsd >= escrowThreshold();
}
