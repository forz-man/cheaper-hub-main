import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
  console.error(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL is missing or invalid. It should look like https://xxxx.supabase.co"
  );
}

export const supabase = supabaseUrl?.startsWith("http")
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null;
