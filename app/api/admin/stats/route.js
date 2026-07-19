import { requireAdmin } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/secure-headers";
import { NextResponse } from "next/server";

export async function GET() {
  const rl = rateLimit({ maxRequests: 30 });
  const rlResult = rl({ headers: { get: () => null } });
  if (rlResult.error) return rlResult.error;

  try {
    const { error, admin } = await requireAdmin();
    if (error) return error;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

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
    ]);

    const [
      { count: activeUsers },
      { count: refundRequests },
    ] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
      admin.from("orders").select("*", { count: "exact", head: true }).eq("payment_status", "refunded"),
    ]);

    const { data: revenueData } = await admin
      .from("orders")
      .select("total")
      .eq("payment_status", "paid");

    const totalRevenue = (revenueData || []).reduce((s, o) => s + Number(o.total || 0), 0);

    const { data: todayRevenueData } = await admin
      .from("orders")
      .select("total")
      .eq("payment_status", "paid")
      .gte("created_at", todayStart);

    const todayRevenue = (todayRevenueData || []).reduce((s, o) => s + Number(o.total || 0), 0);

    const { data: lowStockData } = await admin
      .from("products")
      .select("id", { count: false, head: false })
      .eq("status", "active")
      .eq("approval_status", "approved")
      .lte("stock", 5);

    const response = NextResponse.json({
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

    return withSecurityHeaders(response);
  } catch (err) {
    return withSecurityHeaders(
      NextResponse.json({ message: "Internal server error" }, { status: 500 })
    );
  }
}
