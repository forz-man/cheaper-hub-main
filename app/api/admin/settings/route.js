import { requireAdmin } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/secure-headers";
import { logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";

const RATE_LIMIT_INST = rateLimit({ maxRequests: 30 });

const VALID_KEYS = [
  "site_name",
  "platform_name",
  "support_email",
  "commission_rate",
  "platform_fee",
  "currency",
  "contact_number",
  "maintenance_mode",
  "tax_rate",
  "shipping_flat_rate",
  "free_shipping_threshold",
  "allow_vendor_registration",
  "allow_product_submission",
];

const NUMERIC_KEYS = ["commission_rate", "platform_fee", "tax_rate", "shipping_flat_rate", "free_shipping_threshold"];
const BOOLEAN_KEYS = ["maintenance_mode", "allow_vendor_registration", "allow_product_submission"];

async function getSettings(admin) {
  const { data } = await admin
    .from("settings")
    .select("key, value, description")
    .in("key", VALID_KEYS);

  const settings = {};
  for (const key of VALID_KEYS) {
    settings[key] = null;
  }
  if (data) {
    for (const row of data) {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

export async function GET() {
  const rl = RATE_LIMIT_INST({ headers: { get: () => null } });
  if (rl.error) return rl.error;

  try {
    const { error, admin } = await requireAdmin();
    if (error) return error;

    const settings = await getSettings(admin);

    const response = NextResponse.json({ settings });
    return withSecurityHeaders(response);
  } catch {
    return withSecurityHeaders(
      NextResponse.json({ message: "Internal server error" }, { status: 500 })
    );
  }
}

export async function PATCH(req) {
  const rl = RATE_LIMIT_INST(req);
  if (rl.error) return rl.error;

  try {
    const { error: authError, admin, user: adminUser } = await requireAdmin();
    if (authError) return authError;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return withSecurityHeaders(
        NextResponse.json({ message: "Invalid request body" }, { status: 400 })
      );
    }

    const { key, value } = body;

    if (!key || !VALID_KEYS.includes(key)) {
      return withSecurityHeaders(
        NextResponse.json({ message: `Invalid key. Must be one of: ${VALID_KEYS.join(", ")}` }, { status: 400 })
      );
    }

    let validatedValue = value;

    if (NUMERIC_KEYS.includes(key)) {
      const num = parseFloat(String(value ?? ""));
      if (isNaN(num) || num < 0 || num > 100) {
        return withSecurityHeaders(
          NextResponse.json({ message: `${key} must be a number between 0 and 100` }, { status: 400 })
        );
      }
      validatedValue = String(num);
    }

    if (BOOLEAN_KEYS.includes(key)) {
      const str = String(value ?? "").toLowerCase();
      if (!["true", "false"].includes(str)) {
        return withSecurityHeaders(
          NextResponse.json({ message: `${key} must be true or false` }, { status: 400 })
        );
      }
      validatedValue = str;
    }

    if (key === "support_email" && String(value ?? "") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Invalid email format" }, { status: 400 })
      );
    }

    const { error: upsertError } = await admin
      .from("settings")
      .upsert({
        key,
        value: validatedValue,
        updated_by: adminUser.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

    if (upsertError) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Failed to save setting" }, { status: 500 })
      );
    }

    await logActivity({
      actor_id: adminUser.id,
      action: "update_setting",
      entity_type: "setting",
      entity_id: key,
      description: `Updated setting: ${key} = ${JSON.stringify(validatedValue)}`,
      metadata: { key, value: validatedValue },
    });

    const settings = await getSettings(admin);
    const response = NextResponse.json({ message: "Setting updated", settings });
    return withSecurityHeaders(response);
  } catch {
    return withSecurityHeaders(
      NextResponse.json({ message: "Internal server error" }, { status: 500 })
    );
  }
}