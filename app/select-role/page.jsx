"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { supabase } from "@/lib/supabase";

function SelectRoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromOAuth = searchParams.get("from") === "oauth";

  const [loading, setLoading] = useState(null); // tracks which role is loading
  const [error, setError] = useState("");

  const handleSelect = async (role) => {
    if (loading) return;

    if (fromOAuth) {
      setLoading(role);
      setError("");
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const { error: updateError } = await supabase.auth.updateUser({
          data: { role },
        });
        if (updateError) throw updateError;

        await supabase
          .from("profiles")
          .upsert({ id: user.id, role }, { onConflict: "id" });

        router.replace(role === "vendor" ? "/dashboard/vendor" : "/dashboard/buyer");
      } catch {
        setError("Something went wrong. Please try again.");
        setLoading(null);
      }
    } else {
      router.push(`/register?role=${role}`);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-950">Choose your role</h2>
          <p className="text-gray-500 mt-2">How would you like to use Cheaper?</p>
        </div>

        <div className="space-y-4">
          {/* Buyer Card */}
          <button
            type="button"
            onClick={() => handleSelect("buyer")}
            disabled={!!loading}
            className="w-full text-left rounded-2xl border-2 border-gray-200 bg-white p-6 transition-all hover:border-[#4648d4] hover:shadow-lg hover:shadow-[#4648d4]/10 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#4648d4]/10 flex items-center justify-center text-2xl flex-shrink-0">
                🛒
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Buyer</h3>
                  {loading === "buyer" && (
                    <svg className="animate-spin h-5 w-5 text-[#4648d4]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">Compare prices and source products</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5">
              {["Compare supplier pricing", "Source products faster", "Track purchases"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-[#4648d4] font-bold">✓</span> {f}
                </li>
              ))}
            </ul>
          </button>

          {/* Vendor Card */}
          <button
            type="button"
            onClick={() => handleSelect("vendor")}
            disabled={!!loading}
            className="w-full text-left rounded-2xl border-2 border-gray-200 bg-white p-6 transition-all hover:border-[#131b2e] hover:shadow-lg hover:shadow-black/10 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#131b2e]/10 flex items-center justify-center text-2xl flex-shrink-0">
                🏪
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Vendor</h3>
                  {loading === "vendor" && (
                    <svg className="animate-spin h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">List products and grow your business</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5">
              {["List your products", "Receive buyer inquiries", "Grow your revenue"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-gray-800 font-bold">✓</span> {f}
                </li>
              ))}
            </ul>
          </button>
        </div>

        {error && (
          <p className="mt-4 text-red-500 text-sm text-center">{error}</p>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-black hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function SelectRolePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    }>
      <SelectRoleContent />
    </Suspense>
  );
}
