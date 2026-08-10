"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { destinationForRole, resolveUserRole } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    async function resolveDashboard() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      const role = resolveUserRole(user, profile?.role);
      router.replace(destinationForRole(role));
    }

    resolveDashboard();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router]);

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return null;
}
