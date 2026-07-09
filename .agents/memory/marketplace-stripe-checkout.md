---
name: Marketplace Stripe checkout
description: Why this project's checkout deviates from the standard stripe skill (stripe-replit-sync) pattern.
---

This app (Cheaper) has a multi-vendor product catalog owned by Supabase (`products` table, vendor-managed), not by Stripe. Orders/order_items are the app's own source of truth for what was purchased and from which vendor.

Decision: use Stripe Checkout Sessions with ad-hoc `price_data` line items built server-side from Supabase product rows, instead of syncing a Stripe product/price catalog via `stripe-replit-sync`.

**Why:** the stripe skill's default guidance assumes Stripe is the catalog source of truth (SaaS/subscription shape). Here, syncing every vendor's product into Stripe as a first-class Product/Price would duplicate the catalog and fight the existing vendor-managed schema. stripe-replit-sync also expects a `DATABASE_URL` Postgres instance for its own schema, which this project doesn't have (it uses Supabase's Postgres via the REST API, not a direct connection string).

**How to apply:** if extending checkout (e.g. subscriptions, saved payment methods), keep pricing authority in Supabase — always re-fetch product price/stock/status server-side before creating a Checkout Session or trusting any client-submitted cart data. Payment status reconciliation (`/api/checkout/verify` and the webhook) re-fetches the Stripe session server-side rather than trusting request bodies, so it's tamper-safe even without webhook signature verification.
