"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import useAuth from "@/hooks/useAuth";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const mergedUserRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cheaper_cart");
      if (stored) {
        const parsed = JSON.parse(stored);
        setTimeout(() => setItems(parsed), 0);
      }
    } catch {}
    setTimeout(() => setHydrated(true), 0);
  }, []);

  // Merge an anonymous cart into the signed-in user's cart instead of
  // discarding it during the login redirect/resume flow.
  useEffect(() => {
    if (!hydrated || !user?.id || mergedUserRef.current === user.id) return;
    mergedUserRef.current = user.id;

    try {
      const accountKey = `cheaper_cart_${user.id}`;
      const accountItems = JSON.parse(localStorage.getItem(accountKey) || "[]");
      const anonymousItems = JSON.parse(localStorage.getItem("cheaper_cart") || "[]");
      const merged = [...accountItems];

      for (const incoming of anonymousItems) {
        const existing = merged.find((item) => item.id === incoming.id);
        if (existing) existing.qty += Math.max(1, Number(incoming.qty) || 1);
        else merged.push({ ...incoming, qty: Math.max(1, Number(incoming.qty) || 1) });
      }

      setItems(merged);
      localStorage.setItem(accountKey, JSON.stringify(merged));
      localStorage.removeItem("cheaper_cart");
    } catch {
      // Keep the in-memory cart usable if storage is unavailable.
    }
  }, [hydrated, user?.id]);

  useEffect(() => {
    if (hydrated) {
      const key = user?.id ? `cheaper_cart_${user.id}` : "cheaper_cart";
      localStorage.setItem(key, JSON.stringify(items));
    }
  }, [items, hydrated, user?.id]);

  const addItem = useCallback((product, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.id === product.id ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        original_price: product.original_price ? parseFloat(product.original_price) : null,
        vendor_id: product.vendor_id || null,
        vendor_name: product.vendor_name || "Marketplace Seller",
        images: Array.isArray(product.images) ? product.images : [],
        qty,
      }];
    });
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQty = useCallback((id, qty) => {
    if (qty < 1) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      count, total, hydrated,
      cartOpen, openCart, closeCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
