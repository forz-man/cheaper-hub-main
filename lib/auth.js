import { supabase } from "./supabase";

function pendingReturnTo() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("cheaper_pending_auth_intent");
    const intent = raw ? JSON.parse(raw) : null;
    const value = intent?.returnTo;
    return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
      ? value
      : null;
  } catch {
    return null;
  }
}

function oauthCallbackUrl(role) {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  const next = pendingReturnTo();
  if (next) params.set("next", next);
  const query = params.toString();
  return `${window.location.origin}/api/auth/callback${query ? `?${query}` : ""}`;
}

function getClient() {
  if (!supabase) {
    console.warn("Supabase client is not initialized. Check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY secrets.");
    return {
      auth: {
        signUp: async () => ({ data: { session: null, user: null }, error: { message: "Supabase client not initialized" } }),
        signInWithPassword: async () => ({ data: { session: null, user: null }, error: { message: "Supabase client not initialized" } }),
        signOut: async () => ({ error: null }),
      }
    };
  }
  return supabase;
}

export async function login(email, password) {
  return await getClient().auth.signInWithPassword({ email, password });
}

export async function register({ email, password, fullName, role }) {
  return await getClient().auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

export async function logout() {
  return await getClient().auth.signOut();
}

export async function loginWithGoogle(role) {
  const redirectTo = oauthCallbackUrl(role);
  console.log("[loginWithGoogle] redirectTo:", redirectTo, "role:", role);
  const result = await getClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  console.log("[loginWithGoogle] signInWithOAuth result:", result.data, result.error);
  return result;
}

export async function loginWithApple(role) {
  const redirectTo = oauthCallbackUrl(role);
  return await getClient().auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo },
  });
}

export async function forgotPassword(email) {
  return await getClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export async function getCurrentUser() {
  return await getClient().auth.getUser();
}

// Single source of truth for role resolution. Precedence: user_metadata,
// then app_metadata, then the profiles table row (passed in by the caller,
// since fetching it requires a DB round-trip). Returns null if no role is
// set anywhere — callers should send the user to /select-role in that case,
// never assign a default.
export function resolveUserRole(user, profileRole) {
  return (
    profileRole ||
    user?.user_metadata?.role ||
    user?.app_metadata?.role ||
    null
  );
}

// Maps a resolved role to where the user should land. Unknown/missing roles
// go to /select-role — never assigned a default.
export function destinationForRole(role) {
  if (role === "buyer") return "/dashboard/buyer";
  if (role === "vendor") return "/dashboard/vendor";
  if (role === "admin") return "/dashboard/admin";
  return "/select-role?from=oauth";
}

// Builds a link into the right dashboard, optionally deep-linked to a tab
// (e.g. "orders", "settings", "wishlist"). Falls back to the role-resolving
// /dashboard route when the role isn't known yet client-side — that route
// forwards the tab param once it resolves the user's role.
export function dashboardTabHref(role, tab) {
  let base;
  if (role === "buyer") base = "/dashboard/buyer";
  else if (role === "vendor") base = "/dashboard/vendor";
  else if (role === "admin") base = "/dashboard/admin";
  else base = "/dashboard";
  return tab ? `${base}?tab=${tab}` : base;
}
