import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

// GET /api/orders
// Returns all orders that contain at least one item belonging to the calling vendor.
// Requires the `orders_vendor_select` RLS policy in Supabase (see schema.sql).
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Get every order_item sold by this vendor
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id, order_id, product_id, product_name, vendor_id, vendor_name, price, qty, subtotal")
      .eq("vendor_id", user.id);

    if (itemsError) {
      console.error("order_items fetch error:", itemsError);
      return NextResponse.json({ orders: [] });
    }
    if (!items || items.length === 0) return NextResponse.json({ orders: [] });

    const orderIds = [...new Set(items.map(i => i.order_id))];

    // 2. Fetch order metadata (status, buyer info, totals, timestamps).
    //    Requires the orders_vendor_select policy.  Falls back gracefully if
    //    the policy hasn't been applied yet.
    const { data: orders } = await supabase
      .from("orders")
      .select("id, status, buyer_name, buyer_email, total, created_at, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country")
      .in("id", orderIds)
      .order("created_at", { ascending: false });

    // 3. Build a map, falling back to skeleton if the policy isn't applied
    const ordersMap = {};
    (orders || []).forEach(o => {
      ordersMap[o.id] = { ...o, order_items: [] };
    });
    // For any order_id that the policy blocked, create a minimal skeleton
    orderIds.forEach(id => {
      if (!ordersMap[id]) {
        ordersMap[id] = {
          id,
          status: "processing",
          buyer_name: "—",
          buyer_email: null,
          total: 0,
          created_at: null,
          order_items: [],
        };
      }
    });

    // 4. Attach items to their parent order
    items.forEach(item => {
      if (ordersMap[item.order_id]) ordersMap[item.order_id].order_items.push(item);
    });

    // 5. Derive total from items when the order row total is 0 (skeleton case)
    const result = Object.values(ordersMap).map(o => {
      if (!o.total && o.order_items.length) {
        o.total = o.order_items.reduce((sum, i) => sum + (i.subtotal || i.price * i.qty || 0), 0);
      }
      return o;
    });

    // Sort by created_at desc (nulls last)
    result.sort((a, b) => {
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return NextResponse.json({ orders: result });
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json({ orders: [] });
  }
}
