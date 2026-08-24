import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  PLATFORM_FEE_RATE,
  calculateVendorPayoutCents,
  isPayoutAccountReady,
} from "../../lib/payouts/amounts.mjs";

test("vendor payout leaves Cheaper's 10% commission before Stripe transfer", () => {
  assert.equal(PLATFORM_FEE_RATE, 0.10);
  assert.equal(calculateVendorPayoutCents(10), 900);
  assert.equal(calculateVendorPayoutCents("19.99"), 1799);
  assert.equal(calculateVendorPayoutCents(0.01), 1);
});

test("only Stripe Connect accounts ready for payouts pass checkout validation", () => {
  assert.equal(isPayoutAccountReady({ stripe_account_id: "acct_ready", stripe_payouts_enabled: true }), true);
  assert.equal(isPayoutAccountReady({ stripe_account_id: "acct_disabled", stripe_payouts_enabled: false }), false);
  assert.equal(isPayoutAccountReady({ stripe_payouts_enabled: true }), false);
});

test("payout service transfers from the paid charge and retains delivery-independent idempotency", async () => {
  const source = await readFile("lib/payouts.js", "utf8");

  assert.match(source, /source_transaction:\s*chargeId/);
  assert.match(source, /idempotencyKey:\s*`payout-item-\$\{item\.id\}`/);
  assert.match(source, /payout_status:\s*"released"/);
  assert.doesNotMatch(source, /buyer_confirmed_at/);
  assert.doesNotMatch(source, /fulfillment_status/);
});

test("checkout and both payment-confirmation paths use the immediate payout service", async () => {
  const [checkout, verify, webhook, retryRoute] = await Promise.all([
    readFile("app/api/checkout/session/route.js", "utf8"),
    readFile("app/api/checkout/verify/route.js", "utf8"),
    readFile("app/api/stripe/webhook/route.js", "utf8"),
    readFile("app/api/orders/[id]/retry-payout/route.js", "utf8"),
  ]);

  assert.match(checkout, /stripe_payouts_enabled/);
  assert.match(checkout, /not ready to receive payments/);
  assert.match(verify, /markOrderPaidAndSendPayouts/);
  assert.match(webhook, /markOrderPaidAndSendPayouts/);
  assert.match(webhook, /retryRequired/);
  assert.match(retryRoute, /vendorId:\s*user\.id/);
});

test("refunds and disputes use an auditable, item-level transfer-reversal ledger", async () => {
  const [payouts, webhook, schema] = await Promise.all([
    readFile("lib/payouts.js", "utf8"),
    readFile("app/api/stripe/webhook/route.js", "utf8"),
    readFile("supabase/migrations/immediate_vendor_payouts.sql", "utf8"),
  ]);

  assert.match(payouts, /processStripeRefundOrDispute/);
  assert.match(payouts, /transfers\.createReversal/);
  assert.match(payouts, /idempotencyKey:\s*`payout-recovery-\$\{eventRecord\.stripe_adjustment_id\}-\$\{allocation\.id\}`/);
  assert.match(payouts, /payout_recovery_events/);
  assert.match(payouts, /allocatePayoutRecoveryCents/);
  assert.match(webhook, /charge\.refunded/);
  assert.match(webhook, /charge\.dispute\.created/);
  assert.match(schema, /stripe_payment_events/);
  assert.match(schema, /UNIQUE \(stripe_adjustment_id, order_item_id\)/);
  assert.match(schema, /payout_recovery_status/);
});