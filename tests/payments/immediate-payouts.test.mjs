import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  PLATFORM_FEE_RATE,
  calculateVendorPayoutCents,
  isPayoutAccountReady,
} from "../../lib/payouts/amounts.mjs";
import { processStripeRefundOrDispute } from "../../lib/payouts.js";

const WAIT = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

class Mutex {
  constructor() {
    this.tail = Promise.resolve();
  }

  async run(operation) {
    const previous = this.tail;
    let release;
    this.tail = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}

class QueryBuilder {
  constructor(database, table, operation = "select") {
    this.database = database;
    this.table = table;
    this.operation = operation;
    this.filters = [];
    this.values = null;
    this.selectionRequested = false;
  }

  select() {
    this.selectionRequested = true;
    return this;
  }

  update(values) {
    this.operation = "update";
    this.values = values;
    return this;
  }

  insert(values) {
    this.operation = "insert";
    this.values = values;
    return this;
  }

  eq(column, value) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  in(column, values) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  maybeSingle() {
    this.singleResult = "maybe";
    return this;
  }

  single() {
    this.singleResult = "single";
    return this;
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute() {
    const rows = this.database.tables[this.table];
    if (!rows) return { data: null, error: new Error(`Unknown table ${this.table}`) };

    if (this.operation === "insert") {
      const inserts = Array.isArray(this.values) ? this.values : [this.values];
      const inserted = [];
      for (const values of inserts) {
        if (this.table === "stripe_payment_events" &&
            rows.some((row) => row.stripe_event_id === values.stripe_event_id)) {
          return { data: null, error: new Error("duplicate key value violates unique constraint") };
        }
        if (this.table === "stripe_payment_adjustments" &&
            rows.some((row) => row.stripe_adjustment_id === values.stripe_adjustment_id)) {
          return { data: null, error: new Error("duplicate key value violates unique constraint") };
        }
        if (this.table === "payout_recovery_events" &&
            rows.some((row) =>
              row.stripe_adjustment_id === values.stripe_adjustment_id &&
              row.order_item_id === values.order_item_id
            )) {
          return { data: null, error: new Error("duplicate key value violates unique constraint") };
        }
        const row = { id: this.database.nextId(this.table), ...values };
        rows.push(row);
        inserted.push(row);
      }
      return { data: this.singleResult === "single" || this.singleResult === "maybe" ? inserted[0] : inserted, error: null };
    }

    const matching = rows.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.operation === "update") {
      for (const row of matching) Object.assign(row, this.values);
      return { data: this.selectionRequested ? matching : null, error: null };
    }

    if (this.singleResult === "single") {
      return matching.length === 1
        ? { data: matching[0], error: null }
        : { data: null, error: new Error(`Expected one ${this.table} row, found ${matching.length}`) };
    }
    if (this.singleResult === "maybe") {
      return { data: matching[0] || null, error: null };
    }
    return { data: matching, error: null };
  }
}

class RecoveryDatabase {
  constructor({ orderId = "order_1", itemId = "item_1", vendorId = "vendor_1", total = 12 } = {}) {
    this.orderId = orderId;
    this.itemId = itemId;
    this.vendorId = vendorId;
    this.tables = {
      orders: [{
        id: orderId,
        payment_status: "paid",
        stripe_payment_intent: "pi_1",
        total,
        refunded_amount: 0,
        disputed_amount: 0,
        payment_issue_status: "none",
      }],
      order_items: [{
        id: itemId,
        order_id: orderId,
        vendor_id: vendorId,
        payout_amount: 9,
        payout_status: "released",
        stripe_transfer_id: "tr_1",
        payout_recovered_amount: 0,
        payout_recovery_status: "none",
        payout_recovery_error: null,
      }],
      profiles: [{ id: vendorId, stripe_account_id: "acct_vendor_1" }],
      stripe_payment_events: [],
      stripe_payment_adjustments: [],
      payout_recovery_events: [],
      activity_logs: [],
    };
    this.orderLock = new Mutex();
    this.itemLock = new Mutex();
    this.insertCounts = new Map();
  }

  nextId(table) {
    const count = (this.insertCounts.get(table) || 0) + 1;
    this.insertCounts.set(table, count);
    return `${table}_${count}`;
  }

  from(table) {
    return new QueryBuilder(this, table);
  }

