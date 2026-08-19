import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/secure-headers";
import { isUuid, requireVendor } from "@/lib/integrations/auth";
import {
  archiveConnectionProducts,
  getOwnedConnection,
  publicDatabaseError,
} from "@/lib/integrations/repository";

const DELETE_LIMIT = rateLimit({ maxRequests: 20 });

function json(payload, init) {
  return withSecurityHeaders(NextResponse.json(payload, init));
}

export async function DELETE(request, { params }) {
  const limited = DELETE_LIMIT(request);
  if (limited.error) return limited.error;
  const { id } = await params;
  if (!isUuid(id)) return json({ message: "Invalid store connection." }, { status: 400 });

  try {
    const { error, user, admin } = await requireVendor();
    if (error) return error;
    const connection = await getOwnedConnection(admin, user.id, id);
    if (!connection) return json({ message: "Store connection not found." }, { status: 404 });

    const now = new Date().toISOString();
    await admin
      .from("store_sync_jobs")
      .update({
        status: "failed",
        error_message: "The store was disconnected.",
        lease_token: null,
        lease_expires_at: null,
        completed_at: now,
        updated_at: now,
      })
      .eq("vendor_id", user.id)
      .eq("connection_id", id)
      .in("status", ["queued", "running"]);

    const { error: databaseError } = await admin
      .from("store_connections")
      .update({
        status: "disconnected",
        credentials_ciphertext: null,
        credentials: {},
        disconnected_at: now,
        error_message: null,
        updated_at: now,
      })
      .eq("id", id)
      .eq("vendor_id", user.id);
    if (databaseError) throw databaseError;
    await archiveConnectionProducts(admin, user.id, id);

    return json({ ok: true });
  } catch (error) {
    return json(
      { message: publicDatabaseError(error, "The store could not be disconnected.") },
      { status: 500 },
    );
  }
}