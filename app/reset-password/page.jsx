"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import PasswordStrength from "@/components/auth/PasswordStrength";
import useAuth from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { loading: authLoading, recoverySession } = useAuth();
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
    try {
      if (!recoverySession) {
        setError("This reset link is invalid or has expired. Request a new one.");
        setLoading(false);
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      const notificationResponse = await fetch("/api/auth/password-change-notification", {
        method: "POST",
      });
      if (!notificationResponse.ok) {
        console.warn("[ResetPassword] Password changed but notification could not be queued.");
      }
      await supabase.auth.signOut();
      router.push("/login?passwordUpdated=1");
    } catch (err) {
      console.error("[ResetPassword] Network exception:", err);
      setError("Unable to connect. Please try again.");
      setLoading(false);
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
        {!authLoading && !recoverySession && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            Open the latest password-reset link from your email to continue.
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
            disabled={loading || authLoading || !recoverySession}
            className="h-12 w-full rounded-xl bg-black text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition hover:bg-gray-800"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
