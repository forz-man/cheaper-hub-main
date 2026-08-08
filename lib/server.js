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

  const supabaseUrl = isValidUrl ? trimmedUrl.replace(/\/+$/, "") : "https://placeholder.supabase.co";
  const supabaseAnonKey = isValidKey ? trimmedAnonKey : "placeholder-key";

  let supabase;
  try {
    supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
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
      }
    );
  } catch (e) {
    console.error("Failed to initialize server Supabase client, falling back to placeholder:", e);
    supabase = createServerClient(
      "https://placeholder.supabase.co",
      "placeholder-key",
      {
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
      }
    );
  }

  const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
  const originalGetUser = supabase.auth.getUser.bind(supabase.auth);

  supabase.auth.getSession = async () => {
    try {
      const res = await originalGetSession();
      if (res.data?.session) return res;
    } catch {}

    try {
      const cookieVal = cookieStore.get("cheaper_mock_session")?.value;
      if (cookieVal) {
        const session = JSON.parse(decodeURIComponent(cookieVal));
        return { data: { session }, error: null };
      }
    } catch {}
    return { data: { session: null }, error: null };
  };

  supabase.auth.getUser = async () => {
    try {
      const res = await originalGetUser();
      if (res.data?.user) return res;
    } catch {}

    try {
      const cookieVal = cookieStore.get("cheaper_mock_session")?.value;
      if (cookieVal) {
        const session = JSON.parse(decodeURIComponent(cookieVal));
        return { data: { user: session?.user || null }, error: null };
      }
    } catch {}
    return { data: { user: null }, error: null };
  };

  return supabase;
}