"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import PasswordStrength from "@/components/auth/PasswordStrength";
import { register } from "@/lib/auth";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role");

  // No role chosen yet (e.g. someone landed on /register directly) —
  // send them to pick one instead of silently defaulting to "buyer".
  useEffect(() => {
    if (!role) router.replace("/select-role");
  }, [role, router]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roleLabel = useMemo(() => (role === "vendor" ? "Seller" : "Buyer"), [role]);

  if (!role) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("You must agree to the Terms and Privacy Policy.");
      return;
    }

    setLoading(true);
    const { error } = await register({ email, password, fullName, role });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title={`Create ${roleLabel} Account`}
        subtitle="Join Cheaper — it's free and takes 2 minutes."
      >
        <SocialLoginButtons />

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#e2ddd6]" />
          <span className="text-xs font-medium text-[#aaa]">or continue with email</span>
          <div className="h-px flex-1 bg-[#e2ddd6]" />
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="h-11 w-full rounded-lg border border-[#e2ddd6] px-4 text-sm outline-none focus:border-[#111] text-[#111] placeholder:text-[#bbb] transition-colors"
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 w-full rounded-lg border border-[#e2ddd6] px-4 text-sm outline-none focus:border-[#111] text-[#111] placeholder:text-[#bbb] transition-colors"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="h-11 w-full rounded-lg border border-[#e2ddd6] px-4 pr-16 text-sm outline-none focus:border-[#111] text-[#111] placeholder:text-[#bbb] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#888] hover:text-[#111] transition-colors"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="h-11 w-full rounded-lg border border-[#e2ddd6] px-4 text-sm outline-none focus:border-[#111] text-[#111] placeholder:text-[#bbb] transition-colors"
          />

          <PasswordStrength password={password} />

          <label className="flex items-start gap-3 text-sm text-[#888] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[#111]"
            />
            <span>
              I agree to Cheaper's{" "}
              <Link href="#" className="font-semibold text-[#111] hover:underline">Terms</Link>{" "}
              and{" "}
              <Link href="#" className="font-semibold text-[#111] hover:underline">Privacy Policy</Link>.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-[#111] font-semibold text-white text-sm hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating account…" : `Create ${roleLabel} Account`}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#888]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#111] hover:underline">Sign in</Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f5f3ef]">
        <div className="w-7 h-7 border-2 border-[#111] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
