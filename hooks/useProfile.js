import { useState, useEffect } from "react";
import useAuth from "@/hooks/useAuth";

export default function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not load your profile.");
        setProfile(payload.profile);
        setError(null);
      } catch (err) {
        console.warn("Error loading profile from Supabase:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user?.id, user?.email, authLoading]);

  const updateProfile = async (updates) => {
    if (!profile || !user) return { error: "No profile or user loaded" };
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not update your profile.");
      setProfile(payload.profile);
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: payload.profile }));
      return { data: payload.profile, error: null };
    } catch (err) {
      console.warn("Error updating profile in Supabase:", err);
      return { error: err };
    }
  };

  return { profile, loading, error, updateProfile, setProfile };
}
