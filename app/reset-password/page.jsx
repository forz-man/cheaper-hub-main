"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import PasswordStrength from "@/components/auth/PasswordStrength";

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
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
      } else {
        router.push("/login");
      }
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
