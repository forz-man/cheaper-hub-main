import test from "node:test";
import assert from "node:assert/strict";
import {
  SUPPORTED_PLATFORMS,
  validateCredentials,
} from "../../lib/integrations/adapters.mjs";
import { readFile } from "node:fs/promises";

const adapterSource = await readFile(
  new URL("../../lib/integrations/adapters.mjs", import.meta.url),
  "utf8",
);

test("all existing provider adapters remain registered", () => {
  assert.deepEqual(SUPPORTED_PLATFORMS, [
    "shopify",
    "woocommerce",
    "wix",
    "wordpress",
    "etsy",
    "squarespace",
    "bigcommerce",
    "prestashop",
    "magento2",
    "ecwid",
  ]);
});

test("credential validation rejects unknown, malformed, and missing credentials", () => {
  assert.equal(validateCredentials("unknown", {}).ok, false);
  assert.equal(validateCredentials("shopify", null).ok, false);
  assert.equal(validateCredentials("shopify", {}).ok, false);
  assert.equal(validateCredentials("shopify", { access_token: "token" }).ok, true);
});

test("credential validation rejects oversized secrets", () => {
  const result = validateCredentials("shopify", { access_token: "x".repeat(4097) });
  assert.equal(result.ok, false);
  assert.match(result.error, /maximum allowed size/i);
});

test("provider credentials are sent in headers rather than URL query strings", () => {
  assert.doesNotMatch(adapterSource, /[?&](?:token|access_token|api_key|secret)=\$\{/i);
  assert.match(adapterSource, /Authorization: `Bearer \$\{secret_token\}`/);
});

test("PrestaShop uses offset,count pagination", () => {
  assert.match(adapterSource, /limit=\$\{offset\},\$\{ID_BATCH\}/);
  assert.doesNotMatch(adapterSource, /limit=\$\{ID_BATCH\}&offset=/);
});