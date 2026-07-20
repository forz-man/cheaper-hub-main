"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import { login } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await login(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Redirect back to the saved URL (or /dashboard which handles role routing)
    router.replace(next);
  };

  return (
    <AuthShell>
      <AuthCard title="Welcome Back" subtitle="Sign in to continue to Cheaper">
        <SocialLoginButtons />

        <div className="flex items-center gap-4 my-6">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs font-semibold text-gray-400">OR</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-gray-950"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-12 rounded-xl border border-gray-200 px-4 pr-16 outline-none focus:border-gray-950"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-500">
              <input type="checkbox" className="rounded" />
              Remember me
            </label>
            <Link href="/forgot-password" className="font-medium text-gray-950">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-gray-950 text-white font-semibold hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/select-role" className="font-semibold text-gray-950">
            Create Account
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f5f3ef]">
        <div className="w-7 h-7 border-2 border-[#111] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