  rpc(name, params) {
    const run = async () => {
      if (name === "claim_stripe_payment_adjustment") {
        return this.orderLock.run(async () => {
          const existing = this.tables.stripe_payment_adjustments.find(
            (adjustment) => adjustment.stripe_adjustment_id === params.p_stripe_adjustment_id
          );
          if (existing) return { amount_cents: existing.amount_cents, is_new: false };

          const amount = Math.max(0, Math.floor(params.p_amount_cents || 0));
          this.tables.stripe_payment_adjustments.push({
            id: this.nextId("stripe_payment_adjustments"),
            order_id: params.p_order_id,
            stripe_adjustment_id: params.p_stripe_adjustment_id,
            event_type: params.p_event_type,
            amount_cents: amount,
          });
          const order = this.tables.orders.find((candidate) => candidate.id === params.p_order_id);
          if (params.p_event_type === "refund") {
            order.refunded_amount += amount / 100;
            order.payment_status = order.refunded_amount >= order.total ? "refunded" : order.payment_status;
            order.payment_issue_status = order.refunded_amount >= order.total ? "refunded" : "partially_refunded";
          } else {
            order.disputed_amount += amount / 100;
          }
          return { amount_cents: amount, is_new: true };
        });
      }

      if (name === "claim_payout_recovery") {
        return this.itemLock.run(async () => {
          // The production RPC performs this lookup after SELECT ... FOR
          // UPDATE has acquired the item lock, so a waiting delivery sees the
          // recovery inserted by the delivery that held the lock first.
          const existing = this.tables.payout_recovery_events.find(
            (recovery) =>
              recovery.stripe_adjustment_id === params.p_stripe_adjustment_id &&
              recovery.order_item_id === params.p_order_item_id
          );
          if (existing) {
            if (["pending", "needs_support"].includes(existing.status)) {
              existing.status = "processing";
              existing.attempt_token = params.p_attempt_token;
              existing.attempt_started_at = new Date().toISOString();
              existing.error = null;
            }
            return existing;
          }

          const item = this.tables.order_items.find((candidate) => candidate.id === params.p_order_item_id);
          const claimed = this.tables.payout_recovery_events
            .filter((recovery) =>
              recovery.order_item_id === params.p_order_item_id &&
              ["pending", "processing", "recovered", "needs_support"].includes(recovery.status)
            )
            .reduce((sum, recovery) => sum + recovery.amount_cents, 0);
          const payoutCents = Math.round(item.payout_amount * 100);
          const amount = Math.max(0, Math.min(params.p_requested_amount_cents, payoutCents - claimed));
          const recovery = {
            id: this.nextId("payout_recovery_events"),
            order_id: params.p_order_id,
            order_item_id: params.p_order_item_id,
            vendor_id: params.p_vendor_id,
            stripe_event_id: params.p_stripe_event_id,
            stripe_adjustment_id: params.p_stripe_adjustment_id,
            event_type: params.p_event_type,
            amount_cents: amount,
            stripe_transfer_id: params.p_stripe_transfer_id,
            stripe_transfer_reversal_id: null,
            stripe_reinstatement_transfer_id: null,
            status: amount > 0 ? "processing" : "not_applicable",
            attempt_token: amount > 0 ? params.p_attempt_token : null,
            attempt_started_at: amount > 0 ? new Date().toISOString() : null,
            error: null,
          };
          this.tables.payout_recovery_events.push(recovery);
          if (amount > 0) item.payout_recovery_status = "pending";
          return recovery;
        });
      }

      if (name === "finalize_payout_recovery") {
        return this.itemLock.run(async () => {
          const recovery = this.tables.payout_recovery_events.find((candidate) => candidate.id === params.p_recovery_id);
          if (recovery.status !== "processing" || recovery.attempt_token !== params.p_attempt_token) {
            return recovery;
          }
          recovery.status = params.p_status;
          recovery.stripe_transfer_reversal_id =
            params.p_status === "recovered" ? params.p_stripe_transfer_reversal_id : recovery.stripe_transfer_reversal_id;
          recovery.error = params.p_status === "recovered" ? null : params.p_error;
          recovery.attempt_token = null;
          recovery.attempt_started_at = null;
          const item = this.tables.order_items.find((candidate) => candidate.id === recovery.order_item_id);
          const recoveredCents = this.tables.payout_recovery_events
            .filter((candidate) => candidate.order_item_id === recovery.order_item_id && candidate.status === "recovered")
            .reduce((sum, candidate) => sum + candidate.amount_cents, 0);
          const hasSupport = this.tables.payout_recovery_events.some(
            (candidate) => candidate.order_item_id === recovery.order_item_id && candidate.status === "needs_support"
          );
          item.payout_recovered_amount = recoveredCents / 100;
          item.payout_recovery_status = hasSupport ? "needs_support" : recoveredCents > 0 ? "recovered" : "none";
          item.payout_recovery_error = hasSupport ? params.p_error : null;
          return recovery;
        });
      }

      if (name === "reinstate_payout_recovery") {
        return this.itemLock.run(async () => {
          const recovery = this.tables.payout_recovery_events.find((candidate) => candidate.id === params.p_recovery_id);
          recovery.status = "reinstated";
          recovery.stripe_reinstatement_transfer_id = params.p_stripe_reinstatement_transfer_id;
          recovery.error = null;
          const item = this.tables.order_items.find((candidate) => candidate.id === recovery.order_item_id);
          item.payout_recovery_status = "reinstated";
          item.payout_recovery_error = null;
          return recovery;
        });
      }

      if (name === "mark_payout_reinstatement_failure") {
        return this.itemLock.run(async () => {
          const recovery = this.tables.payout_recovery_events.find((candidate) => candidate.id === params.p_recovery_id);
          recovery.error = params.p_error;
          const item = this.tables.order_items.find((candidate) => candidate.id === recovery.order_item_id);
          item.payout_recovery_status = "needs_support";
          item.payout_recovery_error = params.p_error;
          return recovery;
        });
      }

      throw new Error(`Unknown RPC ${name}`);
    };
    return {
      single: () => ({ then: (resolve, reject) => run().then((data) => resolve({ data, error: null }), reject) }),
    };
  }
}

class StripeRecoveryStub {
  constructor({ delay = 2, failNextReversal = false, failNextReinstatement = false } = {}) {
    this.delay = delay;
    this.failNextReversal = failNextReversal;
    this.failNextReinstatement = failNextReinstatement;
    this.reversalCalls = [];
    this.successfulReversals = [];
    this.reinstatementCalls = [];
    this.successfulReinstatements = [];
    this.idempotentReversals = new Map();
  }

