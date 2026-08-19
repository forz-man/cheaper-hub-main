"use client";

import { useState, use, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Star, Heart, ShoppingBag, Package,
  Shield, Truck, RefreshCw, Share2,
  Check, Minus, Plus, ExternalLink, Loader2, ShoppingCart,
  MessageCircle, Mail, Phone, MapPin, Clock,
  Edit3, ArrowLeft
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart-context";
import useAuth from "@/hooks/useAuth";
import { requireAuth } from "@/lib/auth-flow";
import { mergeVendorProfile } from "@/lib/vendor-display";
import StarRating from "@/components/reviews/StarRating";
import ReviewCard from "@/components/reviews/ReviewCard";

function normalizeProduct(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    name: raw.name,
    vendor_name: raw.vendor_name || "Seller information unavailable",
    vendor_id: raw.vendor_id || raw.vendorId || null,
    sellerRating: raw.seller_rating || 0,
    sellerSales: raw.seller_sales || "—",
    price: parseFloat(raw.price),
    original_price: raw.original_price ? parseFloat(raw.original_price) : null,
    rating: raw.rating || 0,
    reviews: raw.reviews || 0,
    category: raw.category || "General",
    description: raw.description || "No description provided by the seller.",
    features: Array.isArray(raw.features) ? raw.features : [],
    specs: raw.specs && typeof raw.specs === "object" ? raw.specs : {},
    stock: raw.stock ?? 0,
    seller_email: raw.seller_email || raw.sellerEmail || "",
    seller_phone: raw.seller_phone || raw.sellerPhone || "",
    seller_location: raw.seller_location || raw.sellerLocation || "",
    seller_verified: raw.seller_verified ?? raw.sellerVerified ?? false,
    seller_join_date: raw.seller_join_date || raw.sellerJoinDate || "",
    seller_total_products: raw.seller_total_products || raw.sellerTotalProducts || 0,
    seller_response_time: raw.seller_response_time || raw.sellerResponseTime || "",
    seller_about: raw.seller_about || raw.sellerAbout || "",
    images: Array.isArray(raw.images) ? raw.images : [],
  };
}

const RELATED_STOP_WORDS = new Set([
  "and", "the", "for", "with", "from", "new", "best", "sale",
  "your", "this", "that", "pro", "plus", "edition", "model",
]);

function productTerms(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 1 && !RELATED_STOP_WORDS.has(term)),
  );
}

function rankRelatedProducts(current, candidates) {
  const currentNameTerms = productTerms(current.name);
  const currentDescriptionTerms = productTerms(current.description);

  return candidates
    .map((candidate) => {
      const candidateNameTerms = productTerms(candidate.name);
      const candidateDescriptionTerms = productTerms(candidate.description);
      const nameOverlap = [...currentNameTerms].filter((term) => candidateNameTerms.has(term)).length;
      const descriptionOverlap = [...currentDescriptionTerms].filter((term) => candidateDescriptionTerms.has(term)).length;
      const sameCategory = current.category && candidate.category === current.category;

      return {
        ...candidate,
        relatedScore:
          nameOverlap * 100 +
          descriptionOverlap * 5 +
          (sameCategory ? 10 : 0),
      };
    })
    .sort((a, b) => b.relatedScore - a.relatedScore)
    .slice(0, 4)
    .map(({ relatedScore, ...candidate }) => candidate);
}

