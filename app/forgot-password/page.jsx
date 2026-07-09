"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import { forgotPassword } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await forgotPassword(email);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title="Forgot Password?"
        subtitle="Enter your email and we'll send you a reset link."
      >
        {sent ? (
          <div className="space-y-6">
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-700">
              Reset link sent! Check your inbox at <strong>{email}</strong>.
            </div>
            <Link
              href="/login"
              className="block text-center text-sm font-semibold text-black"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
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
                className="h-12 w-full rounded-xl border border-gray-200 px-4 outline-none focus:border-black"
              />
              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-black text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition hover:bg-gray-800"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
            <Link
              href="/login"
              className="mt-6 block text-center text-sm font-semibold text-black"
            >
              Back to Sign In
            </Link>
          </>
        )}
      </AuthCard>
    </AuthShell>
  );
}
