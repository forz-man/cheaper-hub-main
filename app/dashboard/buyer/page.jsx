"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShoppingBag, Heart, Settings, LogOut,
  Package, Star, ArrowUpRight, ChevronRight,
  X, CheckCircle, Truck, Clock, Store, Loader2,
  Search, Shield, Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logout, resolveUserRole } from "@/lib/auth";
import ReviewModal from "@/components/reviews/ReviewModal";
import useReducedMotion from "@/hooks/useReducedMotion";

const statusConfig = {
  delivered: { label: "Delivered", color: "text-emerald-700 bg-emerald-50 border-emerald-100", Icon: CheckCircle },
  shipped:   { label: "Shipped",   color: "text-blue-700 bg-blue-50 border-blue-100",         Icon: Truck       },
  processing:{ label: "Processing",color: "text-amber-700 bg-amber-50 border-amber-100",       Icon: Clock       },
  cancelled: { label: "Cancelled", color: "text-red-700 bg-red-50 border-red-100",             Icon: X           },
};

function pct(price, original) {
  if (!original || original <= price) return null;
  return Math.round((1 - price / original) * 100);
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Animation variants ────────────────────────────────────────────────────────

const tabVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

// ─── Shared tab bar ────────────────────────────────────────────────────────────

function TabBar({ tabs, activeTab, setActiveTab }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div className="flex gap-1 flex-wrap">
      {tabs.map(({ id, label, Icon, badge, href }) => (
        href ? (
          <motion.div
            key={id}
            whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
          >
            <Link href={href}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 bg-white border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-black">
              <Icon size={14} />
              {label}
            </Link>
          </motion.div>
        ) : (
          <motion.button
            key={id}
            whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeTab === id
                ? "bg-black text-white shadow-lg shadow-black/15"
                : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-black"
            }`}
          >
            <Icon size={14} />
            {label}
            {badge != null && badge > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>{badge}</span>
            )}
          </motion.button>
        )
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, Icon }) {
  const shouldReduceMotion = useReducedMotion();
  const innerFadeUp = {
    hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  };
  return (
    <motion.div variants={innerFadeUp}
      className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:shadow-black/5 hover:border-gray-300 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
          <Icon size={14} className="text-gray-400" />
        </div>
      </div>
      <div className="text-2xl font-bold text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </motion.div>
  );
}

const VALID_TABS = ["overview", "orders", "wishlist", "settings"];

export default function BuyerDashboard() {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState([]);

  const innerTabVariants = {
    hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
    exit: shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -6, transition: { duration: 0.15 } },
  };

  const innerStagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06, delayChildren: shouldReduceMotion ? 0 : 0.05 } },
  };

  // Deep-link support: /dashboard/buyer?tab=orders (used by the navbar's
  // Profile/Orders/Wishlist/Settings links).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab && VALID_TABS.includes(tab)) setActiveTab(tab);
  }, []);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersFilter, setOrdersFilter] = useState("all");

  const [reviewEligibility, setReviewEligibility] = useState({});
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  const [reviewModalOrderId, setReviewModalOrderId] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState("");

  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const [confirmError, setConfirmError] = useState(null);

  function eligibilityKey(orderId, productId) {
    return `${orderId}_${productId}`;
  }

  async function handleConfirmDelivery(orderId) {
    setConfirmingOrderId(orderId);
    setConfirmError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm-delivery`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm delivery");
      // Refresh order list to show updated state
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) await loadOrders(u.id);
    } catch (err) {
      setConfirmError(err.message);
    } finally {
      setConfirmingOrderId(null);
    }
  }

  async function loadOrders(uid) {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, status, payment_status, total, created_at, buyer_confirmed_at, payouts_released_at, order_items(id, product_id, product_name, vendor_name, qty, price, payout_status)")
      .eq("buyer_id", uid)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data);
      checkReviewEligibility(data);
    }
    setOrdersLoading(false);
  }

  async function loadWishlist(uid) {
    const storageKey = `cheaper_wishlist_ids_${uid}`;
    let ids = [];
    try {
      ids = JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      ids = [];
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      setWishlist([]);
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("id, name, vendor_name, price, original_price, rating, reviews, images")
      .in("id", ids);

    if (error || !data) {
      setWishlist([]);
      return;
    }

    setWishlist(data);
    const existingIds = data.map((product) => product.id);
    localStorage.setItem(storageKey, JSON.stringify(existingIds));
  }

  function normStatus(s) { return s?.toLowerCase(); }

  async function checkReviewEligibility(orders) {
    const checks = [];
    for (const order of orders) {
      if (normStatus(order.status) !== "delivered" || !order.order_items) continue;
      for (const item of order.order_items) {
        if (item.product_id) {
          checks.push({ orderId: order.id, productId: item.product_id });
        }
      }
    }
    if (checks.length === 0) return;

    const loadingMap = {};
    for (const { orderId, productId } of checks) {
      loadingMap[eligibilityKey(orderId, productId)] = { canReview: false, loading: true };
    }
    setReviewEligibility(prev => ({ ...prev, ...loadingMap }));

    const results = await Promise.all(
      checks.map(async ({ orderId, productId }) => {
        const key = eligibilityKey(orderId, productId);
        try {
          const res = await fetch(`/api/reviews/can-review?orderId=${orderId}&productId=${productId}`);
          if (res.ok) {
            const data = await res.json();
            return [key, { ...data, loading: false }];
          }
        } catch {}
        return [key, { canReview: false, loading: false }];
      })
    );
    setReviewEligibility(prev => ({ ...prev, ...Object.fromEntries(results) }));
  }

  function openReviewModal(item, orderId) {
    setReviewModalProduct(item);
    setReviewModalOrderId(orderId);
    setReviewSubmitError("");
    setReviewModalOpen(true);
  }

  async function handleSubmitReview({ rating, comment }) {
    if (!reviewModalProduct || !reviewModalOrderId || rating < 1) return;
    setReviewSubmitting(true);
    setReviewSubmitError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: reviewModalOrderId, productId: reviewModalProduct.product_id, rating, comment }),
      });
      if (!res.ok) {
        const err = await res.json();
        setReviewSubmitError(err.error || "Failed to submit review");
        return;
      }
      setReviewModalOpen(false);
      const key = eligibilityKey(reviewModalOrderId, reviewModalProduct.product_id);
      setReviewEligibility(prev => ({
        ...prev,
        [key]: { canReview: false, alreadyReviewed: true, loading: false },
      }));
      setReviewModalProduct(null);
      setReviewModalOrderId(null);
    } catch {
      setReviewSubmitError("Something went wrong. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      if (!user.email_confirmed_at) {
        router.replace(`/verify-email?email=${encodeURIComponent(user.email || "")}`);
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const role = resolveUserRole(user, profile?.role);
      if (role !== "buyer") { router.replace("/dashboard"); return; }

      setUser(user);
      setLoading(false);
      loadOrders(user.id);
      loadWishlist(user.id);
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const removeFromWishlist = (id) => setWishlist(w => w.filter(item => item.id !== id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Buyer";
  const deliveredCount = orders.filter(o => normStatus(o.status) === "delivered").length;
  const totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  const filteredOrders = ordersFilter === "all" ? orders : orders.filter(o => normStatus(o.status) === ordersFilter);

  const tabs = [
    { id: "overview", label: "Overview", Icon: LayoutDashboard },
    { id: "orders", label: "My Orders", Icon: ShoppingBag },
    { id: "wishlist", label: "Wishlist", Icon: Heart, badge: wishlist.length },
    { id: "settings", label: "Settings", Icon: Settings },
    { id: "marketplace", label: "Marketplace", Icon: Search, href: "/dashboard/buyer/marketplace" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="container py-8">

        {/* Page header */}
        <motion.div className="mb-6 flex flex-wrap items-start justify-between gap-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-black rounded-xl">
                <LayoutDashboard size={20} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
                Buyer Dashboard
              </h1>
            </div>
            <p className="text-gray-400 text-sm mt-1 ml-1">Welcome back, {displayName.split(" ")[0]} — here&apos;s your shopping activity</p>
          </div>
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-2 text-sm text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
          >
            <LogOut size={15} /> Sign out
          </button>
        </motion.div>

        {/* Tabs */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <TabBar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div key="overview" variants={innerTabVariants} initial="hidden" animate="visible" exit="exit">
              <motion.div variants={innerStagger} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div key="overview" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Orders placed", value: ordersLoading ? "…" : String(orders.length), sub: "All time", Icon: ShoppingBag },
                  { label: "Items delivered", value: ordersLoading ? "…" : String(deliveredCount), sub: "Completed", Icon: CheckCircle },
                  { label: "Saved items", value: String(wishlist.length), sub: "In your wishlist", Icon: Heart },
                  { label: "Total spent", value: ordersLoading ? "…" : `$${totalSpent.toFixed(2)}`, sub: "All orders", Icon: Store },
                ].map(s => <StatCard key={s.label} {...s} />)}
              </motion.div>

              <div className="grid lg:grid-cols-3 gap-5">
                {/* Recent orders */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-black">Recent orders</h2>
                    <button onClick={() => setActiveTab("orders")} className="text-xs text-black font-medium hover:underline flex items-center gap-1">
                      View all <ChevronRight size={12} />
                    </button>
                  </div>
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-10"><Loader2 size={18} className="animate-spin text-gray-300" /></div>
                  ) : orders.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <Package size={22} className="text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No orders yet</p>
                      <p className="text-xs text-gray-300 mt-1">Start shopping on the marketplace</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {orders.slice(0, 4).map((order) => {
                        const sc = statusConfig[normStatus(order.status)] || statusConfig.processing;
                        const firstItem = order.order_items?.[0];
                        return (
                          <div key={order.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4 min-w-0">
                              <span className="text-xs font-mono text-gray-400 flex-shrink-0">#{order.id.slice(0, 8)}</span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-black truncate">
                                  {firstItem?.product_name || "Order"}
                                  {order.order_items?.length > 1 && (
                                    <span className="text-gray-400 font-normal"> +{order.order_items.length - 1} more</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400">{firstItem?.vendor_name || "Marketplace"} · {formatDate(order.created_at)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="font-semibold text-sm text-black">${parseFloat(order.total || 0).toFixed(2)}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div className="space-y-3">
                  {[
                    { label: "Browse marketplace", sub: "Shop thousands of products from verified sellers", Icon: Search, href: "/dashboard/buyer/marketplace" },
                    { label: "My wishlist", sub: `${wishlist.length} saved items`, Icon: Heart, action: () => setActiveTab("wishlist") },
                    { label: "All orders", sub: "Track your recent purchases", Icon: ShoppingBag, action: () => setActiveTab("orders") },
                  ].map(({ label, sub, Icon, action, href }) =>
                    href ? (
                      <Link key={label} href={href} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 hover:border-gray-400 hover:shadow-md hover:shadow-black/5 transition-all duration-300 group">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0"><Icon size={16} className="text-gray-500" /></div>
                        <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-black">{label}</div><div className="text-xs text-gray-400 mt-0.5">{sub}</div></div>
                        <ArrowUpRight size={14} className="text-gray-300 group-hover:text-black transition-colors flex-shrink-0" />
                      </Link>
                    ) : (
                      <button key={label} onClick={action} className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 hover:border-gray-400 hover:shadow-md hover:shadow-black/5 transition-all duration-300 group text-left">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0"><Icon size={16} className="text-gray-500" /></div>
                        <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-black">{label}</div><div className="text-xs text-gray-400 mt-0.5">{sub}</div></div>
                        <ArrowUpRight size={14} className="text-gray-300 group-hover:text-black transition-colors flex-shrink-0" />
                      </button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ORDERS */}
          {activeTab === "orders" && (
            <motion.div key="orders" variants={innerTabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="flex gap-1 flex-wrap mb-6">
                {[
                  { label: "All", value: "all" },
                  { label: "Processing", value: "processing" },
                  { label: "Shipped", value: "shipped" },
                  { label: "Delivered", value: "delivered" },
                ].map(({ label, value }) => {
                  const count = value === "all" ? orders.length : orders.filter(o => normStatus(o.status) === value).length;
                  const active = ordersFilter === value;
                  return (
                    <motion.button 
                      key={value} 
                      onClick={() => setOrdersFilter(value)}
                      whileTap={{ scale: 0.95 }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${active ? "bg-black text-white shadow-lg shadow-black/15" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-black"}`}
                    >
                      {label}
                      <span className={`text-[10px] font-bold tabular-nums ${active ? "opacity-60" : "text-gray-400"}`}>{count}</span>
                    </motion.button>
                  );
                })}
              </div>

              {ordersLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">Loading orders…</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <Package size={28} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-500 mb-1">
                    {ordersFilter === "all" ? "No orders yet" : `No ${ordersFilter} orders`}
                  </p>
                  <p className="text-xs text-gray-400 mb-5">
                    {ordersFilter === "all" ? "Your orders will appear here after checkout" : "Nothing to show for this status"}
                  </p>
                  <Link href="/dashboard/buyer/marketplace" className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10 inline-block">
                    Browse marketplace
                  </Link>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {confirmError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      {confirmError}
                    </div>
                  )}
                  {filteredOrders.map((order) => {
                    const sc = statusConfig[normStatus(order.status)] || statusConfig.processing;
                    const StatusIcon = sc.Icon;
                    const firstItem = order.order_items?.[0];
                    const canConfirm = !order.buyer_confirmed_at && order.payment_status === "paid" && ["shipped", "delivered"].includes(normStatus(order.status));
                    const allReleased = order.order_items?.length > 0 && order.order_items.every(i => i.payout_status === "released");
                    return (
                      <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                              <Package size={18} className="text-gray-300" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-black text-sm truncate">
                                {firstItem?.product_name || "Order"}
                                {order.order_items?.length > 1 && (
                                  <span className="text-gray-400 font-normal text-xs"> +{order.order_items.length - 1} item{order.order_items.length > 2 ? "s" : ""}</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">{firstItem?.vendor_name || "Marketplace"}</div>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.color}`}>
                                  <StatusIcon size={10} /> {sc.label}
                                </span>
                                <span className="text-[10px] text-gray-300">{formatDate(order.created_at)}</span>
                                {normStatus(order.status) === "delivered" && firstItem?.product_id && (() => {
                                  const ek = eligibilityKey(order.id, firstItem.product_id);
                                  const r = reviewEligibility[ek];
                                  if (r && !r.loading && r.canReview) {
                                    return (
                                      <motion.button 
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => openReviewModal(firstItem, order.id)}
                                        className="text-[10px] font-semibold text-white bg-black px-2.5 py-0.5 rounded-full hover:bg-gray-800 transition-colors whitespace-nowrap cursor-pointer"
                                      >
                                        Leave Review
                                      </motion.button>
                                    );
                                  }
                                  if (r && !r.loading && r.alreadyReviewed) {
                                    return (
                                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                        Reviewed
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="font-bold text-black text-sm">${parseFloat(order.total).toFixed(2)}</div>
                            <div className="text-[10px] text-gray-300 font-mono mt-1">#{order.id.slice(0, 8)}</div>
                          </div>
                        </div>

                        {/* Payment hold / payout status banner */}
                        {order.payment_status === "paid" && (
                          <div className={`mt-3 rounded-xl px-3 py-2.5 text-xs flex items-start gap-2 ${
                            allReleased
                              ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
                              : order.buyer_confirmed_at
                              ? "bg-blue-50 border border-blue-100 text-blue-700"
                              : "bg-indigo-50 border border-indigo-100 text-indigo-700"
                          }`}>
                            <Lock size={10} className="mt-0.5 flex-shrink-0" />
                            <span>
                              {allReleased
                                ? "Payment released to seller — order complete."
                                : order.buyer_confirmed_at
                                ? "You've confirmed receipt. Payment will be released once the seller marks delivery."
                                : canConfirm
                                ? "Payment is held by Cheaper. Confirm receipt below to release it to the seller."
                                : "Payment held by Cheaper until delivery is confirmed by both parties."}
                            </span>
                          </div>
                        )}

                        {/* Confirm delivery button */}
                        {canConfirm && (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleConfirmDelivery(order.id)}
                            disabled={confirmingOrderId === order.id}
                            className="mt-3 w-full flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            {confirmingOrderId === order.id ? (
                                <><Loader2 size={14} className="animate-spin" /> Confirming…</>
                            ) : (
                               <><CheckCircle size={14} /> Confirm I received this order</>
                            )}
                          </motion.button>
                        )}

                        {order.order_items?.length > 1 && (
                          <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                            {order.order_items.slice(1).map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-xs text-gray-400">
                                <span className="truncate">{item.product_name} × {item.qty}</span>
                                <span className="flex items-center gap-2 flex-shrink-0 ml-4">
                                  <span>${parseFloat(item.price * item.qty).toFixed(2)}</span>
                                  {(normStatus(order.status) === "delivered" && item.product_id && (() => {
                                    const ek = eligibilityKey(order.id, item.product_id);
                                    const r = reviewEligibility[ek];
                                    if (r && !r.loading && r.canReview) {
                                      return (
                                        <motion.button 
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() => openReviewModal(item, order.id)}
                                          className="text-[10px] font-semibold text-white bg-black px-2 py-0.5 rounded-full hover:bg-gray-800 transition-colors whitespace-nowrap cursor-pointer"
                                        >
                                          Leave Review
                                        </motion.button>
                                      );
                                    }
                                    if (r && !r.loading && r.alreadyReviewed) {
                                      return (
                                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                          Reviewed
                                        </span>
                                      );
                                    }
                                    return null;
                                  })())}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* WISHLIST */}
          {activeTab === "wishlist" && (
            <motion.div key="wishlist" variants={innerTabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-gray-400">
                  <span className="font-semibold text-black">{wishlist.length}</span> {wishlist.length === 1 ? "item" : "items"}
                </p>
              </div>

              {wishlist.length === 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <Heart size={32} className="text-gray-200 mx-auto mb-4" />
                  <p className="text-sm font-semibold text-gray-500 mb-1">Your wishlist is empty</p>
                  <p className="text-xs text-gray-400 mb-5">Save products you love and come back to them later</p>
                  <Link href="/dashboard/buyer/marketplace" className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10 inline-block">
                    Browse marketplace
                  </Link>
                </motion.div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {wishlist.map((item) => {
                    const discount = pct(item.price, item.original_price);
                    return (
                      <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex gap-4 shadow-sm hover:shadow-md hover:shadow-black/5 hover:border-gray-300 transition-all duration-300">
                        <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                          <Package size={20} className="text-gray-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-gray-400 mb-0.5 font-medium truncate">{item.vendor_name || "Seller information unavailable"}</div>
                          <div className="font-semibold text-sm text-black mb-1 leading-snug truncate">{item.name}</div>
                          <div className="flex items-center gap-1 mb-2">
                            <Star size={10} className="text-amber-500 fill-amber-500" />
                            <span className="text-[10px] font-bold text-black">{item.rating}</span>
                            <span className="text-gray-300 text-[10px]">({item.reviews})</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-bold text-black text-sm">${Number(item.price).toFixed(2)}</span>
                              {item.original_price && <span className="text-gray-300 text-xs line-through">${Number(item.original_price).toFixed(2)}</span>}
                              {discount && <span className="text-emerald-600 text-[10px] font-semibold">{discount}% off</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeFromWishlist(item.id)} 
                            className="text-gray-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                          >
                            <X size={15} />
                          </motion.button>
                          <motion.div
                            whileTap={{ scale: 0.95 }}
                            className="mt-auto"
                          >
                            <Link href={`/products/${item.id}`} className="text-[10px] font-semibold text-black hover:underline block">
                              View →
                            </Link>
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <motion.div key="settings" variants={innerTabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="space-y-4 max-w-2xl">
                {[
                  { title: "Full name", desc: "Your name shown on orders and reviews", value: displayName },
                  { title: "Email address", desc: "Used for order confirmations and account access", value: user?.email },
                ].map(({ title, desc, value }) => (
                  <div key={title} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
                    <div>
                      <div className="text-sm font-semibold text-black mb-0.5">{title}</div>
                      <div className="text-xs text-gray-400">{desc}</div>
                      <div className="text-sm text-gray-600 mt-2 font-medium">{value}</div>
                    </div>
                    <button className="text-xs font-semibold text-black hover:underline flex-shrink-0">Edit</button>
                  </div>
                ))}

                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <div className="text-sm font-semibold text-black mb-0.5">Password</div>
                  <div className="text-xs text-gray-400 mb-3">Update your account password</div>
                  <button className="text-xs font-semibold text-black hover:underline">Change password</button>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                  <div className="text-sm font-semibold text-red-700 mb-0.5">Danger zone</div>
                  <div className="text-xs text-red-400 mb-3">Permanently delete your account and all data</div>
                  <button className="text-xs font-semibold text-red-600 hover:underline">Delete account</button>
                </div>

                <button
                  onClick={handleLogout}
                  className="sm:hidden w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm font-semibold hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <ReviewModal
        open={reviewModalOpen}
        onClose={() => { setReviewModalOpen(false); setReviewModalProduct(null); setReviewModalOrderId(null); }}
        productName={reviewModalProduct?.product_name || ""}
        onSubmit={handleSubmitReview}
        submitting={reviewSubmitting}
        error={reviewSubmitError}
      />
    </div>
  );
}
