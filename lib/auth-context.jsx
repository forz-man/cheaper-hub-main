"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabase";
import { isVerifiedRecoveryEvent } from "./account-settings.mjs";

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
  const [recoverySession, setRecoverySession] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("[AuthProvider] getSession:", session?.user?.email || "no session");

        if (session?.user) {
          const expired = checkAndUpdateIdle();
          if (expired) {
            console.log("[AuthProvider] Session expired (idle), signing out");
            try {
              await supabase.auth.signOut();
            } catch (err) {
              console.warn("[AuthProvider] signOut failed:", err);
            }
            clearIdle();
            setUser(null);
          } else {
            // Use getUser() (network request) over getSession() (cached JWT)
            // so metadata changes (e.g. role update by admin) are reflected.
            try {
              const { data: { user: latestUser } } = await supabase.auth.getUser();
              console.log("[AuthProvider] getUser:", latestUser?.email || "no user");
              setUser(latestUser || session.user);
            } catch (err) {
              console.warn("[AuthProvider] getUser failed:", err);
              setUser(session.user);
            }
          }
        } else {
          clearIdle();
          setUser(null);
        }
      } catch (error) {
        console.warn("[AuthProvider] initAuth error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    let subscription;
    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        console.log("[AuthProvider] onAuthStateChange:", event, session?.user?.email || "no session");
        if (session?.user) {
          if (isVerifiedRecoveryEvent(event, session)) setRecoverySession(true);
          checkAndUpdateIdle();
          setUser(session.user);
        } else {
          setRecoverySession(false);
          clearIdle();
          setUser(null);
        }
        setLoading(false);
      });
      subscription = data?.subscription;
    } catch (error) {
      console.warn("[AuthProvider] onAuthStateChange error:", error);
      setTimeout(() => setLoading(false), 0);
    }

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (err) {
          console.warn("[AuthProvider] unsubscribe error:", err);
        }
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, recoverySession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
