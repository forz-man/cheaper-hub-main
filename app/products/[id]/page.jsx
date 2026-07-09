"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Star, Heart, ShoppingBag, Package, Store,
  Shield, Truck, RefreshCw, ChevronRight, Share2, Flag,
  Check, Minus, Plus, ExternalLink, Loader2, ShoppingCart,
  MessageCircle, Mail, Phone, MapPin, Clock, Award, User
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart-context";
import useAuth from "@/hooks/useAuth";

const MOCK_PRODUCTS = {
  "1": {
    id: "1", name: "Wireless Earbuds Pro", vendor_name: "TechHub Store", sellerRating: 4.9, sellerSales: "12.4k",
    price: 29.99, original_price: 59.99, rating: 4.8, reviews: 342, category: "Electronics",
    description: "Premium wireless earbuds with active noise cancellation, 30-hour battery life, and IPX5 water resistance. Crystal-clear audio with deep bass and crisp highs. Seamlessly pair with any Bluetooth 5.3 device.",
    features: ["Active Noise Cancellation", "30-hour battery (10hr buds + 20hr case)", "IPX5 water resistant", "Bluetooth 5.3", "USB-C charging", "Touch controls"],
    specs: { "Connectivity": "Bluetooth 5.3", "Battery": "10hr (buds) + 20hr (case)", "Water Rating": "IPX5", "Driver Size": "10mm", "Weight": "5g per earbud" },
    vendor_id: "vendor-123",
    seller_email: "techhub@example.com",
    seller_phone: "+1 (555) 123-4567",
    seller_location: "San Francisco, CA",
    seller_verified: true,
    seller_join_date: "2024",
    seller_total_products: 156,
    seller_response_time: "2-4 hours",
    seller_about: "Premium electronics retailer with 5+ years of experience. We specialize in high-quality gadgets and accessories."
  },
  "2": {
    id: "2", name: "Linen Throw Blanket", vendor_name: "CozyNest Shop", sellerRating: 4.9, sellerSales: "3.1k",
    price: 18.00, original_price: 36.00, rating: 4.9, reviews: 128, category: "Home",
    description: "Handwoven 100% French linen throw blanket. Naturally breathable, hypoallergenic, and gets softer with every wash. Perfect for sofa draping or light bedding. Available in earthy, neutral tones.",
    features: ["100% French linen", "Hypoallergenic", "Pre-washed & softened", "Machine washable", "140 × 200cm", "Ethically made"],
    specs: { "Material": "100% French Linen", "Size": "140 × 200 cm", "Weight": "450g", "Care": "Machine wash 40°C", "Origin": "Portugal" },
    vendor_id: "vendor-456",
    seller_email: "cozynest@example.com",
    seller_phone: "+1 (555) 987-6543",
    seller_location: "Portland, OR",
    seller_verified: true,
    seller_join_date: "2023",
    seller_total_products: 89,
    seller_response_time: "1-3 hours",
    seller_about: "We create beautiful home decor items that bring comfort and style to your space."
  },
};

const MOCK_REVIEWS = [
  { id: 1, author: "Sarah M.", rating: 5, date: "Jun 15, 2026", verified: true, text: "Absolutely love it. Arrived quickly and the quality exceeded my expectations for the price. Would buy again without hesitation." },
  { id: 2, author: "James T.", rating: 5, date: "Jun 10, 2026", verified: true, text: "Great value. Works exactly as described. Setup was straightforward and it's been reliable since day one." },
  { id: 3, author: "Priya K.", rating: 4, date: "Jun 4, 2026", verified: false, text: "Good product overall. Took a couple days extra to arrive but the seller communicated well. Happy with the purchase." },
];

