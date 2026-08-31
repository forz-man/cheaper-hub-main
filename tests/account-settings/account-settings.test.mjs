import assert from "node:assert/strict";
import test from "node:test";
import {
  hasPasswordIdentity,
  getCanonicalAuthOrigin,
  isVerifiedRecoveryEvent,
  sanitizeProfileUpdates,
  validatePasswordChangeInput,
} from "../../lib/account-settings.mjs";

test("buyer updates exclude vendor-only and privileged fields", () => {
  const updates = sanitizeProfileUpdates(
    {
      full_name: "  Ada Buyer  ",
      phone_number: " 555-0100 ",
      location: " Lagos ",
      store_name: "Not allowed",
      role: "admin",
      email: "other@example.com",
      email_notifications: false,
    },
    "buyer"
  );

  assert.deepEqual(updates, {
    full_name: "Ada Buyer",
    phone_number: "555-0100",
    phone: "555-0100",
    location: "Lagos",
    email_notifications: false,
  });
});

test("only Supabase password recovery events enable password setup", () => {
  const session = { user: { id: "user-1" } };
  assert.equal(isVerifiedRecoveryEvent("PASSWORD_RECOVERY", session), true);
  assert.equal(isVerifiedRecoveryEvent("SIGNED_IN", session), false);
  assert.equal(isVerifiedRecoveryEvent("PASSWORD_RECOVERY", null), false);
});

test("auth email redirects use only a canonical HTTPS origin", () => {
  assert.equal(
    getCanonicalAuthOrigin({
      siteUrl: "https://cheaper.com/some/path",
      replitDevDomain: "preview.replit.dev",
    }),
    "https://cheaper.com"
  );
  assert.equal(
    getCanonicalAuthOrigin({ replitDevDomain: "preview.replit.dev" }),
    "https://preview.replit.dev"
  );
  assert.equal(
    getCanonicalAuthOrigin({ siteUrl: "http://attacker.example" }),
    null
  );
});

test("vendor updates include store details", () => {
  const updates = sanitizeProfileUpdates(
    { store_name: " Cheaper Store ", website: " https://example.com " },
    "vendor"
  );
  assert.equal(updates.store_name, "Cheaper Store");
  assert.equal(updates.website, "https://example.com");
});

test("password identity recognizes email provider only", () => {
  assert.equal(hasPasswordIdentity({ app_metadata: { providers: ["google"] } }), false);
  assert.equal(hasPasswordIdentity({ identities: [{ provider: "email" }] }), true);
});

test("password changes require current password and a distinct strong replacement", () => {
  assert.equal(
    validatePasswordChangeInput({ currentPassword: "", password: "newpassword" }),
    "Current password is required."
  );
  assert.equal(
    validatePasswordChangeInput({ currentPassword: "old", password: "short" }),
    "New password must be at least 8 characters."
  );
  assert.equal(
    validatePasswordChangeInput({ currentPassword: "samepassword", password: "samepassword" }),
    "New password must be different from your current password."
  );
  assert.equal(
    validatePasswordChangeInput({ currentPassword: "oldpassword", password: "newpassword" }),
    null
  );
});