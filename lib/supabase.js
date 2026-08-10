import { createBrowserClient } from "@supabase/ssr";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const trimmedUrl = typeof rawUrl === "string" ? rawUrl.trim() : "";
const trimmedAnonKey = typeof rawAnonKey === "string" ? rawAnonKey.trim() : "";

// Keep the client importable during local setup without inventing users or
// data. Missing configuration produces normal Supabase errors.
const supabaseUrl =
  trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")
    ? trimmedUrl.replace(/\/+$/, "")
    : "https://invalid.supabase.co";
const supabaseAnonKey = trimmedAnonKey || "invalid-anon-key";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      "x-client-info": "cheaper-web",
    },
  },
});