export default function ProductPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  const { addItem, openCart, count: cartCount } = useCart();
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function checkWishlist() {
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      const storageKey = user ? `cheaper_wishlist_ids_${user.id}` : "cheaper_wishlist_ids";
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const ids = JSON.parse(stored);
          setWishlisted(ids.includes(String(id)));
        }
      } catch {}
    }
    checkWishlist();
  }, [id]);

  const handleToggleWishlist = async () => {
    if (!user) {
      requireAuth(router, {
        type: "wishlist_toggle",
        context: { productId: String(id) },
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const storageKey = user ? `cheaper_wishlist_ids_${user.id}` : "cheaper_wishlist_ids";
    
    let ids = [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) ids = JSON.parse(stored);
    } catch {}

    let nextWishlisted = !wishlisted;
    if (nextWishlisted) {
      if (!ids.includes(String(id))) ids.push(String(id));
    } else {
      ids = ids.filter(x => x !== String(id));
    }
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(ids));
    } catch {}
    setWishlisted(nextWishlisted);
  };
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState(
    () => searchParams.get("tab") === "reviews" ? "reviews" : "description",
  );
  const [copied, setCopied] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ average: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [reviewFormRating, setReviewFormRating] = useState(0);
  const [reviewFormText, setReviewFormText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState("");
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState(false);

  const handleBuyNow = () => {
    if (!user) {
      requireAuth(router, {
        type: "buy_now",
        context: { product, qty },
      });
      return;
    }
    addItem(product, qty);
    router.push("/checkout");
  };

  const handleAddToCart = () => {
    if (!user) {
      requireAuth(router, {
        type: "add_to_cart",
        context: { product, qty },
      });
      return;
    }
    addItem(product, qty);
    openCart();
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  // Contact Seller Handler - Navigates directly to Messages page
  const handleContactSeller = async () => {
    if (!user) {
      requireAuth(router, {
        type: "message_seller",
        context: {
          sellerId: product?.vendor_id,
          productId: product?.id,
        },
      });
      return;
    }

    setContactLoading(true);

    try {
      const buyerId = user.id || user.userId;
      const sellerId = product?.vendor_id;
      const productId = product?.id;

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
        const normalizedProduct = normalizeProduct(data);
        const { data: vendorProfile } = data.vendor_id
          ? await supabase
              .from("profiles")
              .select("id, store_name, full_name, email, phone_number, phone, location, bio, avatar_url")
              .eq("id", data.vendor_id)
              .maybeSingle()
          : { data: null };
        setProduct(mergeVendorProfile(normalizedProduct, vendorProfile));

        const { data: relatedData } = await supabase
            .from("products")
            .select("id, name, description, price, original_price, images, category, vendor_name, created_at")
            .eq("approval_status", "approved")
            .eq("status", "active")
            .neq("id", id)
            .order("created_at", { ascending: false })
            .limit(40);

        const relatedCandidates = (relatedData || []).map((item) => ({
          ...item,
          images: Array.isArray(item.images) ? item.images : [],
          price: Number(item.price),
          original_price: item.original_price ? Number(item.original_price) : null,
        }));
        setRelatedProducts(rankRelatedProducts(normalizedProduct, relatedCandidates));
      }
      setDbLoading(false);
    }
    fetchProduct();
  }, [id]);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews?product_id=${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews || []);
      setReviewStats(data.stats || { average: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
    } catch {
      // silently fail — reviews are non-critical
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  const checkEligibility = useCallback(async () => {
    if (!user) return;
    setEligibilityLoading(true);
    try {
      const res = await fetch(`/api/reviews/eligibility?product_id=${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setCanReview(data.canReview || false);
      setExistingReview(data.existingReview || null);
      setReviewOrderId(data.orderId || null);
      if (data.existingReview) {
        setReviewFormRating(data.existingReview.rating);
        setReviewFormText(data.existingReview.comment || "");
      }
    } catch {
      // silently fail
    } finally {
      setEligibilityLoading(false);
    }
  }, [id, user]);

  const handleSubmitReview = async () => {
    if (!user) {
      requireAuth(router, {
        type: "review",
        context: { productId: String(id) },
        returnTo: `${window.location.pathname}?tab=reviews`,
      });
      return;
    }
    if (reviewFormRating < 1) {
      setReviewSubmitError("Please select a rating");
      return;
    }
    setReviewSubmitError("");
    setReviewSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: reviewOrderId, productId: id, rating: reviewFormRating, comment: reviewFormText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewSubmitError(data.error || "Failed to submit review");
        return;
      }
      setReviewSubmitSuccess(true);
      setReviewFormRating(0);
      setReviewFormText("");
      setCanReview(false);
      fetchReviews();
    } catch {
      setReviewSubmitError("Network error — please try again");
    } finally {
      setReviewSubmitting(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { checkEligibility(); }, [checkEligibility]);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/products");
    }
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
    <div className="min-h-screen bg-[#f5f3ef] pt-14 sm:pt-16 md:pt-[72px]" style={{ fontFamily: "var(--font-inter), sans-serif" }}>

      <div className="max-w-7xl mx-auto px-5 md:px-8 pb-8">

        <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-[#888] hover:text-[#111] transition-colors mb-4">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] gap-8">

          {/* ── Left: Images + Tabs ── */}
          <div className="min-w-0">
            {/* Main image */}
            <div className="bg-white border border-[#e2ddd6] rounded-2xl overflow-hidden mb-3 relative">
              {pct && (
                <div className="absolute top-4 left-4 bg-[#111] text-white text-xs font-bold px-2.5 py-1 rounded-lg z-10">
                  {pct}% off
                </div>
              )}
              <div className="flex items-center justify-center h-[260px] sm:h-[340px] lg:h-[420px] bg-[#f9f8f6] overflow-hidden">
                {product.images?.[activeImage] ? (
                  <img src={product.images[activeImage]} alt={product.name} className="w-full h-full object-contain p-6" />
                ) : (
                  <Package size={72} className="text-[#ddd]" />
                )}
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
                  onClick={handleToggleWishlist}
                  className={`w-9 h-9 rounded-full bg-white border flex items-center justify-center transition-all shadow-sm ${
                    wishlisted ? "border-red-300 bg-red-50" : "border-[#e2ddd6] hover:border-[#999]"
                  }`}
                >
                  <Heart size={14} className={wishlisted ? "text-red-500 fill-red-500" : "text-[#888]"} />
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            {product.images?.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-8">
                {product.images.map((img, i) => (
                  <button
                    key={img + i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden bg-white transition-colors ${
                      i === activeImage ? "border-[#111]" : "border-[#e2ddd6] hover:border-[#999]"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain p-1.5" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-8">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-16 h-16 rounded-xl border-2 border-[#e2ddd6] flex items-center justify-center bg-white"
                  >
                    <Package size={18} className="text-[#ddd]" />
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="bg-white border border-[#e2ddd6] rounded-2xl overflow-hidden">
              <div className="flex overflow-x-auto border-b border-[#e2ddd6]">
                {[
                  { id: "description", label: "Description" },
                  { id: "features", label: "Features" },
                  { id: "specs", label: "Specs" },
                  { id: "reviews", label: `Reviews (${reviewStats.total})` },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`min-w-max flex-1 px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
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
                  <p className="text-sm text-[#555] leading-relaxed break-words">{product.description}</p>
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
                          <span className="text-xs font-semibold text-[#888] w-24 sm:w-32 flex-shrink-0">{key}</span>
                          <span className="min-w-0 break-words text-sm text-[#555]">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#888]">No specifications listed.</p>
                  )
                )}

                {activeTab === "reviews" && (
                  <div>
                    {reviewsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={20} className="animate-spin text-[#ccc]" />
                      </div>
                    ) : (
                      <>
                        {reviewStats.total > 0 && (
                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#f0ede8]">
                              <div className="text-center">
                                <div className="text-4xl font-bold text-[#111]" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>{reviewStats.average}</div>
                                <StarRating value={reviewStats.average} size={12} className="justify-center mt-1" />
                                <div className="text-xs text-[#aaa] mt-1">{reviewStats.total} reviews</div>
                              </div>
                            <div className="flex-1 space-y-1.5">
                              {[5,4,3,2,1].map(s => {
                                const count = reviewStats.distribution[s] || 0;
                                const pct = reviewStats.total > 0 ? Math.round((count / reviewStats.total) * 100) : 0;
                                return (
                                  <div key={s} className="flex items-center gap-2">
                                    <span className="text-xs text-[#888] w-2">{s}</span>
                                    <Star size={10} className="text-amber-500 fill-amber-500" />
                                    <div className="flex-1 h-1.5 bg-[#f0ede8] rounded-full overflow-hidden">
                                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-[10px] text-[#bbb] w-6 text-right">{pct}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {reviewStats.total === 0 && !reviewsLoading && (
                          <p className="text-sm text-[#888] text-center py-6">No reviews yet. Be the first to review this product!</p>
                        )}

                        {/* Review Form */}
                        {user && !eligibilityLoading && canReview && (
                          <div className="mb-6 p-5 bg-[#f9f8f6] border border-[#e2ddd6] rounded-xl">
                            <h4 className="text-sm font-semibold text-[#111] mb-3 flex items-center gap-2">
                              <Edit3 size={14} /> Write a review
                            </h4>
                            <StarRating value={reviewFormRating} onChange={setReviewFormRating} size={18} showLabel interactive className="mb-3" />
                            <textarea
                              value={reviewFormText}
                              onChange={(e) => setReviewFormText(e.target.value)}
                              placeholder="Share your experience with this product..."
                              maxLength={2000}
                              rows={3}
                              className="w-full px-3 py-2.5 text-sm border border-[#e2ddd6] rounded-lg bg-white resize-none focus:outline-none focus:border-[#999] transition-colors"
                            />
                            {reviewSubmitError && (
                              <p className="text-xs text-red-500 mt-1.5">{reviewSubmitError}</p>
                            )}
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-[10px] text-[#aaa]">{reviewFormText.length}/2000</span>
                              <button
                                onClick={handleSubmitReview}
                                disabled={reviewSubmitting || reviewFormRating < 1}
                                className="bg-[#111] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                              >
                                {reviewSubmitting ? (
                                  <>
                                    <Loader2 size={12} className="animate-spin" />
                                    Submitting...
                                  </>
                                ) : (
                                  "Submit review"
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {user && !eligibilityLoading && existingReview && (
                          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <p className="text-xs font-semibold text-emerald-700">You have reviewed this product.</p>
                          </div>
                        )}

                        {!user && (
                          <div className="mb-6 p-4 bg-[#f9f8f6] border border-[#e2ddd6] rounded-xl text-center">
                            <p className="text-xs text-[#888]">
                              <Link href="/login" className="text-[#4D8337] font-semibold hover:underline">Sign in</Link> to leave a review.
                            </p>
                          </div>
                        )}

                        {/* Review List */}
                        {reviews.length > 0 && (
                          <div className="space-y-5">
                            {reviews.map((r) => (
                              <ReviewCard
                                key={r.id}
                                review={r}
                                isOwn={user && r.buyer_id === user.id}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
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

              {reviewStats.total > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <StarRating value={reviewStats.average} size={13} />
                  <span className="text-sm font-bold text-[#111]">{reviewStats.average}</span>
                  <span className="text-sm text-[#bbb]">({reviewStats.total} reviews)</span>
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
                className="w-full mt-3 bg-[#4D8337] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#3E6D2E] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                onClick={handleToggleWishlist}
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
                  {product.vendor_avatar_url ? (
                    <img
                      src={product.vendor_avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#111] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{(product.vendor_name || "S")[0]}</span>
                    </div>
                  )}
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
                <button className="text-xs font-semibold text-[#4D8337] flex items-center gap-1 hover:underline">
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
                className="w-full mt-3 bg-[#4D8337] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#3E6D2E] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {relatedProducts.length > 0 && (
              <div className="bg-white border border-[#e2ddd6] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[#111]">Related items</h2>
                  <Link
                    href={`/marketplace?category=${encodeURIComponent(product.category)}`}
                    className="text-[11px] font-semibold text-[#4D8337] hover:underline"
                  >
                    See more
                  </Link>
                </div>
                <div className="space-y-3">
                  {relatedProducts.map((related) => (
                    <Link
                      key={related.id}
                      href={`/products/${related.id}`}
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-14 h-14 rounded-xl bg-[#f9f8f6] border border-[#f0ede8] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {related.images[0] ? (
                          <img
                            src={related.images[0]}
                            alt={related.name}
                            className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <Package size={18} className="text-[#d8d5cf]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#111] truncate group-hover:underline">
                          {related.name}
                        </p>
                        <p className="text-[10px] text-[#999] truncate mt-0.5">
                          {related.vendor_name || "Seller information unavailable"}
                        </p>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-xs font-bold text-[#111]">${related.price.toFixed(2)}</span>
                          {related.original_price && (
                            <span className="text-[10px] text-[#bbb] line-through">
                              ${related.original_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}