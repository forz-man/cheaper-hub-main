export const SELLER_TYPES = ["individual", "business"];
export const VERIFICATION_STATUSES = ["not_submitted", "pending", "approved", "declined"];

export function getVendorBadge(sellerType, verificationStatus) {
  if (verificationStatus !== "approved") return null;

  if (sellerType === "business") {
    return {
      label: "Verified Business",
      tone: "business",
    };
  }

  if (sellerType === "individual") {
    return {
      label: "Verified Seller",
      tone: "individual",
    };
  }

  return null;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function validPhone(value) {
  return /^[+()\-\s0-9]{7,25}$/.test(value);
}

function validWebsite(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateVendorVerification(input, { hasIdentityDocument = false } = {}) {
  const sellerType = cleanText(input?.seller_type, 20);
  const values = {
    seller_type: sellerType,
    full_name: cleanText(input?.full_name, 120),
    phone_number: cleanText(input?.phone_number, 30),
    location: cleanText(input?.location, 160),
    store_name: cleanText(input?.store_name, 160),
    business_category: cleanText(input?.business_category, 120),
    business_registration_details: cleanText(input?.business_registration_details, 300),
    business_description: cleanText(input?.business_description, 1200),
    website: cleanText(input?.website, 300),
    additional_notes: cleanText(input?.additional_notes, 1200),
  };
  const errors = {};

  if (!SELLER_TYPES.includes(sellerType)) {
    errors.seller_type = "Choose whether you are selling as an individual or a business.";
  }
  if (!values.full_name) errors.full_name = "Full name is required.";
  if (!values.phone_number) {
    errors.phone_number = "Phone number is required.";
  } else if (!validPhone(values.phone_number)) {
    errors.phone_number = "Enter a valid phone number.";
  }
  if (!values.location) errors.location = "Location is required.";
  if (!hasIdentityDocument) errors.identity_document = "A government-issued identity document is required.";

  if (sellerType === "business") {
    if (!values.store_name) errors.store_name = "Store or business name is required.";
    if (!values.business_category) errors.business_category = "Business category is required.";
    if (!values.business_registration_details) {
      errors.business_registration_details = "Business registration details are required.";
    }
    if (!validWebsite(values.website)) {
      errors.website = "Enter a complete website or social link starting with http:// or https://.";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values,
  };
}