  async reverseTransfer(transferId, params, options) {
    this.reversalCalls.push({ transferId, params, options });
    await WAIT(this.delay);
    if (this.failNextReversal) {
      this.failNextReversal = false;
      throw new Error("Stripe Connect temporarily unavailable.");
    }
    const existing = this.idempotentReversals.get(options.idempotencyKey);
    if (existing) return existing;
    const reversal = { id: `trr_${this.reversalCalls.length}` };
    this.idempotentReversals.set(options.idempotencyKey, reversal);
    this.successfulReversals.push(reversal);
    return reversal;
  }

  async reinstateTransfer(params, options) {
    this.reinstatementCalls.push({ params, options });
    await WAIT(this.delay);
    if (this.failNextReinstatement) {
      this.failNextReinstatement = false;
      throw new Error("Stripe Connect temporarily unavailable.");
    }
    const transfer = { id: `tr_reinstate_${this.successfulReinstatements.length + 1}` };
    this.successfulReinstatements.push(transfer);
    return transfer;
  }

  asStripeClient() {
    return {
      transfers: {
        createReversal: this.reverseTransfer.bind(this),
        create: this.reinstateTransfer.bind(this),
      },
    };
  }
}

function refundEvent({ eventId, refundId, amount = 300, type = "refund.updated" } = {}) {
  return {
    id: eventId,
    type,
    data: {
      object: {
        id: refundId,
        amount,
        status: "succeeded",
        currency: "usd",
        metadata: { order_id: "order_1" },
        payment_intent: "pi_1",
        charge: "ch_1",
      },
    },
  };
}

function disputeEvent({ eventId, disputeId = "dp_1", status, amount = 900 }) {
  return {
    id: eventId,
    type: status ? "charge.dispute.closed" : "charge.dispute.created",
    data: {
      object: {
        id: disputeId,
        amount,
        status,
        currency: "usd",
        metadata: { order_id: "order_1" },
        payment_intent: "pi_1",
        charge: "ch_1",
      },
    },
  };
}

async function processEvent(database, stripe, event) {
  return processStripeRefundOrDispute({
    event,
    adminClient: database,
    stripeClient: stripe.asStripeClient(),
  });
}

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
  const [payouts, webhook, migration, schema] = await Promise.all([
    readFile("lib/payouts.js", "utf8"),
    readFile("app/api/stripe/webhook/route.js", "utf8"),
    readFile("supabase/migrations/immediate_vendor_payouts.sql", "utf8"),
    readFile("supabase/schema.sql", "utf8"),
  ]);

