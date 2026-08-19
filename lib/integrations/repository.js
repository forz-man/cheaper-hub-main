import { decryptCredentials, encryptCredentials, hasLegacyCredentials } from "./crypto.mjs";
import { randomUUID } from "node:crypto";
import {
  buildImportedProductRow,
  classifyImportedProduct,
} from "./reconcile.mjs";

export const EMPTY_SYNC_COUNTS = Object.freeze({
  discovered: 0,
  created: 0,
  updated: 0,
  unchanged: 0,
  archived: 0,
  failed: 0,
});

const CONNECTION_SAFE_FIELDS = [
  "id",
  "platform",
  "store_url",
  "status",
  "error_message",
  "last_synced_at",
  "product_count",
  "created_at",
  "updated_at",
  "last_sync_job_id",
].join(", ");

const JOB_SAFE_FIELDS = [
  "id",
  "connection_id",
  "status",
  "cursor",
  "counts",
  "errors",
  "warnings",
  "error_message",
  "started_at",
  "completed_at",
  "updated_at",
].join(", ");

function integrationSchemaError(error) {
  const text = `${error?.code || ""} ${error?.message || ""}`;
  return /store_sync_jobs|credentials_ciphertext|source_connection_id|source_checksum|source_variants/i.test(text);
}

export function publicDatabaseError(error, fallback = "The integration request could not be completed.") {
  if (integrationSchemaError(error)) {
    return "The product integration database upgrade has not been applied yet.";
  }
  return fallback;
}

export async function listConnections(admin, vendorId) {
  const { data, error } = await admin
    .from("store_connections")
    .select(CONNECTION_SAFE_FIELDS)
    .eq("vendor_id", vendorId)
    .neq("status", "disconnected")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const connectionIds = (data || []).map((connection) => connection.id);
  if (!connectionIds.length) return [];

  const { data: jobs, error: jobError } = await admin
    .from("store_sync_jobs")
    .select(JOB_SAFE_FIELDS)
    .eq("vendor_id", vendorId)
    .in("connection_id", connectionIds)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false });
  if (jobError) throw jobError;

  const activeJobs = new Map();
  for (const job of jobs || []) {
    if (!activeJobs.has(job.connection_id)) activeJobs.set(job.connection_id, job);
  }

  return (data || []).map((connection) => ({
    ...connection,
    active_job: activeJobs.get(connection.id) || null,
  }));
}

