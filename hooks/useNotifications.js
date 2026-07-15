"use client";

import { useState, useEffect, useCallback } from "react";
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
// recent order/payout activity for the user's role. Order/payout "read"
// state is tracked locally per-browser since those tables have no
// per-recipient read flag.
export default function useNotifications(userId, role) {
  const [items, setItems] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(false);

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
      const enriched = (data.items || []).map((it) =>
        it.type === "message" ? it : { ...it, unread: !seen.has(it.id) }
      );
      setItems(enriched);
      setUnreadMessages(data.unreadMessages || 0);
    } catch (_) {
      // network hiccup — keep showing last known state
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll periodically so badges stay fresh even without realtime events
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [userId, load]);

  // Realtime: refresh on new messages or order/order-item changes
  useEffect(() => {
    if (!userId || !supabase) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "order_items" }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId, load]);

  const unreadCount =
    unreadMessages + items.filter((it) => it.type !== "message" && it.unread).length;

  // Mark all non-message notifications as seen (called when the dropdown opens)
  const markAllSeen = useCallback(() => {
    if (!userId) return;
    setItems((prev) => {
      const seen = getSeenIds(userId);
      for (const it of prev) if (it.type !== "message") seen.add(it.id);
      saveSeenIds(userId, seen);
      return prev.map((it) => (it.type !== "message" ? { ...it, unread: false } : it));
    });
  }, [userId]);

  // Mark a conversation's messages as read (real DB write) and drop it locally
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

  return { items, unreadMessages, unreadCount, loading, markAllSeen, markMessageRead, refresh: load };
}
