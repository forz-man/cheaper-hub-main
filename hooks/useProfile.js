import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          // If profile row doesn't exist, insert a real profile record into the database
          if (error.code === "PGRST116" || error.message?.includes("no rows") || error.message?.includes("JSON object")) {
            console.log("Profile not found in DB, creating real profile row for user:", user.id);
            
            const email = user.email || "";
            const username = email ? email.split("@")[0] : "user";
            const fullName = user.user_metadata?.full_name || user.user_metadata?.name || username || "User";
            const role = user.user_metadata?.role || user.app_metadata?.role || "buyer";
            const currentMonthYear = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

            const newProfileData = {
              id: user.id,
              email: email,
              full_name: fullName,
              username: username,
              role: role,
              store_name: `${fullName}'s Store`,
              phone: user.phone || "",
              website: "",
              location: "",
              member_since: currentMonthYear,
              bio: "Preferred seller on Cheaper Hub marketplace.",
              badges: ["Email verified"],
              listings_count: 0,
              inventory_count: 0,
              deals_count: 0,
              revenue: 0.00
            };

            const { data: insertedData, error: insertError } = await supabase
              .from("profiles")
              .insert(newProfileData)
              .select()
              .single();

            if (insertError) throw insertError;
            setProfile(insertedData || newProfileData);
            return;
          }
          throw error;
        }

        setProfile(data);
      } catch (err) {
        console.warn("Error loading real profile from Supabase:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user, authLoading]);

  const updateProfile = async (updates) => {
    if (!profile || !user) return { error: "No profile or user loaded" };
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();
        
      if (error) throw error;
      setProfile(data);
      return { data, error: null };
    } catch (err) {
      console.warn("Error updating profile in Supabase:", err);
      return { error: err };
    }
  };

  return { profile, loading, error, updateProfile, setProfile };
}
