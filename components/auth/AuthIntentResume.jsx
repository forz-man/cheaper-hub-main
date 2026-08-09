"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { useCart } from "@/lib/cart-context";
import { clearAuthIntent, getAuthIntent, normalizeReturnTo } from "@/lib/auth-flow";

function mergeWishlistItem(userId, productId) {
  if (!userId || !productId) return;
  const key = `cheaper_wishlist_ids_${userId}`;
  try {
    const ids = JSON.parse(localStorage.getItem(key) || "[]");
    if (!ids.includes(String(productId))) {
      localStorage.setItem(key, JSON.stringify([...ids, String(productId)]));
    }
  } catch {
    // The product page can still be used if storage is unavailable.
  }
}

/**
 * Resumes actions captured on public product pages after login/signup.
 * This is intentionally mounted globally, but only acts on a stored intent
 * and only after the browser is back on that intent's return path.
 */
export default function AuthIntentResume() {
  const { user, loading: authLoading } = useAuth();
  const { addItem, openCart, hydrated } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const runningRef = useRef(false);

  useEffect(() => {
    if (authLoading || !user || !hydrated || runningRef.current) return;

    const intent = getAuthIntent();
    if (!intent) return;

    const returnTo = normalizeReturnTo(intent.returnTo, "/");
    let targetPathname = "/";
    try {
      targetPathname = new URL(returnTo, window.location.origin).pathname;
    } catch {
      return;
    }

    // Login may briefly render before router.replace finishes. Waiting for
    // the original pathname prevents an add/message action from firing there.
    if (pathname !== targetPathname) return;

    runningRef.current = true;
    clearAuthIntent();

    const context = intent.context || {};

    if (intent.type === "add_to_cart" || intent.type === "buy_now") {
      if (context.product?.id) {
        addItem(context.product, Math.max(1, Number(context.qty) || 1));
        if (intent.type === "add_to_cart") {
          openCart();
        } else {
          router.push("/checkout");
        }
      }
      runningRef.current = false;
      return;
    }

    if (intent.type === "wishlist_toggle") {
      mergeWishlistItem(user.id, context.productId);
      runningRef.current = false;
      return;
    }

    if (intent.type === "message_seller") {
      fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_id: user.id,
          seller_id: context.sellerId,
          product_id: context.productId,
        }),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Could not start conversation");
          return response.json();
        })
        .then((conversation) => {
          if (conversation?.id) {
            router.push(`/messages?conversationId=${conversation.id}`);
          }
        })
        .catch((error) => {
          console.warn("[AuthIntentResume] message action failed:", error);
        })
        .finally(() => {
          runningRef.current = false;
        });
      return;
    }

    // Review intents return to the product page. The product page uses the
    // `tab=reviews` return query to show the gated review area immediately.
    runningRef.current = false;
  }, [addItem, authLoading, hydrated, openCart, pathname, router, user]);

  return null;
}
