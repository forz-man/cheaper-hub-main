"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, ShoppingBag, Plug, Settings,
  Plus, Upload, TrendingUp, Eye, Star, ChevronRight, Search, X,
  CheckCircle, Clock, AlertCircle, Trash2, Store, Loader2,
  AlertTriangle, Heart, Truck, ArrowUpRight, Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import useAuth from "@/hooks/useAuth";
import IntegrationsTab from "@/components/dashboard/IntegrationsTab";

// ─── Static data ───────────────────────────────────────────────────────────────

const CATEGORIES = ["Electronics", "Fashion", "Home & Living", "Food & Bev", "Sports", "Books"];

const statusConfig = {
  delivered:    { label: "Delivered",    color: "text-emerald-700 bg-emerald-50 border-emerald-100", Icon: CheckCircle },
  shipped:      { label: "Shipped",      color: "text-blue-700 bg-blue-50 border-blue-100",           Icon: Truck       },
  processing:   { label: "Processing",   color: "text-amber-700 bg-amber-50 border-amber-100",        Icon: Clock       },
  cancelled:    { label: "Cancelled",    color: "text-red-700 bg-red-50 border-red-100",              Icon: X           },
  active:       { label: "Active",       color: "text-emerald-700 bg-emerald-50 border-emerald-100",  Icon: CheckCircle },
  out_of_stock: { label: "Out of stock", color: "text-red-700 bg-red-50 border-red-100",              Icon: AlertCircle },
  draft:        { label: "Draft",        color: "text-gray-500 bg-gray-50 border-gray-200",           Icon: Clock       },
};

const integrations = [
  { name: "Shopify",     bg: "#96bf48", desc: "Sync your Shopify product catalog automatically",  connected: false },
  { name: "WooCommerce", bg: "#7f54b3", desc: "Import products from your WooCommerce store",      connected: false },
  { name: "Wix",         bg: "#1a1a1a", desc: "Connect your Wix store and sync inventory",        connected: false },
  { name: "WordPress",   bg: "#21759b", desc: "Link your WordPress site with WooCommerce plugin", connected: false },
];


const mockWishlist = [
  { id: "5", name: "Standing Desk Pro",   seller: "WorkSpace Co.",  price: 249.99, was: 349.99, rating: 4.7, reviews: 203 },
  { id: "6", name: "Air Purifier HEPA",   seller: "CleanAir Shop",  price: 89.00,  was: 129.00, rating: 4.9, reviews: 87  },
  { id: "7", name: "Leather Wallet Slim", seller: "Craft & Co.",    price: 34.00,  was: 54.00,  rating: 4.6, reviews: 145 },
  { id: "8", name: "Smart Plug (4-pack)", seller: "TechHub Store",  price: 19.99,  was: 29.99,  rating: 4.8, reviews: 412 },
];

const emptyForm = { name: "", price: "", original_price: "", stock: "", category: "", description: "" };

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
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

// ─── Shared tab bar ────────────────────────────────────────────────────────────

