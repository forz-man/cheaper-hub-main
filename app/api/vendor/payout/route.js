import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (error) {
              // Handle edge cases where headers are already sent
            }
          },
        },
      }
    );

    // 1. Authenticate the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get the vendor's profile from Supabase
    // Replace 'vendors' with your actual table name if different
    const { data: vendorData } = await supabase
      .from("vendors")
      .select("stripe_account_id, email")
      .eq("id", user.id)
      .single();

    let stripeAccountId = vendorData?.stripe_account_id;

    // 3. If they don't have a Stripe account yet, create one
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
      });

      stripeAccountId = account.id;

      // Save the new Stripe ID to Supabase
      await supabase
        .from("vendors")
        .update({ stripe_account_id: stripeAccountId })
        .eq("id", user.id);
    }

    // 4. Create the onboarding link
    // Change these URLs to match your actual local/production domains
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${request.headers.get("origin")}/vendor/dashboard`,
      return_url: `${request.headers.get("origin")}/vendor/dashboard?onboarding=complete`,
      type: "account_onboarding",
    });

    // 5. Return the URL to the frontend
    return NextResponse.json({ url: accountLink.url });
    
  } catch (error) {
    console.error("Stripe Onboarding Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}