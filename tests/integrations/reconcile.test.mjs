import test from "node:test";
import assert from "node:assert/strict";
import {
  buildImportedProductRow,
  classifyImportedProduct,
  shouldArchiveSourceProduct,
} from "../../lib/integrations/reconcile.mjs";

const context = {
  connection: { id: "connection-1", platform: "shopify", store_url: "https://demo.myshopify.com" },
  vendorId: "vendor-1",
  vendorName: "Vendor",
  seenAt: "2026-08-19T12:00:00.000Z",
  now: "2026-08-19T12:01:00.000Z",
};

const product = {
  externalId: "product-1",
  name: "Product",
  description: "",
  price: 10,
  originalPrice: null,
  stock: 2,
  category: "General",
  images: [],
  variants: [],
  sourceProductUrl: null,
  checksum: "checksum",
  currency: "USD",
};

test("import rows are connection scoped and never overwrite approval", () => {
  const row = buildImportedProductRow(product, context);
  assert.equal(row.source_connection_id, "connection-1");
  assert.equal(row.external_id, "product-1");
  assert.equal(Object.hasOwn(row, "approval_status"), false);
});

test("repeat sync classification is idempotent", () => {
  assert.equal(classifyImportedProduct(null, "a"), "created");
  assert.equal(classifyImportedProduct({ source_checksum: "a", source_archived_at: null }, "a"), "unchanged");
  assert.equal(classifyImportedProduct({ source_checksum: "a", source_archived_at: null }, "b"), "updated");
  assert.equal(classifyImportedProduct({ source_checksum: "a", source_archived_at: "2026-01-01" }, "a"), "updated");
});

test("reappearing products are restored without approval fields", () => {
  const row = buildImportedProductRow(product, context);
  assert.equal(row.source_archived_at, null);
  assert.equal(row.status, "active");
  assert.equal(Object.hasOwn(row, "approval_status"), false);
});

test("only unseen products from the current connection are archived", () => {
  const options = { connectionId: "connection-1", syncStartedAt: "2026-08-19T12:00:00.000Z" };
  assert.equal(shouldArchiveSourceProduct({
    source_connection_id: "connection-1",
    source_last_seen_at: "2026-08-19T11:00:00.000Z",
  }, options), true);
  assert.equal(shouldArchiveSourceProduct({
    source_connection_id: "connection-1",
    source_last_seen_at: "2026-08-19T12:00:00.000Z",
  }, options), false);
  assert.equal(shouldArchiveSourceProduct({
    source_connection_id: "connection-2",
    source_last_seen_at: null,
  }, options), false);
});