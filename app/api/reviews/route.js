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
      .select("id, buyer_id, rating, comment, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({ reviews: [], stats: { average: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } });
    }

    const userIds = [...new Set(reviews.map((r) => r.buyer_id))];

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
      author: profileMap[r.buyer_id] || "Anonymous",
      rating: r.rating,
      comment: r.comment,
      date: r.created_at,
      verified: true,
      buyer_id: r.buyer_id,
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

// POST /api/reviews  { orderId, productId, rating, comment }
// Creates a review after verifying the user has a delivered order_item
// for this product in this order.
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "You must be signed in to leave a review." }, { status: 401 });
    }

    const { orderId, productId, rating, comment } = await request.json();

    if (!orderId || !productId) {
      return NextResponse.json({ error: "orderId and productId are required" }, { status: 400 });
    }

    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return NextResponse.json({ error: "rating must be an integer between 1 and 5" }, { status: 400 });
    }

    const commentStr = typeof comment === "string" ? comment.trim() : "";
    if (commentStr.length > 2000) {
      return NextResponse.json({ error: "Review text must be under 2000 characters" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify order belongs to user and is delivered
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found or does not belong to you" }, { status: 404 });
    }

    if (order.status !== "delivered") {
      return NextResponse.json({ error: "You can only review delivered orders" }, { status: 403 });
    }

    // Verify product belongs to this order and is delivered
    const { data: orderItem, error: itemErr } = await admin
      .from("order_items")
      .select("id, fulfillment_status, vendor_id")
      .eq("order_id", orderId)
      .eq("product_id", String(productId))
      .maybeSingle();

    if (itemErr || !orderItem) {
      return NextResponse.json({ error: "Product not found in this order" }, { status: 404 });
    }

    // Check for existing review for this order + product
    const { data: existing } = await admin
      .from("reviews")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("product_id", productId)
      .eq("order_id", orderId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You have already reviewed this product for this order." },
        { status: 409 }
      );
    }

    const vendor_id = orderItem.vendor_id || null;

    const { data: review, error: insertErr } = await admin
      .from("reviews")
      .insert({
        order_id: orderId,
        product_id: productId,
        buyer_id: user.id,
        vendor_id,
        rating: r,
        comment: commentStr || null,
      })
      .select("id, rating, comment, created_at")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ review, vendor_id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
