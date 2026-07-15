import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

// GET /api/notifications?userId=<uuid>&role=<buyer|vendor|admin>
// Returns unread-message notifications (real, backed by messages.is_read)
// plus recent order/payout activity relevant to the user's role.
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const role = searchParams.get("role") || null;

    if (!userId) {
      return NextResponse.json({ message: "userId is required" }, { status: 400 });
    }

    const items = [];
    let unreadMessages = 0;

    // ── Unread messages, one notification per conversation ──────────────────
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    if (convs && convs.length > 0) {
      const convIds = convs.map((c) => c.id);
      const { data: unread } = await supabase
        .from("messages")
        .select("conversation_id, message, created_at")
        .in("conversation_id", convIds)
        .eq("is_read", false)
        .neq("sender_id", userId)
        .order("created_at", { ascending: false });

      if (unread && unread.length > 0) {
        unreadMessages = unread.length;

        const latestByConv = {};
        const countByConv = {};
        for (const m of unread) {
          countByConv[m.conversation_id] = (countByConv[m.conversation_id] || 0) + 1;
          if (!latestByConv[m.conversation_id]) latestByConv[m.conversation_id] = m;
        }

        const otherIds = [
          ...new Set(
            Object.keys(latestByConv)
              .map((cid) => {
                const c = convs.find((x) => x.id === cid);
                return c ? (c.buyer_id === userId ? c.seller_id : c.buyer_id) : null;
              })
              .filter(Boolean)
          ),
        ];

        let nameMap = {};
        if (otherIds.length > 0) {
          try {
            const { data: rpcRows } = await supabase.rpc("get_user_display_names", {
              user_ids: otherIds,
            });
            if (rpcRows) for (const r of rpcRows) nameMap[r.id] = r.display_name;
          } catch (_) { /* RPC not deployed yet */ }
        }

        for (const [convId, m] of Object.entries(latestByConv)) {
          const c = convs.find((x) => x.id === convId);
          const otherId = c ? (c.buyer_id === userId ? c.seller_id : c.buyer_id) : null;
          const name = nameMap[otherId] || "Someone";
          items.push({
            id: `message-${convId}`,
            type: "message",
            title: `New message from ${name}`,
            body: m.message,
            timestamp: m.created_at,
            href: `/messages?conversationId=${convId}`,
            unread: true,
            count: countByConv[convId],
          });
        }
      }
    }

    // ── Role-specific order/payout activity ─────────────────────────────────
    if (role === "vendor" || role === "admin") {
      const { data: newItems } = await supabase
        .from("order_items")
        .select("id, product_name, subtotal, created_at")
        .eq("vendor_id", userId)
        .eq("fulfillment_status", "processing")
        .order("created_at", { ascending: false })
        .limit(5);

      for (const it of newItems || []) {
        items.push({
          id: `order-item-${it.id}`,
          type: "order",
          title: "New order to fulfill",
          body: `${it.product_name} — $${Number(it.subtotal).toFixed(2)}`,
          timestamp: it.created_at,
          href: "/dashboard/vendor?tab=orders",
        });
      }

      const { data: released } = await supabase
        .from("order_items")
        .select("id, product_name, payout_amount, subtotal, payout_released_at")
        .eq("vendor_id", userId)
        .eq("payout_status", "released")
        .not("payout_released_at", "is", null)
        .order("payout_released_at", { ascending: false })
        .limit(5);

      for (const it of released || []) {
        items.push({
          id: `payout-${it.id}`,
          type: "payout",
          title: "Payout released",
          body: `$${Number(it.payout_amount || it.subtotal).toFixed(2)} for ${it.product_name}`,
          timestamp: it.payout_released_at,
          href: "/dashboard/vendor?tab=payouts",
        });
      }
    } else if (role === "buyer") {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status, total, created_at")
        .eq("buyer_id", userId)
        .in("status", ["shipped", "delivered", "cancelled"])
        .order("created_at", { ascending: false })
        .limit(5);

      const labels = {
        shipped: "Your order has shipped",
        delivered: "Your order was delivered",
        cancelled: "Your order was cancelled",
      };

      for (const o of orders || []) {
        items.push({
          id: `order-${o.id}`,
          type: "order",
          title: labels[o.status] || "Order update",
          body: `Order #${o.id.slice(0, 8)} — $${Number(o.total).toFixed(2)}`,
          timestamp: o.created_at,
          href: "/dashboard/buyer?tab=orders",
        });
      }
    }

    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return NextResponse.json({ unreadMessages, items: items.slice(0, 20) });
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
