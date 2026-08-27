import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  getVendorBadge,
  validateVendorVerification,
} from "../../lib/vendor-verification.mjs";

test("individual verification requires identity, name, phone, and location", () => {
  const missingDocument = validateVendorVerification({
    seller_type: "individual",
    full_name: "Ama Seller",
    phone_number: "+234 800 000 0000",
    location: "Lagos",
  });
  assert.equal(missingDocument.valid, false);
  assert.equal(missingDocument.errors.identity_document.includes("required"), true);

  const valid = validateVendorVerification({
    seller_type: "individual",
    full_name: "Ama Seller",
    phone_number: "+234 800 000 0000",
    location: "Lagos",
  }, { hasIdentityDocument: true });
  assert.equal(valid.valid, true);
});

test("business verification additionally requires store, category, and registration", () => {
  const incomplete = validateVendorVerification({
    seller_type: "business",
    full_name: "Kofi Owner",
    phone_number: "+234 811 111 1111",
    location: "Abuja",
  }, { hasIdentityDocument: true });

  assert.equal(incomplete.valid, false);
  assert.ok(incomplete.errors.store_name);
  assert.ok(incomplete.errors.business_category);
  assert.ok(incomplete.errors.business_registration_details);

  const valid = validateVendorVerification({
    seller_type: "business",
    full_name: "Kofi Owner",
    phone_number: "+234 811 111 1111",
    location: "Abuja",
    store_name: "Kofi Stores",
    business_category: "Electronics",
    business_registration_details: "RC-123456",
    website: "https://example.com",
  }, { hasIdentityDocument: true });
  assert.equal(valid.valid, true);
});

test("badges are tiered and only granted after approval", () => {
  assert.equal(getVendorBadge("individual", "pending"), null);
  assert.equal(getVendorBadge("business", "declined"), null);
  assert.deepEqual(getVendorBadge("individual", "approved"), {
    label: "Verified Seller",
    tone: "individual",
  });
  assert.deepEqual(getVendorBadge("business", "approved"), {
    label: "Verified Business",
    tone: "business",
  });
});

test("verification documents remain in private storage and tables are not client-readable", async () => {
  const migration = await readFile(
    new URL("../../supabase/migrations/vendor_verification.sql", import.meta.url),
    "utf8",
  );
  const vendorRoute = await readFile(
    new URL("../../app/api/vendor/verification/route.js", import.meta.url),
    "utf8",
  );
  const adminRoute = await readFile(
    new URL("../../app/api/admin/vendor-verifications/route.js", import.meta.url),
    "utf8",
  );

  assert.match(migration, /vendor-verification-documents[\s\S]*false/);
  assert.match(migration, /revoke all on public\.vendor_verification_submissions from anon, authenticated/i);
  assert.match(migration, /status in \('pending', 'approved'\)/);
  assert.match(migration, /status <> 'pending'/);
  assert.match(migration, /updated_at <> p_expected_updated_at/);
  assert.match(vendorRoute, /createAdminClient/);
  assert.match(vendorRoute, /already under review/);
  assert.match(adminRoute, /createSignedUrl/);
  assert.match(adminRoute, /p_expected_updated_at/);
  assert.doesNotMatch(adminRoute, /getPublicUrl/);
});