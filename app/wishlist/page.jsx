"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, ShoppingBag, Package, Star, Eye, ArrowRight, ArrowLeft } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import StarRating from "@/components/reviews/StarRating";

const WishlistCard = ({ product, imageUrl, hasImage, discount, isOutOfStock, onRemove, onMoveToCart }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [dbRating, setDbRating] = useState(null);
  const [dbReviewCount, setDbReviewCount] = useState(null);

  useEffect(() => {
    if (!product?.id) return;
    fetch(`/api/reviews?product_id=${product.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.stats) {
          setDbRating(data.stats.average);
          setDbReviewCount(data.stats.total);
        }
      })
      .catch(() => {});
  }, [product?.id]);

  const rating = dbRating ?? product.rating ?? 0;
  const reviews = dbReviewCount ?? product.reviews ?? 0;

  return (
    <motion.div 
      className="group relative bg-white rounded-2xl overflow-hidden border border-gray-200 transition-all duration-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -8, boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}
      layout
    >
      <div className="relative h-52 bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center overflow-hidden">
        {hasImage ? (
          <motion.img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-contain p-4"
            animate={{ scale: isHovered ? 1.06 : 1 }}
            transition={{ duration: 0.4 }}
          />
        ) : (
          <motion.div
            animate={{ 
              scale: isHovered ? 1.1 : 1,
              rotate: isHovered ? 3 : 0
            }}
            transition={{ duration: 0.4 }}
          >
            <Package size={50} className="text-gray-300 group-hover:text-gray-400 transition-colors duration-300" />
          </motion.div>
        )}
        
        {discount && discount !== "0" && (
          <motion.span 
            className="absolute top-3 left-3 bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg z-10"
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            -{discount}%
          </motion.span>
        )}

        {/* Stock Status Badge */}
        {isOutOfStock && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-extrabold px-2 py-1 rounded-full z-10 border border-red-400 shadow-sm">
            Out of Stock
          </span>
        )}

        {/* Red Active Wishlist Heart */}
        <motion.button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(product.id);
          }}
          className="absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-sm shadow-lg transition-all duration-300 z-10 bg-red-500 text-white shadow-red-500/30"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.85 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.3 }}
        >
          <Heart size={17} fill="currentColor" />
        </motion.button>

        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        />

        <motion.div 
          className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            {product.vendor_name || "Verified Seller"}
          </p>
        </div>
        
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-sm text-black mb-2 leading-snug line-clamp-2 hover:text-gray-600 transition-colors duration-200">
            {product.name}
          </h3>
        </Link>
        
        <div className="flex items-center gap-1.5 mb-3">
          <StarRating value={rating} size={14} />
          <span className="text-xs font-bold text-black">{rating}</span>
          <span className="text-gray-300 text-xs">({reviews})</span>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-black text-lg">${Number(product.price).toFixed(2)}</span>
            {product.original_price && Number(product.original_price) > Number(product.price) && (
              <span className="text-gray-300 text-xs line-through">${Number(product.original_price).toFixed(2)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button 
            onClick={() => onMoveToCart(product)}
            disabled={isOutOfStock}
            className="flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 bg-black text-white hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ShoppingBag size={14} />
            Move to Cart
          </motion.button>

          <Link
            href={`/products/${product.id}`}
            className="px-5 py-2.5 text-xs font-semibold text-black border border-gray-300 rounded-xl hover:border-black hover:bg-gray-50 transition-all duration-200 flex items-center gap-1.5 group"
          >
            <Eye size={14} />
            View
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default function WishlistPage() {
  const { addItem, openCart } = useCart();
  const [wishlist, setWishlist] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Load wishlist from Supabase and localStorage on client mount
  useEffect(() => {
    async function loadWishlist() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        const storageKey = currentUser ? `cheaper_wishlist_ids_${currentUser.id}` : "cheaper_wishlist_ids";
        let wishlistIds = [];

        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            wishlistIds = JSON.parse(stored);
          }
        } catch (e) {
          console.error("Failed to parse wishlist IDs from localStorage:", e);
        }

        if (wishlistIds.length === 0) {
          setWishlist([]);
        } else {
          // Fetch product details from the live products table
          const { data: products, error } = await supabase
            .from("products")
            .select("id, name, vendor_name, price, original_price, stock, status, images")
            .in("id", wishlistIds);

          if (!error && products) {
            setWishlist(products);
            // Prune any stored IDs that do not exist in the database anymore
            const existingIds = products.map(p => p.id);
            localStorage.setItem(storageKey, JSON.stringify(existingIds));
          } else {
            console.error("Error fetching wishlist products:", error);
            setWishlist([]);
          }
        }
      } catch (err) {
        console.error("Failed loading wishlist route data:", err);
      } finally {
        setLoading(false);
        setHydrated(true);
      }
    }

    loadWishlist();
  }, []);

  const handleRemove = (id) => {
    const storageKey = user ? `cheaper_wishlist_ids_${user.id}` : "cheaper_wishlist_ids";
    const newList = wishlist.filter(item => item.id !== id);
    setWishlist(newList);
    try {
      const newIds = newList.map(item => item.id);
      localStorage.setItem(storageKey, JSON.stringify(newIds));
    } catch (err) {
      console.error("Failed to update localStorage:", err);
    }
  };

  const handleMoveToCart = (item) => {
    // Add to cart drawer
    addItem(item);
    // Remove from wishlist
    handleRemove(item.id);
    // Open the cart drawer
    openCart();
  };

  const calculateDiscountPercent = (price, original) => {
    if (!original || original === 0) return null;
    const discount = ((original - price) / original) * 100;
    return Math.round(discount).toString();
  };

  if (!hydrated || loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1280px] mx-auto space-y-8">
        
        {/* Header Hero Section */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 to-pink-500"></div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mt-2">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shadow-md">
                <Heart size={32} className="fill-red-50" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">My Wishlist</h1>
                <p className="text-sm text-gray-500 font-medium">
                  {wishlist.length} saved {wishlist.length === 1 ? "item" : "items"} you are tracking
                </p>
              </div>
            </div>
            
            <Link 
              href="/marketplace"
              className="flex items-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-gray-800 transition rounded-xl text-sm font-semibold shadow-lg shadow-black/10"
            >
              <ArrowLeft size={16} />
              Back to Marketplace
            </Link>
          </div>
        </div>

        {/* Wishlist Grid */}
        <AnimatePresence mode="popLayout">
          {wishlist.length === 0 ? (
            <motion.div 
              key="empty-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-24 bg-white rounded-3xl border border-gray-200 shadow-sm space-y-5"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-full border border-gray-100 flex items-center justify-center mx-auto text-gray-300">
                <Heart size={40} />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-lg font-bold text-black">Your Wishlist is Empty</h3>
                <p className="text-sm text-gray-400 font-medium">
                  You haven&apos;t added any items to your wishlist yet.
                </p>
              </div>
              <Link 
                href="/marketplace" 
                className="bg-black text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition shadow-lg shadow-black/10 inline-block"
              >
                Browse Marketplace
              </Link>
            </motion.div>
          ) : (
            <motion.div 
              key="grid"
              layout
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
              {wishlist.map((item) => {
                const discount = calculateDiscountPercent(parseFloat(item.price), item.original_price ? parseFloat(item.original_price) : 0);
                
                // Get thumbnail from images array
                let imageUrl = "";
                if (item.images) {
                  try {
                    const parsed = typeof item.images === "string" ? JSON.parse(item.images) : item.images;
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      imageUrl = parsed[0];
                    }
                  } catch (e) {
                    if (Array.isArray(item.images) && item.images.length > 0) {
                      imageUrl = item.images[0];
                    }
                  }
                }
                const hasImage = !!imageUrl;
                
                // Stock calculations
                const isOutOfStock = item.status === "out_of_stock" || Number(item.stock) <= 0;
                
                return (
                  <WishlistCard 
                    key={item.id}
                    product={item}
                    imageUrl={imageUrl}
                    hasImage={hasImage}
                    discount={discount}
                    isOutOfStock={isOutOfStock}
                    onRemove={handleRemove}
                    onMoveToCart={handleMoveToCart}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
