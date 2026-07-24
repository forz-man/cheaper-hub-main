import { requireAdmin, validateUUID, parsePagination } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/secure-headers";
import { NextResponse } from "next/server";

const VALID_STATUSES = ["new", "read", "resolved"];
const RATE_LIMIT_INST = rateLimit({ maxRequests: 30 });

export async function GET(req) {
  const rl = RATE_LIMIT_INST(req);
  if (rl.error) return rl.error;

  try {
    const { error, admin } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const { page, limit, offset } = parsePagination(searchParams);

    let countQuery = admin.from("contact_messages").select("*", { count: "exact", head: true });
    let q = admin.from("contact_messages").select("*");

    if (status && VALID_STATUSES.includes(status)) {
      q = q.eq("status", status);
      countQuery = countQuery.eq("status", status);
    }

    const { data, error: dbError } = await q
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbError) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Failed to fetch messages" }, { status: 500 })
      );
    }

    const { count: total } = await countQuery;

    const response = NextResponse.json({ messages: data || [], total: total || 0, page, limit });
    return withSecurityHeaders(response);
  } catch {
    return withSecurityHeaders(
      NextResponse.json({ message: "Internal server error" }, { status: 500 })
    );
  }
}

export async function PATCH(req) {
  const rl = RATE_LIMIT_INST(req);
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

    const { message_id, status } = body;

    if (!message_id || !validateUUID(message_id)) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Valid message_id is required" }, { status: 400 })
      );
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Invalid status. Must be one of: new, read, resolved" }, { status: 400 })
      );
    }

    const { data, error: dbError } = await admin
      .from("contact_messages")
      .update({ status })
      .eq("id", message_id)
      .select()
      .single();

    if (dbError) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Failed to update message" }, { status: 500 })
      );
    }

    const { logActivity } = await import("@/lib/audit");
    await logActivity({
      actor_id: adminUser.id,
      action: "update_contact_message",
      entity_type: "contact_message",
      entity_id: message_id,
      description: `Updated message status to: ${status}`,
      metadata: { message_id, status },
    });

    const response = NextResponse.json(data);
    return withSecurityHeaders(response);
  } catch {
    return withSecurityHeaders(
      NextResponse.json({ message: "Internal server error" }, { status: 500 })
    );
  }
}
