import { createBrowserClient } from "@supabase/ssr";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const trimmedUrl = typeof rawUrl === "string" ? rawUrl.trim() : "";
const trimmedAnonKey = typeof rawAnonKey === "string" ? rawAnonKey.trim() : "";

const isValidUrl = trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://");
const isValidKey = trimmedAnonKey.length > 0;

const supabaseUrl = isValidUrl ? trimmedUrl.replace(/\/+$/, "") : "https://placeholder.supabase.co";
const supabaseAnonKey = isValidKey ? trimmedAnonKey : "placeholder-key";

const isPlaceholder = !isValidUrl || !isValidKey;

let initializedClient;
try {
  initializedClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'x-client-info': 'cheaper-web',
      },
    },
  });
} catch (e) {
  console.warn("Failed to initialize Supabase client, falling back to placeholder:", e);
  initializedClient = createBrowserClient("https://placeholder.supabase.co", "placeholder-key");
}

export const supabase = initializedClient;

if (isPlaceholder) {
  supabase.__isFallback = true;

  // Mock implementation of supabase.auth
  const listeners = new Set();

  const getMockSession = () => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("cheaper_fallback_session");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const setMockSession = (session) => {
    if (typeof window === "undefined") return;
    try {
      if (session) {
        localStorage.setItem("cheaper_fallback_session", JSON.stringify(session));
        document.cookie = `cheaper_mock_session=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=604800; SameSite=Lax`;
      } else {
        localStorage.removeItem("cheaper_fallback_session");
        document.cookie = "cheaper_mock_session=; path=/; max-age=0; SameSite=Lax";
      }
    } catch {}
    listeners.forEach((cb) => cb(session ? "SIGNED_IN" : "SIGNED_OUT", session));
  };

  supabase.auth = {
    async getSession() {
      const session = getMockSession();
      return { data: { session }, error: null };
    },
    async getUser() {
      const session = getMockSession();
      return { data: { user: session?.user || null }, error: null };
    },
    async signInWithPassword({ email, password }) {
      let isUnconfirmed = email && email.toLowerCase().startsWith("unconfirmed");
      if (typeof window !== "undefined") {
        try {
          const unconfirmed = JSON.parse(localStorage.getItem("cheaper_unconfirmed_emails") || "[]");
          if (email && unconfirmed.includes(email.toLowerCase())) {
            isUnconfirmed = true;
          }
        } catch {}
      }

      if (isUnconfirmed) {
        return { data: null, error: { message: "Email not confirmed" } };
      }

      const user = {
        id: "mock-user-id-12345",
        email: email || "user@example.com",
        email_confirmed_at: "2026-08-05T12:00:00Z",
        user_metadata: {
          full_name: email ? email.split("@")[0] : "Mock User",
          role: email?.includes("vendor") ? "vendor" : "buyer",
        },
        app_metadata: {
          role: email?.includes("vendor") ? "vendor" : "buyer",
        },
      };
      const session = {
        access_token: "mock-access-token",
        user,
      };
      setMockSession(session);
      return { data: { session, user }, error: null };
    },
    async signUp({ email, password, options }) {
      const role = options?.data?.role || "buyer";
      const fullName = options?.data?.full_name || "Mock User";
      
      if (typeof window !== "undefined" && email) {
        try {
          const unconfirmed = JSON.parse(localStorage.getItem("cheaper_unconfirmed_emails") || "[]");
          if (!unconfirmed.includes(email.toLowerCase())) {
            unconfirmed.push(email.toLowerCase());
            localStorage.setItem("cheaper_unconfirmed_emails", JSON.stringify(unconfirmed));
          }
        } catch {}
      }

      const user = {
        id: "mock-user-id-12345",
        email: email || "user@example.com",
        email_confirmed_at: null,
        user_metadata: {
          full_name: fullName,
          role: role,
        },
        app_metadata: {
          role: role,
        },
      };
      return { data: { session: null, user }, error: null };
    },
    async resend({ type, email, options }) {
      console.log(`[Mock Supabase] Resending verification email to ${email}`);
      return { data: {}, error: null };
    },
    async signOut() {
      setMockSession(null);
      return { error: null };
    },
    onAuthStateChange(callback) {
      listeners.add(callback);
      const session = getMockSession();
      setTimeout(() => {
        callback(session ? "SIGNED_IN" : "INITIAL_SESSION", session);
      }, 0);
      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners.delete(callback);
            },
          },
        },
      };
    },
    async resetPasswordForEmail(email, options) {
      return { data: {}, error: null };
    },
    async signInWithOAuth({ provider, options }) {
      const user = {
        id: "mock-user-id-oauth",
        email: "oauth-user@example.com",
        email_confirmed_at: "2026-08-05T12:00:00Z",
        user_metadata: {
          full_name: "OAuth User",
          role: "buyer",
        },
        app_metadata: {
          role: "buyer",
        },
      };
      const session = {
        access_token: "mock-access-token",
        user,
      };
      setMockSession(session);
      return { data: { provider, url: options?.redirectTo || "/" }, error: null };
    },
  };

  supabase.from = () => {
    const builder = {
      select() { return builder; },
      eq() { return builder; },
      neq() { return builder; },
      or() { return builder; },
      lte() { return builder; },
      gte() { return builder; },
      order() { return builder; },
      limit() { return builder; },
      single() {
        return Promise.resolve({ data: null, error: null });
      },
      then(onfulfilled) {
        return Promise.resolve({ data: [], error: null }).then(onfulfilled);
      },
    };
    return builder;
  };
} else {
  if (typeof window !== "undefined") {
    const getMockSession = () => {
      try {
        const stored = localStorage.getItem("cheaper_fallback_session");
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    };

    const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
    const originalGetUser = supabase.auth.getUser.bind(supabase.auth);

    supabase.auth.getSession = async () => {
      try {
        const res = await originalGetSession();
        if (res.data?.session) return res;
      } catch {}
      
      const mockSession = getMockSession();
      if (mockSession) {
        return { data: { session: mockSession }, error: null };
      }
      return { data: { session: null }, error: null };
    };

    supabase.auth.getUser = async () => {
      try {
        const res = await originalGetUser();
        if (res.data?.user) return res;
      } catch {}

      const mockSession = getMockSession();
      if (mockSession?.user) {
        return { data: { user: mockSession.user }, error: null };
      }
      return { data: { user: null }, error: null };
    };
  }
}
