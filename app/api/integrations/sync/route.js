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
        case "woocommerce":  products = await syncWooCommerce(conn.store_url, conn.credentials);  break;
        case "shopify":      products = await syncShopify(conn.store_url, conn.credentials);      break;
        case "wix":          products = await syncWix(conn.store_url, conn.credentials);          break;
        case "wordpress":    products = await syncWordPress(conn.store_url, conn.credentials);    break;
        case "etsy":         products = await syncEtsy(conn.store_url, conn.credentials);         break;
        case "squarespace":  products = await syncSquarespace(conn.store_url, conn.credentials);  break;
        case "bigcommerce":  products = await syncBigCommerce(conn.store_url, conn.credentials);  break;
        case "prestashop":   products = await syncPrestaShop(conn.store_url, conn.credentials);   break;
        case "magento2":     products = await syncMagento2(conn.store_url, conn.credentials);     break;
        case "ecwid":        products = await syncEcwid(conn.store_url, conn.credentials);        break;
        default: throw new Error("Unknown platform");
      }
    } catch (e) {
      syncError = e.message;
    }

    if (syncError) {
      await supabase.from("store_connections").update({
        status:        "error",
        error_message: syncError,
        updated_at:    new Date().toISOString(),
      }).eq("id", connection_id);
      return NextResponse.json({ message: syncError }, { status: 422 });
    }

    // Upsert products into our products table, tagged with source
    const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Vendor";
    const rows = products.map(p => ({
      vendor_id:       user.id,
      vendor_name:     displayName,
      name:            p.name,
      description:     p.description || "",
      price:           parseFloat(p.price) || 0,
      original_price:  parseFloat(p.original_price) || null,
      stock:           p.stock ?? null,
      status:          (p.stock === 0) ? "out_of_stock" : "active",
      category:        p.category || "Uncategorised",
      images:          p.images || [],
      external_id:     String(p.external_id),
      source_platform: conn.platform,
      source_url:      conn.store_url,
    }));

    let imported = 0;
    if (rows.length > 0) {
      const { error: upsertErr, count } = await supabase
        .from("products")
        .upsert(rows, { onConflict: "vendor_id,external_id,source_platform", ignoreDuplicates: false });

      if (upsertErr) {
        // Columns may not exist yet — fall back to plain insert (no dedup)
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
      description:    p.short_description?.replace(/<[^>]*>/g, "") || p.description?.replace(/<[^>]*>/g, "") || "",
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
  const shop    = url.replace(/^https?:\/\//, "");
  const token   = creds.access_token;
  let sinceId   = 0, all = [];
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
      headers: { Authorization: api_key, "wix-site-id": site_id, "Content-Type": "application/json" },
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
  // Try WooCommerce REST API first (most WP stores with products use it)
  if (creds.consumer_key && creds.consumer_secret) {
    try { return await syncWooCommerce(url, creds); } catch { /* fall through */ }
  }
  // Fall back to WP REST API with application password
  const auth = "Basic " + btoa(`${creds.username}:${creds.app_password}`);
  let page = 1, all = [];
  while (true) {
    // Try WooCommerce endpoint with WP auth first, then custom CPT "product"
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
      price:        0, // WP core has no price field — vendor can edit after import
      category:     "Uncategorised",
      images:       [],
    })));
    if (data.length < 100) break;
    page++;
  }
  return all;
}

async function syncEtsy(storeUrl, creds) {
  const { api_key, shop_id } = creds;
  let offset = 0, all = [];
  while (true) {
    const res = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings/active?limit=100&offset=${offset}&includes=Images,MainImage`,
      { headers: { "x-api-key": api_key } }
    );
    if (!res.ok) throw new Error(`Etsy API error: ${res.status}`);
    const data = await res.json();
    const listings = data.results || [];
    all = all.concat(listings.map(p => {
      const price = p.price ? (p.price.amount / p.price.divisor) : 0;
      const images = [];
      if (p.MainImage?.url_fullxfull) images.push(p.MainImage.url_fullxfull);
      (p.Images || []).forEach(i => { if (i.url_fullxfull && !images.includes(i.url_fullxfull)) images.push(i.url_fullxfull); });
      return {
        external_id:    p.listing_id,
        name:           p.title,
        description:    p.description?.slice(0, 1000) || "",
        price,
        original_price: null,
        stock:          p.quantity,
        category:       p.taxonomy_path?.[0] || "Handmade",
        images,
      };
    }));
    if (listings.length < 100) break;
    offset += 100;
  }
  return all;
}

async function syncSquarespace(storeUrl, creds) {
  const { api_key } = creds;
  let cursor = null, all = [];
  while (true) {
    const url = cursor
      ? `https://api.squarespace.com/1.0/commerce/products?cursor=${cursor}`
      : "https://api.squarespace.com/1.0/commerce/products";
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${api_key}`, "User-Agent": "Cheaper/1.0" },
    });
    if (!res.ok) throw new Error(`Squarespace API error: ${res.status}`);
    const data = await res.json();
    const products = data.products || [];
    all = all.concat(products.map(p => {
      const variant   = p.variants?.[0] || {};
      const price     = (variant.priceMoney?.value ?? 0) / 100;
      const compareAt = (variant.salePriceMoney?.value ?? 0) / 100;
      return {
        external_id:    p.id,
        name:           p.name,
        description:    p.description?.replace(/<[^>]*>/g, "") || "",
        price,
        original_price: compareAt > price ? compareAt : null,
        stock:          p.isUnlimited ? null : (variant.stock ?? 0),
        category:       p.tags?.[0] || "Uncategorised",
        images:         (p.images || []).map(i => i.url).filter(Boolean),
      };
    }));
    cursor = data.pagination?.nextPageCursor;
    if (!cursor || products.length === 0) break;
  }
  return all;
}

async function syncBigCommerce(storeUrl, creds) {
  const { store_hash, client_id, access_token } = creds;
  let page = 1, all = [];
  while (true) {
    const res = await fetch(
      `https://api.bigcommerce.com/stores/${store_hash}/v3/catalog/products?include=images,variants&limit=250&page=${page}&is_visible=true`,
      {
        headers: {
          "X-Auth-Token":   access_token,
          "X-Auth-Client":  client_id || "",
          "Content-Type":   "application/json",
        },
      }
    );
    if (!res.ok) throw new Error(`BigCommerce API error: ${res.status}`);
    const data = await res.json();
    const products = data.data || [];
    all = all.concat(products.map(p => ({
      external_id:    p.id,
      name:           p.name,
      description:    p.description?.replace(/<[^>]*>/g, "") || "",
      price:          p.price || 0,
      original_price: p.retail_price || null,
      stock:          p.inventory_tracking === "none" ? null : (p.inventory_level ?? null),
      category:       p.categories?.[0] ? String(p.categories[0]) : "Uncategorised",
      images:         (p.images || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(i => i.url_standard)
        .filter(Boolean),
    })));
    const meta = data.meta?.pagination;
    if (!meta || meta.current_page >= meta.total_pages) break;
    page++;
  }
  return all;
}

