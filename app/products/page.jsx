"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Forwards any incoming query params (e.g. ?category=Electronics&q=laptop)
// so existing bookmarks / deep links still work after the rename to /marketplace.
function Redirector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(qs ? `/marketplace?${qs}` : "/marketplace");
  }, [router, searchParams]);

  return null;
}

export default function ProductsPage() {
  return (
    <Suspense>
      <Redirector />
    </Suspense>
  );
}
