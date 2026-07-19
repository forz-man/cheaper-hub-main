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
    const paymentStatus = searchParams.get("payment_status");
    const search = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    const admin = createAdminClient();
    let q = admin.from("orders").select("*, order_items(*)");

    if (status && ["processing", "shipped", "delivered", "cancelled"].includes(status)) {
      q = q.eq("status", status);
    }

    if (paymentStatus && ["unpaid", "paid", "failed", "refunded"].includes(paymentStatus)) {
      q = q.eq("payment_status", paymentStatus);
    }

    if (search && search.trim()) {
      const safe = search.trim().replace(/[%_'(),]/g, " ");
      q = q.or(`buyer_name.ilike.%${safe}%,buyer_email.ilike.%${safe}%,id.ilike.%${safe}%`);
    }

    const { data, error } = await q
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    const { count: total } = await admin
      .from("orders")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({ orders: data || [], total: total || 0, page, limit });
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