async function syncPrestaShop(url, creds) {
  const { api_key } = creds;
  const auth = "Basic " + btoa(`${api_key}:`);

  // Fetch product IDs
  const idsRes = await fetch(
    `${url}/api/products?output_format=JSON&limit=1000&display=[id]&filter[active]=1`,
    { headers: { Authorization: auth } }
  );
  if (!idsRes.ok) throw new Error(`PrestaShop API error: ${idsRes.status}`);
  const idsData = await idsRes.json();
  const ids = (idsData.products || []).map(p => p.id);
  if (ids.length === 0) return [];

  const all = [];
  const batchSize = 50;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const res = await fetch(
      `${url}/api/products?output_format=JSON&display=full&filter[id]=[${batch.join("|")}]`,
      { headers: { Authorization: auth } }
    );
    if (!res.ok) continue;
    const data = await res.json();
    for (const p of data.products || []) {
      const nameVal = typeof p.name === "object" ? Object.values(p.name)[0] : p.name;
      const descVal = typeof p.description_short === "object" ? Object.values(p.description_short)[0] : (p.description_short || "");
      all.push({
        external_id:    p.id,
        name:           nameVal || `Product ${p.id}`,
        description:    descVal.replace(/<[^>]*>/g, ""),
        price:          parseFloat(p.price) || 0,
        original_price: null,
        stock:          parseInt(p.quantity) || 0,
        category:       "Uncategorised",
        images:         [],
      });
    }
  }
  return all;
}

async function syncMagento2(url, creds) {
  const { access_token } = creds;
  const headers = { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" };
  let page = 1, all = [];

  while (true) {
    const qs = new URLSearchParams({
      "searchCriteria[currentPage]": page,
      "searchCriteria[pageSize]":    "100",
      "searchCriteria[filter_groups][0][filters][0][field]":          "status",
      "searchCriteria[filter_groups][0][filters][0][value]":          "1",
      "searchCriteria[filter_groups][0][filters][0][condition_type]": "eq",
      "fields": "items[id,sku,name,price,custom_attributes,media_gallery_entries],total_count",
    });
    const res = await fetch(`${url}/rest/V1/products?${qs}`, { headers });
    if (!res.ok) throw new Error(`Magento API error: ${res.status}`);
    const data = await res.json();
    const products = data.items || [];

    all = all.concat(products.map(p => {
      const attr = (code) => p.custom_attributes?.find(a => a.attribute_code === code)?.value;
      const price        = p.price || 0;
      const specialPrice = parseFloat(attr("special_price"));
      const images = (p.media_gallery_entries || [])
        .filter(m => m.media_type === "image" && !m.disabled)
        .map(m => `${url}/pub/media/catalog/product${m.file}`);
      return {
        external_id:    p.id,
        name:           p.name,
        description:    attr("short_description")?.replace(/<[^>]*>/g, "") || "",
        price:          specialPrice > 0 ? specialPrice : price,
        original_price: specialPrice > 0 ? price : null,
        stock:          null, // requires separate stock API — set to null
        category:       "Uncategorised",
        images,
      };
    }));

    const totalPages = Math.ceil((data.total_count || 0) / 100);
    if (page >= totalPages || products.length === 0) break;
    page++;
  }
  return all;
}

async function syncEcwid(storeUrl, creds) {
  const { store_id, secret_token } = creds;
  let offset = 0, all = [];
  while (true) {
    const res = await fetch(
      `https://app.ecwid.com/api/v3/${store_id}/products?limit=100&offset=${offset}&enabled=true&token=${secret_token}`
    );
    if (!res.ok) throw new Error(`Ecwid API error: ${res.status}`);
    const data = await res.json();
    const items = data.items || [];
    all = all.concat(items.map(p => {
      const images = [];
      if (p.imageUrl) images.push(p.imageUrl);
      (p.galleryImages || []).forEach(i => { if (i.url) images.push(i.url); });
      return {
        external_id:    p.id,
        name:           p.name,
        description:    p.description?.replace(/<[^>]*>/g, "") || "",
        price:          p.defaultPrice || p.price || 0,
        original_price: p.compareToPrice || null,
        stock:          p.unlimited ? null : (p.quantity ?? 0),
        category:       "Uncategorised",
        images,
      };
    }));
    if (items.length < 100) break;
    offset += 100;
  }
  return all;
}