export async function getOwnedConnection(admin, vendorId, connectionId, { includeSecrets = false } = {}) {
  const fields = includeSecrets
    ? `${CONNECTION_SAFE_FIELDS}, vendor_id, credentials_ciphertext, credentials, disconnected_at`
    : `${CONNECTION_SAFE_FIELDS}, vendor_id, disconnected_at`;
  const { data, error } = await admin
    .from("store_connections")
    .select(fields)
    .eq("id", connectionId)
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function loadConnectionCredentials(admin, connection) {
  if (connection.credentials_ciphertext) {
    return decryptCredentials(connection.credentials_ciphertext);
  }

  if (!hasLegacyCredentials(connection.credentials)) {
    throw new Error("This store needs to be reconnected before it can sync.");
  }

  const encrypted = encryptCredentials(connection.credentials);
  const { error } = await admin
    .from("store_connections")
    .update({
      credentials_ciphertext: encrypted,
      credentials: {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id)
    .eq("vendor_id", connection.vendor_id);
  if (error) throw error;
  return connection.credentials;
}

export async function createSyncJob(admin, { vendorId, connectionId }) {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("store_sync_jobs")
    .insert({
      vendor_id: vendorId,
      connection_id: connectionId,
      status: "queued",
      counts: { ...EMPTY_SYNC_COUNTS },
      errors: [],
      warnings: [],
      started_at: now,
      updated_at: now,
    })
    .select(JOB_SAFE_FIELDS)
    .single();

  if (error?.code === "23505") {
    const { data: active, error: activeError } = await admin
      .from("store_sync_jobs")
      .select(JOB_SAFE_FIELDS)
      .eq("vendor_id", vendorId)
      .eq("connection_id", connectionId)
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeError) throw activeError;
    return { job: active, existing: true };
  }
  if (error) throw error;

  const { error: connectionError } = await admin
    .from("store_connections")
    .update({
      status: "syncing",
      error_message: null,
      last_sync_job_id: data.id,
      updated_at: now,
    })
    .eq("id", connectionId)
    .eq("vendor_id", vendorId);
  if (connectionError) throw connectionError;

  return { job: data, existing: false };
}

export async function getSyncJob(admin, vendorId, jobId) {
  const { data, error } = await admin
    .from("store_sync_jobs")
    .select(JOB_SAFE_FIELDS)
    .eq("id", jobId)
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function isSyncConnectionActive(
  admin,
  { vendorId, connectionId, jobId },
) {
  const { data, error } = await admin
    .from("store_connections")
    .select("id")
    .eq("id", connectionId)
    .eq("vendor_id", vendorId)
    .eq("status", "syncing")
    .eq("last_sync_job_id", jobId)
    .is("disconnected_at", null)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function claimSyncJob(admin, vendorId, jobId) {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + 15 * 60_000).toISOString();
  const leaseToken = randomUUID();
  const staleBefore = now.toISOString();
  const { data, error } = await admin
    .from("store_sync_jobs")
    .update({
      status: "running",
      lease_token: leaseToken,
      lease_expires_at: leaseExpiresAt,
      updated_at: staleBefore,
    })
    .eq("id", jobId)
    .eq("vendor_id", vendorId)
    .in("status", ["queued", "running"])
    .or(`lease_expires_at.is.null,lease_expires_at.lt.${staleBefore}`)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function applyProductBatch(
  admin,
  { connection, vendorId, vendorName, products, seenAt },
) {
  if (!products.length) return { created: 0, updated: 0, unchanged: 0 };

  const externalIds = products.map((product) => product.externalId);
  const { data: existing, error: existingError } = await admin
    .from("products")
    .select("id, external_id, source_checksum, source_archived_at")
    .eq("vendor_id", vendorId)
    .eq("source_connection_id", connection.id)
    .in("external_id", externalIds);
  if (existingError) throw existingError;

  const existingByExternalId = new Map(
    (existing || []).map((product) => [String(product.external_id), product]),
  );
  const inserts = [];
  const updates = [];
  let updated = 0;
  let unchanged = 0;

  for (const product of products) {
    const current = existingByExternalId.get(product.externalId);
    const row = buildImportedProductRow(product, {
      connection,
      vendorId,
      vendorName,
      seenAt,
    });
    if (!current) {
      inserts.push(row);
      continue;
    }

    updates.push({ ...row, id: current.id });
    if (classifyImportedProduct(current, product.checksum) === "unchanged") {
      unchanged += 1;
    } else {
      updated += 1;
    }
  }

  if (updates.length) {
    const { error } = await admin
      .from("products")
      .upsert(updates, { onConflict: "id", ignoreDuplicates: false });
    if (error) throw error;
  }
  if (inserts.length) {
    const { error } = await admin.from("products").insert(inserts);
    if (error) throw error;
  }

  return { created: inserts.length, updated, unchanged };
}

export async function markSourceProductsSeen(
  admin,
  { connectionId, vendorId, externalIds, seenAt },
) {
  const ids = [...new Set(
    (externalIds || [])
      .map((value) => String(value ?? "").trim().slice(0, 300))
      .filter(Boolean),
  )];
  if (!ids.length) return;

  const { error } = await admin
    .from("products")
    .update({
      source_last_seen_at: seenAt,
      updated_at: new Date().toISOString(),
    })
    .eq("vendor_id", vendorId)
    .eq("source_connection_id", connectionId)
    .in("external_id", ids);
  if (error) throw error;
}

function addCounts(current, delta) {
  const next = { ...EMPTY_SYNC_COUNTS, ...(current || {}) };
  for (const key of Object.keys(EMPTY_SYNC_COUNTS)) {
    next[key] = Number(next[key] || 0) + Number(delta?.[key] || 0);
  }
  return next;
}

function appendMessages(current, additions) {
  return [...(Array.isArray(current) ? current : []), ...(additions || [])].slice(0, 100);
}

export async function saveSyncPage(
  admin,
  job,
  { nextCursor, counts, errors, warnings, done },
) {
  const now = new Date().toISOString();
  const nextCounts = addCounts(job.counts, counts);
  const nextErrors = appendMessages(job.errors, errors);
  const nextWarnings = appendMessages(job.warnings, warnings);
  const { data, error } = await admin
    .from("store_sync_jobs")
    .update({
      status: done ? "running" : "running",
      cursor: done ? null : nextCursor,
      counts: nextCounts,
      errors: nextErrors,
      warnings: nextWarnings,
      lease_token: done ? job.lease_token : null,
      lease_expires_at: done ? job.lease_expires_at : null,
      updated_at: now,
    })
    .eq("id", job.id)
    .eq("vendor_id", job.vendor_id)
    .eq("status", "running")
    .eq("lease_token", job.lease_token)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function completeSyncJob(admin, job, connection) {
  const now = new Date().toISOString();
  const active = await isSyncConnectionActive(admin, {
    vendorId: job.vendor_id,
    connectionId: connection.id,
    jobId: job.id,
  });
  if (!active) throw new Error("The store connection is no longer active.");

  const { count: archivedCount, error: archiveError } = await admin
    .from("products")
    .update({
      status: "draft",
      source_archived_at: now,
      updated_at: now,
    }, { count: "exact" })
    .eq("vendor_id", job.vendor_id)
    .eq("source_connection_id", connection.id)
    .or(`source_last_seen_at.is.null,source_last_seen_at.lt.${job.started_at}`);
  if (archiveError) throw archiveError;

  const counts = addCounts(job.counts, { archived: archivedCount || 0 });
  const finalStatus = Number(counts.failed || 0) > 0 ? "partial" : "completed";
  const { data: completed, error: jobError } = await admin
    .from("store_sync_jobs")
    .update({
      status: finalStatus,
      counts,
      cursor: null,
      lease_token: null,
      lease_expires_at: null,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", job.id)
    .eq("vendor_id", job.vendor_id)
    .eq("status", "running")
    .eq("lease_token", job.lease_token)
    .select(JOB_SAFE_FIELDS)
    .single();
  if (jobError) throw jobError;

  const { count: productCount, error: countError } = await admin
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", job.vendor_id)
    .eq("source_connection_id", connection.id)
    .is("source_archived_at", null);
  if (countError) throw countError;

  const { error: connectionError } = await admin
    .from("store_connections")
    .update({
      status: "connected",
      error_message: null,
      last_synced_at: now,
      product_count: productCount || 0,
      updated_at: now,
    })
    .eq("id", connection.id)
    .eq("vendor_id", job.vendor_id)
    .eq("status", "syncing")
    .eq("last_sync_job_id", job.id)
    .is("disconnected_at", null);
  if (connectionError) throw connectionError;

  return completed;
}

export async function failSyncJob(admin, job, connection, message) {
  const safeMessage = String(message || "The sync could not be completed.").slice(0, 500);
  const now = new Date().toISOString();
  const { data: failedJob } = await admin
    .from("store_sync_jobs")
    .update({
      status: "failed",
      error_message: safeMessage,
      lease_token: null,
      lease_expires_at: null,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", job.id)
    .eq("vendor_id", job.vendor_id)
    .eq("status", "running")
    .eq("lease_token", job.lease_token)
    .select("id")
    .maybeSingle();
  if (!failedJob) return;
  await admin
    .from("store_connections")
    .update({
      status: "error",
      error_message: safeMessage,
      updated_at: now,
    })
    .eq("id", connection.id)
    .eq("vendor_id", job.vendor_id);
}

export async function archiveConnectionProducts(admin, vendorId, connectionId) {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("products")
    .update({
      status: "draft",
      source_archived_at: now,
      updated_at: now,
    })
    .eq("vendor_id", vendorId)
    .eq("source_connection_id", connectionId);
  if (error) throw error;
}