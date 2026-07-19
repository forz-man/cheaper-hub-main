"use client";

import { useState, useEffect, useCallback, memo, startTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveUserRole } from "@/lib/auth";
import {
  LayoutDashboard, Package, ShoppingBag, Users, Store, MessageSquare,
  Bell, Settings, LogOut, Search, ChevronDown, Loader2, AlertTriangle,
  CheckCircle2, XCircle, Clock, Eye, DollarSign, Activity, Shield,
  Menu, X, RefreshCw, Ban, Trash2, Undo2, ChevronLeft,
  ChevronRight, Star, ShoppingCart,
} from "lucide-react";
import useNotifications from "@/hooks/useNotifications";

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
  { id: "pending", label: "Pending", color: "text-amber-600" },
  { id: "approved", label: "Approved", color: "text-emerald-600" },
  { id: "rejected", label: "Rejected", color: "text-red-600" },
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

const SIDEBAR_SECTIONS = [
  { id: "overview", label: "Dashboard", Icon: LayoutDashboard },
  {
    id: "products", label: "Products", Icon: Package,
    children: [
      { id: "products_pending", label: "Pending" },
      { id: "products_approved", label: "Approved" },
      { id: "products_rejected", label: "Rejected" },
    ],
  },
  {
    id: "orders", label: "Orders", Icon: ShoppingBag,
    children: [
      { id: "orders_all", label: "All" },
      { id: "orders_processing", label: "Processing" },
      { id: "orders_shipped", label: "Shipped" },
      { id: "orders_delivered", label: "Delivered" },
      { id: "orders_cancelled", label: "Cancelled" },
    ],
  },
  {
    id: "users", label: "Users", Icon: Users,
    children: [
      { id: "users_all", label: "All" },
      { id: "users_buyer", label: "Buyers" },
      { id: "users_vendor", label: "Vendors" },
      { id: "users_admin", label: "Admins" },
    ],
  },
  { id: "vendors", label: "Vendors", Icon: Store },
  { id: "messages", label: "Contact Messages", Icon: MessageSquare },
  { id: "activity_log", label: "Activity Log", Icon: Activity },
  { id: "settings", label: "Settings", Icon: Settings },
];

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

const StatCardMemo = memo(StatCard);

function Pagination({ page, total, limit, onPageChange }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
      <span className="text-xs text-gray-400">{total} total</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-medium text-gray-500">{page} / {totalPages}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function OverviewSection() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load stats");
        return r.json();
      })
      .then((data) => { if (!cancelled) setStats(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <AlertTriangle size={24} className="mx-auto mb-2 text-red-500" />
        <p className="text-sm text-red-700 mb-3">{error}</p>
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
    { label: "Today Orders", value: formatNumber(stats?.todayOrders), sub: `${formatCurrency(stats?.todayRevenue)} revenue`, Icon: Activity, color: "bg-teal-600" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => <StatCardMemo key={c.label} {...c} />)}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-2xl flex items-center overflow-hidden shadow-sm hover:border-gray-400 focus-within:border-black transition-all">
      <Search size={16} className="ml-4 text-gray-400 flex-shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-sm py-3 px-3 outline-none text-black placeholder:text-gray-400 bg-transparent"
        placeholder={placeholder}
      />
    </div>
  );
}

function ProductsSection({ tab }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectionModal, setRejectionModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const approvalStatus = tab.replace("products_", "");
  const approvalTabLabel = approvalTabList.find((t) => t.id === approvalStatus)?.label || approvalStatus;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ approval_status: approvalStatus, page: String(page), limit: String(limit) });
    if (search.trim()) params.set("q", search.trim());
    fetch(`/api/admin/products?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          setProducts(data.products || []);
          setTotal(data.total || 0);
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [approvalStatus, search, page]);

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
      setTotal((prev) => Math.max(0, prev - 1));
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
      setTotal((prev) => Math.max(0, prev - 1));
      setRejectionModal(null);
      setRejectionReason("");
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={`Search ${approvalTabLabel} products...`} />
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
                            <img src={p.images[0]} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
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
                    <td className="px-5 py-4 font-semibold text-black">${Number(p.price).toFixed(2)}</td>
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
          <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
        </div>
      )}

      {rejectionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="font-bold text-black text-lg mb-2" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Reject Product</h3>
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
              >Cancel</button>
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

function OrdersSection({ filter }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filter && filter !== "all") params.set("status", filter);
    fetch(`/api/admin/orders?${params}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => { if (!cancelled) { setOrders(data.orders || []); setTotal(data.total || 0); } })
      .catch(() => { if (!cancelled) setOrders([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, page]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-16 flex items-center justify-center shadow-sm">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center shadow-sm">
        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShoppingBag size={24} className="text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-black mb-1">No orders found</p>
        <p className="text-xs text-gray-400">No orders match the current filter.</p>
      </div>
    );
  }

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
      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
    </div>
  );
}

