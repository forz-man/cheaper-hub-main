"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

async function resolveDestination(session) {
  if (!session?.user) return "/login";

  const role =
    session.user.user_metadata?.role ||
    session.user.app_metadata?.role;

  if (!role) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (profile?.role === "vendor") return "/dashboard/vendor";
      if (profile?.role === "buyer") return "/dashboard/buyer";
    } catch {}
    return "/select-role?from=oauth";
  }

  if (role === "vendor") return "/dashboard/vendor";
  if (role === "buyer") return "/dashboard/buyer";
  return "/select-role?from=oauth";
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleCallback() {
      if (!supabase) {
        router.replace("/login");
        return;
      }

      const code = searchParams.get("code");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        console.error("OAuth error:", error, errorDescription);
        router.replace("/login?error=" + encodeURIComponent(errorDescription || error));
        return;
      }

      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("Code exchange failed:", exchangeError.message);
          router.replace("/login?error=" + encodeURIComponent(exchangeError.message));
          return;
        }
        const dest = await resolveDestination(data?.session);
        router.replace(dest);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const dest = await resolveDestination(session);
        router.replace(dest);
        return;
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          subscription.unsubscribe();
          const dest = await resolveDestination(session);
          router.replace(dest);
        }
      });

      setTimeout(() => {
        subscription.unsubscribe();
        router.replace("/login");
      }, 10000);
    }

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f3ef]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#111] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#888] text-sm">Signing you in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f5f3ef]">
        <div className="w-8 h-8 border-2 border-[#111] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
