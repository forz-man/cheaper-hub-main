import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// POST /api/notifications/read-all — Mark all notifications as read for the current user
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .select("id");

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: data?.length || 0 }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
