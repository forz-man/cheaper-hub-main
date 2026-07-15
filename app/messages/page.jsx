"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Search, MessageCircle, Check, CheckCheck,
  Send, MoreVertical, Package, ChevronRight, AlertCircle,
  Loader2, X, Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useAuth from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60_000)  return "Just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  if (diff < 172_800_000) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTimeFull(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDateDivider(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86_400_000) return "Today";
  if (diff < 172_800_000) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function Avatar({ name = "?", size = 9 }) {
  const letter = name.trim()[0]?.toUpperCase() || "?";
  const sizeClass = size === 9 ? "w-9 h-9 text-sm" : size === 10 ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
  return (
    <div className={`${sizeClass} rounded-full bg-black flex items-center justify-center flex-shrink-0`}>
      <span className="text-white font-bold">{letter}</span>
    </div>
  );
}

// ─── Inner component (needs useSearchParams) ───────────────────────────────────

function MessagesPageInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [conversations, setConversations]           = useState([]);
  const [selectedConv, setSelectedConv]             = useState(null);
  const [messages, setMessages]                     = useState([]);
  const [newMessage, setNewMessage]                 = useState("");
  const [searchQuery, setSearchQuery]               = useState("");
  const [loading, setLoading]                       = useState(true);
  const [messagesLoading, setMessagesLoading]       = useState(false);
  const [sending, setSending]                       = useState(false);
  const [showList, setShowList]                     = useState(true);
  const [isMobile, setIsMobile]                     = useState(false);
  const [loadError, setLoadError]                   = useState(null);

  const urlConvId = searchParams.get("conversationId");

  // ── Mobile detection
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setShowList(true);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  // ── Load conversations
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    async function load() {
      setLoading(true); setLoadError(null);
      try {
        const res = await fetch(`/api/conversations?userId=${user.id}`);
        if (!res.ok) throw new Error("Failed to load conversations");
        const data = await res.json();
        if (cancelled) return;
        setConversations(data);
        // Auto-select from URL param or first conversation
        const target = urlConvId ? data.find(c => c.id === urlConvId) : null;
        const first  = target ?? (data.length > 0 ? data[0] : null);
        if (first) {
          setSelectedConv(first);
          if (window.innerWidth < 768) setShowList(false);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id, urlConvId]);

  // ── Load messages for selected conversation
  useEffect(() => {
    if (!selectedConv) return;
    async function load() {
      setMessagesLoading(true);
      try {
        const res = await fetch(`/api/messages?conversationId=${selectedConv.id}`);
        if (!res.ok) throw new Error("Failed to load messages");
        setMessages(await res.json());
        scrollToBottom();
      } catch {
        // silently fail — realtime will fill in
      } finally {
        setMessagesLoading(false);
      }
    }
    load();
  }, [selectedConv?.id]);

  // ── Realtime: new messages in selected conversation
  useEffect(() => {
    if (!selectedConv) return;
    const channel = supabase
      .channel(`conv-${selectedConv.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        setConversations(prev => prev.map(c =>
          c.id === selectedConv.id
            ? { ...c, last_message: payload.new.message, last_message_at: payload.new.created_at }
            : c
        ));
        scrollToBottom();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedConv?.id]);

  // ── Realtime: new conversations
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("convs-new")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "conversations",
        filter: `buyer_id=eq.${user.id}`,
      }, async () => {
        const res = await fetch(`/api/conversations?userId=${user.id}`);
        if (res.ok) setConversations(await res.json());
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

  const selectConv = (conv) => {
    setSelectedConv(conv);
    if (isMobile) setShowList(false);
    router.replace(`/messages?conversationId=${conv.id}`, { scroll: false });
    inputRef.current?.focus();

    // Mark the other participant's messages read (real DB write) and clear
    // the badge locally right away.
    if (conv.unread_count > 0) {
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
      fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conv.id }),
      }).catch(() => {});
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv || !user || sending) return;
    const text = newMessage.trim();
    setNewMessage("");
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: selectedConv.id, sender_id: user.id, message: text }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const msg = await res.json();
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      setConversations(prev => prev.map(c =>
        c.id === selectedConv.id ? { ...c, last_message: msg.message, last_message_at: msg.created_at } : c
      ));
      scrollToBottom();
    } catch (err) {
      setNewMessage(text); // restore on failure
      alert(`Failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // ── Filtered list
  const filtered = conversations.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.other_party_name || "").toLowerCase().includes(q) ||
      (c.product?.name || "").toLowerCase().includes(q)
    );
  });

  // ── Auth / loading states
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading messages…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-sm shadow-sm">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={24} className="text-gray-300" />
          </div>
          <h2 className="text-lg font-bold text-black mb-2">Sign in to view messages</h2>
          <p className="text-sm text-gray-400 mb-6">You need to be logged in to see your conversations.</p>
          <Link href="/login" className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors inline-block">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-sm shadow-sm">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-black mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-400 mb-6">{loadError}</p>
          <button onClick={() => window.location.reload()}
            className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Main UI
  return (
    <div className="min-h-screen bg-gray-50 pt-20" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="container py-6">

        {/* Page title row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
              Messages
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p>
          </div>
          <Link href="/marketplace"
            className="text-xs font-semibold text-gray-500 border border-gray-200 px-4 py-2 rounded-xl hover:border-gray-400 hover:text-black transition-all flex items-center gap-1.5">
            <Plus size={13} /> New conversation
          </Link>
        </div>

        {/* Split-pane container */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
          style={{ height: "calc(100vh - 180px)", minHeight: 520 }}>
          <div className="flex h-full">

            {/* ── Conversation list ─────────────────────────────────────────── */}
            {(showList || !isMobile) && (
              <div className={`${isMobile ? "w-full" : "w-[320px] min-w-[280px]"} border-r border-gray-100 flex flex-col bg-white`}>

                {/* Search */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-black focus-within:ring-2 focus-within:ring-black/5 transition-all">
                    <Search size={14} className="text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search conversations…"
                      className="flex-1 bg-transparent outline-none text-sm text-black placeholder:text-gray-400"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="text-gray-300 hover:text-black transition-colors">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                        <MessageCircle size={20} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-semibold text-black mb-1">
                        {searchQuery ? "No results" : "No conversations yet"}
                      </p>
                      <p className="text-xs text-gray-400 mb-4">
                        {searchQuery ? "Try a different search" : "Browse products and contact a seller to start chatting"}
                      </p>
                      {!searchQuery && (
                        <Link href="/marketplace" className="text-xs font-semibold text-black hover:underline flex items-center gap-1">
                          Browse marketplace <ChevronRight size={12} />
                        </Link>
                      )}
                    </div>
                  ) : (
                    filtered.map(conv => {
                      const name    = conv.other_party_name || "Unknown";
                      const isActive = selectedConv?.id === conv.id;
                      const hasUnread = conv.unread_count > 0;
                      return (
                        <button
                          key={conv.id}
                          onClick={() => selectConv(conv)}
                          className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors border-b border-gray-50 last:border-0 ${
                            isActive ? "bg-gray-50" : "hover:bg-gray-50/70"
                          }`}
                        >
                          <div className="relative">
                            <Avatar name={name} size={10} />
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-0.5">
                              <p className={`text-sm truncate ${hasUnread ? "font-bold text-black" : "font-semibold text-black"}`}>{name}</p>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">
                                {formatTime(conv.last_message_at || conv.created_at)}
                              </span>
                            </div>
                            {conv.product?.name && (
                              <p className="text-[10px] text-gray-400 truncate mb-0.5 flex items-center gap-1">
                                {conv.product?.images?.[0] ? (
                                  <span className="w-3.5 h-3.5 rounded bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    <img src={conv.product.images[0]} alt="" className="w-full h-full object-contain" />
                                  </span>
                                ) : (
                                  <Package size={9} className="flex-shrink-0" />
                                )}
                                {conv.product.name}
                              </p>
                            )}
                            <p className={`text-xs truncate ${hasUnread ? "text-black font-medium" : "text-gray-400"}`}>
                              {conv.last_message || "No messages yet"}
                            </p>
                          </div>
                          {hasUnread ? (
                            <span className="min-w-[18px] h-[18px] bg-black text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 mt-1 flex-shrink-0">
                              {conv.unread_count > 9 ? "9+" : conv.unread_count}
                            </span>
                          ) : isActive ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-black mt-2 flex-shrink-0" />
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── Chat panel ───────────────────────────────────────────────── */}
            {(!isMobile || !showList) && (
              <div className="flex-1 flex flex-col min-w-0 bg-white">
                {selectedConv ? (
                  <>
                    {/* Chat header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white flex-shrink-0">
                      <div className="flex items-center gap-3">
                        {isMobile && (
                          <button onClick={() => { setShowList(true); router.replace("/messages", { scroll: false }); }}
                            className="p-1.5 -ml-1 text-gray-400 hover:text-black transition-colors">
                            <ArrowLeft size={18} />
                          </button>
                        )}
                        <div className="relative">
                          <Avatar name={selectedConv.other_party_name || "U"} size={9} />
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-black leading-tight">
                            {selectedConv.other_party_name || "Unknown"}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-medium">Online</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {selectedConv.product_id && (
                          <Link href={`/products/${selectedConv.product_id}`}
                            className="text-xs text-gray-400 border border-gray-200 px-3 py-1.5 rounded-xl hover:border-gray-400 hover:text-black transition-all flex items-center gap-1.5 hidden sm:flex">
                            {selectedConv.product?.images?.[0] ? (
                              <span className="w-4 h-4 rounded bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                <img src={selectedConv.product.images[0]} alt="" className="w-full h-full object-contain" />
                              </span>
                            ) : (
                              <Package size={11} />
                            )}
                            <span className="max-w-[100px] truncate">{selectedConv.product?.name || "Product"}</span>
                          </Link>
                        )}
                        <button className="p-2 text-gray-300 hover:text-black hover:bg-gray-50 rounded-xl transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50/50 space-y-1">

                      {/* Product context card */}
                      {selectedConv.product_id && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-3 mb-4 flex items-center gap-3 shadow-sm">
                          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {selectedConv.product?.images?.[0] ? (
                              <img src={selectedConv.product.images[0]} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <Package size={16} className="text-gray-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-black truncate">{selectedConv.product?.name || "Product"}</p>
                            {selectedConv.product?.price && (
                              <p className="text-xs text-gray-400">${parseFloat(selectedConv.product.price).toFixed(2)}</p>
                            )}
                          </div>
                          <Link href={`/products/${selectedConv.product_id}`}
                            className="text-[10px] font-semibold text-black border border-gray-200 px-2.5 py-1.5 rounded-lg hover:border-gray-400 transition-colors flex-shrink-0">
                            View →
                          </Link>
                        </div>
                      )}

                      {messagesLoading ? (
                        <div className="flex items-center justify-center h-40">
                          <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-center">
                          <div className="w-10 h-10 bg-white border border-gray-200 rounded-2xl flex items-center justify-center mb-3 shadow-sm">
                            <MessageCircle size={18} className="text-gray-300" />
                          </div>
                          <p className="text-sm font-semibold text-black mb-1">Start the conversation</p>
                          <p className="text-xs text-gray-400">Send a message below to get started</p>
                        </div>
                      ) : (
                        <MessageList messages={messages} userId={user.id} messagesEndRef={messagesEndRef} />
                      )}
                    </div>

                    {/* Input */}
                    <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
                      <form onSubmit={handleSend} className="flex items-center gap-2">
                        <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 gap-2 focus-within:border-black focus-within:ring-2 focus-within:ring-black/5 transition-all">
                          <input
                            ref={inputRef}
                            type="text"
                            placeholder="Type a message…"
                            className="flex-1 bg-transparent outline-none text-sm text-black placeholder:text-gray-400"
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            disabled={sending}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                          />
                        </div>
                        <button type="submit" disabled={!newMessage.trim() || sending}
                          className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                          {sending
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Send size={15} />}
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  /* Empty state — no conversation selected */
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/30">
                    <div className="w-16 h-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                      <MessageCircle size={28} className="text-gray-300" />
                    </div>
                    <h3 className="text-base font-bold text-black mb-2" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
                      Your messages
                    </h3>
                    <p className="text-sm text-gray-400 max-w-xs mb-6">
                      {conversations.length > 0
                        ? "Select a conversation on the left to start messaging"
                        : "No conversations yet. Browse the marketplace and contact a seller to get started."}
                    </p>
                    {conversations.length === 0 && (
                      <Link href="/marketplace"
                        className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2">
                        Browse marketplace <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Message list (extracted so it can re-render independently) ────────────────

function MessageList({ messages, userId, messagesEndRef }) {
  // Group by date for dividers
  const groups = [];
  let lastDate = null;
  for (const msg of messages) {
    const d = msg.created_at ? new Date(msg.created_at).toDateString() : "Unknown";
    if (d !== lastDate) { groups.push({ type: "divider", date: msg.created_at }); lastDate = d; }
    groups.push({ type: "msg", msg });
  }

  return (
    <>
      <AnimatePresence initial={false}>
        {groups.map((item, idx) =>
          item.type === "divider" ? (
            <div key={`div-${idx}`} className="flex justify-center my-3">
              <span className="text-[10px] text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-full shadow-sm">
                {formatDateDivider(item.date)}
              </span>
            </div>
          ) : (
            <MessageBubble key={item.msg.id} msg={item.msg} isOwn={item.msg.sender_id === userId} />
          )
        )}
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </>
  );
}

function MessageBubble({ msg, isOwn }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}
    >
      <div className={`max-w-[72%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? "bg-black text-white rounded-br-sm"
            : "bg-white text-black border border-gray-200 rounded-bl-sm shadow-sm"
        }`}>
          {msg.message}
        </div>
        <div className="flex items-center gap-1 mt-1 px-1">
          <span className="text-[10px] text-gray-400">{formatTimeFull(msg.created_at)}</span>
          {isOwn && (
            msg.is_read
              ? <CheckCheck size={11} className="text-black" />
              : <Check size={11} className="text-gray-300" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Export with Suspense (useSearchParams requirement) ────────────────────────

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    }>
      <MessagesPageInner />
    </Suspense>
  );
}
