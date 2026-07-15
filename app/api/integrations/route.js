import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

// GET /api/integrations — list vendor's store connections
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("store_connections")
      .select("id, platform, store_url, status, error_message, last_synced_at, product_count, created_at")
      .eq("vendor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// POST /api/integrations — connect a store
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { platform, store_url, credentials } = body;

    if (!platform || !store_url) {
      return NextResponse.json({ message: "platform and store_url are required" }, { status: 400 });
    }

    // Normalise URL — strip trailing slash, ensure https
    const normalised = store_url.replace(/\/+$/, "").replace(/^http:\/\//, "https://");

    // Test the connection before saving
    const testResult = await testConnection(platform, normalised, credentials);
    if (!testResult.ok) {
      return NextResponse.json({ message: testResult.error }, { status: 422 });
    }

    // Upsert so reconnecting the same store just updates credentials
    const { data, error } = await supabase
      .from("store_connections")
      .upsert({
        vendor_id:     user.id,
        platform,
        store_url:     normalised,
        credentials:   credentials ?? {},
        status:        "connected",
        error_message: null,
        updated_at:    new Date().toISOString(),
      }, { onConflict: "vendor_id,platform,store_url" })
      .select("id, platform, store_url, status, product_count, last_synced_at")
      .single();

    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// ── Connection tester ─────────────────────────────────────────────────────────

async function testConnection(platform, url, creds = {}) {
  try {
    switch (platform) {

      case "woocommerce": {
        const { consumer_key, consumer_secret } = creds;
        if (!consumer_key || !consumer_secret) return { ok: false, error: "Consumer key and secret are required" };
        const res = await fetch(
          `${url}/wp-json/wc/v3/system_status`,
          { headers: { Authorization: "Basic " + btoa(`${consumer_key}:${consumer_secret}`) } }
        );
        if (!res.ok) return { ok: false, error: `Store responded with ${res.status}. Check your credentials.` };
        return { ok: true };
      }

      case "shopify": {
        const { access_token } = creds;
        if (!access_token) return { ok: false, error: "Access token is required" };
        const shop = url.replace(/^https?:\/\//, "");
        const res = await fetch(
          `https://${shop}/admin/api/2024-01/shop.json`,
          { headers: { "X-Shopify-Access-Token": access_token } }
        );
        if (!res.ok) return { ok: false, error: `Shopify responded with ${res.status}. Check your token.` };
        return { ok: true };
      }

      case "wix": {
        const { api_key, site_id } = creds;
        if (!api_key || !site_id) return { ok: false, error: "API key and Site ID are required" };
        const res = await fetch(
          "https://www.wixapis.com/site-properties/v4/properties",
          { headers: { Authorization: api_key, "wix-site-id": site_id } }
        );
        if (!res.ok) return { ok: false, error: `Wix responded with ${res.status}. Check your API key.` };
        return { ok: true };
      }

      case "wordpress": {
        const { username, app_password } = creds;
        if (!username || !app_password) return { ok: false, error: "Username and application password are required" };
        const res = await fetch(
          `${url}/wp-json/wp/v2/users/me`,
          { headers: { Authorization: "Basic " + btoa(`${username}:${app_password}`) } }
        );
        if (!res.ok) return { ok: false, error: `WordPress responded with ${res.status}. Check your credentials.` };
        return { ok: true };
      }

      case "etsy": {
        const { api_key, shop_id } = creds;
        if (!api_key || !shop_id) return { ok: false, error: "API key and shop ID/name are required" };
        const res = await fetch(
          `https://openapi.etsy.com/v3/application/shops/${shop_id}`,
          { headers: { "x-api-key": api_key } }
        );
        if (!res.ok) return { ok: false, error: `Etsy responded with ${res.status}. Check your API key and shop ID.` };
        return { ok: true };
      }

      case "squarespace": {
        const { api_key } = creds;
        if (!api_key) return { ok: false, error: "API key is required" };
        const res = await fetch(
          "https://api.squarespace.com/1.0/commerce/products?limit=1",
          { headers: { Authorization: `Bearer ${api_key}`, "User-Agent": "Cheaper/1.0" } }
        );
        if (!res.ok) return { ok: false, error: `Squarespace responded with ${res.status}. Check your API key.` };
        return { ok: true };
      }

      case "bigcommerce": {
        const { store_hash, access_token } = creds;
        if (!store_hash || !access_token) return { ok: false, error: "Store hash and access token are required" };
        const res = await fetch(
          `https://api.bigcommerce.com/stores/${store_hash}/v2/store`,
          { headers: { "X-Auth-Token": access_token, "Content-Type": "application/json" } }
        );
        if (!res.ok) return { ok: false, error: `BigCommerce responded with ${res.status}. Check your credentials.` };
        return { ok: true };
      }

      case "prestashop": {
        const { api_key } = creds;
        if (!api_key) return { ok: false, error: "API key is required" };
        const res = await fetch(
          `${url}/api/?output_format=JSON`,
          { headers: { Authorization: "Basic " + btoa(`${api_key}:`) } }
        );
        if (!res.ok) return { ok: false, error: `PrestaShop responded with ${res.status}. Check your URL and API key.` };
        return { ok: true };
      }

      case "magento2": {
        const { access_token } = creds;
        if (!access_token) return { ok: false, error: "Access token is required" };
        const res = await fetch(
          `${url}/rest/V1/store/storeConfigs`,
          { headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" } }
        );
        if (!res.ok) return { ok: false, error: `Magento responded with ${res.status}. Check your URL and token.` };
        return { ok: true };
      }

      case "ecwid": {
        const { store_id, secret_token } = creds;
        if (!store_id || !secret_token) return { ok: false, error: "Store ID and secret token are required" };
        const res = await fetch(
          `https://app.ecwid.com/api/v3/${store_id}/profile?token=${secret_token}`
        );
        if (!res.ok) return { ok: false, error: `Ecwid responded with ${res.status}. Check your credentials.` };
        return { ok: true };
      }

      default:
        return { ok: false, error: "Unknown platform" };
    }
  } catch {
    return { ok: false, error: "Could not reach the store. Check the URL and try again." };
  }
}
