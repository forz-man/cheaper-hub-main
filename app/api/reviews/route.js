import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// GET /api/reviews?product_id=xxx
// Returns all reviews for a product, with author display names.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");

    if (!productId) {
      return NextResponse.json({ error: "product_id query parameter is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: reviews, error } = await admin
      .from("reviews")
      .select("id, user_id, rating, text, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({ reviews: [], stats: { average: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } });
    }

    const userIds = [...new Set(reviews.map((r) => r.user_id))];

    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profileMap = {};
    (profiles || []).forEach((p) => {
      profileMap[p.id] = p.full_name || p.email?.split("@")[0] || "Anonymous";
    });

    const enriched = reviews.map((r) => ({
      id: r.id,
      author: profileMap[r.user_id] || "Anonymous",
      rating: r.rating,
      text: r.text,
      date: r.created_at,
      verified: true,
      user_id: r.user_id,
    }));

    const total = reviews.length;
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    const average = total > 0 ? +(sum / total).toFixed(1) : 0;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => { distribution[r.rating]++; });

    return NextResponse.json({ reviews: enriched, stats: { average, total, distribution } });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

// POST /api/reviews  { product_id, rating, text }
// Creates a review after verifying the user has a delivered order_item for this product.
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "You must be signed in to leave a review." }, { status: 401 });
    }

    const { product_id, rating, text } = await request.json();

    if (!product_id) {
      return NextResponse.json({ error: "product_id is required" }, { status: 400 });
    }

    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return NextResponse.json({ error: "rating must be an integer between 1 and 5" }, { status: 400 });
    }

    const textStr = typeof text === "string" ? text.trim() : "";
    if (textStr.length > 2000) {
      return NextResponse.json({ error: "Review text must be under 2000 characters" }, { status: 400 });
    }

    // Verify purchase: check for a delivered order_item for this product by this user.
    const admin = createAdminClient();
    const { data: orderItems } = await admin
      .from("order_items")
      .select("id, order_id, fulfillment_status")
      .eq("product_id", String(product_id));

    let matchingItem = null;
    if (orderItems) {
      for (const item of orderItems) {
        if (item.fulfillment_status !== "delivered") continue;

        const { data: order } = await admin
          .from("orders")
          .select("id")
          .eq("id", item.order_id)
          .eq("buyer_id", user.id)
          .single();

        if (order) {
          matchingItem = item;
          break;
        }
      }
    }

    if (!matchingItem) {
      return NextResponse.json(
        { error: "You can only review products you have purchased and received." },
        { status: 403 }
      );
    }

    // Check for existing review (one review per product per user)
    const { data: existing } = await admin
      .from("reviews")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You have already reviewed this product." },
        { status: 409 }
      );
    }

    const { data: review, error: insertErr } = await admin
      .from("reviews")
      .insert({
        product_id,
        user_id: user.id,
        order_item_id: matchingItem.id,
        rating: r,
        text: textStr || null,
      })
      .select("id, rating, text, created_at")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