  assert.match(payouts, /processStripeRefundOrDispute/);
  assert.match(payouts, /transfers\.createReversal/);
  assert.match(payouts, /idempotencyKey:\s*`payout-recovery-\$\{eventRecord\.stripe_adjustment_id\}-\$\{allocation\.id\}`/);
  assert.match(payouts, /payout_recovery_events/);
  assert.match(payouts, /allocatePayoutRecoveryCents/);
  assert.match(payouts, /p_attempt_token/);
  assert.match(payouts, /ownsAttempt/);
  assert.match(webhook, /charge\.refunded/);
  assert.match(webhook, /charge\.dispute\.created/);
  assert.match(migration, /stripe_payment_events/);
  assert.match(migration, /UNIQUE \(stripe_adjustment_id, order_item_id\)/);
  assert.match(migration, /payout_recovery_status/);
  assert.match(migration, /attempt_token UUID/);
  assert.match(migration, /attempt_started_at TIMESTAMPTZ/);
  assert.match(migration, /status = 'processing'/);
  const migrationClaim = migration.slice(
    migration.indexOf("CREATE OR REPLACE FUNCTION public.claim_payout_recovery"),
    migration.indexOf("CREATE OR REPLACE FUNCTION public.claim_stripe_payment_adjustment")
  );
  const schemaClaim = schema.slice(
    schema.indexOf("create or replace function public.claim_payout_recovery"),
    schema.indexOf("create or replace function public.claim_stripe_payment_adjustment")
  );
  assert.ok(
    migrationClaim.indexOf("FOR UPDATE;") < migrationClaim.indexOf("SELECT * INTO existing_recovery"),
    "the deployable claim RPC must recheck the adjustment after locking the order item"
  );
  assert.ok(
    schemaClaim.indexOf("for update;") < schemaClaim.indexOf("select * into existing_recovery"),
    "the schema claim RPC must recheck the adjustment after locking the order item"
  );
});

test("concurrent partial refunds serialize order and item recovery without losing money", async () => {
  const database = new RecoveryDatabase();
  const stripe = new StripeRecoveryStub({ delay: 10 });

  const [first, second] = await Promise.all([
    processEvent(database, stripe, refundEvent({ eventId: "evt_refund_1", refundId: "re_1" })),
    processEvent(database, stripe, refundEvent({ eventId: "evt_refund_2", refundId: "re_2" })),
  ]);

  assert.equal(first.retryRequired, false);
  assert.equal(second.retryRequired, false);
  assert.equal(database.tables.orders[0].refunded_amount, 6);
  assert.equal(database.tables.orders[0].payment_issue_status, "partially_refunded");
  assert.equal(database.tables.order_items[0].payout_recovered_amount, 6);
  assert.equal(database.tables.order_items[0].payout_recovery_status, "recovered");
  assert.equal(database.tables.stripe_payment_adjustments.length, 2);
  assert.equal(database.tables.payout_recovery_events.length, 2);
  assert.deepEqual(
    database.tables.payout_recovery_events.map((recovery) => recovery.amount_cents).sort((a, b) => a - b),
    [300, 300]
  );
  assert.equal(stripe.reversalCalls.length, 2);
  assert.deepEqual(
    stripe.reversalCalls.map((call) => call.options.idempotencyKey).sort(),
    ["payout-recovery-re_1-item_1", "payout-recovery-re_2-item_1"]
  );
});

test("duplicate refund lifecycle deliveries create one adjustment and one transfer reversal", async () => {
  const database = new RecoveryDatabase();
  const stripe = new StripeRecoveryStub();
  const created = refundEvent({ eventId: "evt_refund_created", refundId: "re_duplicate" });
  const updated = refundEvent({ eventId: "evt_refund_updated", refundId: "re_duplicate" });

  const deliveries = await Promise.all([
    processEvent(database, stripe, created),
    processEvent(database, stripe, created),
    processEvent(database, stripe, updated),
  ]);

  assert.equal(database.tables.stripe_payment_events.length, 2);
  assert.equal(database.tables.stripe_payment_adjustments.length, 1);
  assert.equal(database.tables.payout_recovery_events.length, 1);
  assert.equal(database.tables.orders[0].refunded_amount, 3);
  assert.equal(database.tables.order_items[0].payout_recovered_amount, 3);
  assert.equal(database.tables.payout_recovery_events[0].status, "recovered");
  assert.equal(stripe.successfulReversals.length, 1);
  assert.equal(stripe.reversalCalls.length, 1);
  assert.ok(deliveries.some((delivery) => delivery.retryRequired));
  assert.equal(stripe.reversalCalls[0].options.idempotencyKey, "payout-recovery-re_duplicate-item_1");
  assert.equal(stripe.reversalCalls[0].options.timeout, 30_000);
});

