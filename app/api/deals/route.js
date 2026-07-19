import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// GET /api/deals — active products that are genuinely marked down
// (original_price > price), enriched with a real discount percentage and a
// "sold" count derived from order_items so the Deals page can surface
// actual trending/clearance items instead of randomized placeholders.
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("approval_status", "approved")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    const deals = (products || [])
      .filter((p) => p.original_price && Number(p.original_price) > Number(p.price))
      .map((p) => ({
        ...p,
        discount_pct: Math.round(
          ((Number(p.original_price) - Number(p.price)) / Number(p.original_price)) * 100
        ),
      }));

    // Real "trending" signal: units sold across all orders. order_items has
    // no public-read policy (buyers/vendors only see their own rows), so use
    // the admin client — we only ever return an aggregated count, never the
    // underlying order/buyer data.
    let soldMap = {};
    if (deals.length > 0) {
      try {
        const admin = createAdminClient();
        const { data: items } = await admin
          .from("order_items")
          .select("product_id, qty")
          .in("product_id", deals.map((d) => d.id));
        for (const it of items || []) {
          soldMap[it.product_id] = (soldMap[it.product_id] || 0) + (it.qty || 1);
        }
      } catch (_) {
        // Admin client unavailable — trending falls back to 0 sold, still real data.
      }
    }

    const enriched = deals.map((d) => ({ ...d, sold_count: soldMap[d.id] || 0 }));

    return NextResponse.json(enriched, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
