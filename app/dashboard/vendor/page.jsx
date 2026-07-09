"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, ShoppingBag, Plug, Settings,
  LogOut, Plus, Upload, ArrowUpRight,
  TrendingUp, Eye, ChevronRight, Search, X,
  Trash2, Store, Loader2, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logout, resolveUserRole } from "@/lib/auth";

const integrations = [
  { name: "Shopify", bg: "#96bf48", desc: "Sync your Shopify product catalog automatically", connected: false },
  { name: "WooCommerce", bg: "#7f54b3", desc: "Import products from your WooCommerce store", connected: false },
  { name: "Wix", bg: "#1a1a1a", desc: "Connect your Wix store and sync inventory", connected: false },
  { name: "WordPress", bg: "#21759b", desc: "Link your WordPress site with WooCommerce plugin", connected: false },
];

const mockOrders = [
  { id: "#3821", buyer: "Sarah K.", product: "Wireless Earbuds Pro", amount: 29.99, status: "delivered", date: "Jun 23" },
  { id: "#3820", buyer: "James L.", product: "Linen Throw Blanket", amount: 18.00, status: "shipped", date: "Jun 23" },
  { id: "#3818", buyer: "Amara D.", product: "Ceramic Mug Set (4)", amount: 12.50, status: "processing", date: "Jun 22" },
  { id: "#3815", buyer: "Tom W.", product: "Wireless Earbuds Pro", amount: 29.99, status: "delivered", date: "Jun 21" },
  { id: "#3812", buyer: "Priya N.", product: "Running Shoes X2", amount: 44.99, status: "delivered", date: "Jun 20" },
];

