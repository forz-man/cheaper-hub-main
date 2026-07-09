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
