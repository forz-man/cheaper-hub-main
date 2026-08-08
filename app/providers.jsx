"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import CartDrawer from "@/components/CartDrawer";

function CartDrawerWrapper() {
  return <CartDrawer />;
}

export default function Providers({ children }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleUnhandledRejection = (event) => {
        const reason = event.reason;
        if (
          reason &&
          (reason.message?.includes("Failed to fetch") ||
           reason.message?.includes("Load failed") ||
           reason.message?.includes("Supabase is not configured") ||
           reason.name === "TypeError" ||
           reason.status === 500)
        ) {
          event.stopImmediatePropagation();
          event.preventDefault();
        }
      };

      const handleGlobalError = (event) => {
        const message = event.message || "";
        if (
          message.includes("Failed to fetch") ||
          message.includes("Load failed") ||
          message.includes("Supabase is not configured")
        ) {
          event.stopImmediatePropagation();
          event.preventDefault();
        }
      };

      window.addEventListener("unhandledrejection", handleUnhandledRejection, true);
      window.addEventListener("error", handleGlobalError, true);

      return () => {
        window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
        window.removeEventListener("error", handleGlobalError, true);
      };
    }
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <CartDrawerWrapper />
      </CartProvider>
    </AuthProvider>
  );
}
