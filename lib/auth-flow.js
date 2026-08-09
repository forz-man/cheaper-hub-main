"use client";

/**
 * Client-side auth intent storage.
 *
 * Public pages stay browseable. Before a gated action sends a visitor to
 * /login, we keep the action and its context in sessionStorage. The
 * AuthIntentResume component (mounted after AuthProvider + CartProvider)
 * consumes it once the user is authenticated and back on the original page.
 */
const INTENT_KEY = "cheaper_pending_auth_intent";
const MAX_INTENT_AGE_MS = 30 * 60 * 1000;

function isSafeReturnTo(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

export function currentReturnTo() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function normalizeReturnTo(value, fallback = "/dashboard") {
  return isSafeReturnTo(value) ? value : fallback;
}

export function saveAuthIntent({ type, context = {}, returnTo = currentReturnTo() }) {
  if (typeof window === "undefined" || !type) return;

  try {
    sessionStorage.setItem(
      INTENT_KEY,
      JSON.stringify({
        type,
        context,
        returnTo: normalizeReturnTo(returnTo, "/"),
        createdAt: Date.now(),
      }),
    );
  } catch {
    // Private browsing/storage-disabled environments still get the login flow.
  }
}

export function getAuthIntent() {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const intent = JSON.parse(raw);
    if (!intent?.type || Date.now() - Number(intent.createdAt) > MAX_INTENT_AGE_MS) {
      sessionStorage.removeItem(INTENT_KEY);
      return null;
    }
    return intent;
  } catch {
    return null;
  }
}

export function clearAuthIntent() {
  try {
    sessionStorage.removeItem(INTENT_KEY);
  } catch {
    // Ignore storage errors.
  }
}

/**
 * Save the gated action before navigating. `next` is also included in the
 * URL so route middleware and the login page preserve the exact return page.
 */
export function requireAuth(router, { type, context = {}, returnTo = currentReturnTo() }) {
  const safeReturnTo = normalizeReturnTo(returnTo, "/");
  saveAuthIntent({ type, context, returnTo: safeReturnTo });
  router.push(`/login?next=${encodeURIComponent(safeReturnTo)}`);
}