test("failed or timed-out seller recovery stays retryable with the same Stripe idempotency key", async () => {
  const database = new RecoveryDatabase();
  const stripe = new StripeRecoveryStub({ failNextReversal: true });
  const event = refundEvent({ eventId: "evt_refund_retry", refundId: "re_retry" });

  const failed = await processEvent(database, stripe, event);
  assert.equal(failed.retryRequired, true);
  assert.match(failed.warnings[0], /temporarily unavailable/);
  assert.equal(database.tables.payout_recovery_events[0].status, "needs_support");
  assert.equal(database.tables.stripe_payment_events[0].status, "needs_support");

  const retried = await processEvent(database, stripe, event);
  assert.equal(retried.retryRequired, false);
  assert.equal(database.tables.payout_recovery_events[0].status, "recovered");
  assert.equal(database.tables.order_items[0].payout_recovery_status, "recovered");
  assert.equal(stripe.reversalCalls.length, 2);
  assert.equal(stripe.successfulReversals.length, 1);
  assert.equal(
    stripe.reversalCalls[0].options.idempotencyKey,
    stripe.reversalCalls[1].options.idempotencyKey
  );
  assert.equal(stripe.reversalCalls[0].options.timeout, stripe.reversalCalls[1].options.timeout);
});

test("a won dispute reinstates a seller transfer after reversing it", async () => {
  const database = new RecoveryDatabase({ total: 9 });
  const stripe = new StripeRecoveryStub();

  const disputed = await processEvent(database, stripe, disputeEvent({ eventId: "evt_dispute_created" }));
  const won = await processEvent(database, stripe, disputeEvent({
    eventId: "evt_dispute_won",
    status: "won",
  }));

  assert.equal(disputed.retryRequired, false);
  assert.equal(won.retryRequired, false);
  assert.equal(database.tables.orders[0].disputed_amount, 9);
  assert.equal(database.tables.orders[0].payment_issue_status, "dispute_won");
  assert.equal(database.tables.order_items[0].payout_recovered_amount, 9);
  assert.equal(database.tables.order_items[0].payout_recovery_status, "reinstated");
  assert.equal(database.tables.payout_recovery_events[0].status, "reinstated");
  assert.equal(stripe.reversalCalls.length, 1);
  assert.equal(stripe.successfulReinstatements.length, 1);
  assert.equal(
    stripe.reinstatementCalls[0].options.idempotencyKey,
    "payout-dispute-reinstatement-dp_1-item_1"
  );
});

test("failed seller reinstatement stays retryable and succeeds on webhook retry", async () => {
  const database = new RecoveryDatabase({ total: 9 });
  const stripe = new StripeRecoveryStub({ failNextReinstatement: true });
  const created = await processEvent(database, stripe, disputeEvent({ eventId: "evt_dispute_created" }));
  assert.equal(created.retryRequired, false);

  const wonEvent = disputeEvent({ eventId: "evt_dispute_won_retry", status: "won" });
  const failed = await processEvent(database, stripe, wonEvent);
  assert.equal(failed.retryRequired, true);
  assert.match(failed.warnings[0], /temporarily unavailable/);
  assert.equal(database.tables.stripe_payment_events.find((event) => event.stripe_event_id === wonEvent.id).status, "needs_support");
  assert.equal(database.tables.payout_recovery_events[0].status, "recovered");
  assert.equal(database.tables.order_items[0].payout_recovery_status, "needs_support");

  const retried = await processEvent(database, stripe, wonEvent);
  assert.equal(retried.retryRequired, false);
  assert.equal(database.tables.payout_recovery_events[0].status, "reinstated");
  assert.equal(database.tables.order_items[0].payout_recovery_status, "reinstated");
  assert.equal(database.tables.order_items[0].payout_recovered_amount, 9);
  assert.equal(stripe.reinstatementCalls.length, 2);
  assert.equal(stripe.successfulReinstatements.length, 1);
  assert.equal(
    stripe.reinstatementCalls[0].options.idempotencyKey,
    stripe.reinstatementCalls[1].options.idempotencyKey
  );
});
