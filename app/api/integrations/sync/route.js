import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/secure-headers";
import { isUuid, requireVendor } from "@/lib/integrations/auth";
import {
  createSyncJob,
  getOwnedConnection,
  publicDatabaseError,
} from "@/lib/integrations/repository";

const SYNC_LIMIT = rateLimit({ maxRequests: 30 });

function json(payload, init) {
  return withSecurityHeaders(NextResponse.json(payload, init));
}

// Create or resume a sync job. Product pages are processed separately through
// /api/integrations/sync/[jobId], keeping large catalogs out of one request.
export async function POST(request) {
  const limited = SYNC_LIMIT(request);
  if (limited.error) return limited.error;

  try {
    const { error, user, admin } = await requireVendor();
    if (error) return error;
    const body = await request.json().catch(() => null);
    const connectionId = body?.connection_id;
    if (!isUuid(connectionId)) {
      return json({ message: "A valid connection_id is required." }, { status: 400 });
    }

    const connection = await getOwnedConnection(admin, user.id, connectionId);
    if (!connection || connection.status === "disconnected") {
      return json({ message: "Store connection not found." }, { status: 404 });
    }

    const { job, existing } = await createSyncJob(admin, {
      vendorId: user.id,
      connectionId,
    });
    if (!job) {
      return json({ message: "The active sync job could not be loaded." }, { status: 409 });
    }

    return json({
      job_id: job.id,
      connection_id: job.connection_id,
      status: job.status,
      counts: job.counts,
      errors: job.errors,
      warnings: job.warnings,
      existing,
    }, { status: 202 });
  } catch (error) {
    return json(
      { message: publicDatabaseError(error, "The sync could not be started.") },
      { status: 500 },
    );
  }
}