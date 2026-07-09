import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

// DELETE /api/integrations/[id] — disconnect a store
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("store_connections")
      .delete()
      .eq("id", params.id)
      .eq("vendor_id", user.id); // RLS double-check

    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
