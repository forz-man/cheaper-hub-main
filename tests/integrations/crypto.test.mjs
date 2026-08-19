import test from "node:test";
import assert from "node:assert/strict";
import {
  decryptCredentials,
  encryptCredentials,
  hasLegacyCredentials,
} from "../../lib/integrations/crypto.mjs";

const SECRET = "integration-test-secret-".padEnd(64, "x");

test("credential encryption round-trips without exposing plaintext", () => {
  const credentials = { access_token: "shpat_super_secret", store: "example" };
  const encrypted = encryptCredentials(credentials, SECRET);
  assert.equal(encrypted.includes(credentials.access_token), false);
  assert.deepEqual(decryptCredentials(encrypted, SECRET), credentials);
});

test("credential encryption uses a fresh nonce", () => {
  const first = encryptCredentials({ token: "same" }, SECRET);
  const second = encryptCredentials({ token: "same" }, SECRET);
  assert.notEqual(first, second);
});

test("tampered or wrongly keyed ciphertext cannot be decrypted", () => {
  const encrypted = encryptCredentials({ token: "secret" }, SECRET);
  assert.throws(() => decryptCredentials(encrypted, `${SECRET}different`), /could not be decrypted/i);
  const parsed = JSON.parse(encrypted);
  parsed.data = `${parsed.data.slice(0, -1)}A`;
  assert.throws(() => decryptCredentials(JSON.stringify(parsed), SECRET), /could not be decrypted/i);
});

test("legacy credential detection accepts only non-empty objects", () => {
  assert.equal(hasLegacyCredentials({ token: "x" }), true);
  assert.equal(hasLegacyCredentials({}), false);
  assert.equal(hasLegacyCredentials(null), false);
  assert.equal(hasLegacyCredentials(["x"]), false);
});