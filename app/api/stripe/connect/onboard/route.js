import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getStripeClient } from "@/lib/stripeClient";

// POST /api/stripe/connect/onboard
//
// Creates (or reuses) a Stripe Connect Express account for the signed-in
// vendor and returns a one-time onboarding link. Stripe's hosted flow
// collects identity + bank account details directly — we never see or
// store bank account numbers ourselves.
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const stripe = getStripeClient();

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("role, stripe_account_id")
      .eq("id", user.id)
      .single();

    if (profileErr) throw profileErr;
    if (profile?.role !== "vendor" && profile?.role !== "admin") {
      return NextResponse.json({ error: "Only vendors can set up payouts." }, { status: 403 });
    }

    let accountId = profile?.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      const { error: saveErr } = await admin
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
      if (saveErr) throw saveErr;
    }

    const origin = request.headers.get("origin") || new URL(request.url).origin;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/vendor?stripe=refresh`,
      return_url: `${origin}/dashboard/vendor?stripe=return`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error("stripe connect onboard error:", err);
    return NextResponse.json({ error: err.message || "Failed to start payout setup." }, { status: 500 });
  }
}
