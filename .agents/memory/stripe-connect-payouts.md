---
name: Stripe Connect vendor payouts
description: How vendor payouts are wired in the marketplace (Connect Express + transfers from platform balance) and the RLS column-privilege pattern used to secure it.
---

Vendor payouts use Stripe Connect **Express** accounts + `stripe.transfers.create()` from the
platform's own Stripe balance (not destination charges) — money is captured to the platform at
checkout, then transferred to a vendor's connected account once they mark their order item
delivered on a paid order.

**Why Express + separate transfers, not destination charges:** the escrow requirement (hold
money until delivery) only works if the platform receives the full charge itself; destination
charges route money to the vendor at charge time, which defeats the hold. Transfers are made with
`source_transaction` = the charge's id (via the order's payment intent's `latest_charge`) so they
draw from that specific charge's available balance rather than the platform's general balance.

**Idempotency:** every transfer call uses `idempotencyKey: payout-item-<order_item_id>` — this is
what actually prevents double payouts on retry/race, not a DB-only guard, since a DB compare-and-set
can't close the gap around an in-flight Stripe API call.

**RLS column-privilege pattern:** Postgres RLS `USING`/`WITH CHECK` only restrict which *rows* and
resulting *row values* are allowed — they do NOT restrict which *columns* a client can include in
the same UPDATE statement. This project hit two real leaks from that: (1) a vendor could set
`orders.payment_status` alongside the allowed `status` field since the vendor update policy only
checked `status`'s value; (2) `profiles` had `stripe_account_id` etc. publicly readable and
owner-writable, letting a vendor discover and copy another vendor's Connect account id into their
own profile to get a Stripe Express login link into it.
**How to apply:** whenever a table has RLS `for update`/`for all` policies for a role that should
only touch a subset of columns, layer `revoke update on <table> from <role>; grant update (<cols>)
on <table> to <role>;` on top of RLS — the same for `select` on sensitive columns. Do this any time
a role is allowed to touch a row but a subset of its columns are supposed to be server/admin-only.
