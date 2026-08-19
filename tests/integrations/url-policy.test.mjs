import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertSafePublicUrl,
  canonicalizeStoreUrl,
  integrationFetch,
  isPrivateAddress,
} from "../../lib/integrations/url-policy.mjs";

const policySource = await readFile(
  new URL("../../lib/integrations/url-policy.mjs", import.meta.url),
  "utf8",
);

test("canonicalizes custom store URLs without query strings or trailing slashes", () => {
  assert.equal(
    canonicalizeStoreUrl("woocommerce", "https://shop.example.com///?token=secret#part"),
    "https://shop.example.com",
  );
});

test("requires a real myshopify.com hostname for Shopify", () => {
  assert.equal(
    canonicalizeStoreUrl("shopify", "https://demo.myshopify.com/admin"),
    "https://demo.myshopify.com",
  );
  assert.throws(
    () => canonicalizeStoreUrl("shopify", "https://myshopify.com.evil.example"),
    /myshopify/i,
  );
});

test("derives fixed provider source URLs from validated identifiers", () => {
  assert.equal(
    canonicalizeStoreUrl("bigcommerce", "", { store_hash: "abc_123" }),
    "https://abc_123.mybigcommerce.com",
  );
  assert.throws(
    () => canonicalizeStoreUrl("etsy", "", { shop_id: "../admin" }),
    /unsupported characters/i,
  );
});

test("rejects unsafe protocols, embedded credentials, ports, and local hosts", () => {
  assert.throws(() => assertSafePublicUrl("http://shop.example.com"), /HTTPS/i);
  assert.throws(() => assertSafePublicUrl("https://user:pass@shop.example.com"), /credentials/i);
  assert.throws(() => assertSafePublicUrl("https://shop.example.com:8443"), /custom port/i);
  assert.throws(() => assertSafePublicUrl("https://localhost"), /not allowed/i);
});

test("recognizes private, link-local, documentation, and loopback addresses", () => {
  for (const address of [
    "10.0.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "203.0.113.10",
    "::1",
    "fd00::1",
  ]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  assert.equal(isPrivateAddress("8.8.8.8"), false);
});

test("outbound requests reject private IPs before opening a connection", async () => {
  await assert.rejects(
    integrationFetch("https://127.0.0.1/products", { maxRetries: 0 }),
    /private network|not publicly reachable/i,
  );
});

test("outbound requests reject cross-origin redirects", () => {
  assert.match(policySource, /next\.origin !== current\.origin/);
  assert.match(policySource, /UNSAFE_REDIRECT/);
});