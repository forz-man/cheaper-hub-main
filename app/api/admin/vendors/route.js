import { requireAdmin, sanitizeSearchTerm, parsePagination } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/secure-headers";
import { NextResponse } from "next/server";

const RATE_LIMIT_INST = rateLimit({ maxRequests: 60 });

export async function GET(req) {
  const rl = RATE_LIMIT_INST(req);
  if (rl.error) return rl.error;

  try {
    const { error, admin } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = sanitizeSearchTerm(searchParams.get("q"));
    const { page, limit, offset } = parsePagination(searchParams);

    let countQuery = admin.from("profiles").select("*", { count: "exact", head: true })
      .eq("role", "vendor")
      .is("deleted", false);

    let q = admin.from("profiles").select("*")
      .eq("role", "vendor")
      .is("deleted", false);

    if (status === "pending") {
      q = q.is("stripe_account_id", null);
      countQuery = countQuery.is("stripe_account_id", null);
    } else if (status === "approved") {
      q = q.not("stripe_account_id", "is", null);
      countQuery = countQuery.not("stripe_account_id", "is", null);
    } else if (status === "suspended") {
      q = q.eq("suspended", true);
      countQuery = countQuery.eq("suspended", true);
    }

    if (search) {
      q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error: dbError } = await q
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbError) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Failed to fetch vendors" }, { status: 500 })
      );
    }

    const { count: total } = await countQuery;

    const vendorIds = (data || []).map((v) => v.id);
    let productCounts = {};
    if (vendorIds.length > 0) {
      const { data: counts } = await admin
        .from("products")
        .select("vendor_id, id")
        .in("vendor_id", vendorIds);

      if (counts) {
        for (const c of counts) {
          productCounts[c.vendor_id] = (productCounts[c.vendor_id] || 0) + 1;
        }
      }
    }

    const enriched = (data || []).map((v) => ({
      id: v.id,
      full_name: v.full_name,
      email: v.email,
      role: v.role,
      stripe_account_id: v.stripe_account_id,
      suspended: v.suspended || false,
      created_at: v.created_at,
      product_count: productCounts[v.id] || 0,
    }));

    const response = NextResponse.json({ vendors: enriched, total: total || 0, page, limit });
    return withSecurityHeaders(response);
  } catch {
    return withSecurityHeaders(
      NextResponse.json({ message: "Internal server error" }, { status: 500 })
    );
  }
}