function normalizeProduct(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    name: raw.name,
    vendor_name: raw.vendor_name || "Marketplace Seller",
    vendor_id: raw.vendor_id || raw.vendorId || "unknown-vendor",
    sellerRating: 4.8,
    sellerSales: "—",
    price: parseFloat(raw.price),
    original_price: raw.original_price ? parseFloat(raw.original_price) : null,
    rating: raw.rating || 0,
    reviews: raw.reviews || 0,
    category: raw.category || "General",
    description: raw.description || "No description provided.",
    features: Array.isArray(raw.features) ? raw.features : [],
    specs: raw.specs && typeof raw.specs === "object" ? raw.specs : {},
    stock: raw.stock ?? 0,
    seller_email: raw.seller_email || raw.sellerEmail || "seller@example.com",
    seller_phone: raw.seller_phone || raw.sellerPhone || "+1 (555) 000-0000",
    seller_location: raw.seller_location || raw.sellerLocation || "Location not specified",
    seller_verified: raw.seller_verified ?? raw.sellerVerified ?? false,
    seller_join_date: raw.seller_join_date || raw.sellerJoinDate || "2024",
    seller_total_products: raw.seller_total_products || raw.sellerTotalProducts || 0,
    seller_response_time: raw.seller_response_time || raw.sellerResponseTime || "24 hours",
    seller_about: raw.seller_about || raw.sellerAbout || "Seller information not available.",
  };
}

