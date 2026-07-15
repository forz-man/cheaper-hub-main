import { supabase } from "./supabase";

function getClient() {
  if (!supabase) throw new Error("Supabase is not configured. Check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY secrets.");
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

export async function loginWithGoogle() {
  return await getClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/api/auth/callback` },
  });
}

export async function loginWithApple() {
  return await getClient().auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: `${window.location.origin}/api/auth/callback` },
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
    user?.user_metadata?.role ||
    user?.app_metadata?.role ||
    profileRole ||
    null
  );
}

// Maps a resolved role to where the user should land. Admins share the
// vendor dashboard. Unknown/missing roles go to /select-role — never
// assigned a default.
export function destinationForRole(role) {
  if (role === "buyer") return "/dashboard/buyer";
  if (role === "vendor" || role === "admin") return "/dashboard/vendor";
  return "/select-role?from=oauth";
}

// Builds a link into the right dashboard, optionally deep-linked to a tab
// (e.g. "orders", "settings", "wishlist"). Falls back to the role-resolving
// /dashboard route when the role isn't known yet client-side — that route
// forwards the tab param once it resolves the user's role.
export function dashboardTabHref(role, tab) {
  let base;
  if (role === "buyer") base = "/dashboard/buyer";
  else if (role === "vendor" || role === "admin") base = "/dashboard/vendor";
  else base = "/dashboard";
  return tab ? `${base}?tab=${tab}` : base;
}
