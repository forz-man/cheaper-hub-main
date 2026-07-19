import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [
      { count: totalProducts },
      { count: pendingProducts },
      { count: totalOrders },
      { count: pendingOrders },
      { count: totalUsers },
      { count: vendorCount },
      { count: buyerCount },
      { count: pendingVendors },
      { count: todayOrders },
      { count: activeUsers },
    ] = await Promise.all([
      admin.from("products").select("*", { count: "exact", head: true }),
      admin.from("products").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
      admin.from("orders").select("*", { count: "exact", head: true }),
      admin.from("orders").select("*", { count: "exact", head: true }).eq("status", "processing"),
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "vendor"),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "buyer"),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "vendor").is("stripe_account_id", null),
      admin.from("orders").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
      admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const { data: revenueData } = await admin
      .from("orders")
      .select("total")
      .eq("payment_status", "paid");

    const totalRevenue = (revenueData || []).reduce((s, o) => s + Number(o.total), 0);

    const { data: todayRevenueData } = await admin
      .from("orders")
      .select("total")
      .eq("payment_status", "paid")
      .gte("created_at", todayStart);

    const todayRevenue = (todayRevenueData || []).reduce((s, o) => s + Number(o.total), 0);

    const { data: lowStockData } = await admin
      .from("products")
      .select("id")
      .eq("status", "active")
      .eq("approval_status", "approved")
      .lte("stock", 5);

    const { count: refundRequests } = await admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "refunded");

    return NextResponse.json({
      totalRevenue,
      todayRevenue,
      totalOrders: totalOrders || 0,
      pendingOrders: pendingOrders || 0,
      totalProducts: totalProducts || 0,
      pendingProducts: pendingProducts || 0,
      totalUsers: totalUsers || 0,
      vendorCount: vendorCount || 0,
      buyerCount: buyerCount || 0,
      pendingVendors: pendingVendors || 0,
      activeUsers: activeUsers || 0,
      refundRequests: refundRequests || 0,
      lowStockCount: lowStockData?.length || 0,
      todayOrders: todayOrders || 0,
    });
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
