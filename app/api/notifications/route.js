import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// GET /api/notifications?userId=<uuid>&role=<buyer|vendor|admin>
// Returns unread-message notifications (real, backed by messages.is_read)
// plus recent order/payout activity for the user's role,
// plus structured notifications from the notifications table.
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

    // ── Structured notifications from notifications table ───────────────────
    const { data: dbNotifs } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (dbNotifs && dbNotifs.length > 0) {
      for (const n of dbNotifs) {
        items.push({
          id: `notif-${n.id}`,
          type: n.type,
          title: n.title,
          body: n.body || "",
          timestamp: n.created_at,
          href: n.link || "#",
          unread: !n.is_read,
          dbId: n.id,
          data: n.data,
        });
      }
    }

    // ── Merge and sort all items by timestamp ───────────────────────────────
    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return NextResponse.json({ unreadMessages, items: items.slice(0, 30) });
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/notifications — Create a notification (service-role, for server-side use)
export async function POST(request) {
  try {
    const body = await request.json();
    const { user_id, type, title, body: notifBody, link, data: metaData } = body;

    if (!user_id || !type || !title) {
      return NextResponse.json({ message: "user_id, type, and title are required" }, { status: 400 });
    }

    const validTypes = ["product_pending", "product_approved", "product_rejected", "order_update", "payout_release", "system"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ message: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const payload = {
      user_id,
      type,
      title,
      body: notifBody || null,
      link: link || null,
      data: metaData || {},
      is_read: false,
    };

    const admin = createAdminClient();
    const { data: created, error } = await admin
      .from("notifications")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
