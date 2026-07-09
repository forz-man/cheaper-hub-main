"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveUserRole, destinationForRole } from "@/lib/auth";

async function resolveDestination(session) {
  if (!session?.user) return "/login";

  let role = resolveUserRole(session.user, null);

  if (!role) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      role = resolveUserRole(session.user, profile?.role);
    } catch {}
  }

  return destinationForRole(role);
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
