import { requireAdmin, sanitizeSearchTerm, parsePagination } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/secure-headers";
import { logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";

const VALID_APPROVAL_STATUSES = ["pending", "approved", "rejected"];
const VALID_PRODUCT_STATUSES = ["active", "draft", "out_of_stock"];

const RATE_LIMIT = rateLimit({ maxRequests: 60 });

async function createNotification({ user_id, type, title, body, link, data }) {
  try {
    const { createAdminClient } = await import("@/lib/supabaseAdmin");
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id,
      type,
      title,
      body: body || null,
      link: link || null,
      data: data || {},
      is_read: false,
    });
  } catch {
    // Best effort
  }
}

export async function GET(req) {
  const rl = RATE_LIMIT(req);
  if (rl.error) return rl.error;

  try {
    const { error, admin } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const approvalStatusFilter = searchParams.get("approval_status");
    const status = searchParams.get("status");
    const search = sanitizeSearchTerm(searchParams.get("q"));
    const { page, limit, offset } = parsePagination(searchParams);

    let q = admin.from("products").select("*", { count: "exact" });

    if (approvalStatusFilter && VALID_APPROVAL_STATUSES.includes(approvalStatusFilter)) {
      q = q.eq("approval_status", approvalStatusFilter);
    }

    if (status && VALID_PRODUCT_STATUSES.includes(status)) {
      q = q.eq("status", status);
    }

    if (search) {
      q = q.or(`name.ilike.%${search}%,vendor_name.ilike.%${search}%`);
    }

    const { data, error: dbError, count } = await q
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbError) {
      return NextResponse.json({ message: "Failed to fetch products" }, { status: 500 });
    }

    const response = NextResponse.json({ products: data || [], total: count || 0, page, limit }, { status: 200 });
    return withSecurityHeaders(response);
  } catch {
    return withSecurityHeaders(
      NextResponse.json({ message: "Internal server error" }, { status: 500 })
    );
  }
}

export async function PATCH(req) {
  const rl = RATE_LIMIT(req);
  if (rl.error) return rl.error;

  try {
    const { error: authError, admin, user: adminUser } = await requireAdmin();
    if (authError) return authError;

    const body = await req.json().catch(() => null);
    if (!body) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Invalid request body" }, { status: 400 })
      );
    }

    const { product_id, approval_status, rejection_reason } = body;

    if (!product_id || typeof product_id !== "string") {
      return withSecurityHeaders(
        NextResponse.json({ message: "product_id is required" }, { status: 400 })
      );
    }

    if (!approval_status || !VALID_APPROVAL_STATUSES.includes(approval_status)) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Invalid approval_status. Must be one of: pending, approved, rejected" }, { status: 400 })
      );
    }

    const { data: product } = await admin
      .from("products")
      .select("id, name, vendor_id, vendor_name, approval_status")
      .eq("id", product_id)
      .single();

    if (!product) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Product not found" }, { status: 404 })
      );
    }

    const { data, error: dbError } = await admin
      .from("products")
      .update({ approval_status })
      .eq("id", product_id)
      .select("id, name, approval_status, vendor_id, vendor_name")
      .single();

    if (dbError) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Failed to update product" }, { status: 500 })
      );
    }

    if (approval_status === "approved" && product.vendor_id) {
      await createNotification({
        user_id: product.vendor_id,
        type: "product_approved",
        title: "Product Approved!",
        body: `Your product "${product.name}" has been approved and is now live.`,
        link: `/dashboard/vendor?tab=products`,
        data: { product_id: product.id, vendor_id: product.vendor_id },
      });
    }

    if (approval_status === "rejected" && product.vendor_id) {
      await createNotification({
        user_id: product.vendor_id,
        type: "product_rejected",
        title: "Product Rejected",
        body: `Your product "${product.name}" was rejected.${rejection_reason ? ` Reason: ${rejection_reason}` : ""}`,
        link: `/dashboard/vendor?tab=products`,
        data: { product_id: product.id, vendor_id: product.vendor_id },
      });
    }

    const actionLabel = approval_status === "approved" ? "approve_product" : "reject_product";
    await logActivity({
      actor_id: adminUser.id,
      action: actionLabel,
      entity_type: "product",
      entity_id: product.id,
      description: `${actionLabel.replace("_", " ")}: "${product.name}"`,
      metadata: { product_id: product.id, approval_status, rejection_reason: rejection_reason || null },
    });

    const response = NextResponse.json(data, { status: 200 });
    return withSecurityHeaders(response);
  } catch {
    return withSecurityHeaders(
      NextResponse.json({ message: "Internal server error" }, { status: 500 })
    );
  }
}
