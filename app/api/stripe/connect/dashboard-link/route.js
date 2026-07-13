import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getStripeClient } from "@/lib/stripeClient";

// POST /api/stripe/connect/dashboard-link
//
// Returns a one-time link into the vendor's Stripe Express dashboard, where
// they can see payouts, update their bank account, and view transfer history.
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("role, stripe_account_id")
      .eq("id", user.id)
      .single();
    if (profileErr) throw profileErr;
    if (profile?.role !== "vendor" && profile?.role !== "admin") {
      return NextResponse.json({ error: "Only vendors have payout accounts." }, { status: 403 });
    }

    if (!profile?.stripe_account_id) {
      return NextResponse.json({ error: "No connected Stripe account yet." }, { status: 400 });
    }

    const stripe = getStripeClient();
    const link = await stripe.accounts.createLoginLink(profile.stripe_account_id);

    return NextResponse.json({ url: link.url });
  } catch (err) {
    console.error("stripe connect dashboard-link error:", err);
    return NextResponse.json({ error: err.message || "Failed to open Stripe dashboard." }, { status: 500 });
  }
}