function ConfirmationModal({ title, message, confirmLabel, confirmVariant = "danger", loading, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 className="font-bold text-black text-lg mb-2" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex items-center gap-3 justify-end">
          <button onClick={onCancel} disabled={loading} className="text-sm font-semibold text-gray-500 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40 ${confirmVariant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-black hover:bg-gray-800"}`}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const colors = {
    admin: "bg-purple-50 text-purple-600",
    vendor: "bg-blue-50 text-blue-600",
    buyer: "bg-gray-50 text-gray-600",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors[role] || "bg-gray-50 text-gray-600"}`}>
      {role || "—"}
    </span>
  );
}

function UsersSection({ filter }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const limit = 20;

  const roleLabel = filter === "users_all" ? "all" : filter.replace("users_", "");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filter && filter !== "users_all") {
      const role = filter.replace("users_", "");
      if (["buyer", "vendor", "admin"].includes(role)) params.set("role", role);
    }
    if (search.trim()) params.set("q", search.trim());
    fetch(`/api/admin/users?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => { if (!cancelled) { setUsers(data.users || []); setTotal(data.total || 0); } })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, search, page]);

  const handleAction = async (userId, action, value) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, action, value }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Action failed");
      }
      setConfirmModal(null);
      startTransition(() => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (filter && filter !== "users_all") {
          const role = filter.replace("users_", "");
          if (["buyer", "vendor", "admin"].includes(role)) params.set("role", role);
        }
        if (search.trim()) params.set("q", search.trim());
        fetch(`/api/admin/users?${params}`)
          .then((r) => r.ok ? r.json() : Promise.reject())
          .then((data) => { setUsers(data.users || []); setTotal(data.total || 0); })
          .catch(() => {});
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const showConfirm = (user, actionType, detail) => {
    const actions = {
      promote_vendor: { title: "Promote to Admin", message: `Make "${user.full_name || user.email}" an admin? They will have full access.`, confirmLabel: "Promote", variant: "primary" },
      promote_buyer: { title: "Promote to Vendor", message: `Make "${user.full_name || user.email}" a vendor? They can list products.`, confirmLabel: "Promote", variant: "primary" },
      demote_admin: { title: "Demote Admin", message: `Remove admin from "${user.full_name || user.email}"? They will lose dashboard access.`, confirmLabel: "Demote", variant: "danger" },
      suspend: { title: "Suspend User", message: `Suspend "${user.full_name || user.email}"? They will be unable to use the platform.`, confirmLabel: "Suspend", variant: "danger" },
      unsuspend: { title: "Unsuspend User", message: `Restore "${user.full_name || user.email}"? They will regain access.`, confirmLabel: "Unsuspend", variant: "primary" },
      soft_delete: { title: "Delete User", message: `Soft-delete "${user.full_name || user.email}"? Their profile will be hidden.`, confirmLabel: "Delete", variant: "danger" },
      restore: { title: "Restore User", message: `Restore "${user.full_name || user.email}"? Their profile will be visible again.`, confirmLabel: "Restore", variant: "primary" },
    };
    const config = actions[actionType];
    setConfirmModal({ user, actionType, ...config });
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={`Search ${roleLabel} users...`} />
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">{error}</div>}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 flex items-center justify-center shadow-sm">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={24} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-black mb-1">No users found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Email</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Joined</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
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
                    <td className="px-5 py-4"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      {u.suspended ? (
                        <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Suspended</span>
                      ) : u.deleted ? (
                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Deleted</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400 hidden lg:table-cell">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {(u.role === "buyer" || u.role === "vendor") && (
                          <button
                            onClick={() => showConfirm(u, u.role === "buyer" ? "promote_buyer" : "promote_vendor")}
                            className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100"
                          >
                            {u.role === "buyer" ? "→ Vendor" : "→ Admin"}
                          </button>
                        )}
                        {u.role === "admin" && (
                          <button
                            onClick={() => showConfirm(u, "demote_admin")}
                            className="text-[10px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg hover:bg-orange-100"
                          >
                            Demote
                          </button>
                        )}
                        {!u.suspended && !u.deleted && (
                          <button
                            onClick={() => showConfirm(u, "suspend")}
                            className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-100"
                          >
                            <Ban size={10} className="inline mr-0.5" />Suspend
                          </button>
                        )}
                        {u.suspended && (
                          <button
                            onClick={() => showConfirm(u, "unsuspend")}
                            className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-100"
                          >
                            <CheckCircle2 size={10} className="inline mr-0.5" />Unsuspend
                          </button>
                        )}
                        {!u.deleted && (
                          <button
                            onClick={() => showConfirm(u, "soft_delete")}
                            className="text-[10px] font-semibold text-gray-500 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-100"
                          >
                            <Trash2 size={10} className="inline mr-0.5" />Delete
                          </button>
                        )}
                        {u.deleted && (
                          <button
                            onClick={() => showConfirm(u, "restore")}
                            className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-100"
                          >
                            <Undo2 size={10} className="inline mr-0.5" />Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
        </div>
      )}

      {confirmModal && (
        <ConfirmationModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          confirmVariant={confirmModal.variant}
          loading={actionLoading}
          onConfirm={() => {
            const actionMap = {
              promote_buyer: "change_role",
              promote_vendor: "change_role",
              demote_admin: "change_role",
              suspend: "suspend",
              unsuspend: "unsuspend",
              soft_delete: "soft_delete",
              restore: "restore",
            };
            const valueMap = {
              promote_buyer: "vendor",
              promote_vendor: "admin",
              demote_admin: "vendor",
            };
            handleAction(confirmModal.user.id, actionMap[confirmModal.actionType], valueMap[confirmModal.actionType]);
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

function VendorsSection() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/vendors")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => { if (!cancelled) setVendors(data.vendors || []); })
      .catch(() => { if (!cancelled) setError("Failed to load vendors"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-16 flex items-center justify-center shadow-sm">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <AlertTriangle size={24} className="mx-auto mb-2 text-red-500" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center shadow-sm">
        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Store size={24} className="text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-black mb-1">No vendors found</p>
      </div>
    );
  }

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

function ContactMessagesSection() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("new");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ status: statusFilter, page: String(page), limit: String(limit) });
    fetch(`/api/admin/contact-messages?${params}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => { if (!cancelled) { setMessages(data.messages || []); setTotal(data.total || 0); } })
      .catch(() => { if (!cancelled) setMessages([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    if (!cancelled && selected) setSelected(null);
    return () => { cancelled = true; };
  }, [statusFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async (id, status) => {
    await fetch("/api/admin/contact-messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: id, status }),
    });
    startTransition(() => {
      const params = new URLSearchParams({ status: statusFilter, page: String(page), limit: String(limit) });
      fetch(`/api/admin/contact-messages?${params}`)
        .then((r) => r.ok ? r.json() : Promise.reject())
        .then((data) => { setMessages(data.messages || []); setTotal(data.total || 0); });
    });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex gap-1 flex-wrap">
          {["new", "read", "resolved"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === s ? "bg-black text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-black">No messages</p>
          </div>
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
        <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
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
                selected.status === "read" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
              }`}>{selected.status}</span>
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
                >Mark resolved</button>
              )}
              {selected.status === "new" && (
                <button
                  onClick={() => handleStatusChange(selected.id, "read")}
                  className="text-xs font-semibold text-gray-500 border border-gray-200 px-4 py-2 rounded-xl hover:border-gray-400 hover:text-black transition-colors"
                >Mark read</button>
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

function ActivityLogSection() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search.trim()) params.set("q", search.trim());
    if (actionFilter) params.set("action", actionFilter);
    if (entityTypeFilter) params.set("entity_type", entityTypeFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    fetch(`/api/admin/activity?${params}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => { if (!cancelled) { setLogs(data.logs || []); setTotal(data.total || 0); } })
      .catch(() => { if (!cancelled) setLogs([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, actionFilter, entityTypeFilter, dateFrom, dateTo, page]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search activity..." />
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
        >
          <option value="">All Actions</option>
          <option value="approve_product">Approve Product</option>
          <option value="reject_product">Reject Product</option>
          <option value="change_role">Change Role</option>
          <option value="suspend_user">Suspend User</option>
          <option value="unsuspend_user">Unsuspend User</option>
          <option value="soft_delete_user">Delete User</option>
          <option value="restore_user">Restore User</option>
          <option value="update_setting">Update Setting</option>
        </select>
        <select
          value={entityTypeFilter}
          onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
        >
          <option value="">All Types</option>
          <option value="product">Product</option>
          <option value="user">User</option>
          <option value="setting">Setting</option>
          <option value="order">Order</option>
          <option value="vendor">Vendor</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
          placeholder="To"
        />
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity size={24} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-black mb-1">No activity logged yet</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Admin</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Target</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Description</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80">
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium text-black">{log.actor_name || "Unknown"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium text-black capitalize">{log.action.replace(/_/g, " ")}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 hidden md:table-cell">
                      <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{log.entity_type}</span>
                      {log.entity_id && <span className="text-[10px] text-gray-400 ml-1 font-mono">#{log.entity_id.slice(0, 8)}</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400 hidden lg:table-cell max-w-xs truncate">{log.description || "—"}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{formatDateTime(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
function SettingsSection() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [saveMessage, setSaveMessage] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/settings")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load settings");
        return r.json();
      })
      .then((data) => { if (!cancelled) setSettings(data.settings || {}); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSave = async (key) => {
    setSaving(key);
    try {
      const input = document.querySelector(`[data-setting-key="${key}"]`);
      const value = input?.value || "";
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to save");
      }
      const data = await res.json();
      setSettings(data.settings || {});
      setSaveMessage((prev) => ({ ...prev, [key]: "Saved!" }));
      setTimeout(() => setSaveMessage((prev) => ({ ...prev, [key]: null })), 2000);
    } catch (err) {
      setSaveMessage((prev) => ({ ...prev, [key]: err.message || "Error" }));
      setTimeout(() => setSaveMessage((prev) => ({ ...prev, [key]: null })), 3000);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-10 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <AlertTriangle size={24} className="mx-auto mb-2 text-red-500" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  const getValue = (key) => {
    const v = settings[key];
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v).replace(/^"(.*)"$/, "$1");
  };

  const fields = [
    { key: "site_name", label: "Site Name", type: "text" },
    { key: "platform_name", label: "Platform Name", type: "text" },
    { key: "support_email", label: "Support Email", type: "email" },
    { key: "contact_number", label: "Contact Number", type: "text" },
    { key: "commission_rate", label: "Commission Rate (%)", type: "number", min: 0, max: 100, step: 0.1 },
    { key: "platform_fee", label: "Platform Fee ($)", type: "number", min: 0, step: 0.01 },
    { key: "tax_rate", label: "Tax Rate (%)", type: "number", min: 0, max: 100, step: 0.1 },
    { key: "shipping_flat_rate", label: "Shipping Flat Rate ($)", type: "number", min: 0, step: 0.01 },
    { key: "free_shipping_threshold", label: "Free Shipping Threshold ($)", type: "number", min: 0, step: 0.01 },
    { key: "currency", label: "Currency", type: "text" },
    {
      key: "maintenance_mode", label: "Maintenance Mode", type: "select",
      options: [{ value: "false", label: "Disabled" }, { value: "true", label: "Enabled" }],
    },
    {
      key: "allow_vendor_registration", label: "Allow Vendor Registration", type: "select",
      options: [{ value: "true", label: "Enabled" }, { value: "false", label: "Disabled" }],
    },
    {
      key: "allow_product_submission", label: "Allow Product Submission", type: "select",
      options: [{ value: "true", label: "Enabled" }, { value: "false", label: "Disabled" }],
    },
  ];

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold text-black text-sm mb-4" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Platform Settings</h3>
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">{field.label}</label>
              <div className="flex items-center gap-2">
                {field.type === "select" ? (
                  <select
                    data-setting-key={field.key}
                    defaultValue={getValue(field.key) || "false"}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black bg-white"
                  >
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    data-setting-key={field.key}
                    type={field.type}
                    defaultValue={getValue(field.key)}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
                  />
                )}
                <button
                  onClick={() => handleSave(field.key)}
                  disabled={saving === field.key}
                  className="flex items-center gap-1 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  {saving === field.key ? <Loader2 size={14} className="animate-spin" /> : saveMessage[field.key] || "Save"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400">Changes are saved individually. Each setting is persisted to the database.</p>
    </div>
  );
}

const sectionComponents = {
  overview: OverviewSection,
  products: ProductsSection,
  orders: OrdersSection,
  users: UsersSection,
  vendors: VendorsSection,
  messages: ContactMessagesSection,
  activity_log: ActivityLogSection,
  settings: SettingsSection,
};

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(["products", "orders", "users"]);

  const { unreadCount: notifUnreadCount } = useNotifications(user?.id, user?.user_metadata?.role || user?.app_metadata?.role || null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const s = params.get("section");
    const tab = params.get("tab");
    const target = s ? (tab ? `${s}_${tab}` : s) : "overview";
    if (target !== "overview") setSection(target);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const role = resolveUserRole(user, profile?.role);
      if (role !== "admin") { router.replace("/dashboard"); return; }
      if (!cancelled) { setUser(user); setLoading(false); }
    }
    checkAuth();
    return () => { cancelled = true; };
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

  const getSectionBase = (sectionId) => {
    if (sectionId.startsWith("products")) return "products";
    if (sectionId.startsWith("orders")) return "orders";
    if (sectionId.startsWith("users")) return "users";
    return sectionId;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  const SectionComponent = sectionComponents[getSectionBase(section)];

  return (
    <div className="min-h-screen bg-gray-50 flex" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

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
                            section === child.id ? "bg-gray-100 text-black" : "text-gray-500 hover:text-black hover:bg-gray-50"
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
          {SectionComponent && (
            <SectionComponent
              key={section}
              tab={section}
              filter={section.startsWith("orders") ? section.replace("orders_", "") : section}
            />
          )}
        </div>
      </main>
    </div>
  );
}
