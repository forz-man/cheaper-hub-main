// Central Supabase env resolution. Next.js inlines NEXT_PUBLIC_* at build/dev start —
// copy `.env.local.example` to `.env.local`, fill in your project keys, then restart.

const CONFIG_MESSAGE =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server.";

export function getSupabaseEnv() {
  return {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim(),
    anonKey: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim(),
    serviceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
  };
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseEnv();
  return url.startsWith("http") && anonKey.length > 0;
}

export function getSupabaseConfigError() {
  if (isSupabaseConfigured()) return null;
  return { message: CONFIG_MESSAGE, name: "SupabaseConfigError", status: 503 };
}
