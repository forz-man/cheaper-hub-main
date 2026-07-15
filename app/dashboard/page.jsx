"use client";

// Thin role router: this route no longer renders a dashboard UI itself.
// It just figures out the signed-in user's role and sends them to the
// dedicated page (/dashboard/vendor or /dashboard/buyer). If no role is
// set yet, the user is sent to /select-role to choose one — we never
// guess/assign a role on their behalf.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import useAuth from "@/hooks/useAuth";
import { resolveUserRole, destinationForRole } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }

    let cancelled = false;

    async function resolveRole() {
      let role = resolveUserRole(user, null);

      if (!role) {
        const { data: profile } = await supabase
          .from("profiles").select("role").eq("id", user.id).single();
        role = resolveUserRole(user, profile?.role);
      }

      if (cancelled) return;

      // No role on file — ask the user instead of assigning one.
      const tab = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("tab")
        : null;
      const dest = role ? destinationForRole(role) : "/select-role?from=dashboard";
      router.replace(role && tab ? `${dest}?tab=${tab}` : dest);
      setResolving(false);
    }
    resolveRole();

    return () => { cancelled = true; };
  }, [user, authLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading your dashboard…</p>
      </div>
    </div>
  );
}