export default function ProductPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [product, setProduct] = useState(() => {
    const mock = MOCK_PRODUCTS[String(id)];
    return mock ? normalizeProduct(mock) : null;
  });
  const [dbLoading, setDbLoading] = useState(!MOCK_PRODUCTS[String(id)]);
  const [notFound, setNotFound] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  const { addItem, openCart, count: cartCount } = useCart();
  const [wishlisted, setWishlisted] = useState(false);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [copied, setCopied] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const handleBuyNow = () => {
    addItem(product, qty);
    router.push("/checkout");
  };

  const handleAddToCart = () => {
    addItem(product, qty);
    openCart();
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  // Contact Seller Handler - Navigates directly to Messages page
  const handleContactSeller = async () => {
    if (!user) {
      alert("Please login to contact the seller.");
      router.push("/login");
      return;
    }

    setContactLoading(true);

    try {
      const buyerId = user.id || user.userId;
      const sellerId = product?.vendor_id;
      const productId = product?.id;

      console.log("=== Contact Seller ===");
      console.log("Product ID:", productId);
      console.log("Vendor ID:", sellerId);
      console.log("Product Name:", product?.name);
      console.log("Vendor Name:", product?.vendor_name);
      console.log("Buyer ID:", buyerId);
      console.log("=== End Contact Seller ===");

      // Step 1: Create or get conversation
      const conversationResponse = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buyer_id: buyerId,
          seller_id: sellerId,
          product_id: productId,
        }),
      });

      if (!conversationResponse.ok) {
        const errorData = await conversationResponse.json();
        throw new Error(errorData.message || "Failed to create conversation");
      }

      const conversationData = await conversationResponse.json();
      const conversationId = conversationData.id;

      console.log("Conversation created/found:", conversationData);

      // Step 2: Navigate directly to messages page with conversation ID
      router.push(`/messages?conversationId=${conversationId}`);

    } catch (error) {
      console.error("Error creating conversation:", error);
      alert(`Failed to start conversation: ${error.message}`);
    } finally {
      setContactLoading(false);
    }
  };

  useEffect(() => {
    if (MOCK_PRODUCTS[String(id)]) return;
    async function fetchProduct() {
      setDbLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setProduct(normalizeProduct(data));
      }
      setDbLoading(false);
    }
    fetchProduct();
  }, [id]);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (dbLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
        <Loader2 size={24} className="animate-spin text-[#ccc]" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-[#111] mb-2">Product not found</h1>
          <p className="text-sm text-[#888] mb-6">This listing may have been removed or is no longer available.</p>
          <Link href="/" className="bg-[#111] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors">
            Back to marketplace
          </Link>
        </div>
      </div>
    );
  }

  const savings = product.original_price ? (product.original_price - product.price).toFixed(2) : null;
  const pct = product.original_price ? Math.round((1 - product.price / product.original_price) * 100) : null;

  return (
    <div className="min-h-screen bg-[#f5f3ef]" style={{ fontFamily: "var(--font-inter), sans-serif" }}>

      {/* Nav */}
      <nav className="bg-white border-b border-[#e2ddd6] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[#888] hover:text-[#111] transition-colors">
              <ArrowLeft size={16} /> Back
            </button>
            <span className="text-[#ddd]">|</span>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#aaa]">
              <Link href="/" className="hover:text-[#111]">Marketplace</Link>
              <ChevronRight size={12} />
              <span className="text-[#888]">{product.category}</span>
              <ChevronRight size={12} />
              <span className="text-[#111] font-medium truncate max-w-[160px]">{product.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openCart}
              className="relative p-2 rounded-full hover:bg-[#f5f3ef] transition-colors"
              aria-label="Open cart"
            >
              <ShoppingCart size={18} className="text-[#555]" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#111] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#111] flex items-center justify-center">
                <span className="text-white font-bold text-xs" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>C</span>
              </div>
              <span className="font-bold text-sm hidden sm:block" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Cheaper</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-5 md:px-8 py-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">

          {/* ── Left: Images + Tabs ── */}
          <div>
            {/* Main image */}
            <div className="bg-white border border-[#e2ddd6] rounded-2xl overflow-hidden mb-3 relative">
              {pct && (
                <div className="absolute top-4 left-4 bg-[#111] text-white text-xs font-bold px-2.5 py-1 rounded-lg z-10">
                  {pct}% off
                </div>
              )}
              <div className="flex items-center justify-center h-[340px] sm:h-[420px] bg-[#f9f8f6]">
                <Package size={72} className="text-[#ddd]" />
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={handleShare}
                  className="w-9 h-9 rounded-full bg-white border border-[#e2ddd6] flex items-center justify-center hover:border-[#999] transition-colors shadow-sm"
                  title={copied ? "Copied!" : "Share"}
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} className="text-[#888]" />}
                </button>
                <button
                  onClick={() => setWishlisted(w => !w)}
                  className={`w-9 h-9 rounded-full bg-white border flex items-center justify-center transition-all shadow-sm ${
                    wishlisted ? "border-red-300 bg-red-50" : "border-[#e2ddd6] hover:border-[#999]"
                  }`}
                >
                  <Heart size={14} className={wishlisted ? "text-red-500 fill-red-500" : "text-[#888]"} />
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center bg-white transition-colors ${
                    i === 0 ? "border-[#111]" : "border-[#e2ddd6] hover:border-[#999]"
                  }`}
                >
                  <Package size={18} className="text-[#ddd]" />
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="bg-white border border-[#e2ddd6] rounded-2xl overflow-hidden">
              <div className="flex border-b border-[#e2ddd6]">
                {[
                  { id: "description", label: "Description" },
                  { id: "features", label: "Features" },
                  { id: "specs", label: "Specs" },
                  { id: "reviews", label: `Reviews (${product.reviews})` },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex-1 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === id
                        ? "border-[#111] text-[#111]"
                        : "border-transparent text-[#888] hover:text-[#555]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === "description" && (
                  <p className="text-sm text-[#555] leading-relaxed">{product.description}</p>
                )}

                {activeTab === "features" && (
                  product.features.length > 0 ? (
                    <ul className="space-y-2.5">
                      {product.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-[#555]">
                          <div className="w-5 h-5 rounded-full bg-[#111] flex items-center justify-center flex-shrink-0">
                            <Check size={11} className="text-white" />
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[#888]">No features listed for this product.</p>
                  )
                )}

                {activeTab === "specs" && (
                  Object.keys(product.specs).length > 0 ? (
                    <div className="divide-y divide-[#f0ede8]">
                      {Object.entries(product.specs).map(([key, val]) => (
                        <div key={key} className="flex py-3 gap-4">
                          <span className="text-xs font-semibold text-[#888] w-32 flex-shrink-0">{key}</span>
                          <span className="text-sm text-[#555]">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#888]">No specifications listed.</p>
                  )
                )}

                {activeTab === "reviews" && (
                  <div>
                    {product.rating > 0 && (
                      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#f0ede8]">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-[#111]" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>{product.rating}</div>
                          <div className="flex items-center gap-0.5 justify-center mt-1">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} size={12} className={s <= Math.round(product.rating) ? "text-amber-500 fill-amber-500" : "text-[#ddd]"} />
                            ))}
                          </div>
                          <div className="text-xs text-[#aaa] mt-1">{product.reviews} reviews</div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {[5,4,3,2,1].map(s => {
                            const w = s === 5 ? 72 : s === 4 ? 18 : s === 3 ? 7 : s === 2 ? 2 : 1;
                            return (
                              <div key={s} className="flex items-center gap-2">
                                <span className="text-xs text-[#888] w-2">{s}</span>
                                <Star size={10} className="text-amber-500 fill-amber-500" />
                                <div className="flex-1 h-1.5 bg-[#f0ede8] rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${w}%` }} />
                                </div>
                                <span className="text-[10px] text-[#bbb] w-6 text-right">{w}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="space-y-5">
                      {MOCK_REVIEWS.map((r) => (
                        <div key={r.id} className="pb-5 border-b border-[#f0ede8] last:border-0 last:pb-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-[#111]">{r.author}</span>
                                {r.verified && (
                                  <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                                    Verified
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} size={10} className={s <= r.rating ? "text-amber-500 fill-amber-500" : "text-[#ddd]"} />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-[#bbb]">{r.date}</span>
                          </div>
                          <p className="text-sm text-[#555] leading-relaxed">{r.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Purchase panel ── */}
          <div className="space-y-4">
            <div className="bg-white border border-[#e2ddd6] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">{product.category}</span>
                {pct && (
                  <>
                    <span className="text-[#e2ddd6]">·</span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">{pct}% OFF</span>
                  </>
                )}
              </div>

              <h1 className="text-2xl font-bold text-[#111] mb-3 leading-snug" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
                {product.name}
              </h1>

              {product.rating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={13} className={s <= Math.round(product.rating) ? "text-amber-500 fill-amber-500" : "text-[#ddd]"} />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-[#111]">{product.rating}</span>
                  <span className="text-sm text-[#bbb]">({product.reviews} reviews)</span>
                </div>
              )}

              {/* Price */}
              <div className="bg-[#f9f8f6] border border-[#e2ddd6] rounded-xl p-4 mb-4">
                <div className="flex items-baseline gap-2.5 mb-1">
                  <span className="text-3xl font-bold text-[#111]" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
                    ${product.price.toFixed(2)}
                  </span>
                  {product.original_price && (
                    <span className="text-lg text-[#bbb] line-through">${product.original_price.toFixed(2)}</span>
                  )}
                </div>
                {savings && (
                  <p className="text-sm text-emerald-600 font-semibold">You save ${savings} ({pct}% off)</p>
                )}
              </div>

              {/* Qty */}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-xs font-bold text-[#888] uppercase tracking-wide">QTY</span>
                <div className="flex items-center border border-[#e2ddd6] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-9 h-9 flex items-center justify-center text-[#888] hover:bg-[#f5f3ef] transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-[#111]">{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="w-9 h-9 flex items-center justify-center text-[#888] hover:bg-[#f5f3ef] transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span className="text-xs text-emerald-600 font-medium">In stock</span>
              </div>

              {/* CTAs */}
              <button onClick={handleBuyNow} className="w-full bg-[#111] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#333] transition-colors flex items-center justify-center gap-2 mb-3">
                <ShoppingBag size={16} />
                Buy now · ${(product.price * qty).toFixed(2)}
              </button>
              <button
                onClick={handleAddToCart}
                className="w-full bg-white border border-[#e2ddd6] py-3.5 rounded-xl font-semibold text-sm text-[#555] hover:border-[#999] transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart size={16} />
                {addedToCart ? "Added!" : "Add to cart"}
              </button>

              {/* Contact Seller Button - Now navigates directly to Messages */}
              <button
                onClick={handleContactSeller}
                disabled={contactLoading}
                className="w-full mt-3 bg-[#4648d4] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#3537b8] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {contactLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <MessageCircle size={16} />
                    Contact Seller
                  </>
                )}
              </button>

              <button
                onClick={() => setWishlisted(w => !w)}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm border transition-all flex items-center justify-center gap-2 mt-2 ${
                  wishlisted
                    ? "bg-red-50 border-red-200 text-red-600"
                    : "bg-white border-[#e2ddd6] text-[#555] hover:border-[#999]"
                }`}
              >
                <Heart size={16} className={wishlisted ? "fill-red-500" : ""} />
                {wishlisted ? "Saved to wishlist" : "Add to wishlist"}
              </button>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-[#f0ede8]">
                {[
                  { Icon: Truck, label: "Fast shipping" },
                  { Icon: Shield, label: "Buyer protection" },
                  { Icon: RefreshCw, label: "Easy returns" },
                ].map(({ Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                    <Icon size={18} className="text-[#888]" />
                    <span className="text-[10px] text-[#888] font-medium leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Seller card */}
            <div className="bg-white border border-[#e2ddd6] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#111] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{(product.vendor_name || "S")[0]}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm text-[#111]">{product.vendor_name}</div>
                      {product.seller_verified && (
                        <div className="flex items-center gap-0.5 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full text-[8px] font-semibold">
                          <Check size={8} /> Verified
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={11} className="text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold text-[#111]">{product.sellerRating}</span>
                      {product.sellerSales !== "—" && (
                        <span className="text-xs text-[#bbb]">· {product.sellerSales} sales</span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="text-xs font-semibold text-[#4648d4] flex items-center gap-1 hover:underline">
                  Visit <ExternalLink size={11} />
                </button>
              </div>

              {/* Seller Details */}
              <div className="border-t border-[#f0ede8] pt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-[#888]">
                  <Clock size={12} /> Response: {product.seller_response_time}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#888]">
                  <Package size={12} /> {product.seller_total_products} products
                </div>
                <div className="flex items-center gap-2 text-xs text-[#888]">
                  <MapPin size={12} /> {product.seller_location}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#888]">
                  <Mail size={12} /> {product.seller_email}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#888]">
                  <Phone size={12} /> {product.seller_phone}
                </div>
              </div>

              {/* Contact Seller Button in Seller Card */}
              <button 
                onClick={handleContactSeller}
                disabled={contactLoading}
                className="w-full mt-3 bg-[#4648d4] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#3537b8] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {contactLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <MessageCircle size={14} />
                    Contact {product.vendor_name}
                  </>
                )}
              </button>
            </div>

            {/* Related products */}
            <div className="bg-white border border-[#e2ddd6] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-[#111] mb-4">You might also like</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(MOCK_PRODUCTS)
                  .filter(p => String(p.id) !== String(id))
                  .slice(0, 4)
                  .map((related) => (
                    <Link
                      key={related.id}
                      href={`/products/${related.id}`}
                      className="border border-[#e2ddd6] rounded-xl overflow-hidden hover:border-[#999] transition-colors group"
                    >
                      <div className="h-20 bg-[#f5f3ef] flex items-center justify-center">
                        <Package size={22} className="text-[#ddd]" />
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-semibold text-[#111] leading-snug mb-1 line-clamp-2">{related.name}</div>
                        <div className="text-xs font-bold text-[#111]">${parseFloat(related.price).toFixed(2)}</div>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}