const statusConfig = {
  delivered: { label: "Delivered", color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  shipped: { label: "Shipped", color: "text-blue-700 bg-blue-50 border-blue-100" },
  processing: { label: "Processing", color: "text-amber-700 bg-amber-50 border-amber-100" },
  active: { label: "Active", color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  out_of_stock: { label: "Out of stock", color: "text-red-700 bg-red-50 border-red-100" },
  draft: { label: "Draft", color: "text-gray-500 bg-gray-50 border-gray-200" },
};

const CATEGORIES = ["Electronics", "Fashion", "Home & Living", "Food & Bev", "Sports", "Books"];

const emptyForm = { name: "", price: "", original_price: "", stock: "", category: "", description: "" };

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

export default function VendorDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [dbError, setDbError] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function loadProducts(u) {
    setProductsLoading(true);
    setDbError(null);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("vendor_id", (u || user).id)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        setDbError("table_missing");
      } else {
        setDbError(error.message);
      }
    } else {
      setProducts(data || []);
    }
    setProductsLoading(false);
  }

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const role = resolveUserRole(user, profile?.role);
      if (role !== "vendor" && role !== "admin") { router.replace("/dashboard"); return; }

      setUser(user);
      setLoading(false);
      loadProducts(user);
    }
    checkAuth();
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleFormChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openAddProduct = () => {
    setForm(emptyForm);
    setSaveError(null);
    setShowAddProduct(true);
  };

  const handleSaveProduct = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    setSaveError(null);

    const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Seller";
    const payload = {
      vendor_id: user.id,
      vendor_name: displayName,
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category || null,
      price: parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      stock: form.stock ? parseInt(form.stock, 10) : 0,
      status: parseInt(form.stock || "0", 10) === 0 ? "out_of_stock" : "active",
    };

    const { data, error } = await supabase.from("products").insert(payload).select().single();

    if (error) {
      setSaveError(error.code === "42P01" ? "table_missing" : error.message);
      setSaving(false);
      return;
    }

    setProducts(prev => [data, ...prev]);
    setForm(emptyForm);
    setShowAddProduct(false);
    setSaving(false);
  };

  const handleDelete = async (productId) => {
    if (!confirm("Delete this product? This can't be undone.")) return;
    setDeletingId(productId);
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (!error) setProducts(prev => prev.filter(p => p.id !== productId));
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Seller";

  const tabs = [
    { id: "overview", label: "Overview", Icon: LayoutDashboard },
    { id: "products", label: "Products", Icon: Package, badge: products.length },
    { id: "orders", label: "Orders", Icon: ShoppingBag },
    { id: "integrations", label: "Integrations", Icon: Plug },
    { id: "settings", label: "Settings", Icon: Settings },
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
                Vendor Dashboard
              </h1>
            </div>
            <p className="text-gray-400 text-sm mt-1 ml-1">Good morning, {displayName.split(" ")[0]} — here&apos;s how your store is performing</p>
          </div>
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-2 text-sm text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
          >
            <LogOut size={15} /> Sign out
          </button>
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
              <div className="flex items-center justify-end mb-6">
                <motion.button onClick={openAddProduct} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10">
                  <Plus size={16} /> Add product
                </motion.button>
              </div>

              <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total products", value: productsLoading ? "…" : String(products.length), sub: "Live listings", Icon: Package },
                  { label: "Total orders", value: "82", sub: "+12 this month", Icon: ShoppingBag },
                  { label: "Revenue", value: "$1,840", sub: "+8% vs last month", Icon: TrendingUp },
                  { label: "Product views", value: "3,245", sub: "Last 30 days", Icon: Eye },
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
                  <div className="divide-y divide-gray-50">
                    {mockOrders.slice(0, 4).map((order) => (
                      <div key={order.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="text-xs font-mono text-gray-400 flex-shrink-0">{order.id}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-black truncate">{order.product}</div>
                            <div className="text-xs text-gray-400">{order.buyer} · {order.date}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-semibold text-sm text-black">${order.amount}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusConfig[order.status].color}`}>{statusConfig[order.status].label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="space-y-3">
                  {[
                    { label: "Add a product", sub: "List manually or via CSV", Icon: Plus, action: openAddProduct },
                    { label: "Connect store", sub: "Shopify, WooCommerce & more", Icon: Plug, action: () => setActiveTab("integrations") },
                    { label: "View marketplace", sub: "See your live listings", Icon: Store, href: "/marketplace" },
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
                <p className="text-sm text-gray-400">
                  <span className="font-semibold text-black">{products.length}</span> {products.length === 1 ? "product" : "products"}
                </p>
                <motion.button onClick={openAddProduct} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10">
                  <Plus size={16} /> Add product
                </motion.button>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl flex items-center mb-5 overflow-hidden shadow-sm hover:border-gray-400 focus-within:border-black focus-within:ring-2 focus-within:ring-black/5 transition-all">
                <Search size={16} className="ml-4 text-gray-400 flex-shrink-0" />
                <input className="flex-1 text-sm py-3.5 px-3 outline-none text-black placeholder:text-gray-400 bg-transparent" placeholder="Search products…" />
              </div>

              {productsLoading ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-16 flex flex-col items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm animate-pulse">Loading products...</p>
                </div>
              ) : dbError === "table_missing" ? (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-dashed border-gray-200 rounded-2xl p-16 text-center shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={28} className="text-amber-400" />
                  </div>
                  <p className="text-base font-semibold text-black mb-1">Database setup needed</p>
                  <p className="text-sm text-gray-400 mb-6">Run the one-time SQL to create the products table before adding products.</p>
                  <Link href="/setup" className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-black/10 inline-block">
                    Go to setup
                  </Link>
                </motion.div>
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
              <div className="flex gap-1 flex-wrap mb-6">
                {["All", "Processing", "Shipped", "Delivered"].map((label, i) => (
                  <button key={label}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${i === 0 ? "bg-black text-white shadow-lg shadow-black/15" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-black"}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Order</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Product</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Buyer</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {mockOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-4 font-mono text-xs text-gray-400">{order.id}</td>
                        <td className="px-5 py-4 font-medium text-black hidden md:table-cell">{order.product}</td>
                        <td className="px-5 py-4 text-gray-400 hidden sm:table-cell">{order.buyer}</td>
                        <td className="px-5 py-4 font-semibold text-black">${order.amount}</td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusConfig[order.status].color}`}>{statusConfig[order.status].label}</span>
                        </td>
                        <td className="px-5 py-4 text-gray-400 text-xs hidden lg:table-cell">{order.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* INTEGRATIONS */}
          {activeTab === "integrations" && (
            <motion.div key="integrations" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="mb-6">
                <p className="text-sm text-gray-400">Connect your existing store to automatically sync your products.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {integrations.map(({ name, bg, desc, connected }) => (
                  <div key={name} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 hover:shadow-md hover:shadow-black/5 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: bg }}>
                          {name[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-black text-sm">{name}</div>
                          {connected && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[10px] text-emerald-600 font-medium">Connected</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button className={`text-xs font-semibold px-4 py-2 rounded-xl border transition-colors ${
                        connected
                          ? "border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-600"
                          : "bg-black text-white border-black hover:bg-gray-800"
                      }`}>
                        {connected ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <Upload size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-black text-sm">Manual upload</div>
                    <div className="text-xs text-gray-400 mt-0.5">Don&apos;t have an integrated store? Add products directly or import via CSV.</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={openAddProduct} className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors">
                    <Plus size={14} /> Add single product
                  </button>
                  <button className="flex items-center gap-2 bg-white text-black border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-semibold hover:border-gray-400 transition-colors">
                    <Upload size={14} /> Import CSV
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <motion.div key="settings" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="space-y-4 max-w-2xl">
                {[
                  { title: "Store name", desc: "Your public store name on the marketplace", value: displayName + "'s Store" },
                  { title: "Contact email", desc: "Used for order notifications and buyer contact", value: user?.email },
                ].map(({ title, desc, value }) => (
                  <div key={title} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-black text-sm">{title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                      </div>
                      <button className="text-xs font-semibold text-black hover:underline flex-shrink-0">Edit</button>
                    </div>
                    <div className="mt-3 text-sm text-gray-600 font-medium bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                      {value}
                    </div>
                  </div>
                ))}

                <div className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm">
                  <div className="font-semibold text-black text-sm mb-1">Danger zone</div>
                  <div className="text-xs text-gray-400 mb-4">These actions are permanent and cannot be undone.</div>
                  <button className="text-xs font-semibold text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors">
                    Delete store
                  </button>
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

      {/* ── Add Product Modal ── */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
              <h2 className="font-bold text-black text-base" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Add a product</h2>
              <button onClick={() => setShowAddProduct(false)} className="text-gray-400 hover:text-black transition-colors"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {saveError === "table_missing" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                  <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-amber-800 mb-0.5">Database not set up yet</div>
                    <Link href="/setup" className="text-xs text-amber-700 underline">Run the one-time setup →</Link>
                  </div>
                </div>
              )}
              {saveError && saveError !== "table_missing" && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
                  {saveError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Product name <span className="text-red-400">*</span></label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
                  placeholder="e.g. Wireless Earbuds Pro"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Price ($) <span className="text-red-400">*</span></label>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={handleFormChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Original price ($)</label>
                  <input
                    name="original_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.original_price}
                    onChange={handleFormChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Stock qty</label>
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={handleFormChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black bg-white"
                  >
                    <option value="">Select…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black resize-none"
                  rows={3}
                  placeholder="Describe your product…"
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => setShowAddProduct(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={saving || !form.name.trim() || !form.price}
                className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save product"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
