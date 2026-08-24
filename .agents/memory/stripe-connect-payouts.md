---
name: Stripe Connect vendor payouts
description: How vendor payouts are wired in the marketplace (Connect Express + transfers from platform balance) and the RLS column-privilege pattern used to secure it.
---

Vendor payouts use Stripe Connect **Express** accounts + `stripe.transfers.create()` from the
platform's own Stripe balance (not destination charges). A verified successful checkout payment
immediately transfers each vendor item's net share to that vendor's connected account.

**Why Express + separate transfers, not destination charges:** one Checkout Session can contain
items from multiple vendors, while a destination charge has only one destination. Separate
transfers preserve one marketplace checkout and split the paid charge across vendors. Transfers
use `source_transaction` = the charge's id (via the order's payment intent's `latest_charge`) so
they draw from that specific charge's available balance rather than the platform's general balance.

**Idempotency and recovery:** every transfer call uses `idempotencyKey:
payout-item-<order_item_id>` — this is what prevents duplicate payments when the webhook and
success-page verification race. Transfer failures remain pending with an audit error; Stripe
webhook redelivery and a vendor-only retry path revalidate the payment before retrying.

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
