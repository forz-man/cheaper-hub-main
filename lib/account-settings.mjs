export const SHARED_PROFILE_FIELDS = [
  "full_name",
  "phone_number",
  "location",
  "bio",
  "avatar_url",
  "email_notifications",
  "sms_notifications",
];

export const VENDOR_PROFILE_FIELDS = ["store_name", "website"];

function cleanText(value, maxLength) {
  if (typeof value !== "string") return undefined;
  return value.trim().slice(0, maxLength);
}

export function sanitizeProfileUpdates(input, role) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};

  const allowed = new Set([
    ...SHARED_PROFILE_FIELDS,
    ...(role === "vendor" ? VENDOR_PROFILE_FIELDS : []),
  ]);
  const result = {};

  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) continue;
    if (key === "email_notifications" || key === "sms_notifications") {
      if (typeof value === "boolean") result[key] = value;
      continue;
    }
    const maxLength = key === "bio" ? 1000 : key === "avatar_url" ? 2048 : 200;
    const cleaned = cleanText(value, maxLength);
    if (cleaned !== undefined) result[key] = cleaned;
  }

  if (Object.prototype.hasOwnProperty.call(result, "phone_number")) {
    result.phone = result.phone_number;
  }

  return result;
}

export function hasPasswordIdentity(user) {
  const providers = new Set([
    ...(Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers : []),
    ...(Array.isArray(user?.identities)
      ? user.identities.map((identity) => identity?.provider).filter(Boolean)
      : []),
  ]);
  return providers.has("email");
}

export function validatePasswordChangeInput({ currentPassword, password } = {}) {
  if (typeof currentPassword !== "string" || currentPassword.length === 0) {
    return "Current password is required.";
  }
  if (typeof password !== "string" || password.length < 8) {
    return "New password must be at least 8 characters.";
  }
  if (password === currentPassword) {
    return "New password must be different from your current password.";
  }
  return null;
}

export function getCanonicalAuthOrigin({ siteUrl, replitDevDomain } = {}) {
  const candidate =
    typeof siteUrl === "string" && siteUrl.trim()
      ? siteUrl.trim()
      : typeof replitDevDomain === "string" && replitDevDomain.trim()
        ? `https://${replitDevDomain.trim()}`
        : "";
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || !url.hostname) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isVerifiedRecoveryEvent(event, session) {
  return event === "PASSWORD_RECOVERY" && !!session?.user?.id;
}
