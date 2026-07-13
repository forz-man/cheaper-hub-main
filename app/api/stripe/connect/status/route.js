import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getStripeClient } from "@/lib/stripeClient";

// GET /api/stripe/connect/status
//
// Re-fetches the vendor's connected account status live from Stripe (source
// of truth) and mirrors it onto the profile row so the rest of the app can
// read it without an extra Stripe call.
export async function GET() {
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
      return NextResponse.json({ connected: false });
    }

    const stripe = getStripeClient();
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    const update = {
      stripe_charges_enabled: !!account.charges_enabled,
      stripe_payouts_enabled: !!account.payouts_enabled,
      stripe_details_submitted: !!account.details_submitted,
    };

    await admin.from("profiles").update(update).eq("id", user.id);

    return NextResponse.json({ connected: true, ...update });
  } catch (err) {
    console.error("stripe connect status error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch payout status." }, { status: 500 });
  }
}
