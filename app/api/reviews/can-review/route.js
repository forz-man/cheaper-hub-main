import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ canReview: false, reason: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const productId = searchParams.get("productId");

    if (!orderId || !productId) {
      return NextResponse.json({ canReview: false, reason: "orderId and productId are required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, status, created_at")
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ canReview: false, reason: "Order not found or does not belong to you" }, { status: 404 });
    }

    if (order.status !== "delivered") {
      return NextResponse.json({ canReview: false, reason: "Order not delivered" });
    }

    const { data: orderItem, error: itemErr } = await admin
      .from("order_items")
      .select("id, fulfillment_status, vendor_id")
      .eq("order_id", orderId)
      .eq("product_id", String(productId))
      .maybeSingle();

    if (itemErr || !orderItem) {
      return NextResponse.json({ canReview: false, reason: "Product not found in this order" });
    }

    const { data: existingReview } = await admin
      .from("reviews")
      .select("id, rating, comment, created_at")
      .eq("buyer_id", user.id)
      .eq("product_id", productId)
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingReview) {
      return NextResponse.json({
        canReview: false,
        alreadyReviewed: true,
        review: existingReview,
        order,
        product: { id: productId },
      });
    }

    const { data: product } = await admin
      .from("products")
      .select("id, name")
      .eq("id", productId)
      .single();

    return NextResponse.json({
      canReview: true,
      alreadyReviewed: false,
      order: { id: order.id, status: order.status },
      product: product || { id: productId },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
