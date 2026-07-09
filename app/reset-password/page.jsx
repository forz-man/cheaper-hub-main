"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import PasswordStrength from "@/components/auth/PasswordStrength";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/login");
    }
  };

  return (
    <AuthShell>
      <AuthCard title="Reset Password" subtitle="Create a new secure password.">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-12 w-full rounded-xl border border-gray-200 px-4 outline-none focus:border-black"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="h-12 w-full rounded-xl border border-gray-200 px-4 outline-none focus:border-black"
          />
          <PasswordStrength password={password} />
          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-black text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition hover:bg-gray-800"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
