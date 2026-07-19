"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

const SEEN_KEY_PREFIX = "cheaper_notif_seen_";

function getSeenIds(userId) {
  if (typeof window === "undefined" || !userId) return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY_PREFIX + userId);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(userId, ids) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(SEEN_KEY_PREFIX + userId, JSON.stringify([...ids]));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

// Real notifications: unread messages (backed by messages.is_read) plus
// recent order/payout activity for the user's role plus structured
// notifications from the notifications table. Order/payout "read" state
// is tracked locally per-browser since those tables have no per-recipient
// read flag. Structured notifications (product_pending, etc.) use the
// notifications table's is_read column.
export default function useNotifications(userId, role) {
  const [items, setItems] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(false);

  // Stable per-instance identifier so multiple consumers don't clash on channel name
  const instanceId = useRef(null);
  useEffect(() => {
    if (!instanceId.current) {
      instanceId.current = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setUnreadMessages(0);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/notifications?userId=${userId}&role=${encodeURIComponent(role || "")}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const seen = getSeenIds(userId);
      const enriched = (data.items || []).map((it) => {
        if (it.type === "message") return it;
        // Structured notifications from DB use is_read from the server
        if (it.dbId) return it;
        // Computed notifications (order/payout) use localStorage
        return { ...it, unread: !seen.has(it.id) };
      });
      setItems(enriched);
      setUnreadMessages(data.unreadMessages || 0);
    } catch (_) {
      // network hiccup — keep showing last known state
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  // Stable ref so realtime callbacks always call the latest load without restarting the subscription
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    load();
  }, [load]);

  // Poll periodically so badges stay fresh even without realtime events
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [userId, load]);

  // Realtime: refresh on new messages, order/order-item changes, or new notifications
  // Only re-subscribes when userId changes — uses loadRef to avoid stale closures.
  // Name includes a per-instance suffix so multiple consumers (Navbar + notifications
  // page + admin dashboard) don't collide on the same channel topic.
  useEffect(() => {
    if (!userId || !supabase) return;
    const channel = supabase
      .channel(`notifications-${userId}-${instanceId.current}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => loadRef.current())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => loadRef.current())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "order_items" }, () => loadRef.current())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => loadRef.current())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => loadRef.current())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId]);

  const unreadCount =
    unreadMessages +
    items.filter((it) => it.type !== "message" && it.unread && !it.dbId).length +
    items.filter((it) => it.dbId && !it.is_read && it.unread).length;

  // Mark all non-message notifications as seen
  const markAllSeen = useCallback(async () => {
    if (!userId) return;

    // Local-seen for computed notifications (order/payout)
    setItems((prev) => {
      const seen = getSeenIds(userId);
      for (const it of prev) {
        if (it.type !== "message" && !it.dbId) seen.add(it.id);
      }
      saveSeenIds(userId, seen);
      return prev.map((it) =>
        it.type !== "message" && !it.dbId ? { ...it, unread: false } : it
      );
    });

    // API mark-all-read for DB notifications
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setItems((prev) =>
        prev.map((it) => (it.dbId ? { ...it, unread: false } : it))
      );
    } catch (_) {
      // best-effort
    }
  }, [userId]);

  // Mark a conversation's messages as read
  const markMessageRead = useCallback(
    async (conversationId) => {
      const notifId = `message-${conversationId}`;
      const item = items.find((it) => it.id === notifId);
      setItems((prev) => prev.filter((it) => it.id !== notifId));
      setUnreadMessages((prev) => Math.max(0, prev - (item?.count || 1)));
      try {
        await fetch("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: conversationId }),
        });
      } catch (_) {
        // best-effort; a later refresh will reconcile
      }
    },
    [items]
  );

  // Mark a single structured notification as read
  const markAsRead = useCallback(
    async (dbId) => {
      setItems((prev) =>
        prev.map((it) => (it.dbId === dbId ? { ...it, unread: false } : it))
      );
      try {
        await fetch(`/api/notifications/${dbId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_read: true }),
        });
      } catch (_) {
        load(); // reconcile on error
      }
    },
    [load]
  );

  // Delete a single structured notification
  const deleteNotification = useCallback(
    async (dbId) => {
      setItems((prev) => prev.filter((it) => it.dbId !== dbId));
      try {
        await fetch(`/api/notifications/${dbId}`, { method: "DELETE" });
      } catch (_) {
        load(); // reconcile on error
      }
    },
    [load]
  );

  return {
    items,
    unreadMessages,
    unreadCount,
    loading,
    markAllSeen,
    markMessageRead,
    markAsRead,
    deleteNotification,
    refresh: load,
  };
}
