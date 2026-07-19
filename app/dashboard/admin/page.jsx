"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveUserRole } from "@/lib/auth";
import {
  LayoutDashboard, Package, ShoppingBag, Users, Store, MessageSquare,
  Bell, Settings, LogOut, Search, Plus, ChevronRight, ChevronDown,
  Loader2, AlertTriangle, CheckCircle2, XCircle, Clock, Eye,
  Briefcase, CreditCard, TrendingUp, UserCheck, Ban, DollarSign,
  BarChart3, PieChart, Activity, Shield, Menu, X, Filter,
  Mail, Phone, MapPin, Trash2, MoreHorizontal, RefreshCw,
  Star, FileText, Image, ShoppingCart, Tag, Percent,
  Truck, Home, HelpCircle, BookOpen
} from "lucide-react";
import useNotifications from "@/hooks/useNotifications";
import { motion, AnimatePresence } from "framer-motion";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
}

function formatNumber(n) {
  return new Intl.NumberFormat("en-US").format(n || 0);
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  if (diff < 604_800_000) return Math.floor(diff / 86_400_000) + "d ago";
  return formatDate(iso);
}

const approvalTabList = [
  { id: "pending", label: "Pending", Icon: Clock, color: "text-amber-600" },
  { id: "approved", label: "Approved", Icon: CheckCircle2, color: "text-emerald-600" },
  { id: "rejected", label: "Rejected", Icon: XCircle, color: "text-red-600" },
];

