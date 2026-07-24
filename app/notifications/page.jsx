"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell, MessageCircle, Package, Wallet, ChevronRight, CheckCheck,
  AlertCircle, CheckCircle2, XCircle, Trash2, Loader2
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import useNotifications from "@/hooks/useNotifications";
import { useState } from "react";

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  if (diff < 172_800_000) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ICONS = {
  message: MessageCircle,
  order: Package,
  payout: Wallet,
  product_pending: AlertCircle,
  product_approved: CheckCircle2,
  product_rejected: XCircle,
  order_update: Package,
  payout_release: Wallet,
  system: Bell,
};

const ICON_COLORS = {
  product_pending: "bg-amber-50 text-amber-600",
  product_approved: "bg-emerald-50 text-emerald-600",
  product_rejected: "bg-red-50 text-red-600",
  message: "bg-black text-white",
  order: "bg-blue-50 text-blue-600",
  payout: "bg-purple-50 text-purple-600",
};

function getIconStyle(item) {
  if (item.unread && ICON_COLORS[item.type]) return ICON_COLORS[item.type];
  if (item.unread) return "bg-black text-white";
  return "bg-gray-50 text-gray-400";
}

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "product_pending", label: "Pending" },
  { id: "product_approved", label: "Approved" },
  { id: "product_rejected", label: "Rejected" },
  { id: "message", label: "Messages" },
  { id: "order", label: "Orders" },
  { id: "payout", label: "Payouts" },
];

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const userRole = user?.user_metadata?.role || user?.app_metadata?.role || null;
  const {
    items, loading, markAllSeen, markMessageRead, markAsRead, deleteNotification
  } = useNotifications(user?.id, userRole);
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-sm shadow-sm">
          <Bell size={24} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-black mb-2">Sign in to view notifications</h2>
          <Link href="/login" className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors inline-block">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const handleItemClick = async (item) => {
    if (item.type === "message") {
      const convId = item.id.replace("message-", "");
      await markMessageRead(convId);
    } else if (item.dbId && item.unread) {
      await markAsRead(item.dbId);
    }
    if (item.href && item.href !== "#") {
      router.push(item.href);
    }
  };

  const handleDelete = async (e, item) => {
    e.stopPropagation();
    if (!item.dbId) return;
    setDeletingId(item.dbId);
    await deleteNotification(item.dbId);
    setDeletingId(null);
  };

  const filteredItems = filter === "all"
    ? items
    : filter === "unread"
    ? items.filter((it) => it.unread)
    : items.filter((it) => it.type === filter);

  return (
    <div className="min-h-screen bg-gray-50 pt-20" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="container py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
            Notifications
          </h1>
          {items.length > 0 && (
            <button
              onClick={markAllSeen}
              className="text-xs font-semibold text-gray-500 border border-gray-200 px-4 py-2 rounded-xl hover:border-gray-400 hover:text-black transition-all flex items-center gap-1.5"
            >
              <CheckCheck size={13} /> Mark all as read
            </button>
          )}
        </div>

        <div className="flex gap-1 flex-wrap mb-4">
          {FILTER_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === id
                  ? "bg-black text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-14">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <Bell size={22} className="text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-black mb-1">You&apos;re all caught up</p>
              <p className="text-xs text-gray-400">New notifications will show up here.</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const Icon = ICONS[item.type] || Bell;
              return (
                <div
                  key={item.id}
                  className="group flex items-start gap-3 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors"
                >
                  <button
                    onClick={() => handleItemClick(item)}
                    className="flex items-start gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconStyle(item)}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${item.unread ? "font-bold text-black" : "font-semibold text-black"}`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5 whitespace-pre-line">{item.body}</p>
                      <p className="text-[10px] text-gray-300 mt-1">{formatTime(item.timestamp)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {item.unread && <span className="w-2 h-2 rounded-full bg-red-500" />}
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </button>
                  {item.dbId && (
                    <button
                      onClick={(e) => handleDelete(e, item)}
                      disabled={deletingId === item.dbId}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1.5 disabled:opacity-40"
                    >
                      {deletingId === item.dbId ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
