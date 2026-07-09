"use client";

import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import CartDrawer from "@/components/CartDrawer";

function CartDrawerWrapper() {
  return <CartDrawer />;
}

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <CartDrawerWrapper />
      </CartProvider>
    </AuthProvider>
  );
}
