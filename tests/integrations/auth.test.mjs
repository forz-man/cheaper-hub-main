import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const registerSource = await readFile(
  new URL("../../app/api/auth/register/route.js", import.meta.url),
  "utf8",
);
const integrationAuthSource = await readFile(
  new URL("../../lib/integrations/auth.js", import.meta.url),
  "utf8",
);

test("registration accepts only buyer or vendor roles", () => {
  assert.match(registerSource, /role !== "buyer" && role !== "vendor"/);
  assert.doesNotMatch(registerSource, /role:\s*body\?\.role/);
});

test("integration authorization does not trust mutable user metadata", () => {
  assert.match(integrationAuthSource, /normalizeRole\(profile\?\.role\)/);
  assert.doesNotMatch(integrationAuthSource, /normalizeRole\(user\.user_metadata\?\.role\)/);
});