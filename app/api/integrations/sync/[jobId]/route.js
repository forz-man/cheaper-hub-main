import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/secure-headers";
import { fetchProductPage } from "@/lib/integrations/adapters.mjs";
import { isUuid, requireVendor, vendorDisplayName } from "@/lib/integrations/auth";
import { normalizeProductBatch } from "@/lib/integrations/normalize.mjs";
import {
  applyProductBatch,
  archiveConnectionProducts,
  claimSyncJob,
  completeSyncJob,
  failSyncJob,
  getOwnedConnection,
  getSyncJob,
  isSyncConnectionActive,
  loadConnectionCredentials,
  markSourceProductsSeen,
  publicDatabaseError,
  saveSyncPage,
} from "@/lib/integrations/repository";

const PROCESS_LIMIT = rateLimit({ maxRequests: 240 });

function json(payload, init) {
  return withSecurityHeaders(NextResponse.json(payload, init));
}

function jobPayload(job) {
  return {
    job_id: job.id,
    connection_id: job.connection_id,
    status: job.status,
    counts: job.counts,
    errors: job.errors,
    warnings: job.warnings,
    error_message: job.error_message,
    started_at: job.started_at,
    completed_at: job.completed_at,
  };
}

function safeSyncMessage(error) {
  const message = String(error?.message || "");
  if (
    /API error: \d{3}$/i.test(message) ||
    /reconnected before it can sync/i.test(message) ||
    /credentials could not be decrypted/i.test(message) ||
    /store request timed out|store could not be reached|hostname could not be resolved/i.test(message)
  ) {
    return message.slice(0, 500);
  }
  return publicDatabaseError(error, "The product sync could not be completed.");
}

export async function GET(request, { params }) {
  const limited = PROCESS_LIMIT(request);
  if (limited.error) return limited.error;

  const { jobId } = await params;
  if (!isUuid(jobId)) return json({ message: "Invalid sync job." }, { status: 400 });

  try {
    const { error, user, admin } = await requireVendor();
    if (error) return error;
    const job = await getSyncJob(admin, user.id, jobId);
    if (!job) return json({ message: "Sync job not found." }, { status: 404 });
    return json(jobPayload(job));
  } catch (error) {
    return json(
      { message: publicDatabaseError(error, "The sync status could not be loaded.") },
      { status: 500 },
    );
  }
}

// Process one provider page. The dashboard repeats this request until the job
// reaches completed/partial, and a scheduled worker can use the same endpoint.
export async function POST(request, { params }) {
  const limited = PROCESS_LIMIT(request);
  if (limited.error) return limited.error;

  const { jobId } = await params;
  if (!isUuid(jobId)) return json({ message: "Invalid sync job." }, { status: 400 });

  let claimedJob;
  let connection;
  let admin;
  try {
    const auth = await requireVendor();
    if (auth.error) return auth.error;
    admin = auth.admin;

    const current = await getSyncJob(admin, auth.user.id, jobId);
    if (!current) return json({ message: "Sync job not found." }, { status: 404 });
    if (["completed", "partial"].includes(current.status)) return json(jobPayload(current));
    if (current.status === "failed") return json(jobPayload(current), { status: 422 });

    claimedJob = await claimSyncJob(admin, auth.user.id, jobId);
    if (!claimedJob) {
      const inProgress = await getSyncJob(admin, auth.user.id, jobId);
      return json({
        ...jobPayload(inProgress || current),
        message: "This sync page is already being processed.",
      }, { status: 409 });
    }

    connection = await getOwnedConnection(admin, auth.user.id, claimedJob.connection_id, {
      includeSecrets: true,
    });
    if (!connection || connection.status === "disconnected") {
      throw new Error("The store connection is no longer available.");
    }

    const credentials = await loadConnectionCredentials(admin, connection);
    const page = await fetchProductPage({
      platform: connection.platform,
      storeUrl: connection.store_url,
      credentials,
      cursor: claimedJob.cursor,
    });
    const stillActive = await isSyncConnectionActive(admin, {
      vendorId: auth.user.id,
      connectionId: connection.id,
      jobId: claimedJob.id,
    });
    if (!stillActive) throw new Error("The store connection is no longer active.");

    await markSourceProductsSeen(admin, {
      connectionId: connection.id,
      vendorId: auth.user.id,
      externalIds: page.products.map((product) => product?.externalId),
      seenAt: claimedJob.started_at,
    });
    const normalized = normalizeProductBatch(page.products, {
      platform: connection.platform,
    });
    const applied = await applyProductBatch(admin, {
      connection,
      vendorId: auth.user.id,
      vendorName: vendorDisplayName(auth.user, auth.profile),
      products: normalized.valid,
      seenAt: claimedJob.started_at,
    });
    const activeAfterWrite = await isSyncConnectionActive(admin, {
      vendorId: auth.user.id,
      connectionId: connection.id,
      jobId: claimedJob.id,
    });
    if (!activeAfterWrite) {
      await archiveConnectionProducts(admin, auth.user.id, connection.id);
      throw new Error("The store connection is no longer active.");
    }

    const saved = await saveSyncPage(admin, claimedJob, {
      nextCursor: page.nextCursor,
      done: page.done,
      counts: {
        discovered: page.products.length,
        created: applied.created,
        updated: applied.updated,
        unchanged: applied.unchanged,
        failed: normalized.errors.length,
      },
      errors: normalized.errors,
      warnings: normalized.warnings,
    });

    if (page.done) {
      const completed = await completeSyncJob(admin, saved, connection);
      return json(jobPayload(completed));
    }

    return json(jobPayload(saved), { status: 202 });
  } catch (error) {
    const message = safeSyncMessage(error);
    if (admin && claimedJob && connection) {
      await failSyncJob(admin, claimedJob, connection, message).catch(() => {});
    }
    return json({ message }, { status: 422 });
  }
}