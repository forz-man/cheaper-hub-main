import { requireAdmin, sanitizeSearchTerm, parsePagination } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/secure-headers";
import { NextResponse } from "next/server";

const VALID_ORDER_STATUSES = ["processing", "shipped", "delivered", "cancelled"];
const VALID_PAYMENT_STATUSES = ["unpaid", "paid", "failed", "refunded"];
const RATE_LIMIT_INST = rateLimit({ maxRequests: 60 });

export async function GET(req) {
  const rl = RATE_LIMIT_INST(req);
  if (rl.error) return rl.error;

  try {
    const { error, admin } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("payment_status");
    const search = sanitizeSearchTerm(searchParams.get("q"));
    const { page, limit, offset } = parsePagination(searchParams);

    let countQuery = admin.from("orders").select("*", { count: "exact", head: true });
    let q = admin.from("orders").select("*, order_items(*)");

    if (status && VALID_ORDER_STATUSES.includes(status)) {
      q = q.eq("status", status);
      countQuery = countQuery.eq("status", status);
    }

    if (paymentStatus && VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
      q = q.eq("payment_status", paymentStatus);
      countQuery = countQuery.eq("payment_status", paymentStatus);
    }

    if (search) {
      q = q.or(`buyer_name.ilike.%${search}%,buyer_email.ilike.%${search}%,id.ilike.%${search}%`);
      countQuery = countQuery.or(`buyer_name.ilike.%${search}%,buyer_email.ilike.%${search}%,id.ilike.%${search}%`);
    }

    const { data, error: dbError } = await q
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbError) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Failed to fetch orders" }, { status: 500 })
      );
    }

    const { count: total } = await countQuery;

    const response = NextResponse.json({ orders: data || [], total: total || 0, page, limit });
    return withSecurityHeaders(response);
  } catch {
    return withSecurityHeaders(
      NextResponse.json({ message: "Internal server error" }, { status: 500 })
    );
  }
}
