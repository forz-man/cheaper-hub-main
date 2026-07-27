import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// PATCH /api/reviews/[id]  { rating?, text? }
// Update your own review.
export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("reviews")
      .select("id, buyer_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    if (existing.buyer_id !== user.id) {
      return NextResponse.json({ error: "You can only edit your own reviews" }, { status: 403 });
    }

    const updates = {};
    if (body.rating !== undefined) {
      const r = Number(body.rating);
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        return NextResponse.json({ error: "rating must be an integer between 1 and 5" }, { status: 400 });
      }
      updates.rating = r;
    }
    if (body.comment !== undefined) {
      const c = typeof body.comment === "string" ? body.comment.trim() : "";
      if (c.length > 2000) {
        return NextResponse.json({ error: "Review comment must be under 2000 characters" }, { status: 400 });
      }
      updates.comment = c || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data: updated, error } = await admin
      .from("reviews")
      .update(updates)
      .eq("id", id)
      .select("id, rating, comment, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ review: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/reviews/[id]
// Delete your own review.
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("reviews")
      .select("id, buyer_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    if (existing.buyer_id !== user.id) {
      return NextResponse.json({ error: "You can only delete your own reviews" }, { status: 403 });
    }

    const { error } = await admin.from("reviews").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
