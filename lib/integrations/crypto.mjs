import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ENVELOPE_VERSION = 1;
const ALGORITHM = "aes-256-gcm";
const KEY_CONTEXT = "cheaper:store-integration-credentials:v1";

function getEncryptionKey(secret = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.SESSION_SECRET) {
  if (typeof secret !== "string" || secret.trim().length < 32) {
    throw new Error("Store integration encryption is not configured.");
  }

  return createHash("sha256")
    .update(KEY_CONTEXT)
    .update("\0")
    .update(secret.trim())
    .digest();
}

function assertCredentialObject(credentials) {
  if (!credentials || typeof credentials !== "object" || Array.isArray(credentials)) {
    throw new TypeError("Credentials must be an object.");
  }
}

export function encryptCredentials(credentials, secret) {
  assertCredentialObject(credentials);

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(secret), iv);
  const plaintext = Buffer.from(JSON.stringify(credentials), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    v: ENVELOPE_VERSION,
    alg: "A256GCM",
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    data: ciphertext.toString("base64url"),
  });
}

export function decryptCredentials(envelope, secret) {
  if (typeof envelope !== "string" || envelope.length === 0) {
    throw new Error("Stored integration credentials are unavailable.");
  }

  let parsed;
  try {
    parsed = JSON.parse(envelope);
  } catch {
    throw new Error("Stored integration credentials are invalid.");
  }

  if (
    parsed?.v !== ENVELOPE_VERSION ||
    parsed?.alg !== "A256GCM" ||
    typeof parsed.iv !== "string" ||
    typeof parsed.tag !== "string" ||
    typeof parsed.data !== "string"
  ) {
    throw new Error("Stored integration credentials use an unsupported format.");
  }

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      getEncryptionKey(secret),
      Buffer.from(parsed.iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(parsed.tag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(parsed.data, "base64url")),
      decipher.final(),
    ]);
    const credentials = JSON.parse(plaintext.toString("utf8"));
    assertCredentialObject(credentials);
    return credentials;
  } catch {
    throw new Error("Stored integration credentials could not be decrypted.");
  }
}

export function hasLegacyCredentials(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0,
  );
}