"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Package, ArrowRight, ShoppingBag, Loader2, AlertTriangle, Shield } from "lucide-react";
import { Suspense } from "react";
import { useCart } from "@/lib/cart-context";
import BrandMark from "@/components/BrandMark";

function OrderSuccessContent({ id }) {
  const searchParams = useSearchParams();
  const sessionId     = searchParams.get("session_id");
  const { clearCart } = useCart();

  const [order, setOrder]   = useState(null);
  const [paid, setPaid]     = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing payment session.");
      setLoading(false);
      return;
    }

    fetch(`/api/checkout/verify?session_id=${sessionId}&order_id=${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Could not verify payment.");
        setOrder(data.order);
        setPaid(data.paid);
        if (data.paid) clearCart();
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, id]);

  const total     = order?.total ?? 0;
  const name      = order?.buyer_name || "there";
  const itemCount = order?.order_items?.reduce((sum, i) => sum + i.qty, 0) || 0;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
        <div className="text-center">
          <Loader2 size={24} className="animate-spin text-[#ccc] mx-auto mb-3" />
          <p className="text-sm text-[#888]">Confirming your Stripe payment…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center px-4" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
        <div className="text-center max-w-sm">
          <AlertTriangle size={36} className="text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#111] mb-2" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
            Couldn&apos;t confirm payment
          </h1>
          <p className="text-sm text-[#888] mb-6">{error}</p>
          <Link href="/checkout" className="bg-[#111] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors">
            Back to checkout
          </Link>
        </div>
      </div>
    );
  }

  if (!paid) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center px-4" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
        <div className="text-center max-w-sm">
          <AlertTriangle size={36} className="text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#111] mb-2" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
            Payment not completed
          </h1>
          <p className="text-sm text-[#888] mb-6">
            This order hasn&apos;t been paid for yet. If you completed checkout, refresh this page in a moment.
          </p>
          <Link href="/checkout" className="bg-[#111] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors">
            Back to checkout
          </Link>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center px-4" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="w-full max-w-md">

        <div className="flex justify-center mb-10">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-8 w-auto" priority />
            <span className="font-bold text-lg" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Cheaper</span>
          </Link>
        </div>

        <div className="bg-white border border-[#e2ddd6] rounded-2xl p-8 text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>

          <h1 className="text-2xl font-bold text-[#111] mb-2" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
            Order placed!
          </h1>
          <p className="text-sm text-[#888] mb-6">
            Thanks, {name.split(" ")[0]}. Your card has been charged securely, and the seller&apos;s payout is being sent through Stripe.
          </p>

          <div className="bg-[#f9f8f6] border border-[#e2ddd6] rounded-xl p-5 mb-6 text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#888]">Order ID</span>
              <span className="font-mono text-xs text-[#555] font-semibold">{id?.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#888]">Items</span>
              <span className="font-semibold text-[#111]">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#888]">Total charged</span>
              <span className="font-bold text-[#111]">${parseFloat(total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#888]">Payment via</span>
                <span className="font-semibold text-[#111]">Card · Stripe</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#888]">Status</span>
              <span className="text-amber-600 font-semibold text-xs bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">Processing</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-6 text-xs text-[#888]">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle size={11} className="text-white" />
              </div>
              <span>Confirmed</span>
            </div>
            <div className="h-px w-6 bg-[#e2ddd6]" />
            <div className="flex items-center gap-1.5 text-[#ccc]">
              <div className="w-5 h-5 rounded-full bg-[#f0ede8] border border-[#e2ddd6] flex items-center justify-center">
                <Package size={9} className="text-[#ccc]" />
              </div>
              <span>Processing</span>
            </div>
            <div className="h-px w-6 bg-[#e2ddd6]" />
            <div className="flex items-center gap-1.5 text-[#ccc]">
              <div className="w-5 h-5 rounded-full bg-[#f0ede8] border border-[#e2ddd6] flex items-center justify-center">
                <ShoppingBag size={9} className="text-[#ccc]" />
              </div>
              <span>Shipped</span>
            </div>
          </div>

          {/* Payment processing notice */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-5 text-left flex items-start gap-2.5">
            <Shield size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-indigo-700 leading-relaxed">
              <span className="font-semibold">Your payment is processed at checkout.</span>{" "}
              You can still confirm receipt from <strong>My Orders</strong> after delivery to keep your order status up to date.
            </p>
          </div>

          <p className="text-xs text-[#aaa] mb-6">
            You&apos;ll get a notification when your order ships.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard/buyer"
              className="flex items-center justify-center gap-2 bg-[#111] text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors"
            >
              View my orders <ArrowRight size={14} />
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 border border-[#e2ddd6] text-[#555] px-5 py-3 rounded-xl text-sm font-semibold hover:border-[#999] transition-colors"
            >
              Continue shopping
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-[#bbb]">
          Questions? Contact{" "}
          <a href="mailto:support@cheaper.com" className="text-[#4D8337] hover:underline">support@cheaper.com</a>
        </p>
      </div>
    </div>
  );
}

export default function OrderSuccessPage({ params }) {
  const { id } = use(params);
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center">
        <div className="text-[#888] text-sm">Loading…</div>
      </div>
    }>
      <OrderSuccessContent id={id} />
    </Suspense>
  );
}
