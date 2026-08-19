import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../../supabase/migrations/harden_product_integrations.sql", import.meta.url),
  "utf8",
);

test("migration makes source identity connection scoped", () => {
  assert.match(migration, /products_connection_external_idx/i);
  assert.match(migration, /vendor_id,\s*source_connection_id,\s*external_id/i);
  assert.doesNotMatch(migration, /create unique index[^;]+vendor_id,\s*external_id,\s*source_platform/is);
});

test("connection identity supports multiple stores on one platform", () => {
  assert.match(migration, /drop constraint if exists store_connections_vendor_id_platform_key/i);
  assert.match(migration, /store_connections\(vendor_id,\s*platform,\s*store_url\)/i);
});

test("migration enforces one active sync per connection", () => {
  assert.match(migration, /store_sync_jobs_one_active_idx/i);
  assert.match(migration, /where status in \('queued','running'\)/i);
});

test("migration protects secrets from authenticated table access", () => {
  assert.match(migration, /credentials_ciphertext text/i);
  assert.match(migration, /revoke all on public\.store_connections from authenticated, anon/i);
  assert.match(migration, /revoke all on public\.store_sync_jobs from authenticated, anon/i);
});

test("migration hides archived source products from the public policy", () => {
  assert.match(migration, /source_archived_at is null/i);
  assert.match(migration, /status = 'active'/i);
});

test("migration prevents clients from rewriting or recreating profile roles", () => {
  assert.match(migration, /drop policy if exists "profiles_own_write"/i);
  assert.match(migration, /revoke insert, delete, update on public\.profiles from authenticated/i);
  assert.doesNotMatch(migration, /grant update \([^)]*role/is);
});

test("sync leases have ownership tokens", () => {
  assert.match(migration, /lease_token uuid/i);
  assert.match(migration, /add column if not exists lease_token uuid/i);
});

test("signup trigger never copies an admin role from user metadata", () => {
  assert.match(migration, /in \('buyer', 'vendor'\)/i);
  assert.doesNotMatch(migration, /nullif\(new\.raw_user_meta_data->>'role'/i);
});