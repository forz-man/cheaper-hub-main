"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ShoppingBag, Trash2, Package, Shield,
  Truck, CreditCard, Loader2, ChevronRight, Minus, Plus,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { supabase } from "@/lib/supabase";

const COUNTRIES = ["United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Netherlands"];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, updateQty, removeItem, clearCart, total, count, hydrated } = useCart();

  const [user, setUser] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: "", email: "",
    address: "", city: "", zip: "", country: "United States",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        setForm(prev => ({
          ...prev,
          name: user.user_metadata?.full_name || prev.name,
          email: user.email || prev.email,
        }));
      }
    });
  }, []);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const shipping = total >= 50 ? 0 : 4.99;
  const tax = +(total * 0.08).toFixed(2);
  const grandTotal = +(total + shipping + tax).toFixed(2);

  const isValid = form.name && form.email && form.address && form.city && form.zip;

  const handlePlaceOrder = async () => {
    if (!isValid || items.length === 0) return;
    setPlacing(true);
    setError(null);

    try {
      const orderPayload = {
        buyer_id: user?.id || null,
        buyer_email: form.email,
        buyer_name: form.name,
        status: "processing",
        total: grandTotal,
        shipping_name: form.name,
        shipping_address: form.address,
        shipping_city: form.city,
        shipping_zip: form.zip,
        shipping_country: form.country,
      };

      let orderId;

      if (user) {
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert(orderPayload)
          .select("id")
          .single();

        if (orderErr) throw orderErr;
        orderId = order.id;

        const itemsPayload = items.map(item => ({
          order_id: orderId,
          product_id: String(item.id),
          product_name: item.name,
          vendor_id: item.vendor_id || null,
          vendor_name: item.vendor_name || null,
          price: item.price,
          qty: item.qty,
          subtotal: +(item.price * item.qty).toFixed(2),
        }));

        const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
        if (itemsErr) throw itemsErr;
      } else {
        orderId = "guest-" + Date.now();
      }

      clearCart();
      router.push(`/order-success/${orderId}?total=${grandTotal}&name=${encodeURIComponent(form.name)}&items=${count}`);
    } catch (err) {
      if (err?.message?.includes("does not exist") || err?.code === "42P01") {
        setError("Database not set up yet. Your order couldn't be saved — please run the setup SQL first.");
      } else {
        setError(err?.message || "Something went wrong. Please try again.");
      }
      setPlacing(false);
    }
  };

  if (hydrated && count === 0 && !placing) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center px-4" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
        <div className="text-center">
          <ShoppingBag size={40} className="text-[#ccc] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#111] mb-2" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Your cart is empty</h1>
          <p className="text-sm text-[#888] mb-6">Add some products before checking out.</p>
          <Link href="/" className="bg-[#111] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors">
            Browse marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef]" style={{ fontFamily: "var(--font-inter), sans-serif" }}>

      {/* Nav */}
      <nav className="bg-white border-b border-[#e2ddd6] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[#888] hover:text-[#111] transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#111] flex items-center justify-center">
              <span className="text-white font-bold text-xs" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>C</span>
            </div>
            <span className="font-bold text-sm" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Cheaper</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-[#aaa]">
            <Shield size={13} />
            <span className="hidden sm:block">Secure checkout</span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 md:px-8 py-8">
        <h1 className="text-2xl font-bold text-[#111] mb-8" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Checkout</h1>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">

          {/* ── Left: Shipping form ── */}
          <div className="space-y-5">

            {/* Cart items */}
            <div className="bg-white border border-[#e2ddd6] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e2ddd6] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#111]">Your cart ({count} {count === 1 ? "item" : "items"})</h2>
              </div>
              <div className="divide-y divide-[#f0ede8]">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-12 h-12 rounded-lg bg-[#f5f3ef] border border-[#e2ddd6] flex items-center justify-center flex-shrink-0">
                      <Package size={16} className="text-[#ccc]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[#111] truncate">{item.name}</div>
                      <div className="text-xs text-[#aaa]">{item.vendor_name}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center border border-[#e2ddd6] rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQty(item.id, item.qty - 1)}
                            className="w-7 h-7 flex items-center justify-center text-[#888] hover:bg-[#f5f3ef] transition-colors"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-8 text-center text-xs font-semibold text-[#111]">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            className="w-7 h-7 flex items-center justify-center text-[#888] hover:bg-[#f5f3ef] transition-colors"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="font-bold text-sm text-[#111]">${(item.price * item.qty).toFixed(2)}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-[#ccc] hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping address */}
            <div className="bg-white border border-[#e2ddd6] rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-[#111] mb-5">Shipping address</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-[#555] block mb-1.5">Full name</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full border border-[#e2ddd6] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4648d4]/20 focus:border-[#4648d4] text-[#111]"
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-[#555] block mb-1.5">Email</label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      className="w-full border border-[#e2ddd6] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4648d4]/20 focus:border-[#4648d4] text-[#111]"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-[#555] block mb-1.5">Street address</label>
                    <input
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      className="w-full border border-[#e2ddd6] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4648d4]/20 focus:border-[#4648d4] text-[#111]"
                      placeholder="123 Main St, Apt 4B"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#555] block mb-1.5">City</label>
                    <input
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      className="w-full border border-[#e2ddd6] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4648d4]/20 focus:border-[#4648d4] text-[#111]"
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#555] block mb-1.5">ZIP / Postal code</label>
                    <input
                      name="zip"
                      value={form.zip}
                      onChange={handleChange}
                      className="w-full border border-[#e2ddd6] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4648d4]/20 focus:border-[#4648d4] text-[#111]"
                      placeholder="10001"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-[#555] block mb-1.5">Country</label>
                    <select
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      className="w-full border border-[#e2ddd6] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4648d4]/20 focus:border-[#4648d4] text-[#111] bg-white"
                    >
                      {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment (mock) */}
            <div className="bg-white border border-[#e2ddd6] rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-[#111] mb-5 flex items-center gap-2">
                <CreditCard size={15} className="text-[#888]" /> Payment
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#555] block mb-1.5">Card number</label>
                  <input
                    className="w-full border border-[#e2ddd6] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4648d4]/20 focus:border-[#4648d4] text-[#111]"
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#555] block mb-1.5">Expiry</label>
                    <input
                      className="w-full border border-[#e2ddd6] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4648d4]/20 focus:border-[#4648d4] text-[#111]"
                      placeholder="MM / YY"
                      maxLength={7}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#555] block mb-1.5">CVC</label>
                    <input
                      className="w-full border border-[#e2ddd6] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4648d4]/20 focus:border-[#4648d4] text-[#111]"
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-[#bbb] mt-3 flex items-center gap-1">
                <Shield size={10} /> Payments processed securely. Card data is not stored.
              </p>
            </div>

          </div>

          {/* ── Right: Order summary ── */}
          <div className="space-y-4 lg:sticky lg:top-20">
            <div className="bg-white border border-[#e2ddd6] rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-[#111] mb-5">Order summary</h2>

              <div className="space-y-3 text-sm mb-5">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-[#555]">
                    <span className="truncate mr-2">{item.name} × {item.qty}</span>
                    <span className="font-medium text-[#111] flex-shrink-0">${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#f0ede8] pt-4 space-y-2.5 text-sm">
                <div className="flex justify-between text-[#888]">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#888]">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? "text-emerald-600 font-medium" : ""}>
                    {shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-[#888]">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-[#111] text-base pt-2 border-t border-[#f0ede8]">
                  <span>Total</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {shipping > 0 && (
                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
                  Add ${(50 - total).toFixed(2)} more for free shipping
                </div>
              )}

              {error && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={placing || !isValid || items.length === 0}
                className="w-full mt-5 bg-[#111] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {placing ? (
                  <><Loader2 size={15} className="animate-spin" /> Placing order…</>
                ) : (
                  <>Place order · ${grandTotal.toFixed(2)}</>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 mt-5 pt-5 border-t border-[#f0ede8]">
                {[
                  { Icon: Shield, label: "Buyer protection" },
                  { Icon: Truck, label: "Fast delivery" },
                ].map(({ Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-[#888]">
                    <Icon size={13} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