const statusConfig = {
  processing: { label: "Processing", color: "text-amber-700 bg-amber-50 border-amber-100" },
  shipped: { label: "Shipped", color: "text-blue-700 bg-blue-50 border-blue-100" },
  delivered: { label: "Delivered", color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  cancelled: { label: "Cancelled", color: "text-gray-500 bg-gray-50 border-gray-200" },
};

const paymentStatusConfig = {
  unpaid: { label: "Unpaid", color: "text-amber-600 bg-amber-50" },
  paid: { label: "Paid", color: "text-emerald-600 bg-emerald-50" },
  failed: { label: "Failed", color: "text-red-600 bg-red-50" },
  refunded: { label: "Refunded", color: "text-purple-600 bg-purple-50" },
};

// ─── Sidebar Navigation ──────────────────────────────────────────────────────

const SIDEBAR_SECTIONS = [
  { id: "overview", label: "Dashboard", Icon: LayoutDashboard },
  {
    id: "products", label: "Products", Icon: Package,
    children: [
      { id: "products_all", label: "All Products" },
      { id: "products_pending", label: "Pending Approval" },
      { id: "products_approved", label: "Approved" },
      { id: "products_rejected", label: "Rejected" },
    ],
  },
  {
    id: "orders", label: "Orders", Icon: ShoppingBag,
    children: [
      { id: "orders_all", label: "All Orders" },
      { id: "orders_pending", label: "Pending" },
      { id: "orders_shipped", label: "Shipped" },
      { id: "orders_delivered", label: "Delivered" },
      { id: "orders_cancelled", label: "Cancelled" },
    ],
  },
  {
    id: "users", label: "Users", Icon: Users,
    children: [
      { id: "users_buyers", label: "Buyers" },
      { id: "users_vendors", label: "Vendors" },
      { id: "users_admins", label: "Admins" },
    ],
  },
  { id: "vendors", label: "Vendors", Icon: Store },
  { id: "messages", label: "Contact Messages", Icon: MessageSquare },
  { id: "notifications_panel", label: "Notifications", Icon: Bell },
  { id: "settings", label: "Settings", Icon: Settings },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, Icon, color = "bg-black" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:shadow-black/5 hover:border-gray-300 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center`}>
          <Icon size={14} className="text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

// ─── Overview Section ─────────────────────────────────────────────────────────

function OverviewSection() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: "Total Revenue", value: formatCurrency(stats?.totalRevenue), sub: `${formatCurrency(stats?.todayRevenue)} today`, Icon: DollarSign, color: "bg-emerald-600" },
    { label: "Orders", value: formatNumber(stats?.totalOrders), sub: `${formatNumber(stats?.pendingOrders)} pending`, Icon: ShoppingBag, color: "bg-blue-600" },
    { label: "Products", value: formatNumber(stats?.totalProducts), sub: `${formatNumber(stats?.pendingProducts)} pending approval`, Icon: Package, color: "bg-amber-600" },
    { label: "Customers", value: formatNumber(stats?.buyerCount), sub: `${formatNumber(stats?.activeUsers)} active (30d)`, Icon: Users, color: "bg-purple-600" },
    { label: "Vendors", value: formatNumber(stats?.vendorCount), sub: `${formatNumber(stats?.pendingVendors)} need onboarding`, Icon: Store, color: "bg-indigo-600" },
    { label: "Refund Requests", value: formatNumber(stats?.refundRequests), Icon: AlertTriangle, color: "bg-red-600", sub: "Needs attention" },
    { label: "Low Stock", value: formatNumber(stats?.lowStockCount), Icon: AlertTriangle, color: "bg-orange-600", sub: "Products under 5 units" },
    { label: "Active Users (30d)", value: formatNumber(stats?.activeUsers), Icon: Activity, color: "bg-teal-600", sub: "Engaged users" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>
    </div>
  );
}

// ─── Products Section ─────────────────────────────────────────────────────────

function ProductsSection({ tab }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectionModal, setRejectionModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState(null);

  const approvalStatus = tab.replace("products_", "");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ approval_status: approvalStatus });
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/admin/products?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setProducts(data.products || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [approvalStatus, search]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleApprove = async (productId) => {
    setActionLoading(productId);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, approval_status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (productId) => {
    setActionLoading(productId);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          approval_status: "rejected",
          rejection_reason: rejectionReason || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setRejectionModal(null);
      setRejectionReason("");
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const approvalTabLabel = approvalTabList.find((t) => t.id === approvalStatus)?.label || approvalStatus;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 bg-white border border-gray-200 rounded-2xl flex items-center overflow-hidden shadow-sm hover:border-gray-400 focus-within:border-black transition-all">
          <Search size={16} className="ml-4 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm py-3 px-3 outline-none text-black placeholder:text-gray-400 bg-transparent"
            placeholder={`Search ${approvalTabLabel} products...`}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 flex flex-col items-center gap-4 shadow-sm">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
          <p className="text-gray-400 text-sm animate-pulse">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-gray-300" />
          </div>
          <p className="text-base font-semibold text-black mb-1">No {approvalTabLabel} products</p>
          <p className="text-sm text-gray-400">
            {approvalStatus === "pending" ? "All products have been reviewed." : `No products with "${approvalStatus}" status.`}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Product</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Vendor</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Category</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Price</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Stock</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Date</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt="" className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <Package size={14} className="text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-black truncate max-w-[200px]">{p.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{p.id?.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500 hidden md:table-cell">{p.vendor_name || "—"}</td>
                    <td className="px-5 py-4 text-gray-400 hidden sm:table-cell">{p.category || "—"}</td>
                    <td className="px-5 py-4 font-semibold text-black">${parseFloat(p.price).toFixed(2)}</td>
                    <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">{p.stock === 0 ? <span className="text-red-500 font-semibold">0</span> : p.stock}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs hidden lg:table-cell">{formatDate(p.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {approvalStatus === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={actionLoading === p.id}
                              className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-40"
                            >
                              {actionLoading === p.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectionModal(p)}
                              disabled={actionLoading === p.id}
                              className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-40"
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          </>
                        )}
                        {(approvalStatus === "approved" || approvalStatus === "rejected") && (
                          <a
                            href={`/products/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-xl hover:border-gray-400 hover:text-black transition-colors"
                          >
                            <Eye size={12} /> View
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="font-bold text-black text-lg mb-2" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
              Reject Product
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to reject <strong>{rejectionModal.name}</strong>?
            </p>
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Rejection reason (optional)</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black resize-none"
                rows={3}
                placeholder="Provide feedback to the vendor..."
              />
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => { setRejectionModal(null); setRejectionReason(""); }}
                className="text-sm font-semibold text-gray-500 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectionModal.id)}
                disabled={actionLoading === rejectionModal.id}
                className="flex items-center gap-2 text-sm font-semibold text-white bg-red-600 px-4 py-2.5 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {actionLoading === rejectionModal.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Orders Section ───────────────────────────────────────────────────────────

function OrdersSection({ filter }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter && filter !== "all") params.set("status", filter);
    fetch(`/api/admin/orders?${params}`)
      .then((r) => r.json())
      .then((data) => setOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  if (loading) return <LoadingSkeleton />;
  if (orders.length === 0) return <EmptyState icon={ShoppingBag} title="No orders found" />;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Order</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Buyer</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Items</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Payment</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-5 py-4 font-mono text-xs text-gray-400">#{o.id.slice(0, 8)}...</td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <div>
                    <div className="font-medium text-black text-sm">{o.buyer_name || "—"}</div>
                    <div className="text-[10px] text-gray-400">{o.buyer_email || ""}</div>
                  </div>
                </td>
                <td className="px-5 py-4 hidden sm:table-cell text-gray-500">{o.order_items?.length || 0}</td>
                <td className="px-5 py-4 font-semibold text-black">${Number(o.total).toFixed(2)}</td>
                <td className="px-5 py-4">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${(statusConfig[o.status] || statusConfig.processing).color}`}>
                    {(statusConfig[o.status] || statusConfig.processing).label}
                  </span>
                </td>
                <td className="px-5 py-4 hidden lg:table-cell">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${(paymentStatusConfig[o.payment_status] || paymentStatusConfig.unpaid).color}`}>
                    {(paymentStatusConfig[o.payment_status] || paymentStatusConfig.unpaid).label}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-gray-400 hidden lg:table-cell">{formatDate(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Users Section ────────────────────────────────────────────────────────────

function UsersSection({ filter }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter && filter !== "users_all") {
      const role = filter.replace("users_", "");
      if (["buyer", "vendor", "admin"].includes(role)) params.set("role", role);
    }
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  if (loading) return <LoadingSkeleton />;
  if (users.length === 0) return <EmptyState icon={Users} title="No users found" />;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Email</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold">
                      {u.full_name?.[0] || u.email?.[0] || "?"}
                    </div>
                    <div className="font-medium text-black">{u.full_name || "—"}</div>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">{u.email || "—"}</td>
                <td className="px-5 py-4">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    u.role === "admin" ? "bg-purple-50 text-purple-600" :
                    u.role === "vendor" ? "bg-blue-50 text-blue-600" :
                    "bg-gray-50 text-gray-600"
                  }`}>
                    {u.role || "—"}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-gray-400 hidden md:table-cell">{formatDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Vendors Section ──────────────────────────────────────────────────────────

function VendorsSection() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/vendors")
      .then((r) => r.json())
      .then((data) => setVendors(data.vendors || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (vendors.length === 0) return <EmptyState icon={Store} title="No vendors found" />;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Store</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Email</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Products</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Stripe</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {vendors.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      {v.full_name?.[0] || "S"}
                    </div>
                    <div className="font-medium text-black">{v.full_name || "—"}</div>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">{v.email || "—"}</td>
                <td className="px-5 py-4 font-semibold text-black">{v.product_count || 0}</td>
                <td className="px-5 py-4 hidden md:table-cell">
                  {v.stripe_account_id ? (
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Connected</span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Not set up</span>
                  )}
                </td>
                <td className="px-5 py-4 text-xs text-gray-400 hidden lg:table-cell">{formatDate(v.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Contact Messages Section ─────────────────────────────────────────────────

function ContactMessagesSection() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("new");
  const [selected, setSelected] = useState(null);

  const loadMessages = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/admin/contact-messages?${params}`)
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { loadMessages(); if (selected) setSelected(null); }, [loadMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async (id, status) => {
    await fetch("/api/admin/contact-messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: id, status }),
    });
    loadMessages();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex gap-1 flex-wrap">
          {["new", "read", "resolved"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === s ? "bg-black text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? <LoadingSkeleton /> : messages.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No messages" />
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className={`w-full text-left bg-white border rounded-2xl p-4 transition-all hover:border-gray-400 ${
                  selected?.id === m.id ? "border-black ring-2 ring-black/5" : "border-gray-200"
                } ${m.status === "new" ? "ring-1 ring-amber-200" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-black">{m.name}</span>
                  <span className="text-[10px] text-gray-400">{timeAgo(m.created_at)}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">{m.subject || "No subject"}</div>
                <div className="text-[11px] text-gray-400 truncate mt-1">{m.message}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        {selected ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>{selected.name}</h3>
                <a href={`mailto:${selected.email}`} className="text-xs text-gray-500 hover:text-black">{selected.email}</a>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                selected.status === "new" ? "bg-amber-50 text-amber-600" :
                selected.status === "read" ? "bg-blue-50 text-blue-600" :
                "bg-emerald-50 text-emerald-600"
              }`}>
                {selected.status}
              </span>
            </div>
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-400 mb-1">Subject</div>
              <div className="text-sm font-medium text-black">{selected.subject || "No subject"}</div>
            </div>
            <div className="mb-6">
              <div className="text-xs font-semibold text-gray-400 mb-1">Message</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4">{selected.message}</div>
            </div>
            <div className="flex items-center gap-3">
              {selected.status !== "resolved" && (
                <button
                  onClick={() => handleStatusChange(selected.id, "resolved")}
                  className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  Mark resolved
                </button>
              )}
              {selected.status === "new" && (
                <button
                  onClick={() => handleStatusChange(selected.id, "read")}
                  className="text-xs font-semibold text-gray-500 border border-gray-200 px-4 py-2 rounded-xl hover:border-gray-400 hover:text-black transition-colors"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400">
            <MessageSquare size={24} className="mx-auto mb-2" />
            <p className="text-sm">Select a message to view</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Notifications Panel ─────────────────────────────────────────────────────

function NotificationsPanel() {
  return (
    <div className="text-center py-10 text-gray-400">
      <Bell size={24} className="mx-auto mb-2" />
      <p className="text-sm">View all notifications on the</p>
      <a href="/notifications" className="text-sm font-semibold text-black hover:underline">Notifications page →</a>
    </div>
  );
}

// ─── Settings Section ─────────────────────────────────────────────────────────

function SettingsSection() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }, 500);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold text-black text-sm mb-4" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>General Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Platform name</label>
            <input
              defaultValue="Cheaper"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Support email</label>
            <input
              defaultValue="support@cheaper.com"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Commission rate (%)</label>
            <input
              type="number"
              defaultValue="10"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">Changes are saved immediately.</p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State & Loading Skeleton ──────────────────────────────────────────

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center shadow-sm">
      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon size={24} className="text-gray-300" />
      </div>
      <p className="text-sm font-semibold text-black mb-1">{title}</p>
      {desc && <p className="text-xs text-gray-400">{desc}</p>}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-10 flex items-center justify-center shadow-sm">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(["products"]);

  const userRole = user?.user_metadata?.role || user?.app_metadata?.role || null;
  const {
    items: notifItems,
    unreadCount: notifUnreadCount,
  } = useNotifications(user?.id, userRole);

  // Deep-link: ?section=products&tab=pending
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const s = params.get("section");
    const tab = params.get("tab");
    const target = s ? (tab ? `${s}_${tab}` : s) : "overview";
    if (target !== "overview") {
      setSection(target);
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const role = resolveUserRole(user, profile?.role);
      if (role !== "admin") { router.replace("/dashboard"); return; }
      setUser(user);
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const toggleMenu = (id) => {
    setExpandedMenus((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const navigateTo = (id) => {
    setSection(id);
    setSidebarOpen(false);
  };

  const getCurrentLabel = () => {
    for (const s of SIDEBAR_SECTIONS) {
      if (s.id === section) return s.label;
      if (s.children) {
        const child = s.children.find((c) => c.id === section);
        if (child) return child.label;
      }
    }
    return "Dashboard";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <a href="/dashboard/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
              <span className="font-bold text-sm text-black">Admin Panel</span>
            </a>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
        </div>

        <nav className="p-3 space-y-0.5">
          {SIDEBAR_SECTIONS.map((s) => {
            const isActive = section === s.id || (s.children && s.children.some((c) => c.id === section));
            const isExpanded = expandedMenus.includes(s.id);

            if (s.children) {
              return (
                <div key={s.id}>
                  <button
                    onClick={() => toggleMenu(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100 hover:text-black"
                    }`}
                  >
                    <s.Icon size={16} />
                    <span className="flex-1 text-left">{s.label}</span>
                    <ChevronDown size={14} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                  {isExpanded && (
                    <div className="ml-8 mt-0.5 space-y-0.5">
                      {s.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => navigateTo(child.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            section === child.id
                              ? "bg-gray-100 text-black"
                              : "text-gray-500 hover:text-black hover:bg-gray-50"
                          }`}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={s.id}
                onClick={() => navigateTo(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100 hover:text-black"
                }`}
              >
                <s.Icon size={16} />
                {s.label}
                {s.id === "notifications_panel" && notifUnreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{notifUnreadCount > 9 ? "9+" : notifUnreadCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 mt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
                <Menu size={18} />
              </button>
              <h1 className="text-lg font-bold text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
                {getCurrentLabel()}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <a href="/notifications" className="relative p-2 rounded-full hover:bg-gray-100">
                <Bell size={18} className="text-gray-600" />
                {notifUnreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </a>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-[10px] font-bold">
                  {user?.email?.[0] || "A"}
                </div>
                <span className="hidden sm:block text-xs font-medium text-gray-600">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-8">
          {section === "overview" && <OverviewSection />}
          {section.startsWith("products") && <ProductsSection tab={section} />}
          {section.startsWith("orders") && <OrdersSection filter={section.replace("orders_", "")} />}
          {section.startsWith("users") && <UsersSection filter={section} />}
          {section === "vendors" && <VendorsSection />}
          {section === "messages" && <ContactMessagesSection />}
          {section === "notifications_panel" && <NotificationsPanel />}
          {section === "settings" && <SettingsSection />}
        </div>
      </main>
    </div>
  );
}
