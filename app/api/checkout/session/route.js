import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { getUncachableStripeClient } from "@/lib/stripeClient";

export async function POST(req) {
  try {
    const body = await req.json();
    const { items, shipping } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items to check out." }, { status: 400 });
    }
    if (!shipping?.name || !shipping?.email || !shipping?.address || !shipping?.city || !shipping?.zip) {
      return NextResponse.json({ error: "Missing shipping details." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in to check out." }, { status: 401 });
    }

    const subtotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.qty), 0);
    const shippingFee = subtotal >= 50 ? 0 : 4.99;
    const tax = +(subtotal * 0.08).toFixed(2);
    const grandTotal = +(subtotal + shippingFee + tax).toFixed(2);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        buyer_email: shipping.email,
        buyer_name: shipping.name,
        status: "processing",
        payment_status: "unpaid",
        total: grandTotal,
        shipping_name: shipping.name,
        shipping_address: shipping.address,
        shipping_city: shipping.city,
        shipping_zip: shipping.zip,
        shipping_country: shipping.country || "US",
      })
      .select("id")
      .single();

    if (orderErr) throw orderErr;
    const orderId = order.id;

    const itemsPayload = items.map((item) => ({
      order_id: orderId,
      product_id: String(item.id),
      product_name: item.name,
      vendor_id: item.vendor_id || null,
      vendor_name: item.vendor_name || null,
      price: item.price,
      qty: item.qty,
      subtotal: +(item.price * item.qty).toFixed(2),
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
    if (itemsErr) throw itemsErr;

    const stripe = await getUncachableStripeClient();
    const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;

    const line_items = items.map((item) => ({
      quantity: item.qty,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(Number(item.price) * 100),
        product_data: { name: item.name },
      },
    }));

    if (shippingFee > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(shippingFee * 100),
          product_data: { name: "Shipping" },
        },
      });
    }
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(tax * 100),
        product_data: { name: "Tax" },
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      customer_email: shipping.email,
      success_url: `${origin}/order-success/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?cancelled=1`,
      metadata: { order_id: orderId, buyer_id: user.id },
    });

    await supabase.from("orders").update({ stripe_session_id: session.id }).eq("id", orderId);

    return NextResponse.json({ url: session.url, orderId });
  } catch (err) {
    console.error("checkout/session error:", err);
    return NextResponse.json({ error: err?.message || "Checkout failed." }, { status: 500 });
  }
}
