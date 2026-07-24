"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

// ── Session idle-expiry ────────────────────────────────────────────────────────
// Supabase refresh tokens never expire by default, so we track the last time
// the user visited. If it's been longer than IDLE_DAYS without opening the app,
// we sign them out on the next visit so sessions don't linger forever.
const IDLE_DAYS   = 7;
const LAST_SEEN_KEY = "ch_last_seen";

function checkAndUpdateIdle() {
  try {
    const raw = localStorage.getItem(LAST_SEEN_KEY);
    const now = Date.now();
    if (raw) {
      const daysSince = (now - parseInt(raw, 10)) / 86_400_000;
      if (daysSince > IDLE_DAYS) return true; // expired — caller should sign out
    }
    localStorage.setItem(LAST_SEEN_KEY, String(now));
    return false;
  } catch {
    return false; // SSR / private-mode storage blocked — ignore
  }
}

function clearIdle() {
  try { localStorage.removeItem(LAST_SEEN_KEY); } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    async function initAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("[AuthProvider] getSession:", session?.user?.email || "no session");

      if (session?.user) {
        const expired = checkAndUpdateIdle();
        if (expired) {
          console.log("[AuthProvider] Session expired (idle), signing out");
          await supabase.auth.signOut();
          clearIdle();
          setUser(null);
        } else {
          // Use getUser() (network request) over getSession() (cached JWT)
          // so metadata changes (e.g. role update by admin) are reflected.
          const { data: { user: latestUser } } = await supabase.auth.getUser();
          console.log("[AuthProvider] getUser:", latestUser?.email || "no user");
          setUser(latestUser || session.user);
        }
      } else {
        clearIdle();
        setUser(null);
      }
      setLoading(false);
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[AuthProvider] onAuthStateChange:", event, session?.user?.email || "no session");
      if (session?.user) {
        checkAndUpdateIdle();
        setUser(session.user);
      } else {
        clearIdle();
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
