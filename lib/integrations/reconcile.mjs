export function classifyImportedProduct(existing, incomingChecksum) {
  if (!existing) return "created";
  if (existing.source_archived_at) return "updated";
  return existing.source_checksum === incomingChecksum ? "unchanged" : "updated";
}

export function buildImportedProductRow(
  product,
  { connection, vendorId, vendorName, seenAt, now = new Date().toISOString() },
) {
  return {
    vendor_id: vendorId,
    vendor_name: vendorName,
    name: product.name,
    description: product.description || "",
    price: product.price,
    original_price: product.originalPrice,
    stock: product.stock,
    status: product.stock === 0 ? "out_of_stock" : "active",
    category: product.category,
    images: product.images,
    external_id: product.externalId,
    source_platform: connection.platform,
    source_url: product.sourceProductUrl || connection.store_url,
    source_connection_id: connection.id,
    source_last_seen_at: seenAt,
    source_archived_at: null,
    source_checksum: product.checksum,
    currency: product.currency,
    source_variants: product.variants,
    updated_at: now,
  };
}

export function shouldArchiveSourceProduct(product, { connectionId, syncStartedAt }) {
  if (!product || product.source_connection_id !== connectionId) return false;
  if (!product.source_last_seen_at) return true;
  return new Date(product.source_last_seen_at).getTime() < new Date(syncStartedAt).getTime();
}