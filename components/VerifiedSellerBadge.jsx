"use client";

import { BadgeCheck, ShieldCheck } from "lucide-react";
import { getVendorBadge } from "@/lib/vendor-verification.mjs";

export default function VerifiedSellerBadge({
  sellerType,
  verificationStatus,
  compact = false,
  className = "",
}) {
  const badge = getVendorBadge(sellerType, verificationStatus);
  if (!badge) return null;

  const business = badge.tone === "business";
  const Icon = business ? BadgeCheck : ShieldCheck;
  const colors = business
    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span
      title={business ? "Identity and business registration reviewed by Cheaper" : "Identity and phone reviewed by Cheaper"}
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${colors} ${
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"
      } ${className}`}
    >
      <Icon size={compact ? 10 : 12} aria-hidden="true" />
      {badge.label}
    </span>
  );
}