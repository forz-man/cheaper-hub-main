"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, MessageCircle, Package, Wallet, ChevronRight, CheckCheck } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import useNotifications from "@/hooks/useNotifications";

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

const ICONS = { message: MessageCircle, order: Package, payout: Wallet };

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const userRole = user?.user_metadata?.role || user?.app_metadata?.role || null;
  const { items, loading, markAllSeen, markMessageRead } = useNotifications(user?.id, userRole);
  const router = useRouter();

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

  const handleClick = async (item) => {
    if (item.type === "message") {
      const convId = item.id.replace("message-", "");
      await markMessageRead(convId);
    }
    router.push(item.href);
  };

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

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-14">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <Bell size={22} className="text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-black mb-1">You're all caught up</p>
              <p className="text-xs text-gray-400">New messages and order updates will show up here.</p>
            </div>
          ) : (
            items.map((item) => {
              const Icon = ICONS[item.type] || Bell;
              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className="w-full flex items-start gap-3 px-5 py-4 text-left border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    item.unread ? "bg-black text-white" : "bg-gray-50 text-gray-400"
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${item.unread ? "font-bold text-black" : "font-semibold text-black"}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{item.body}</p>
                    <p className="text-[10px] text-gray-300 mt-1">{formatTime(item.timestamp)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {item.unread && <span className="w-2 h-2 rounded-full bg-red-500" />}
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
