import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// GET /api/reviews/eligibility?product_id=xxx
// Checks whether the current user can review this product.
// Returns:
//   { canReview: bool, existingReview: object|null }
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ canReview: false, reason: "not_authenticated" });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");

    if (!productId) {
      return NextResponse.json({ canReview: false, reason: "missing_product_id" });
    }

    const admin = createAdminClient();

    // Check if user already reviewed this product
    const { data: existingReview } = await admin
      .from("reviews")
      .select("id, rating, text, created_at")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existingReview) {
      return NextResponse.json({
        canReview: false,
        reason: "already_reviewed",
        existingReview,
      });
    }

    // Check if user has a delivered order_item for this product
    const { data: orderItems } = await admin
      .from("order_items")
      .select("id, order_id, fulfillment_status")
      .eq("product_id", String(productId));

    let hasDeliveredPurchase = false;
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
          hasDeliveredPurchase = true;
          break;
        }
      }
    }

    if (!hasDeliveredPurchase) {
      return NextResponse.json({
        canReview: false,
        reason: "no_delivered_purchase",
      });
    }

    return NextResponse.json({ canReview: true, existingReview: null });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
