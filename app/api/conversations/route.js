import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

// POST /api/conversations — create or return existing conversation
// Also upserts the buyer's profile so vendors can see their name.
export async function POST(request) {
  try {
    const supabase = await createClient();

    // Verify the requester is authenticated
    const { data: { user: authUser } } = await supabase.auth.getUser();

    const { buyer_id, seller_id, product_id } = await request.json();

    if (!buyer_id || !seller_id || !product_id) {
      return NextResponse.json(
        { message: "buyer_id, seller_id and product_id are required" },
        { status: 400 }
      );
    }

    // Save buyer's display name to profiles so vendor can see it.
    // We only do this when the auth user IS the buyer (conversation initiator).
    if (authUser && authUser.id === buyer_id) {
      const displayName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split("@")[0] ||
        "Buyer";
      try {
        await supabase.from("profiles").upsert(
          { id: buyer_id, full_name: displayName, email: authUser.email },
          { onConflict: "id", ignoreDuplicates: false }
        );
      } catch (_) { /* profiles table may not exist yet — non-fatal */ }
    }

    // Return existing conversation if one already exists
    const { data: existing, error: findErr } = await supabase
      .from("conversations")
      .select("*")
      .eq("buyer_id", buyer_id)
      .eq("seller_id", seller_id)
      .eq("product_id", product_id)
      .maybeSingle();

    if (findErr) {
      return NextResponse.json({ message: findErr.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const { data: created, error: createErr } = await supabase
      .from("conversations")
      .insert({ buyer_id, seller_id, product_id })
      .select()
      .single();

    if (createErr) {
      return NextResponse.json({ message: createErr.message }, { status: 500 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// GET /api/conversations?userId=<uuid>
// Uses separate queries (no FK join) so it works even without a live FK relationship.
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ message: "userId is required" }, { status: 400 });
    }

    // 1 — fetch raw conversations; try last_message_at first, fall back to created_at
    let convs, convsErr;

    ({ data: convs, error: convsErr } = await supabase
      .from("conversations")
      .select("*")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order("last_message_at", { ascending: false }));

    if (convsErr) {
      ({ data: convs, error: convsErr } = await supabase
        .from("conversations")
        .select("*")
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("created_at", { ascending: false }));
    }

    if (convsErr) {
      return NextResponse.json({ message: convsErr.message }, { status: 500 });
    }

    if (!convs || convs.length === 0) {
      return NextResponse.json([]);
    }

    // 2 — collect unique IDs for batch lookups
    const userIds = [...new Set(
      convs.flatMap(c => [c.buyer_id, c.seller_id]).filter(Boolean)
    )];
    const productIds = [...new Set(convs.map(c => c.product_id).filter(Boolean))];
    const buyerIds   = [...new Set(convs.map(c => c.buyer_id).filter(Boolean))];

    // 3 — primary: RPC that reads auth.users metadata (works for ALL users)
    let profileMap = {};
    try {
      const { data: rpcRows } = await supabase
        .rpc("get_user_display_names", { user_ids: userIds });
      if (rpcRows) {
        for (const r of rpcRows) {
          profileMap[r.id] = r.display_name || r.email?.split("@")[0] || null;
        }
      }
    } catch (_) { /* RPC not deployed yet — fall through to other lookups */ }

    // 4 — fallback A: profiles table (populated on new sign-ups / new conversations)
    if (userIds.some(id => !profileMap[id])) {
      try {
        const missing = userIds.filter(id => !profileMap[id]);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", missing);
        if (profiles) {
          for (const p of profiles) {
            if (!profileMap[p.id]) profileMap[p.id] = p.full_name || p.email || null;
          }
        }
      } catch (_) { /* profiles table may not exist yet */ }
    }

    // 5 — fallback B: orders table — buyer_name stored at checkout
    let orderBuyerMap = {};
    if (buyerIds.length > 0) {
      try {
        const { data: orders } = await supabase
          .from("orders")
          .select("buyer_id, buyer_name, buyer_email")
          .in("buyer_id", buyerIds)
          .not("buyer_name", "is", null);
        if (orders) {
          for (const o of orders) {
            if (!orderBuyerMap[o.buyer_id] && (o.buyer_name || o.buyer_email)) {
              orderBuyerMap[o.buyer_id] = o.buyer_name || o.buyer_email?.split("@")[0];
            }
          }
        }
      } catch (_) { /* ignore */ }
    }

    // 5 — products lookup (vendor_name fallback for seller, product info)
    let productMap = {};
    if (productIds.length > 0) {
      try {
        const { data: products } = await supabase
          .from("products")
          .select("id, name, price, vendor_name, vendor_id, images")
          .in("id", productIds);
        if (products) {
          for (const p of products) productMap[p.id] = p;
        }
      } catch (_) { /* ignore */ }
    }

    // 6 — enrich each conversation with resolved names
    //   Seller: profiles → product.vendor_name → "Seller"
    //   Buyer:  profiles → orders.buyer_name   → "Buyer"
    const enriched = convs.map(conv => {
      const product      = conv.product_id ? (productMap[conv.product_id] || null) : null;
      const isBuyer      = conv.buyer_id === userId;
      const otherPartyId = isBuyer ? conv.seller_id : conv.buyer_id;

      const sellerName = profileMap[conv.seller_id] || product?.vendor_name || "Seller";
      const buyerName  = profileMap[conv.buyer_id]  || orderBuyerMap[conv.buyer_id] || "Buyer";
      const otherName  = isBuyer ? sellerName : buyerName;

      return {
        ...conv,
        buyer_name:       buyerName,
        seller_name:      sellerName,
        other_party_id:   otherPartyId,
        other_party_name: otherName,
        product,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    return NextResponse.json({ message: err.message || "Internal Server Error" }, { status: 500 });
  }
}
