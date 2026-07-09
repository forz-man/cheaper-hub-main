"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role || user.user_metadata?.role;

      if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(role)
      ) {
        router.replace("/dashboard");
        return;
      }

      setLoading(false);
    }

    checkAccess();
  }, [router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return children;
}