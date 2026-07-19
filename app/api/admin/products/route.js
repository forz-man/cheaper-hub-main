import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

async function checkAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}

async function createNotification({ user_id, type, title, body, link, data }) {
  try {
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
  } catch (_) {
    // Best effort - don't fail the main operation
  }
}

async function logActivity({ actor_id, action, entity_type, entity_id, description, metadata }) {
  try {
    const admin = createAdminClient();
    await admin.from("activity_logs").insert({
      actor_id,
      action,
      entity_type,
      entity_id,
      description,
      metadata: metadata || {},
    });
  } catch (_) {
    // Best effort
  }
}

export async function GET(req) {
  try {
    const supabase = await createClient();
    const auth = await checkAdmin(supabase);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const approvalStatusFilter = searchParams.get("approval_status");
    const status = searchParams.get("status");
    const search = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    const admin = createAdminClient();
    let q = admin.from("products").select("*", { count: "exact" });

    if (approvalStatusFilter && ["pending", "approved", "rejected"].includes(approvalStatusFilter)) {
      q = q.eq("approval_status", approvalStatusFilter);
    }

    if (status && ["active", "draft", "out_of_stock"].includes(status)) {
      q = q.eq("status", status);
    }

    if (search && search.trim()) {
      const safe = search.trim().replace(/[%_'(),]/g, " ");
      q = q.or(`name.ilike.%${safe}%,vendor_name.ilike.%${safe}%`);
    }

    const { data, error, count } = await q
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data, total: count, page, limit }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const supabase = await createClient();
    const auth = await checkAdmin(supabase);
    if (auth.error) return auth.error;
    const adminUser = auth.user;

    const body = await req.json();
    const { product_id, approval_status } = body;

    if (!product_id || !approval_status) {
      return NextResponse.json({ message: "product_id and approval_status are required" }, { status: 400 });
    }

    if (!["pending", "approved", "rejected"].includes(approval_status)) {
      return NextResponse.json({ message: "Invalid approval_status" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch the current product to get vendor info
    const { data: product } = await admin
      .from("products")
      .select("id, name, vendor_id, vendor_name, approval_status")
      .eq("id", product_id)
      .single();

    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("products")
      .update({ approval_status })
      .eq("id", product_id)
      .select("id, name, approval_status, vendor_id, vendor_name")
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    // ── Send notification to vendor ─────────────────────────────────────────
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
        body: `Your product "${product.name}" was rejected. Please update and resubmit.`,
        link: `/dashboard/vendor?tab=products`,
        data: { product_id: product.id, vendor_id: product.vendor_id },
      });
    }

    // ── Log the activity ────────────────────────────────────────────────────
    const actionLabel = approval_status === "approved" ? "approve_product" : "reject_product";
    await logActivity({
      actor_id: adminUser.id,
      action: actionLabel,
      entity_type: "product",
      entity_id: product.id,
      description: `${actionLabel.replace("_", " ")}: "${product.name}"`,
      metadata: { product_id: product.id, approval_status },
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
