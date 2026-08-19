import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/secure-headers";
import { requireVendor } from "@/lib/integrations/auth";
import { encryptCredentials } from "@/lib/integrations/crypto.mjs";
import {
  SUPPORTED_PLATFORMS,
  testConnection,
  validateCredentials,
} from "@/lib/integrations/adapters.mjs";
import { canonicalizeStoreUrl } from "@/lib/integrations/url-policy.mjs";
import {
  listConnections,
  publicDatabaseError,
} from "@/lib/integrations/repository";

const READ_LIMIT = rateLimit({ maxRequests: 120 });
const CONNECT_LIMIT = rateLimit({ maxRequests: 10 });

function json(payload, init) {
  return withSecurityHeaders(NextResponse.json(payload, init));
}

export async function GET(request) {
  const limited = READ_LIMIT(request);
  if (limited.error) return limited.error;

  try {
    const { error, user, admin } = await requireVendor();
    if (error) return error;
    const connections = await listConnections(admin, user.id);
    return json(connections);
  } catch (error) {
    return json(
      { message: publicDatabaseError(error, "Failed to load store connections.") },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const limited = CONNECT_LIMIT(request);
  if (limited.error) return limited.error;

  try {
    const { error, user, admin } = await requireVendor();
    if (error) return error;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ message: "Enter the store connection details." }, { status: 400 });
    }

    const platform = String(body.platform || "").trim().toLowerCase();
    const credentials = body.credentials;
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return json({ message: "Choose a supported store platform." }, { status: 400 });
    }

    const credentialCheck = validateCredentials(platform, credentials);
    if (!credentialCheck.ok) {
      return json({ message: credentialCheck.error }, { status: 400 });
    }

    let storeUrl;
    try {
      storeUrl = canonicalizeStoreUrl(platform, body.store_url, credentials);
    } catch (urlError) {
      return json({ message: urlError.message }, { status: 400 });
    }

    const connectionCheck = await testConnection({
      platform,
      storeUrl,
      credentials,
    });
    if (!connectionCheck.ok) {
      return json({ message: connectionCheck.error }, { status: 422 });
    }

    const encryptedCredentials = encryptCredentials(credentials);
    const now = new Date().toISOString();
    const { data, error: databaseError } = await admin
      .from("store_connections")
      .upsert({
        vendor_id: user.id,
        platform,
        store_url: storeUrl,
        credentials_ciphertext: encryptedCredentials,
        credentials: {},
        status: "connected",
        error_message: null,
        disconnected_at: null,
        updated_at: now,
      }, { onConflict: "vendor_id,platform,store_url" })
      .select("id, platform, store_url, status, error_message, last_synced_at, product_count, created_at, updated_at")
      .single();

    if (databaseError) {
      return json(
        { message: publicDatabaseError(databaseError, "The store connection could not be saved.") },
        { status: 500 },
      );
    }

    return json(data, { status: 201 });
  } catch (error) {
    const configurationError = /encryption is not configured/i.test(error?.message || "");
    return json(
      {
        message: configurationError
          ? "Store integration encryption is not configured."
          : "The store connection could not be completed.",
      },
      { status: configurationError ? 503 : 500 },
    );
  }
}