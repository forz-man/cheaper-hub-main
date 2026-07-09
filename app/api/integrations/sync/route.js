import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

// POST /api/integrations/sync — import/sync products from a connected store
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { connection_id } = await request.json();
    if (!connection_id) return NextResponse.json({ message: "connection_id is required" }, { status: 400 });

    // Fetch connection including credentials
    const { data: conn, error: connErr } = await supabase
      .from("store_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("vendor_id", user.id)
      .single();

    if (connErr || !conn) return NextResponse.json({ message: "Connection not found" }, { status: 404 });

    // Mark as syncing
    await supabase.from("store_connections").update({ status: "syncing" }).eq("id", connection_id);

    let products = [];
    let syncError = null;

    try {
      switch (conn.platform) {
        case "woocommerce":
          products = await syncWooCommerce(conn.store_url, conn.credentials);
          break;
        case "shopify":
          products = await syncShopify(conn.store_url, conn.credentials);
          break;
        case "wix":
          products = await syncWix(conn.store_url, conn.credentials);
          break;
        case "wordpress":
          products = await syncWordPress(conn.store_url, conn.credentials);
          break;
        default:
          throw new Error("Unknown platform");
      }
    } catch (e) {
      syncError = e.message;
    }

    if (syncError) {
      await supabase.from("store_connections").update({
        status: "error",
        error_message: syncError,
        updated_at: new Date().toISOString(),
      }).eq("id", connection_id);
      return NextResponse.json({ message: syncError }, { status: 422 });
    }

    // Upsert products into our products table, tagged with source
    const rows = products.map(p => ({
      vendor_id:      user.id,
      vendor_name:    user.user_metadata?.full_name || user.email?.split("@")[0] || "Vendor",
      name:           p.name,
      description:    p.description || "",
      price:          parseFloat(p.price) || 0,
      original_price: parseFloat(p.original_price) || null,
      stock:          p.stock ?? null,
      category:       p.category || "Uncategorised",
      images:         p.images || [],
      external_id:    String(p.external_id),
      source_platform: conn.platform,
      source_url:     conn.store_url,
    }));

    let imported = 0;
    if (rows.length > 0) {
      const { error: upsertErr, count } = await supabase
        .from("products")
        .upsert(rows, { onConflict: "vendor_id,external_id,source_platform", ignoreDuplicates: false });

      if (upsertErr) {
        // If unique constraint columns don't exist yet, fall back to insert
        const { count: insertCount } = await supabase.from("products").insert(rows);
        imported = insertCount ?? rows.length;
      } else {
        imported = count ?? rows.length;
      }
    }

    // Update connection status
    await supabase.from("store_connections").update({
      status:         "connected",
      error_message:  null,
      last_synced_at: new Date().toISOString(),
      product_count:  rows.length,
      updated_at:     new Date().toISOString(),
    }).eq("id", connection_id);

    return NextResponse.json({ imported, total: rows.length });
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// ── Platform sync functions ───────────────────────────────────────────────────

async function syncWooCommerce(url, creds) {
  const auth = "Basic " + btoa(`${creds.consumer_key}:${creds.consumer_secret}`);
  let page = 1, all = [];
  while (true) {
    const res = await fetch(
      `${url}/wp-json/wc/v3/products?per_page=100&page=${page}&status=publish`,
      { headers: { Authorization: auth } }
    );
    if (!res.ok) throw new Error(`WooCommerce API error: ${res.status}`);
    const data = await res.json();
    if (!data.length) break;
    all = all.concat(data.map(p => ({
      external_id:    p.id,
      name:           p.name,
      description:    p.short_description || p.description || "",
      price:          p.price || p.regular_price || 0,
      original_price: p.regular_price && p.sale_price ? p.regular_price : null,
      stock:          p.stock_quantity,
      category:       p.categories?.[0]?.name || "Uncategorised",
      images:         (p.images || []).map(i => i.src),
    })));
    if (data.length < 100) break;
    page++;
  }
  return all;
}

async function syncShopify(url, creds) {
  const shop   = url.replace(/^https?:\/\//, "");
  const token  = creds.access_token;
  let sinceId  = 0, all = [];
  while (true) {
    const res = await fetch(
      `https://${shop}/admin/api/2024-01/products.json?limit=250&since_id=${sinceId}&status=active`,
      { headers: { "X-Shopify-Access-Token": token } }
    );
    if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
    const { products } = await res.json();
    if (!products.length) break;
    all = all.concat(products.map(p => {
      const variant = p.variants?.[0] || {};
      return {
        external_id:    p.id,
        name:           p.title,
        description:    p.body_html?.replace(/<[^>]*>/g, "") || "",
        price:          variant.price || 0,
        original_price: variant.compare_at_price || null,
        stock:          variant.inventory_quantity ?? null,
        category:       p.product_type || p.tags?.split(",")?.[0] || "Uncategorised",
        images:         (p.images || []).map(i => i.src),
      };
    }));
    if (products.length < 250) break;
    sinceId = products[products.length - 1].id;
  }
  return all;
}

async function syncWix(storeUrl, creds) {
  const { api_key, site_id } = creds;
  let cursor = null, all = [];
  while (true) {
    const body = { query: { paging: { limit: 100, ...(cursor ? { cursor } : {}) } } };
    const res = await fetch("https://www.wixapis.com/stores/v1/products/query", {
      method: "POST",
      headers: {
        Authorization:   api_key,
        "wix-site-id":   site_id,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Wix API error: ${res.status}`);
    const data = await res.json();
    const products = data.products || [];
    all = all.concat(products.map(p => ({
      external_id:    p.id,
      name:           p.name,
      description:    p.description || "",
      price:          p.price?.price || 0,
      original_price: p.price?.comparePrice || null,
      stock:          p.stock?.quantity ?? null,
      category:       p.productType || "Uncategorised",
      images:         (p.media?.items || []).map(i => i.image?.url).filter(Boolean),
    })));
    cursor = data.metadata?.cursors?.next;
    if (!cursor || products.length < 100) break;
  }
  return all;
}

async function syncWordPress(url, creds) {
  const auth = "Basic " + btoa(`${creds.username}:${creds.app_password}`);
  // WordPress core doesn't have a products endpoint — try WooCommerce first, then
  // fall back to posts with a "product" custom post type.
  try {
    return await syncWooCommerce(url, {
      consumer_key:    creds.consumer_key || creds.username,
      consumer_secret: creds.consumer_secret || creds.app_password,
    });
  } catch {
    // Fall back to WP REST API custom post type "product"
    let page = 1, all = [];
    while (true) {
      const res = await fetch(
        `${url}/wp-json/wp/v2/product?per_page=100&page=${page}&status=publish`,
        { headers: { Authorization: auth } }
      );
      if (!res.ok) break;
      const data = await res.json();
      if (!data.length) break;
      all = all.concat(data.map(p => ({
        external_id:  p.id,
        name:         p.title?.rendered || p.slug,
        description:  p.excerpt?.rendered?.replace(/<[^>]*>/g, "") || "",
        price:        0, // WP core has no price concept — vendor fills in later
        category:     "Uncategorised",
        images:       [],
      })));
      if (data.length < 100) break;
      page++;
    }
    return all;
  }
}
