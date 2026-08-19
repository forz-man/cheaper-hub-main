/**
 * lib/integrations/adapters.mjs
 *
 * Platform adapters for product sync.
 * Exports:
 *   SUPPORTED_PLATFORMS         – string[]
 *   validateCredentials(platform, credentials)
 *   testConnection({ platform, storeUrl, credentials })
 *   fetchProductPage({ platform, storeUrl, credentials, cursor })
 */

import integrationFetch from "./url-policy.mjs";

// ── Constants ─────────────────────────────────────────────────────────────────

export const SUPPORTED_PLATFORMS = [
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
];

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-10";

/** Maximum allowed byte-length for any single credential value */
const CRED_VALUE_MAX_BYTES = 4096;

// ── Required credential fields per platform ───────────────────────────────────

const REQUIRED_CRED_FIELDS = {
  shopify:      ["access_token"],
  woocommerce:  ["consumer_key", "consumer_secret"],
  wix:          ["api_key", "site_id"],
  wordpress:    ["username", "app_password"],
  etsy:         ["api_key", "shop_id"],
  squarespace:  ["api_key"],
  bigcommerce:  ["store_hash", "access_token"],
  prestashop:   ["api_key"],
  magento2:     ["access_token"],
  ecwid:        ["store_id", "secret_token"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip any credential values and store URLs from an error message */
function sanitizeError(msg, credentials = {}, storeUrl = "") {
  let s = String(msg);
  // Remove storeUrl
  if (storeUrl) {
    s = s.split(storeUrl).join("[STORE_URL]");
  }
  // Remove credential values
  for (const v of Object.values(credentials)) {
    if (v && typeof v === "string" && v.length > 0) {
      s = s.split(v).join("[REDACTED]");
    }
  }
  return s;
}

/** Build a Basic auth header value using Buffer (Node.js) */
function basicAuth(user, pass) {
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

/**
 * Map a raw provider product to the canonical shape.
 * All providers should produce this before returning.
 */
function canonical({
  externalId,
  name,
  description = "",
  price = 0,
  originalPrice = null,
  currency = null,
  stock = null,
  category = "Uncategorised",
  images = [],
  variants = [],
  sourceProductUrl = null,
}) {
  return {
    externalId:      String(externalId),
    name:            String(name || ""),
    description:     String(description || ""),
    price:           parseFloat(price) || 0,
    originalPrice:   originalPrice != null ? parseFloat(originalPrice) : null,
    currency:        currency || null,
    stock:           stock != null ? Number(stock) : null,
    category:        String(category || "Uncategorised"),
    images:          Array.isArray(images) ? images.filter(Boolean) : [],
    variants:        Array.isArray(variants) ? variants : [],
    sourceProductUrl: sourceProductUrl || null,
  };
}

// ── validateCredentials ───────────────────────────────────────────────────────

/**
 * Synchronously validates that credentials are a non-null object containing
 * all required fields for the given platform, and that no value is oversized.
 *
 * Returns { ok: true } or { ok: false, error: string }.
 */
export function validateCredentials(platform, credentials) {
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return { ok: false, error: `Unsupported platform: ${platform}` };
  }
  if (credentials === null || typeof credentials !== "object" || Array.isArray(credentials)) {
    return { ok: false, error: "credentials must be a plain object" };
  }

  const required = REQUIRED_CRED_FIELDS[platform] || [];
  for (const field of required) {
    const val = credentials[field];
    if (val === undefined || val === null || String(val).trim() === "") {
      return { ok: false, error: `Missing required credential field: ${field}` };
    }
    if (Buffer.byteLength(String(val), "utf8") > CRED_VALUE_MAX_BYTES) {
      return { ok: false, error: `Credential field '${field}' exceeds maximum allowed size` };
    }
  }
  // Also check any extra supplied values for size
  for (const [key, val] of Object.entries(credentials)) {
    if (val != null && Buffer.byteLength(String(val), "utf8") > CRED_VALUE_MAX_BYTES) {
      return { ok: false, error: `Credential field '${key}' exceeds maximum allowed size` };
    }
  }
  return { ok: true };
}

// ── testConnection ────────────────────────────────────────────────────────────

/**
 * Verifies that the given credentials can reach the platform's API.
 * Returns { ok: true } or { ok: false, error: string }.
 */
export async function testConnection({ platform, storeUrl, credentials: creds = {} }) {
  const validation = validateCredentials(platform, creds);
  if (!validation.ok) return validation;

  try {
    switch (platform) {

      case "shopify": {
        const { access_token } = creds;
        const shop = storeUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
        const res = await integrationFetch(
          `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
          { headers: { "X-Shopify-Access-Token": access_token } }
        );
        if (!res.ok) return { ok: false, error: `Shopify responded with ${res.status}. Check your token.` };
        return { ok: true };
      }

      case "woocommerce": {
        const { consumer_key, consumer_secret } = creds;
        const res = await integrationFetch(
          `${storeUrl}/wp-json/wc/v3/system_status`,
          { headers: { Authorization: basicAuth(consumer_key, consumer_secret) } }
        );
        if (!res.ok) return { ok: false, error: `Store responded with ${res.status}. Check your credentials.` };
        return { ok: true };
      }

      case "wix": {
        const { api_key, site_id } = creds;
        const res = await integrationFetch(
          "https://www.wixapis.com/site-properties/v4/properties",
          { headers: { Authorization: api_key, "wix-site-id": site_id } }
        );
        if (!res.ok) return { ok: false, error: `Wix responded with ${res.status}. Check your API key.` };
        return { ok: true };
      }

      case "wordpress": {
        const { username, app_password } = creds;
        const res = await integrationFetch(
          `${storeUrl}/wp-json/wp/v2/users/me`,
          { headers: { Authorization: basicAuth(username, app_password) } }
        );
        if (!res.ok) return { ok: false, error: `WordPress responded with ${res.status}. Check your credentials.` };
        return { ok: true };
      }

      case "etsy": {
        const { api_key, shop_id } = creds;
        const res = await integrationFetch(
          `https://openapi.etsy.com/v3/application/shops/${shop_id}`,
          { headers: { "x-api-key": api_key } }
        );
        if (!res.ok) return { ok: false, error: `Etsy responded with ${res.status}. Check your API key and shop ID.` };
        return { ok: true };
      }

      case "squarespace": {
        const { api_key } = creds;
        const res = await integrationFetch(
          "https://api.squarespace.com/1.0/commerce/products?limit=1",
          { headers: { Authorization: `Bearer ${api_key}`, "User-Agent": "Cheaper/1.0" } }
        );
        if (!res.ok) return { ok: false, error: `Squarespace responded with ${res.status}. Check your API key.` };
        return { ok: true };
      }

      case "bigcommerce": {
        const { store_hash, access_token } = creds;
        const res = await integrationFetch(
          `https://api.bigcommerce.com/stores/${store_hash}/v2/store`,
          { headers: { "X-Auth-Token": access_token, "Content-Type": "application/json" } }
        );
        if (!res.ok) return { ok: false, error: `BigCommerce responded with ${res.status}. Check your credentials.` };
        return { ok: true };
      }

      case "prestashop": {
        const { api_key } = creds;
        const res = await integrationFetch(
          `${storeUrl}/api/?output_format=JSON`,
          { headers: { Authorization: basicAuth(api_key, "") } }
        );
        if (!res.ok) return { ok: false, error: `PrestaShop responded with ${res.status}. Check your URL and API key.` };
        return { ok: true };
      }

      case "magento2": {
        const { access_token } = creds;
        const res = await integrationFetch(
          `${storeUrl}/rest/V1/store/storeConfigs`,
          { headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" } }
        );
        if (!res.ok) return { ok: false, error: `Magento responded with ${res.status}. Check your URL and token.` };
        return { ok: true };
      }

      case "ecwid": {
        const { store_id, secret_token } = creds;
        const res = await integrationFetch(
          `https://app.ecwid.com/api/v3/${store_id}/profile`,
          { headers: { Authorization: `Bearer ${secret_token}` } },
        );
        if (!res.ok) return { ok: false, error: `Ecwid responded with ${res.status}. Check your credentials.` };
        return { ok: true };
      }

      default:
        return { ok: false, error: "Unknown platform" };
    }
  } catch (e) {
    return { ok: false, error: "Could not reach the store. Check the URL and try again." };
  }
}

// ── fetchProductPage ──────────────────────────────────────────────────────────

/**
 * Fetches exactly one bounded provider page of products.
 *
 * @param {{ platform: string, storeUrl: string, credentials: object, cursor: any }} opts
 * @returns {Promise<{ products: object[], nextCursor: any, done: boolean }>}
 */
export async function fetchProductPage({ platform, storeUrl, credentials: creds = {}, cursor = null }) {
  const validation = validateCredentials(platform, creds);
  if (!validation.ok) throw new Error(validation.error);

  try {
    switch (platform) {
      case "shopify":      return await _shopifyPage(storeUrl, creds, cursor);
      case "woocommerce":  return await _woocommercePage(storeUrl, creds, cursor);
      case "wix":          return await _wixPage(storeUrl, creds, cursor);
      case "wordpress":    return await _wordpressPage(storeUrl, creds, cursor);
      case "etsy":         return await _etsyPage(storeUrl, creds, cursor);
      case "squarespace":  return await _squarespacePage(storeUrl, creds, cursor);
      case "bigcommerce":  return await _bigcommercePage(storeUrl, creds, cursor);
      case "prestashop":   return await _prestashopPage(storeUrl, creds, cursor);
      case "magento2":     return await _magento2Page(storeUrl, creds, cursor);
      case "ecwid":        return await _ecwidPage(storeUrl, creds, cursor);
      default:             throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (e) {
    throw new Error(sanitizeError(e.message, creds, storeUrl));
  }
}

// ── Per-platform page fetchers ────────────────────────────────────────────────

// Shopify — uses Link header page_info cursor pagination
async function _shopifyPage(storeUrl, creds, cursor) {
  const shop  = storeUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const token = creds.access_token;
  const PAGE_LIMIT = 250;

  let url;
  if (cursor) {
    url = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=${PAGE_LIMIT}&page_info=${cursor}&status=active`;
  } else {
    url = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=${PAGE_LIMIT}&status=active`;
  }

  const res = await integrationFetch(url, {
    headers: { "X-Shopify-Access-Token": token },
  });
  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);

  const { products } = await res.json();

  // Extract next page_info from Link header
  let nextCursor = null;
  const linkHeader = res.headers.get("Link") || "";
  // Link: <https://…page_info=ABC>; rel="next"
  const nextMatch = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  if (nextMatch) nextCursor = nextMatch[1];

  const mapped = (products || []).map(p => {
    const variants = (p.variants || []).map(v => ({
      id:               v.id,
      title:            v.title,
      price:            parseFloat(v.price) || 0,
      originalPrice:    v.compare_at_price ? parseFloat(v.compare_at_price) : null,
      sku:              v.sku || null,
      stock:            v.inventory_quantity != null ? Number(v.inventory_quantity) : null,
      weight:           v.weight || null,
      option1:          v.option1 || null,
      option2:          v.option2 || null,
      option3:          v.option3 || null,
    }));
    const firstVariant = variants[0] || {};
    return canonical({
      externalId:      p.id,
      name:            p.title,
      description:     p.body_html?.replace(/<[^>]*>/g, "") || "",
      price:           firstVariant.price ?? 0,
      originalPrice:   firstVariant.originalPrice ?? null,
      currency:        null,
      stock:           firstVariant.stock ?? null,
      category:        p.product_type || p.tags?.split(",")?.[0]?.trim() || "Uncategorised",
      images:          (p.images || []).map(i => i.src),
      variants,
      sourceProductUrl: `https://${shop}/products/${p.handle}`,
    });
  });

  return {
    products:   mapped,
    nextCursor: nextCursor || null,
    done:       !nextCursor || mapped.length < PAGE_LIMIT,
  };
}

// WooCommerce — offset pagination by page number
async function _woocommercePage(storeUrl, creds, cursor) {
  const { consumer_key, consumer_secret } = creds;
  const page = cursor ? Number(cursor) : 1;
  const PER_PAGE = 100;

  const res = await integrationFetch(
    `${storeUrl}/wp-json/wc/v3/products?per_page=${PER_PAGE}&page=${page}&status=publish`,
    { headers: { Authorization: basicAuth(consumer_key, consumer_secret) } }
  );
  if (!res.ok) throw new Error(`WooCommerce API error: ${res.status}`);
  const data = await res.json();

  const mapped = (Array.isArray(data) ? data : []).map(p => {
    const variants = (p.variations || []).map((v, idx) => ({
      id:           v,
      title:        `Variation ${idx + 1}`,
    }));
    // WooCommerce returns variation IDs, not full objects, in the product list endpoint
    // attributes capture the option values available
    const attrs = (p.attributes || []).map(a => ({
      name:    a.name,
      options: a.options,
    }));
    return canonical({
      externalId:      p.id,
      name:            p.name,
      description:     p.short_description?.replace(/<[^>]*>/g, "") || p.description?.replace(/<[^>]*>/g, "") || "",
      price:           p.price || p.regular_price || 0,
      originalPrice:   p.regular_price && p.sale_price ? p.regular_price : null,
      currency:        null,
      stock:           p.stock_quantity,
      category:        p.categories?.[0]?.name || "Uncategorised",
      images:          (p.images || []).map(i => i.src),
      variants:        attrs.length > 0 ? attrs : variants,
      sourceProductUrl: p.permalink || null,
    });
  });

  const done = mapped.length < PER_PAGE;
  return {
    products:   mapped,
    nextCursor: done ? null : page + 1,
    done,
  };
}

// Wix — cursor-based pagination
async function _wixPage(storeUrl, creds, cursor) {
  const { api_key, site_id } = creds;
  const LIMIT = 100;

  const body = {
    query: {
      paging: {
        limit: LIMIT,
        ...(cursor ? { cursor } : {}),
      },
    },
  };

  const res = await integrationFetch("https://www.wixapis.com/stores/v1/products/query", {
    method:  "POST",
    headers: {
      Authorization:    api_key,
      "wix-site-id":    site_id,
      "Content-Type":   "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Wix API error: ${res.status}`);
  const data = await res.json();

  const products = data.products || [];
  const nextCursor = data.metadata?.cursors?.next || null;

  const mapped = products.map(p => {
    const variants = (p.variants || []).map(v => ({
      id:           v.id,
      title:        Object.values(v.choices || {}).join(" / ") || v.id,
      price:        v.variant?.priceData?.price ?? v.variant?.price ?? null,
      originalPrice: v.variant?.priceData?.compareAtPrice ?? null,
      sku:          v.variant?.sku || null,
      stock:        v.stock?.quantity != null ? Number(v.stock.quantity) : null,
    }));
    return canonical({
      externalId:      p.id,
      name:            p.name,
      description:     p.description || "",
      price:           p.price?.price || 0,
      originalPrice:   p.price?.comparePrice || null,
      currency:        p.price?.currency || null,
      stock:           p.stock?.quantity != null ? Number(p.stock.quantity) : null,
      category:        p.productType || "Uncategorised",
      images:          (p.media?.items || []).map(i => i.image?.url).filter(Boolean),
      variants,
      sourceProductUrl: p.productPageUrl?.base ? `${p.productPageUrl.base}${p.productPageUrl.path || ""}` : null,
    });
  });

  const done = !nextCursor || mapped.length < LIMIT;
  return {
    products:   mapped,
    nextCursor: done ? null : nextCursor,
    done,
  };
}

// WordPress — page-based offset pagination
async function _wordpressPage(storeUrl, creds, cursor) {
  const { username, app_password, consumer_key, consumer_secret } = creds;

  // If WooCommerce keys are present, delegate
  if (consumer_key && consumer_secret) {
    return _woocommercePage(storeUrl, { consumer_key, consumer_secret }, cursor);
  }

  const page = cursor ? Number(cursor) : 1;
  const PER_PAGE = 100;
  const auth = basicAuth(username, app_password);

  const res = await integrationFetch(
    `${storeUrl}/wp-json/wp/v2/product?per_page=${PER_PAGE}&page=${page}&status=publish`,
    { headers: { Authorization: auth } }
  );
  if (!res.ok) throw new Error(`WordPress API error: ${res.status}`);
  const data = await res.json();

  const mapped = (Array.isArray(data) ? data : []).map(p => canonical({
    externalId:      p.id,
    name:            p.title?.rendered || p.slug || String(p.id),
    description:     p.excerpt?.rendered?.replace(/<[^>]*>/g, "") || "",
    price:           0,
    originalPrice:   null,
    currency:        null,
    stock:           null,
    category:        "Uncategorised",
    images:          p.featured_media_src_url ? [p.featured_media_src_url] : [],
    variants:        [],
    sourceProductUrl: p.link || null,
  }));

  const done = mapped.length < PER_PAGE;
  return {
    products:   mapped,
    nextCursor: done ? null : page + 1,
    done,
  };
}

// Etsy — offset-based pagination
async function _etsyPage(storeUrl, creds, cursor) {
  const { api_key, shop_id } = creds;
  const LIMIT = 100;
  const offset = cursor ? Number(cursor) : 0;

  const res = await integrationFetch(
    `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings/active?limit=${LIMIT}&offset=${offset}&includes=Images,MainImage,Variations`,
    { headers: { "x-api-key": api_key } }
  );
  if (!res.ok) throw new Error(`Etsy API error: ${res.status}`);
  const data = await res.json();
  const listings = data.results || [];

  const mapped = listings.map(p => {
    const priceVal = p.price ? (p.price.amount / p.price.divisor) : 0;
    const currency  = p.price?.currency_code || null;

    const images = [];
    if (p.MainImage?.url_fullxfull) images.push(p.MainImage.url_fullxfull);
    (p.Images || []).forEach(i => {
      if (i.url_fullxfull && !images.includes(i.url_fullxfull)) images.push(i.url_fullxfull);
    });

    const variants = (p.Variations || []).map(v => ({
      propertyId:   v.property_id,
      propertyName: v.property_name,
      valueId:      v.value_id,
      value:        v.value,
      isAvailable:  v.is_available,
    }));

    return canonical({
      externalId:      p.listing_id,
      name:            p.title,
      description:     p.description?.slice(0, 1000) || "",
      price:           priceVal,
      originalPrice:   null,
      currency,
      stock:           p.quantity,
      category:        p.taxonomy_path?.[0] || "Handmade",
      images,
      variants,
      sourceProductUrl: p.url || null,
    });
  });

  const done = mapped.length < LIMIT;
  return {
    products:   mapped,
    nextCursor: done ? null : offset + LIMIT,
    done,
  };
}

// Squarespace — cursor-based pagination
async function _squarespacePage(storeUrl, creds, cursor) {
  const { api_key } = creds;

  const url = cursor
    ? `https://api.squarespace.com/1.0/commerce/products?cursor=${encodeURIComponent(cursor)}`
    : "https://api.squarespace.com/1.0/commerce/products";

  const res = await integrationFetch(url, {
    headers: { Authorization: `Bearer ${api_key}`, "User-Agent": "Cheaper/1.0" },
  });
  if (!res.ok) throw new Error(`Squarespace API error: ${res.status}`);
  const data = await res.json();
  const products = data.products || [];

  const mapped = products.map(p => {
    const variants = (p.variants || []).map(v => ({
      id:            v.id,
      sku:           v.sku || null,
      price:         (v.priceMoney?.value ?? 0) / 100,
      originalPrice: (v.salePriceMoney?.value ?? 0) > 0 ? (v.salePriceMoney.value / 100) : null,
      stock:         p.isUnlimited ? null : (v.stock ?? 0),
      attributes:    v.attributes || {},
    }));

    const firstVariant = variants[0] || {};
    const price     = firstVariant.price ?? 0;
    const compareAt = firstVariant.originalPrice ?? 0;

    return canonical({
      externalId:      p.id,
      name:            p.name,
      description:     p.description?.replace(/<[^>]*>/g, "") || "",
      price,
      originalPrice:   compareAt > price ? compareAt : null,
      currency:        null,
      stock:           p.isUnlimited ? null : (firstVariant.stock ?? 0),
      category:        p.tags?.[0] || "Uncategorised",
      images:          (p.images || []).map(i => i.url).filter(Boolean),
      variants,
      sourceProductUrl: null,
    });
  });

  const nextCursor = data.pagination?.nextPageCursor || null;
  const done = !nextCursor || products.length === 0;
  return {
    products:   mapped,
    nextCursor: done ? null : nextCursor,
    done,
  };
}

// BigCommerce — page-based pagination
async function _bigcommercePage(storeUrl, creds, cursor) {
  const { store_hash, access_token, client_id } = creds;
  const page = cursor ? Number(cursor) : 1;
  const LIMIT = 250;

  const res = await integrationFetch(
    `https://api.bigcommerce.com/stores/${store_hash}/v3/catalog/products?include=images,variants&limit=${LIMIT}&page=${page}&is_visible=true`,
    {
      headers: {
        "X-Auth-Token":  access_token,
        "X-Auth-Client": client_id || "",
        "Content-Type":  "application/json",
      },
    }
  );
  if (!res.ok) throw new Error(`BigCommerce API error: ${res.status}`);
  const data = await res.json();
  const products = data.data || [];

  const mapped = products.map(p => {
    const variants = (p.variants || []).map(v => ({
      id:            v.id,
      sku:           v.sku || null,
      price:         v.price != null ? v.price : p.price,
      originalPrice: v.retail_price || null,
      stock:         v.inventory_level != null ? Number(v.inventory_level) : null,
      optionValues:  (v.option_values || []).map(o => ({ label: o.label, optionDisplayName: o.option_display_name })),
    }));

    return canonical({
      externalId:      p.id,
      name:            p.name,
      description:     p.description?.replace(/<[^>]*>/g, "") || "",
      price:           p.price || 0,
      originalPrice:   p.retail_price || null,
      currency:        null,
      stock:           p.inventory_tracking === "none" ? null : (p.inventory_level ?? null),
      category:        p.categories?.[0] ? String(p.categories[0]) : "Uncategorised",
      images:          (p.images || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(i => i.url_standard)
        .filter(Boolean),
      variants,
      sourceProductUrl: p.custom_url?.url ? `https://store-${store_hash}.mybigcommerce.com${p.custom_url.url}` : null,
    });
  });

  const meta = data.meta?.pagination;
  const done = !meta || meta.current_page >= meta.total_pages || mapped.length < LIMIT;
  return {
    products:   mapped,
    nextCursor: done ? null : page + 1,
    done,
  };
}

// PrestaShop — offset/limit pagination via filter[id] range
// Strategy: page through product IDs 1000 at a time, then fetch full data in batches
async function _prestashopPage(storeUrl, creds, cursor) {
  const { api_key } = creds;
  const auth = basicAuth(api_key, "");
  const ID_BATCH = 100;   // IDs to collect per page
  const DETAIL_BATCH = 50; // Products to fetch full detail per request

  // cursor = { offset: number } encoded as JSON string or null
  let offset = 0;
  if (cursor) {
    try { offset = JSON.parse(cursor).offset || 0; } catch { offset = Number(cursor) || 0; }
  }

  // Fetch one page of product IDs
  const idsRes = await integrationFetch(
    `${storeUrl}/api/products?output_format=JSON&limit=${offset},${ID_BATCH}&display=[id]&filter[active]=1`,
    { headers: { Authorization: auth } }
  );
  if (!idsRes.ok) throw new Error(`PrestaShop API error: ${idsRes.status}`);
  const idsData = await idsRes.json();
  const ids = (idsData.products || []).map(p => p.id);

  if (ids.length === 0) {
    return { products: [], nextCursor: null, done: true };
  }

  // Fetch full product details for this batch of IDs
  const products = [];
  for (let i = 0; i < ids.length; i += DETAIL_BATCH) {
    const batch = ids.slice(i, i + DETAIL_BATCH);
    const res = await integrationFetch(
      `${storeUrl}/api/products?output_format=JSON&display=full&filter[id]=[${batch.join("|")}]`,
      { headers: { Authorization: auth } }
    );
    if (!res.ok) throw new Error(`PrestaShop API error: ${res.status}`);
    const detail = await res.json();
    for (const p of detail.products || []) {
      const nameVal = typeof p.name === "object" ? Object.values(p.name)[0] : p.name;
      const descVal = typeof p.description_short === "object"
        ? Object.values(p.description_short)[0]
        : (p.description_short || "");

      // Combinations = variants in PrestaShop
      const variants = (p.associations?.combinations || []).map(c => ({
        id:    c.id,
        title: `Combination ${c.id}`,
      }));

      products.push(canonical({
        externalId:      p.id,
        name:            nameVal || `Product ${p.id}`,
        description:     descVal.replace(/<[^>]*>/g, ""),
        price:           parseFloat(p.price) || 0,
        originalPrice:   null,
        currency:        null,
        stock:           parseInt(p.quantity) || 0,
        category:        "Uncategorised",
        images:          [],
        variants,
        sourceProductUrl: p.link_rewrite
          ? `${storeUrl}/${typeof p.link_rewrite === "object" ? Object.values(p.link_rewrite)[0] : p.link_rewrite}`
          : null,
      }));
    }
  }

  const done = ids.length < ID_BATCH;
  return {
    products,
    nextCursor: done ? null : JSON.stringify({ offset: offset + ID_BATCH }),
    done,
  };
}

// Magento 2 — page-based pagination
async function _magento2Page(storeUrl, creds, cursor) {
  const { access_token } = creds;
  const headers = { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" };
  const PAGE_SIZE = 100;
  const page = cursor ? Number(cursor) : 1;

  const qs = new URLSearchParams({
    "searchCriteria[currentPage]": String(page),
    "searchCriteria[pageSize]":    String(PAGE_SIZE),
    "searchCriteria[filter_groups][0][filters][0][field]":          "status",
    "searchCriteria[filter_groups][0][filters][0][value]":          "1",
    "searchCriteria[filter_groups][0][filters][0][condition_type]": "eq",
    "fields": "items[id,sku,name,price,custom_attributes,media_gallery_entries,extension_attributes],total_count",
  });

  const res = await integrationFetch(`${storeUrl}/rest/V1/products?${qs}`, { headers });
  if (!res.ok) throw new Error(`Magento API error: ${res.status}`);
  const data = await res.json();
  const items = data.items || [];

  const mapped = items.map(p => {
    const attr = (code) => p.custom_attributes?.find(a => a.attribute_code === code)?.value;
    const price        = p.price || 0;
    const specialPrice = parseFloat(attr("special_price"));
    const images = (p.media_gallery_entries || [])
      .filter(m => m.media_type === "image" && !m.disabled)
      .map(m => `${storeUrl}/pub/media/catalog/product${m.file}`);

    // configurable_product_links may hold child product IDs (variants)
    const variantLinks = p.extension_attributes?.configurable_product_links || [];
    const variants = variantLinks.map(id => ({ id, title: `Variant ${id}` }));

    return canonical({
      externalId:      p.id,
      name:            p.name,
      description:     attr("short_description")?.replace(/<[^>]*>/g, "") || "",
      price:           specialPrice > 0 ? specialPrice : price,
      originalPrice:   specialPrice > 0 ? price : null,
      currency:        null,
      stock:           null, // requires separate /rest/V1/stockItems call
      category:        "Uncategorised",
      images,
      variants,
      sourceProductUrl: attr("url_key") ? `${storeUrl}/${attr("url_key")}.html` : null,
    });
  });

  const totalPages = Math.ceil((data.total_count || 0) / PAGE_SIZE);
  const done = page >= totalPages || items.length === 0;
  return {
    products:   mapped,
    nextCursor: done ? null : page + 1,
    done,
  };
}

// Ecwid — offset-based pagination
async function _ecwidPage(storeUrl, creds, cursor) {
  const { store_id, secret_token } = creds;
  const LIMIT = 100;
  const offset = cursor ? Number(cursor) : 0;

  const res = await integrationFetch(
    `https://app.ecwid.com/api/v3/${store_id}/products?limit=${LIMIT}&offset=${offset}&enabled=true`,
    { headers: { Authorization: `Bearer ${secret_token}` } },
  );
  if (!res.ok) throw new Error(`Ecwid API error: ${res.status}`);
  const data = await res.json();
  const items = data.items || [];

  const mapped = items.map(p => {
    const images = [];
    if (p.imageUrl) images.push(p.imageUrl);
    (p.galleryImages || []).forEach(i => { if (i.url) images.push(i.url); });

    const variants = (p.combinations || []).map(v => ({
      id:            v.id,
      sku:           v.sku || null,
      price:         v.price != null ? v.price : (p.defaultPrice || p.price || 0),
      stock:         v.unlimited ? null : (v.quantity ?? null),
      options:       (v.options || []).map(o => ({ name: o.name, value: o.value })),
    }));

    return canonical({
      externalId:      p.id,
      name:            p.name,
      description:     p.description?.replace(/<[^>]*>/g, "") || "",
      price:           p.defaultPrice || p.price || 0,
      originalPrice:   p.compareToPrice || null,
      currency:        null,
      stock:           p.unlimited ? null : (p.quantity ?? 0),
      category:        "Uncategorised",
      images,
      variants,
      sourceProductUrl: p.url || null,
    });
  });

  const done = items.length < LIMIT;
  return {
    products:   mapped,
    nextCursor: done ? null : offset + LIMIT,
    done,
  };
}
