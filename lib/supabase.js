import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
  // NEXT_PUBLIC_SUPABASE_URL is missing or invalid
}

export const supabase = supabaseUrl?.startsWith("http")
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null;
