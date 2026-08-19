import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";

const FIXED_SOURCE_URLS = {
  wix: "https://www.wix.com",
  squarespace: null,
};

export class IntegrationRequestError extends Error {
  constructor(message, { code = "UPSTREAM_ERROR", status = null, retryable = false } = {}) {
    super(message);
    this.name = "IntegrationRequestError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function isPrivateIpv4(address) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b, c] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isPrivateIpv6(address) {
  const normalized = address.toLowerCase().split("%")[0];
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("2001:db8:")
  ) {
    return true;
  }

  if (normalized.startsWith("::ffff:")) {
    return isPrivateIpv4(normalized.slice(7));
  }

  return false;
}

export function isPrivateAddress(address) {
  const family = isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
}

export function assertSafePublicUrl(input) {
  let url;
  try {
    url = input instanceof URL ? new URL(input) : new URL(String(input));
  } catch {
    throw new Error("Enter a valid store URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Store URLs must use HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("Store URLs cannot contain embedded credentials.");
  }
  if (url.port && url.port !== "443") {
    throw new Error("Store URLs cannot use a custom port.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("The store hostname is not allowed.");
  }
  if (isIP(hostname) && isPrivateAddress(hostname)) {
    throw new Error("Private network store addresses are not allowed.");
  }

  return url;
}

function cleanIdentifier(value, label) {
  const normalized = String(value || "").trim();
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(normalized)) {
    throw new Error(`${label} contains unsupported characters.`);
  }
  return normalized;
}

export function canonicalizeStoreUrl(platform, input, credentials = {}) {
  if (platform === "wix") return FIXED_SOURCE_URLS.wix;
  if (platform === "etsy") {
    const shopId = cleanIdentifier(credentials.shop_id, "Shop ID");
    return `https://www.etsy.com/shop/${encodeURIComponent(shopId)}`;
  }
  if (platform === "bigcommerce") {
    const storeHash = cleanIdentifier(credentials.store_hash, "Store hash");
    return `https://${storeHash}.mybigcommerce.com`;
  }
  if (platform === "ecwid") {
    const storeId = cleanIdentifier(credentials.store_id, "Store ID");
    return `https://app.ecwid.com/store/${encodeURIComponent(storeId)}`;
  }

  const url = assertSafePublicUrl(input);
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (platform === "shopify") {
    const hostname = url.hostname.toLowerCase();
    if (!hostname.endsWith(".myshopify.com") || hostname === "myshopify.com") {
      throw new Error("Use the store's .myshopify.com domain.");
    }
    url.pathname = "/";
  }

  return url.toString().replace(/\/$/, "");
}

async function resolvePublicAddress(hostname) {
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new IntegrationRequestError("The store address is not publicly reachable.", {
        code: "UNSAFE_ADDRESS",
      });
    }
    return { address: hostname, family: isIP(hostname) };
  }

  let addresses;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new IntegrationRequestError("The store hostname could not be resolved.", {
      code: "DNS_ERROR",
      retryable: true,
    });
  }

  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new IntegrationRequestError("The store address is not publicly reachable.", {
      code: "UNSAFE_ADDRESS",
    });
  }
  return addresses[0];
}

function retryDelay(response, attempt) {
  const retryAfter = Number(response?.headers?.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(retryAfter * 1000, 3_000);
  }
  return Math.min(250 * (2 ** attempt), 2_000);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pinnedHttpsRequest(url, options, timeoutMs) {
  const resolved = await resolvePublicAddress(url.hostname);
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const timer = setTimeout(() => {
      request.destroy();
      fail(new IntegrationRequestError("The store request timed out.", {
        code: "TIMEOUT",
        retryable: true,
      }));
    }, timeoutMs);

    const request = httpsRequest(url, {
      method: options.method || "GET",
      headers: options.headers,
      servername: url.hostname,
      lookup(_hostname, lookupOptions, callback) {
        if (lookupOptions?.all) {
          callback(null, [resolved]);
        } else {
          callback(null, resolved.address, resolved.family);
        }
      },
    }, (response) => {
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
        if (size > 20 * 1024 * 1024) {
          request.destroy();
          fail(new IntegrationRequestError("The store response was too large.", {
            code: "RESPONSE_TOO_LARGE",
          }));
          return;
        }
        chunks.push(chunk);
      });
      response.on("error", () => {
        fail(new IntegrationRequestError("The store response was interrupted.", {
          code: "NETWORK_ERROR",
          retryable: true,
        }));
      });
      response.on("end", () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const headers = new Headers();
        for (let index = 0; index < response.rawHeaders.length; index += 2) {
          headers.append(response.rawHeaders[index], response.rawHeaders[index + 1]);
        }
        resolve(new Response(Buffer.concat(chunks), {
          status: response.statusCode || 500,
          statusText: response.statusMessage || "",
          headers,
        }));
      });
    });

    request.on("error", (error) => {
      clearTimeout(timer);
      if (settled) return;
      fail(new IntegrationRequestError(
        error?.code === "ECONNRESET" ? "The store request timed out." : "The store could not be reached.",
        {
          code: error?.code === "ECONNRESET" ? "TIMEOUT" : "NETWORK_ERROR",
          retryable: true,
        },
      ));
    });

    if (options.body !== undefined && options.body !== null) {
      if (
        typeof options.body !== "string" &&
        !Buffer.isBuffer(options.body) &&
        !(options.body instanceof Uint8Array)
      ) {
        clearTimeout(timer);
        request.destroy();
        fail(new IntegrationRequestError("The store request body format is unsupported."));
        return;
      }
      request.write(options.body);
    }
    request.end();
  });
}

async function fetchWithRedirects(url, options, maxRedirects, timeoutMs) {
  let current = assertSafePublicUrl(url);

  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    let response;
    try {
      response = await pinnedHttpsRequest(current, options, timeoutMs);
    } catch (error) {
      if (error instanceof IntegrationRequestError) throw error;
      throw new IntegrationRequestError("The store could not be reached.", {
        code: "NETWORK_ERROR",
        retryable: true,
      });
    }

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location || redirects === maxRedirects) {
      throw new IntegrationRequestError("The store returned too many redirects.", {
        code: "REDIRECT_ERROR",
      });
    }
    const next = assertSafePublicUrl(new URL(location, current));
    if (next.origin !== current.origin) {
      throw new IntegrationRequestError("The store redirected to a different host.", {
        code: "UNSAFE_REDIRECT",
      });
    }
    current = next;
  }

  throw new IntegrationRequestError("The store request could not be completed.");
}

export async function integrationFetch(input, options = {}) {
  const {
    timeoutMs = 12_000,
    maxRetries = 2,
    maxRedirects = 3,
    ...fetchOptions
  } = options;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetchWithRedirects(input, fetchOptions, maxRedirects, timeoutMs);
      const retryableStatus = response.status === 429 || response.status >= 500;
      if (!retryableStatus || attempt === maxRetries) return response;
      await sleep(retryDelay(response, attempt));
    } catch (error) {
      lastError = error;
      if (!error?.retryable || attempt === maxRetries) throw error;
      await sleep(Math.min(250 * (2 ** attempt), 2_000));
    }
  }

  throw lastError || new IntegrationRequestError("The store request could not be completed.");
}

export default integrationFetch;