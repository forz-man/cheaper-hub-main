import { createHash } from "node:crypto";

function cleanText(value, maxLength) {
  return String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function finiteMoney(value) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

function safeHttpsUrl(value) {
  try {
    const parsed = new URL(String(value));
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeVariants(variants, fallbackPrice) {
  if (!Array.isArray(variants)) return [];
  return variants.slice(0, 100).map((variant, index) => {
    const price = finiteMoney(variant?.price);
    const stock = Number(variant?.stock);
    return {
      id: cleanText(variant?.id || `variant-${index + 1}`, 200),
      sku: cleanText(variant?.sku, 200) || null,
      title: cleanText(variant?.title, 300) || null,
      price: price !== null && price >= 0 ? price : fallbackPrice,
      stock: Number.isInteger(stock) && stock >= 0 ? stock : null,
      options: variant?.options && typeof variant.options === "object" && !Array.isArray(variant.options)
        ? variant.options
        : {},
    };
  });
}

export function productChecksum(product) {
  const stable = JSON.stringify({
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    originalPrice: product.originalPrice,
    currency: product.currency,
    stock: product.stock,
    images: product.images,
    variants: product.variants,
    sourceProductUrl: product.sourceProductUrl,
  });
  return createHash("sha256").update(stable).digest("hex");
}

export function normalizeImportedProduct(raw, { platform } = {}) {
  const errors = [];
  const warnings = [];
  const externalId = cleanText(raw?.externalId, 300);
  const name = cleanText(raw?.name, 500);
  const description = cleanText(raw?.description, 5_000);
  const category = cleanText(raw?.category, 200) || "Uncategorised";
  const price = finiteMoney(raw?.price);
  let originalPrice = finiteMoney(raw?.originalPrice);
  const currency = cleanText(raw?.currency || "USD", 3).toUpperCase();

  if (!externalId) errors.push("Missing source product ID.");
  if (!name) errors.push("Missing product name.");
  if (price === null || price <= 0) errors.push("Price must be greater than zero.");
  if (!/^[A-Z]{3}$/.test(currency)) errors.push("Currency must be a three-letter code.");

  if (originalPrice !== null && originalPrice <= (price ?? 0)) {
    originalPrice = null;
    warnings.push("Original price was ignored because it was not greater than the sale price.");
  }

  let stock;
  if (raw?.stock === null || raw?.stock === undefined || raw?.stock === "") {
    stock = 0;
    warnings.push("Unknown stock was imported as out of stock.");
  } else {
    stock = Number(raw.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      errors.push("Stock must be a non-negative whole number.");
      stock = 0;
    }
  }

  const images = [...new Set(
    (Array.isArray(raw?.images) ? raw.images : [])
      .map(safeHttpsUrl)
      .filter(Boolean),
  )].slice(0, 12);
  const sourceProductUrl = safeHttpsUrl(raw?.sourceProductUrl);
  const variants = normalizeVariants(raw?.variants, price ?? 0);

  const product = {
    externalId,
    name,
    description,
    category,
    price: price ?? 0,
    originalPrice,
    currency,
    stock,
    images,
    variants,
    sourceProductUrl,
    platform: cleanText(platform, 50),
  };
  product.checksum = productChecksum(product);

  return {
    ok: errors.length === 0,
    product,
    errors,
    warnings,
  };
}

export function normalizeProductBatch(rawProducts, context) {
  const valid = [];
  const errors = [];
  const warnings = [];
  const seen = new Set();

  (Array.isArray(rawProducts) ? rawProducts : []).forEach((raw, index) => {
    const result = normalizeImportedProduct(raw, context);
    const externalId = result.product.externalId || `row-${index + 1}`;

    if (result.ok && seen.has(result.product.externalId)) {
      result.errors.push("Duplicate source product ID in this page.");
      result.ok = false;
    }
    if (result.ok) {
      seen.add(result.product.externalId);
      valid.push(result.product);
    } else {
      errors.push({
        row: index + 1,
        external_id: externalId,
        message: result.errors.join(" "),
      });
    }
    result.warnings.forEach((message) => {
      warnings.push({ row: index + 1, external_id: externalId, message });
    });
  });

  return { valid, errors, warnings };
}