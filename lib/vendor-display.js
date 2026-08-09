export function mergeVendorProfiles(products = [], profiles = []) {
  const profileById = new Map(profiles.map((profile) => [String(profile.id), profile]));

  return products.map((product) => {
    const profile = profileById.get(String(product.vendor_id));
    if (!profile) return product;

    return {
      ...product,
      vendor_name: profile.store_name || profile.full_name || product.vendor_name,
      vendor_avatar_url: profile.avatar_url || null,
      seller_email: profile.email || product.seller_email,
      seller_phone: profile.phone_number || profile.phone || product.seller_phone,
      seller_location: profile.location || product.seller_location,
      seller_about: profile.bio || product.seller_about,
    };
  });
}

export function mergeVendorProfile(product, profile) {
  return mergeVendorProfiles([product], profile ? [profile] : [])[0];
}