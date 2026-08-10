import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";


export async function createClient() {
  const cookieStore = await cookies();

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const trimmedUrl = typeof rawUrl === "string" ? rawUrl.trim() : "";
  const trimmedAnonKey = typeof rawAnonKey === "string" ? rawAnonKey.trim() : "";

  const isValidUrl = trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://");
  const isValidKey = trimmedAnonKey.length > 0;

  const supabaseUrl = isValidUrl
    ? trimmedUrl.replace(/\/+$/, "")
    : "https://invalid.supabase.co";
  const supabaseAnonKey = isValidKey ? trimmedAnonKey : "invalid-anon-key";

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}