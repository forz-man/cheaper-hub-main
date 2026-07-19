"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShoppingBag, Heart, Settings, LogOut,
  Package, Star, ArrowUpRight, ChevronRight,
  X, CheckCircle, Truck, Clock, Store, Loader2,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logout, resolveUserRole } from "@/lib/auth";

const mockWishlist = [
  { id: "5", name: "Standing Desk Pro", seller: "WorkSpace Co.", price: 249.99, was: 349.99, rating: 4.7, reviews: 203 },
  { id: "6", name: "Air Purifier HEPA", seller: "CleanAir Shop", price: 89.00, was: 129.00, rating: 4.9, reviews: 87 },
  { id: "7", name: "Leather Wallet Slim", seller: "Craft & Co.", price: 34.00, was: 54.00, rating: 4.6, reviews: 145 },
  { id: "8", name: "Smart Plug (4-pack)", seller: "TechHub Store", price: 19.99, was: 29.99, rating: 4.8, reviews: 412 },
];

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
  return (
    <div className="flex gap-1 flex-wrap">
      {tabs.map(({ id, label, Icon, badge, href }) => (
        href ? (
          <Link key={id} href={href}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 bg-white border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-black">
            <Icon size={14} />
            {label}
          </Link>
        ) : (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
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
          </button>
        )
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, Icon }) {
  return (
    <motion.div variants={fadeUp}
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState(mockWishlist);

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
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  const [reviewFormRating, setReviewFormRating] = useState(0);
  const [reviewFormText, setReviewFormText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState("");

  async function loadOrders(uid) {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, status, total, created_at, order_items(id, product_id, product_name, vendor_name, qty, price)")
      .eq("buyer_id", uid)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data);
      checkReviewEligibility(data);
    }
    setOrdersLoading(false);
  }

  async function checkReviewEligibility(orders) {
    const productIds = new Set();
    for (const order of orders) {
      if (order.status !== "delivered" || !order.order_items) continue;
      for (const item of order.order_items) {
        if (item.product_id) productIds.add(item.product_id);
      }
    }
    if (productIds.size === 0) return;

    const loadingMap = {};
    for (const pid of productIds) loadingMap[pid] = { canReview: false, loading: true };
    setReviewEligibility(prev => ({ ...prev, ...loadingMap }));

    const results = await Promise.all(
      [...productIds].map(async (pid) => {
        try {
          const res = await fetch(`/api/reviews/eligibility?product_id=${pid}`);
          if (res.ok) {
            const data = await res.json();
            return [pid, { ...data, loading: false }];
          }
        } catch {}
        return [pid, { canReview: false, loading: false }];
      })
    );
    setReviewEligibility(prev => ({ ...prev, ...Object.fromEntries(results) }));
  }

  function openReviewModal(item) {
    setReviewModalProduct(item);
    setReviewFormRating(0);
    setReviewFormText("");
    setReviewSubmitError("");
    setReviewModalOpen(true);
  }

  async function handleSubmitReview() {
    if (!reviewModalProduct || reviewFormRating < 1) return;
    setReviewSubmitting(true);
    setReviewSubmitError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: reviewModalProduct.product_id, rating: reviewFormRating, text: reviewFormText.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        setReviewSubmitError(err.error || "Failed to submit review");
        return;
      }
      setReviewModalOpen(false);
      setReviewEligibility(prev => ({
        ...prev,
        [reviewModalProduct.product_id]: { canReview: false, existingReview: { rating: reviewFormRating }, loading: false },
      }));
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

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const role = resolveUserRole(user, profile?.role);
      if (role !== "buyer") { router.replace("/dashboard"); return; }

      setUser(user);
      setLoading(false);
      loadOrders(user.id);
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
  const deliveredCount = orders.filter(o => o.status === "delivered").length;
  const totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  const filteredOrders = ordersFilter === "all" ? orders : orders.filter(o => o.status === ordersFilter);

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
        <motion.div className="mb-6 flex items-start justify-between" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div>
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
            <motion.div key="overview" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                        const sc = statusConfig[order.status] || statusConfig.processing;
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
            <motion.div key="orders" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="flex gap-1 flex-wrap mb-6">
                {[
                  { label: "All", value: "all" },
                  { label: "Processing", value: "processing" },
                  { label: "Shipped", value: "shipped" },
                  { label: "Delivered", value: "delivered" },
                ].map(({ label, value }) => {
                  const count = value === "all" ? orders.length : orders.filter(o => o.status === value).length;
                  const active = ordersFilter === value;
                  return (
                    <button key={value} onClick={() => setOrdersFilter(value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${active ? "bg-black text-white shadow-lg shadow-black/15" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-black"}`}>
                      {label}
                      <span className={`text-[10px] font-bold tabular-nums ${active ? "opacity-60" : "text-gray-400"}`}>{count}</span>
                    </button>
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
                  {filteredOrders.map((order) => {
                    const sc = statusConfig[order.status] || statusConfig.processing;
                    const StatusIcon = sc.Icon;
                    const firstItem = order.order_items?.[0];
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
                                {order.status === "delivered" && firstItem?.product_id && reviewEligibility[firstItem.product_id] && !reviewEligibility[firstItem.product_id].loading && (
                                  reviewEligibility[firstItem.product_id].canReview ? (
                                    <button onClick={() => openReviewModal(firstItem)}
                                      className="text-[10px] font-semibold text-white bg-black px-2.5 py-0.5 rounded-full hover:bg-gray-800 transition-colors whitespace-nowrap">
                                      Give Review
                                    </button>
                                  ) : reviewEligibility[firstItem.product_id].existingReview ? (
                                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                      Reviewed
                                    </span>
                                  ) : null
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="font-bold text-black text-sm">${parseFloat(order.total).toFixed(2)}</div>
                            <div className="text-[10px] text-gray-300 font-mono mt-1">#{order.id.slice(0, 8)}</div>
                          </div>
                        </div>
                        {order.order_items?.length > 1 && (
                          <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                            {order.order_items.slice(1).map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-xs text-gray-400">
                                <span className="truncate">{item.product_name} × {item.qty}</span>
                                <span className="flex items-center gap-2 flex-shrink-0 ml-4">
                                  <span>${parseFloat(item.price * item.qty).toFixed(2)}</span>
                                  {order.status === "delivered" && item.product_id && reviewEligibility[item.product_id] && !reviewEligibility[item.product_id].loading && (
                                    reviewEligibility[item.product_id].canReview ? (
                                      <button onClick={() => openReviewModal(item)}
                                        className="text-[10px] font-semibold text-white bg-black px-2 py-0.5 rounded-full hover:bg-gray-800 transition-colors whitespace-nowrap">
                                        Give Review
                                      </button>
                                    ) : reviewEligibility[item.product_id].existingReview ? (
                                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                        Reviewed
                                      </span>
                                    ) : null
                                  )}
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
            <motion.div key="wishlist" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
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
                    const discount = pct(item.price, item.was);
                    return (
                      <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex gap-4 shadow-sm hover:shadow-md hover:shadow-black/5 hover:border-gray-300 transition-all duration-300">
                        <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                          <Package size={20} className="text-gray-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-gray-400 mb-0.5 font-medium truncate">{item.seller}</div>
                          <div className="font-semibold text-sm text-black mb-1 leading-snug truncate">{item.name}</div>
                          <div className="flex items-center gap-1 mb-2">
                            <Star size={10} className="text-amber-500 fill-amber-500" />
                            <span className="text-[10px] font-bold text-black">{item.rating}</span>
                            <span className="text-gray-300 text-[10px]">({item.reviews})</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-bold text-black text-sm">${item.price.toFixed(2)}</span>
                              {item.was && <span className="text-gray-300 text-xs line-through">${item.was.toFixed(2)}</span>}
                              {discount && <span className="text-emerald-600 text-[10px] font-semibold">{discount}% off</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <button onClick={() => removeFromWishlist(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <X size={15} />
                          </button>
                          <Link href={`/products/${item.id}`} className="text-[10px] font-semibold text-black hover:underline mt-auto">
                            View →
                          </Link>
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
            <motion.div key="settings" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
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

      {/* ── Review Modal ──────────────────────────────────────────── */}
      {reviewModalOpen && reviewModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setReviewModalOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
          >
            <button onClick={() => setReviewModalOpen(false)} className="absolute top-4 right-4 text-gray-300 hover:text-black transition-colors">
              <X size={16} />
            </button>
            <h3 className="text-base font-bold text-black mb-1" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
              Review product
            </h3>
            <p className="text-xs text-gray-400 mb-4">{reviewModalProduct.product_name}</p>

            {/* Star rating */}
            <div className="flex items-center gap-1 mb-4">
              {[1,2,3,4,5].map(s => (
                <button key={s} type="button" onClick={() => setReviewFormRating(s)} className="p-0.5 transition-transform hover:scale-110">
                  <Star size={22} className={s <= reviewFormRating ? "text-amber-500 fill-amber-500" : "text-gray-200"} />
                </button>
              ))}
              {reviewFormRating > 0 && (
                <span className="text-xs text-gray-400 ml-2">
                  {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][reviewFormRating]}
                </span>
              )}
            </div>

            {/* Comment */}
            <textarea
              value={reviewFormText}
              onChange={(e) => setReviewFormText(e.target.value)}
              placeholder="Share your experience with this product..."
              maxLength={2000}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white resize-none focus:outline-none focus:border-gray-400 transition-colors"
            />
            {reviewSubmitError && (
              <p className="text-xs text-red-500 mt-1.5">{reviewSubmitError}</p>
            )}
            <div className="flex items-center justify-between mt-4">
              <span className="text-[10px] text-gray-300">{reviewFormText.length}/2000</span>
              <button
                onClick={handleSubmitReview}
                disabled={reviewSubmitting || reviewFormRating < 1}
                className="bg-black text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {reviewSubmitting ? (
                  <><Loader2 size={12} className="animate-spin" /> Submitting...</>
                ) : (
                  "Submit review"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
