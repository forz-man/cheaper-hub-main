"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardOrdersPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard?tab=orders");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
    </div>
  );
}
