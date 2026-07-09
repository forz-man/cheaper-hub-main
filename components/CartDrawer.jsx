"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X, ShoppingBag, Minus, Plus, Trash2, Package,
  ArrowRight, Truck,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";

export default function CartDrawer() {
  const router = useRouter();
  const { items, updateQty, removeItem, clearCart, count, total, cartOpen, closeCart } = useCart();

  const shipping = total >= 50 ? 0 : total === 0 ? 0 : 4.99;
  const toFreeShipping = Math.max(0, 50 - total);

  useEffect(() => {
    if (cartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [cartOpen]);

  if (!cartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-white z-50 flex flex-col shadow-2xl"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2ddd6] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={18} className="text-[#111]" />
            <span className="font-bold text-base text-[#111]" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
              Your cart
            </span>
            {count > 0 && (
              <span className="bg-[#111] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-[#aaa] hover:text-red-500 transition-colors font-medium"
              >
                Clear all
              </button>
            )}
            <button
              onClick={closeCart}
              className="w-8 h-8 rounded-full bg-[#f5f3ef] flex items-center justify-center hover:bg-[#e2ddd6] transition-colors"
            >
              <X size={16} className="text-[#555]" />
            </button>
          </div>
        </div>

        {/* Free shipping progress */}
        {total > 0 && total < 50 && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex-shrink-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Truck size={13} className="text-amber-600" />
              <span className="text-xs text-amber-700 font-medium">
                Add <span className="font-bold">${toFreeShipping.toFixed(2)}</span> more for free shipping
              </span>
            </div>
            <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (total / 50) * 100)}%` }}
              />
            </div>
          </div>
        )}
        {total >= 50 && (
          <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Truck size={13} className="text-emerald-600" />
              <span className="text-xs text-emerald-700 font-semibold">You qualify for free shipping!</span>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#f5f3ef] flex items-center justify-center mb-5">
                <ShoppingBag size={32} className="text-[#ccc]" />
              </div>
              <p className="font-semibold text-[#111] mb-1.5" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
                Your cart is empty
              </p>
              <p className="text-sm text-[#888] mb-6">Browse our marketplace and add some items</p>
              <button
                onClick={closeCart}
                className="bg-[#111] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors"
              >
                Keep shopping
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#f0ede8]">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 px-5 py-4">
                  <div className="w-14 h-14 rounded-xl bg-[#f5f3ef] border border-[#e2ddd6] flex items-center justify-center flex-shrink-0">
                    <Package size={20} className="text-[#ccc]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#111] leading-snug mb-0.5 truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-[#aaa] mb-2 truncate">{item.vendor_name}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-[#e2ddd6] rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          className="w-7 h-7 flex items-center justify-center text-[#888] hover:bg-[#f5f3ef] transition-colors"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold text-[#111]">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="w-7 h-7 flex items-center justify-center text-[#888] hover:bg-[#f5f3ef] transition-colors"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-[#111]">
                          ${(item.price * item.qty).toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-[#ccc] hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#e2ddd6] px-5 py-5 space-y-3 flex-shrink-0 bg-white">
            <div className="flex justify-between text-sm text-[#888]">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#888]">
              <span>Shipping</span>
              <span className={shipping === 0 ? "text-emerald-600 font-semibold" : ""}>
                {shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between font-bold text-[#111] text-base pt-2 border-t border-[#f0ede8]">
              <span>Estimated total</span>
              <span>${(total + shipping).toFixed(2)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="flex items-center justify-center gap-2 w-full bg-[#111] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#333] transition-colors"
            >
              Proceed to checkout <ArrowRight size={15} />
            </Link>
            <button
              onClick={closeCart}
              className="w-full text-center text-sm text-[#888] hover:text-[#111] transition-colors py-1 font-medium"
            >
              Continue shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