function TabBar({ tabs, activeTab, setActiveTab }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {tabs.map(({ id, label, Icon, badge }) => (
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
      ))}
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

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

// ─── Vendor view ──────────────────────────────────────────────────────────────

function VendorDashboard({ user, displayName }) {
  const [activeTab, setActiveTab]             = useState("overview");
  const [products, setProducts]               = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [dbError, setDbError]                 = useState(null);
  const [showAddProduct, setShowAddProduct]   = useState(false);
  const [form, setForm]                       = useState(emptyForm);
  const [saving, setSaving]                   = useState(false);
  const [saveError, setSaveError]             = useState(null);
  const [deletingId, setDeletingId]           = useState(null);
  // Orders
  const [orders, setOrders]                   = useState([]);
  const [ordersLoading, setOrdersLoading]     = useState(false);
  const [ordersFilter, setOrdersFilter]       = useState("all");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [orderToast, setOrderToast]           = useState(null); // { id, message, ok }

  useEffect(() => { loadProducts(); loadVendorOrders(); }, [user?.id]); // eslint-disable-line

  async function loadProducts() {
    if (!user?.id) return;
    setProductsLoading(true); setDbError(null);
    const { data, error } = await supabase
      .from("products").select("*").eq("vendor_id", user.id).order("created_at", { ascending: false });
    if (error) setDbError(error.code === "42P01" ? "table_missing" : error.message);
    else setProducts(data || []);
    setProductsLoading(false);
  }

  async function loadVendorOrders() {
    if (!user?.id) return;
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/orders");
      const json = await res.json();
      setOrders(json.orders || []);
    } catch { setOrders([]); }
    setOrdersLoading(false);
  }

  async function updateOrderStatus(orderId, newStatus) {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setOrderToast({ id: orderId, message: `Status updated to "${statusConfig[newStatus]?.label || newStatus}"`, ok: true });
    } catch (err) {
      setOrderToast({ id: orderId, message: err.message, ok: false });
    }
    setUpdatingOrderId(null);
    setTimeout(() => setOrderToast(null), 4000);
  }

  const handleFormChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const openAddProduct = () => { setForm(emptyForm); setSaveError(null); setShowAddProduct(true); };

  const handleSaveProduct = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true); setSaveError(null);
    const { data, error } = await supabase.from("products").insert({
      vendor_id: user.id, vendor_name: displayName,
      name: form.name.trim(), description: form.description.trim() || null,
      category: form.category || null, price: parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      stock: form.stock ? parseInt(form.stock, 10) : 0,
      status: parseInt(form.stock || "0", 10) === 0 ? "out_of_stock" : "active",
    }).select().single();
    if (error) { setSaveError(error.code === "42P01" ? "table_missing" : error.message); setSaving(false); return; }
    setProducts(prev => [data, ...prev]);
    setForm(emptyForm); setShowAddProduct(false); setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product? This can't be undone.")) return;
    setDeletingId(id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) setProducts(prev => prev.filter(p => p.id !== id));
    setDeletingId(null);
  };

  const tabs = [
    { id: "overview",     label: "Overview",     Icon: LayoutDashboard },
    { id: "products",     label: "Products",     Icon: Package,    badge: products.length },
    { id: "orders",       label: "Orders",       Icon: ShoppingBag },
    { id: "integrations", label: "Integrations", Icon: Plug        },
    { id: "settings",     label: "Settings",     Icon: Settings    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="container py-8">

        {/* Page header */}
        <motion.div className="mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-black rounded-xl">
              <LayoutDashboard size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
              Vendor Dashboard
            </h1>
          </div>
          <p className="text-gray-400 text-sm mt-1 ml-1">Good morning, {displayName.split(" ")[0]} — here's how your store is performing</p>
        </motion.div>

        {dbError === "table_missing" && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-800">Database setup needed</div>
              <div className="text-xs text-amber-700 mt-0.5">Run the one-time SQL to create the products table.</div>
            </div>
            <Link href="/setup" className="text-xs font-semibold text-amber-700 border border-amber-300 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors flex-shrink-0">Setup →</Link>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <TabBar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div key="overview" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="flex items-center justify-between mb-6">
                <div />
                <motion.button onClick={openAddProduct} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10">
                  <Plus size={16} /> Add product
                </motion.button>
              </div>

              <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {(() => {
                  const revenue = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
                  const pending = orders.filter(o => o.status === "processing").length;
                  return [
                    { label: "Total products", value: productsLoading ? "…" : String(products.length),                   sub: "Live listings",       Icon: Package    },
                    { label: "Total orders",   value: ordersLoading ? "…" : String(orders.length),                       sub: `${pending} pending`,  Icon: ShoppingBag },
                    { label: "Revenue",        value: ordersLoading ? "…" : `${revenue.toFixed(2)}`,                    sub: "All time",            Icon: TrendingUp  },
                    { label: "Delivered",      value: ordersLoading ? "…" : String(orders.filter(o=>o.status==="delivered").length), sub: "Completed", Icon: CheckCircle },
                  ].map(s => <StatCard key={s.label} {...s} />);
                })()}
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
                      <ShoppingBag size={22} className="text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No orders yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {orders.slice(0, 4).map((order) => {
                        const sc = statusConfig[order.status] || statusConfig.processing;
                        const firstItem = order.order_items?.[0];
                        return (
                          <div key={order.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4 min-w-0">
                              <span className="text-xs font-mono text-gray-400 flex-shrink-0">#{order.id.slice(0,8)}</span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-black truncate">{firstItem?.product_name || "Order"}</div>
                                <div className="text-xs text-gray-400">{order.buyer_name || "—"} · {order.created_at ? formatDate(order.created_at) : "—"}</div>
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
                    { label: "Add a product",   sub: "List manually or via CSV",    Icon: Plus,  action: openAddProduct },
                    { label: "Connect store",    sub: "Shopify, WooCommerce & more", Icon: Plug,  action: () => setActiveTab("integrations") },
                    { label: "View marketplace", sub: "See your live listings",      Icon: Store, href: "/marketplace" },
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

          {/* PRODUCTS */}
          {activeTab === "products" && (
            <motion.div key="products" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-400">
                    <Sparkles size={14} className="inline mr-1 text-yellow-400" />
                    <span className="font-semibold text-black">{products.length}</span> {products.length === 1 ? "product" : "products"}
                  </p>
                </div>
                <motion.button onClick={openAddProduct} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10">
                  <Plus size={16} /> Add product
                </motion.button>
              </div>

              {/* Search */}
              <div className="bg-white border border-gray-200 rounded-2xl flex items-center mb-5 overflow-hidden shadow-sm hover:border-gray-400 focus-within:border-black focus-within:ring-2 focus-within:ring-black/5 transition-all">
                <Search size={16} className="ml-4 text-gray-400 flex-shrink-0" />
                <input className="flex-1 text-sm py-3.5 px-3 outline-none text-black placeholder:text-gray-400 bg-transparent" placeholder="Search products…" />
              </div>

              {productsLoading ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-16 flex flex-col items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm animate-pulse">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-dashed border-gray-200 rounded-2xl p-16 text-center shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Package size={28} className="text-gray-300" />
                  </div>
                  <p className="text-base font-semibold text-black mb-1">No products yet</p>
                  <p className="text-sm text-gray-400 mb-6">Add your first product to start selling on Cheaper</p>
                  <motion.button onClick={openAddProduct} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10">
                    Add a product
                  </motion.button>
                </motion.div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Product</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Category</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Price</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Stock</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><Package size={14} className="text-gray-400" /></div>
                              <div className="min-w-0">
                                <div className="font-medium text-black truncate max-w-[180px]">{p.name}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{p.id.slice(0, 8)}…</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-gray-400 hidden md:table-cell">{p.category || "—"}</td>
                          <td className="px-5 py-4 font-semibold text-black">${parseFloat(p.price).toFixed(2)}</td>
                          <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">{p.stock === 0 ? <span className="text-red-500 font-semibold">0</span> : p.stock}</td>
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${(statusConfig[p.status] || statusConfig.active).color}`}>
                              {(statusConfig[p.status] || statusConfig.active).label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link href={`/products/${p.id}`} className="p-1.5 rounded-lg text-gray-300 hover:text-black hover:bg-gray-100 transition-colors"><Eye size={14} /></Link>
                              <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                                {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 border border-dashed border-gray-200 rounded-2xl p-8 text-center bg-white shadow-sm">
                <Upload size={22} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-black mb-1">Import products in bulk</p>
                <p className="text-xs text-gray-400 mb-4">Connect your store or upload a CSV</p>
                <button onClick={() => setActiveTab("integrations")} className="text-xs font-semibold text-black hover:underline">Connect a store →</button>
              </div>
            </motion.div>
          )}

          {/* ORDERS */}
          {activeTab === "orders" && (
            <motion.div key="orders" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              {/* Toast */}
              {orderToast && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${orderToast.ok ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"}`}>
                  {orderToast.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  {orderToast.message}
                </motion.div>
              )}

              {/* Filters */}
              <div className="flex gap-1 flex-wrap mb-6">
                {[
                  { label: "All",        value: "all"        },
                  { label: "Processing", value: "processing" },
                  { label: "Shipped",    value: "shipped"    },
                  { label: "Delivered",  value: "delivered"  },
                  { label: "Cancelled",  value: "cancelled"  },
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
              ) : (() => {
                const filtered = ordersFilter === "all" ? orders : orders.filter(o => o.status === ordersFilter);
                if (filtered.length === 0) return (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><ShoppingBag size={22} className="text-gray-300" /></div>
                    <p className="text-base font-semibold text-black mb-1">{ordersFilter === "all" ? "No orders yet" : `No ${ordersFilter} orders`}</p>
                    <p className="text-sm text-gray-400">{ordersFilter === "all" ? "Orders from buyers will appear here" : "Nothing to show for this status"}</p>
                  </motion.div>
                );

                // Determine which statuses a vendor can transition to from a given status
                const nextStatuses = {
                  processing: ["shipped", "cancelled"],
                  shipped:    ["delivered", "cancelled"],
                  delivered:  [],
                  cancelled:  [],
                };

                return (
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Order</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Items</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Buyer</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Date</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filtered.map((order) => {
                          const sc = statusConfig[order.status] || statusConfig.processing;
                          const firstItem = order.order_items?.[0];
                          const updating = updatingOrderId === order.id;
                          const transitions = nextStatuses[order.status] || [];
                          return (
                            <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-5 py-4 font-mono text-xs text-gray-400">#{order.id.slice(0,8)}</td>
                              <td className="px-5 py-4 font-medium text-black hidden md:table-cell">
                                <div className="truncate max-w-[160px]">{firstItem?.product_name || "—"}</div>
                                {order.order_items?.length > 1 && <div className="text-xs text-gray-400">+{order.order_items.length - 1} more</div>}
                              </td>
                              <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">{order.buyer_name || "—"}</td>
                              <td className="px-5 py-4 font-semibold text-black">${parseFloat(order.total || 0).toFixed(2)}</td>
                              <td className="px-5 py-4">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>
                              </td>
                              <td className="px-5 py-4 text-gray-400 text-xs hidden lg:table-cell">
                                {order.created_at ? formatDate(order.created_at) : "—"}
                              </td>
                              <td className="px-5 py-4">
                                {updating ? (
                                  <Loader2 size={14} className="animate-spin text-gray-400" />
                                ) : transitions.length > 0 ? (
                                  <select
                                    defaultValue=""
                                    onChange={e => { if (e.target.value) updateOrderStatus(order.id, e.target.value); }}
                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-black font-medium hover:border-gray-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/10 transition-colors">
                                    <option value="" disabled>Move to…</option>
                                    {transitions.map(s => (
                                      <option key={s} value={s}>{statusConfig[s]?.label || s}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-xs text-gray-300 italic">Final</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* INTEGRATIONS */}
          {activeTab === "integrations" && (
            <motion.div key="integrations" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <IntegrationsTab openAddProduct={openAddProduct} />
            </motion.div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <motion.div key="settings" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="max-w-2xl space-y-4">
                {[
                  { title: "Store name",    desc: "Your public store name on the marketplace", value: displayName + "'s Store" },
                  { title: "Contact email", desc: "Used for order notifications and buyer contact", value: user?.email },
                ].map(({ title, desc, value }) => (
                  <div key={title} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div><div className="font-semibold text-black text-sm">{title}</div><div className="text-xs text-gray-400 mt-0.5">{desc}</div></div>
                      <button className="text-xs font-semibold text-black border border-gray-200 px-3 py-1.5 rounded-xl hover:border-gray-400 transition-colors flex-shrink-0">Edit</button>
                    </div>
                    <div className="text-sm text-gray-600 font-medium bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">{value}</div>
                  </div>
                ))}
                <div className="bg-white border border-red-100 rounded-2xl p-6">
                  <div className="font-semibold text-black text-sm mb-1">Danger zone</div>
                  <div className="text-xs text-gray-400 mb-4">These actions are permanent and cannot be undone.</div>
                  <button className="text-xs font-semibold text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors">Delete store</button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col"
              initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="font-bold text-black text-base" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Add a product</h2>
                <button onClick={() => setShowAddProduct(false)} className="p-1 text-gray-300 hover:text-black transition-colors"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {saveError === "table_missing" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                    <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div><div className="text-xs font-semibold text-amber-800">Database not set up yet</div><Link href="/setup" className="text-xs text-amber-700 underline">Run the one-time setup →</Link></div>
                  </div>
                )}
                {saveError && saveError !== "table_missing" && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">{saveError}</div>
                )}
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Product name <span className="text-red-400">*</span></label>
                  <input name="name" value={form.name} onChange={handleFormChange} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black transition-all" placeholder="e.g. Wireless Earbuds Pro" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Price ($) <span className="text-red-400">*</span></label>
                    <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleFormChange} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black transition-all" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Original price ($)</label>
                    <input name="original_price" type="number" min="0" step="0.01" value={form.original_price} onChange={handleFormChange} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black transition-all" placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Stock qty</label>
                    <input name="stock" type="number" min="0" value={form.stock} onChange={handleFormChange} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black transition-all" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Category</label>
                    <select name="category" value={form.category} onChange={handleFormChange} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black bg-white transition-all">
                      <option value="">Select…</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Description</label>
                  <textarea name="description" value={form.description} onChange={handleFormChange} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black resize-none transition-all" rows={3} placeholder="Describe your product…" />
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-100">
                <button onClick={() => setShowAddProduct(false)} className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm font-semibold hover:border-gray-400 transition-all">Cancel</button>
                <button onClick={handleSaveProduct} disabled={saving || !form.name.trim() || !form.price}
                  className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save product"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Buyer view ────────────────────────────────────────────────────────────────

function BuyerDashboard({ user, displayName }) {
  const router = useRouter();
  const [activeTab, setActiveTab]         = useState("overview");
  const [wishlist, setWishlist]           = useState(mockWishlist);
  const [orders, setOrders]               = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersFilter, setOrdersFilter]   = useState("all");

  useEffect(() => {
    if (!user?.id) return;
    async function loadOrders() {
      setOrdersLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total, created_at, order_items(product_name, vendor_name, qty, price)")
        .eq("buyer_id", user.id).order("created_at", { ascending: false });
      if (!error && data) setOrders(data);
      setOrdersLoading(false);
    }
    loadOrders();
  }, [user?.id]);

  const removeFromWishlist = (id) => setWishlist(w => w.filter(i => i.id !== id));
  const deliveredCount = orders.filter(o => o.status === "delivered").length;
  const totalSpent     = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  const filteredOrders = ordersFilter === "all" ? orders : orders.filter(o => o.status === ordersFilter);

  const tabs = [
    { id: "overview", label: "Overview",  Icon: LayoutDashboard },
    { id: "orders",   label: "My Orders", Icon: ShoppingBag     },
    { id: "wishlist", label: "Wishlist",  Icon: Heart           },
    { id: "settings", label: "Settings",  Icon: Settings        },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="container py-8">

        {/* Page header */}
        <motion.div className="mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-black rounded-xl">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
              My Dashboard
            </h1>
          </div>
          <p className="text-gray-400 text-sm mt-1 ml-1">Welcome back, {displayName.split(" ")[0]} — your shopping activity at a glance</p>
        </motion.div>

        {/* Tabs */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <TabBar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        </motion.div>

        <AnimatePresence mode="wait">

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div key="overview" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Orders placed",  value: ordersLoading ? "…" : String(orders.length),              sub: "All time",         Icon: ShoppingBag },
                  { label: "Delivered",      value: ordersLoading ? "…" : String(deliveredCount),             sub: "Completed",        Icon: CheckCircle },
                  { label: "Saved items",    value: String(wishlist.length),                                   sub: "In your wishlist", Icon: Heart       },
                  { label: "Total spent",    value: ordersLoading ? "…" : `$${totalSpent.toFixed(2)}`,        sub: "All orders",       Icon: Store       },
                ].map(s => <StatCard key={s.label} {...s} />)}
              </motion.div>

              <div className="grid lg:grid-cols-3 gap-5">
                {/* Recent orders */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-black">Recent orders</h2>
                    <button onClick={() => setActiveTab("orders")} className="text-xs text-black font-medium hover:underline flex items-center gap-1">View all <ChevronRight size={12} /></button>
                  </div>
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-10"><Loader2 size={18} className="animate-spin text-gray-300" /></div>
                  ) : orders.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3"><Package size={20} className="text-gray-300" /></div>
                      <p className="text-sm font-medium text-black mb-1">No orders yet</p>
                      <p className="text-xs text-gray-400 mb-4">Start shopping on the marketplace</p>
                      <button onClick={() => router.push("/marketplace")} className="text-xs font-semibold text-black hover:underline">Browse marketplace →</button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {orders.slice(0, 4).map((order) => {
                        const sc = statusConfig[order.status] || statusConfig.processing;
                        const firstItem = order.order_items?.[0];
                        return (
                          <div key={order.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><Package size={14} className="text-gray-400" /></div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-black truncate">
                                  {firstItem?.product_name || "Order"}
                                  {order.order_items?.length > 1 && <span className="text-gray-400 font-normal"> +{order.order_items.length - 1} more</span>}
                                </div>
                                <div className="text-xs text-gray-400">{firstItem?.vendor_name || "Marketplace"} · {formatDate(order.created_at)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="font-semibold text-sm text-black">${parseFloat(order.total).toFixed(2)}</span>
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
                    { label: "Browse marketplace", sub: "Shop verified sellers",         Icon: Search,      action: () => router.push("/marketplace") },
                    { label: "My wishlist",         sub: `${wishlist.length} saved items`, Icon: Heart,     action: () => setActiveTab("wishlist")    },
                    { label: "All orders",          sub: "Track your purchases",           Icon: ShoppingBag, action: () => setActiveTab("orders")    },
                  ].map(({ label, sub, Icon, action }) => (
                    <motion.button key={label} onClick={action} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 hover:border-gray-400 hover:shadow-md hover:shadow-black/5 transition-all duration-300 group text-left">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0"><Icon size={16} className="text-gray-500" /></div>
                      <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-black">{label}</div><div className="text-xs text-gray-400 mt-0.5">{sub}</div></div>
                      <ArrowUpRight size={14} className="text-gray-300 group-hover:text-black transition-colors flex-shrink-0" />
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ORDERS */}
          {activeTab === "orders" && (
            <motion.div key="orders" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="flex gap-1 flex-wrap mb-6">
                {[{ label: "All", value: "all" }, { label: "Processing", value: "processing" }, { label: "Shipped", value: "shipped" }, { label: "Delivered", value: "delivered" }].map(({ label, value }) => (
                  <button key={value} onClick={() => setOrdersFilter(value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${ordersFilter === value ? "bg-black text-white shadow-lg shadow-black/15" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-black"}`}>
                    {label}
                    {value !== "all" && <span className={`ml-1.5 text-[10px] font-bold ${ordersFilter === value ? "opacity-60" : "text-gray-400"}`}>{orders.filter(o => o.status === value).length}</span>}
                  </button>
                ))}
              </div>
              {ordersLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm animate-pulse">Loading orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Package size={24} className="text-gray-300" /></div>
                  <p className="text-base font-semibold text-black mb-1">{ordersFilter === "all" ? "No orders yet" : `No ${ordersFilter} orders`}</p>
                  <p className="text-sm text-gray-400 mb-6">{ordersFilter === "all" ? "Your orders will appear here after checkout" : "Nothing to show for this status"}</p>
                  <motion.button onClick={() => router.push("/marketplace")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10">
                    Browse marketplace
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
                  {filteredOrders.map((order) => {
                    const sc = statusConfig[order.status] || statusConfig.processing;
                    const StatusIcon = sc.Icon;
                    const firstItem = order.order_items?.[0];
                    return (
                      <motion.div key={order.id} variants={fadeUp}
                        className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:shadow-black/5 hover:border-gray-300 transition-all duration-300">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><Package size={18} className="text-gray-400" /></div>
                            <div className="min-w-0">
                              <div className="font-semibold text-black text-sm truncate">
                                {firstItem?.product_name || "Order"}
                                {order.order_items?.length > 1 && <span className="text-gray-400 font-normal text-xs"> +{order.order_items.length - 1} item{order.order_items.length > 2 ? "s" : ""}</span>}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">{firstItem?.vendor_name || "Marketplace"}</div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.color}`}><StatusIcon size={10} /> {sc.label}</span>
                                <span className="text-[10px] text-gray-400">{formatDate(order.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="font-bold text-black text-sm">${parseFloat(order.total).toFixed(2)}</div>
                            <div className="text-[10px] text-gray-400 font-mono mt-1">#{order.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* WISHLIST */}
          {activeTab === "wishlist" && (
            <motion.div key="wishlist" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-gray-400">
                  <Sparkles size={14} className="inline mr-1 text-yellow-400" />
                  <span className="font-semibold text-black">{wishlist.length}</span> saved {wishlist.length === 1 ? "item" : "items"}
                </p>
                <Link href="/marketplace" className="text-xs font-semibold text-black hover:underline flex items-center gap-1">
                  Browse more <ArrowUpRight size={12} />
                </Link>
              </div>
              {wishlist.length === 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Heart size={28} className="text-gray-300" /></div>
                  <p className="text-base font-semibold text-black mb-1">Your wishlist is empty</p>
                  <p className="text-sm text-gray-400 mb-6">Save products you love and come back to them later</p>
                  <motion.button onClick={() => router.push("/marketplace")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10">
                    Browse marketplace
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="visible" className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {wishlist.map((item) => {
                    const discount = pct(item.price, item.was);
                    return (
                      <motion.div key={item.id} variants={fadeUp}
                        className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-black/5 hover:border-gray-300 transition-all duration-300 group">
                        <div className="relative h-40 bg-gray-50 flex items-center justify-center">
                          {discount && <span className="absolute top-3 left-3 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-{discount}%</span>}
                          <button onClick={() => removeFromWishlist(item.id)} className="absolute top-3 right-3 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-300 hover:text-red-500 transition-colors">
                            <X size={13} />
                          </button>
                          <Package size={32} className="text-gray-300" />
                        </div>
                        <div className="p-4">
                          <div className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide font-medium">{item.seller}</div>
                          <div className="font-semibold text-sm text-black mb-2 leading-snug">{item.name}</div>
                          <div className="flex items-center gap-1 mb-3">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={10} className={i < Math.floor(item.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"} />
                            ))}
                            <span className="text-[10px] text-gray-400 ml-1">({item.reviews})</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-bold text-black">${item.price.toFixed(2)}</span>
                              {item.was && <span className="text-gray-300 text-xs line-through">${item.was.toFixed(2)}</span>}
                            </div>
                            <Link href={`/products/${item.id}`}
                              className="bg-black text-white text-[10px] font-semibold px-3 py-1.5 rounded-full hover:bg-gray-800 transition-colors">
                              View →
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <motion.div key="settings" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="max-w-2xl space-y-4">
                {[
                  { title: "Full name",     desc: "Your name shown on orders and reviews",          value: displayName },
                  { title: "Email address", desc: "Used for order confirmations and account access", value: user?.email },
                ].map(({ title, desc, value }) => (
                  <div key={title} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div><div className="text-sm font-semibold text-black mb-0.5">{title}</div><div className="text-xs text-gray-400">{desc}</div></div>
                      <button className="text-xs font-semibold text-black border border-gray-200 px-3 py-1.5 rounded-xl hover:border-gray-400 transition-colors flex-shrink-0">Edit</button>
                    </div>
                    <div className="text-sm text-gray-600 font-medium bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">{value}</div>
                  </div>
                ))}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <div className="text-sm font-semibold text-black mb-0.5">Password</div>
                  <div className="text-xs text-gray-400 mb-3">Update your account password</div>
                  <button className="text-xs font-semibold text-black border border-gray-200 px-3 py-1.5 rounded-xl hover:border-gray-400 transition-colors">Change password</button>
                </div>
                <div className="bg-white border border-red-100 rounded-2xl p-6">
                  <div className="text-sm font-semibold text-red-700 mb-0.5">Danger zone</div>
                  <div className="text-xs text-gray-400 mb-4">Permanently delete your account and all data</div>
                  <button className="text-xs font-semibold text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors">Delete account</button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Root: auth gate + role router ────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [role, setRole]       = useState(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }

    async function resolveRole() {
      const metaRole = user.user_metadata?.role || user.app_metadata?.role;
      if (metaRole) { setRole(metaRole); setResolving(false); return; }

      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
      const r = profile?.role;
      if (r) { setRole(r); setResolving(false); return; }

      router.replace("/select-role?from=dashboard");
    }
    resolveRole();
  }, [user, authLoading, router]);

  if (authLoading || resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  // Guard: user became null after logout — let redirect take effect
  if (!user) return null;

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  if (role === "vendor" || role === "admin") return <VendorDashboard user={user} displayName={displayName} />;
  if (role === "buyer") return <BuyerDashboard user={user} displayName={displayName} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
      <div className="text-center bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-sm">
        <p className="text-sm text-gray-400 mb-4">We couldn't determine your account type.</p>
        <button onClick={() => router.replace("/select-role")}
          className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all">
          Set up your account →
        </button>
      </div>
    </div>
  );
}
