"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";

  return (
    <AuthShell>
      <AuthCard title="Check your inbox" subtitle="We sent you a confirmation link.">
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-16 w-16 rounded-full bg-[#f5f3ef] border border-[#e2ddd6] flex items-center justify-center text-3xl">
              📬
            </div>
            <p className="text-center text-[#555] text-sm leading-6">
              We sent a confirmation link to{" "}
              <span className="font-semibold text-[#111]">{email}</span>.
              Click the link in that email to activate your account.
            </p>
            <p className="text-center text-xs text-[#aaa]">
              No email? Check your spam folder, or wait a minute and try again.
            </p>
          </div>

          <Link
            href="/login"
            className="block w-full h-11 rounded-lg bg-[#111] text-white text-sm font-semibold flex items-center justify-center hover:bg-[#333] transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f5f3ef]">
        <div className="w-7 h-7 border-2 border-[#111] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
