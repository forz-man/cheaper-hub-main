"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import PasswordStrength from "@/components/auth/PasswordStrength";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRole = searchParams.get("role");
  const role = (rawRole === "seller" || rawRole === "vendor") ? "vendor" : (rawRole === "buyer" ? "buyer" : null);

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
    console.log("Submit button clicked! Sending payload to /api/auth/register...");
    e?.preventDefault();
    setError("");

    try {
      const trimmedEmail = email.trim();
      const trimmedFullName = fullName.trim();

      if (!trimmedEmail || !password || !confirmPassword || !trimmedFullName || !agreed) {
        setError("Please fill all fields and accept the terms.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setLoading(true);

      const username = trimmedEmail.split("@")[0] || "";
      const cleanUsername = username.replace(/^@/, '').trim();

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password, fullName: trimmedFullName, username: cleanUsername, role }),
      });
      const result = await res.json();

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const data = result.data;
      if (data?.user) {
        console.log("[Registration] SignUp success via API. User record ID:", data.user.id);
        try {
          localStorage.setItem(`ch_reg_id_${trimmedEmail.toLowerCase()}`, data.user.id);
          localStorage.setItem(`ch_reg_role_${trimmedEmail.toLowerCase()}`, role);
          localStorage.setItem(`ch_reg_name_${trimmedEmail.toLowerCase()}`, trimmedFullName);
        } catch (storageErr) {
          console.warn("Failed to store registered user metadata locally:", storageErr);
        }
        router.push(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`);
      } else {
        console.warn("[Registration] SignUp response contains no user data");
        setError("Sign-up succeeded, but no user record was returned by the database.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Registration submit error:", err);
      setError("Server connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title={`Create ${roleLabel} Account`}
        subtitle="Join Cheaper — it's free and takes 2 minutes."
      >
        <SocialLoginButtons role={role} />

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
              I agree to Cheaper&apos;s{" "}
              <Link href="#" className="font-semibold text-[#111] hover:underline">Terms</Link>{" "}
              and{" "}
              <Link href="#" className="font-semibold text-[#111] hover:underline">Privacy Policy</Link>.
            </span>
          </label>

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="h-11 w-full rounded-lg bg-[#111] font-semibold text-white text-sm hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating Account..." : role === "vendor" ? "Create Seller Account" : "Create Buyer Account"}
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
