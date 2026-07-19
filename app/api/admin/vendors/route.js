import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    const admin = createAdminClient();
    let q = admin.from("profiles").select("*")
      .eq("role", "vendor");

    if (status === "pending") {
      q = q.is("stripe_account_id", null);
    } else if (status === "approved") {
      q = q.not("stripe_account_id", "is", null);
    } else if (status === "suspended") {
      // Placeholder: no suspended column yet
    }

    if (search && search.trim()) {
      const safe = search.trim().replace(/[%_'(),]/g, " ");
      q = q.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
    }

    const { data, error } = await q
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    const { count: total } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "vendor");

    // Get product counts for each vendor
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
      ...v,
      product_count: productCounts[v.id] || 0,
    }));

    return NextResponse.json({ vendors: enriched, total: total || 0, page, limit });
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
