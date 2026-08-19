import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeImportedProduct,
  normalizeProductBatch,
  productChecksum,
} from "../../lib/integrations/normalize.mjs";

test("normalizes and sanitizes a valid imported product", () => {
  const result = normalizeImportedProduct({
    externalId: 123,
    name: "  Product   name ",
    description: "<script>bad()</script><p>Useful &amp; safe</p>",
    price: "12.345",
    originalPrice: "20",
    currency: "usd",
    stock: "3",
    images: ["https://cdn.example.com/a.jpg", "javascript:alert(1)"],
    variants: [{ id: 1, sku: "SKU", price: 12, stock: 3 }],
  }, { platform: "shopify" });

  assert.equal(result.ok, true);
  assert.equal(result.product.name, "Product name");
  assert.equal(result.product.description, "Useful & safe");
  assert.equal(result.product.price, 12.35);
  assert.equal(result.product.currency, "USD");
  assert.deepEqual(result.product.images, ["https://cdn.example.com/a.jpg"]);
});

test("rejects products without identity, name, or a positive price", () => {
  const result = normalizeImportedProduct({ price: 0 }, { platform: "shopify" });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /source product ID/i);
  assert.match(result.errors.join(" "), /product name/i);
  assert.match(result.errors.join(" "), /greater than zero/i);
});

test("unknown stock is kept safely out of stock", () => {
  const result = normalizeImportedProduct({
    externalId: "a",
    name: "A",
    price: 10,
    stock: null,
  }, { platform: "magento2" });
  assert.equal(result.ok, true);
  assert.equal(result.product.stock, 0);
  assert.match(result.warnings.join(" "), /out of stock/i);
});

test("a batch rejects duplicate source IDs without rejecting valid rows", () => {
  const batch = normalizeProductBatch([
    { externalId: "1", name: "One", price: 1, stock: 1 },
    { externalId: "1", name: "Duplicate", price: 2, stock: 1 },
    { externalId: "2", name: "Invalid", price: 0, stock: 1 },
  ], { platform: "shopify" });
  assert.equal(batch.valid.length, 1);
  assert.equal(batch.errors.length, 2);
});

test("checksums are deterministic and change with catalog fields", () => {
  const product = {
    name: "A",
    description: "",
    category: "General",
    price: 1,
    originalPrice: null,
    currency: "USD",
    stock: 1,
    images: [],
    variants: [],
    sourceProductUrl: null,
  };
  assert.equal(productChecksum(product), productChecksum({ ...product }));
  assert.notEqual(productChecksum(product), productChecksum({ ...product, stock: 2 }));
});