"use client";

import Link from "next/link";
import { Package, Star, Heart, Eye, ShoppingBag, TrendingUp, Sparkles, Zap, ArrowRight } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useCart } from "@/lib/cart-context";

const ProductCard = ({ product }) => {
  const { addItem, openCart } = useCart();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);

  const calculateDiscount = (price, originalPrice) => {
    if (!originalPrice || originalPrice === 0) return "0";
    const discount = ((originalPrice - price) / originalPrice) * 100;
    return Math.round(discount).toString();
  };

  const getRandomRating = () => {
    return (3.5 + Math.random() * 1.5).toFixed(1);
  };

  const getRandomReviews = () => {
    return Math.floor(Math.random() * 500) + 50;
  };

  const discount = calculateDiscount(product.price, product.original_price);
  const rating = product.rating || 4.5;
  const reviews = product.reviews || 128;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    setIsAddedToCart(true);
    openCart();
    setTimeout(() => setIsAddedToCart(false), 2000);
  };

  return (
    <motion.div 
      className="group relative bg-white rounded-2xl overflow-hidden border border-gray-200 transition-all duration-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -8, boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}
    >
      <div className="relative h-52 bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center overflow-hidden">
        {product.images?.[0] ? (
          <motion.img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover"
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
        
        {discount !== "0" && (
          <motion.span 
            className="absolute top-3 left-3 bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg"
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            -{discount}%
          </motion.span>
        )}

        {product.isNew && (
          <motion.span 
            className="absolute top-3 left-[72px] bg-gray-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-full"
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            NEW
          </motion.span>
        )}

        {product.isPremium && (
          <motion.div 
            className="absolute top-3 right-14 flex items-center gap-1 bg-black/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10"
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Sparkles size={10} className="text-yellow-400 animate-pulse" />
            Premium
          </motion.div>
        )}

        <motion.button
          onClick={handleWishlist}
          className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-sm shadow-lg transition-all duration-300 z-10 ${
            isWishlisted 
              ? 'bg-red-500 text-white shadow-red-500/30' 
              : 'bg-white/90 text-gray-400 hover:bg-white hover:text-black shadow-black/10'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.85 }}
          animate={isWishlisted ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <Heart size={17} fill={isWishlisted ? 'currentColor' : 'none'} />
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
          {product.isPremium && (
            <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
              <TrendingUp size={10} className="text-gray-600" />
              <span className="text-[8px] font-semibold text-gray-600">Premium</span>
            </div>
          )}
        </div>
        
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-sm text-black mb-2 leading-snug line-clamp-2 hover:text-gray-600 transition-colors duration-200">
            {product.name}
          </h3>
        </Link>
        
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i}
                size={14} 
                className={`${
                  i < fullStars 
                    ? 'text-yellow-400 fill-yellow-400' 
                    : i === fullStars && hasHalfStar
                      ? 'text-yellow-400 fill-yellow-400 opacity-50'
                      : 'text-gray-300'
                }`} 
              />
            ))}
          </div>
          <span className="text-xs font-bold text-black">{rating}</span>
          <span className="text-gray-300 text-xs">({reviews})</span>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-black text-lg">${product.price}</span>
            {product.original_price && product.original_price > product.price && (
              <span className="text-gray-300 text-xs line-through">${product.original_price}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button 
            onClick={handleAddToCart}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
              isAddedToCart 
                ? 'bg-green-600 text-white' 
                : 'bg-black text-white hover:bg-gray-800'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isAddedToCart ? (
              <>
                <span>✓</span>
                Added
              </>
            ) : (
              <>
                <ShoppingBag size={14} />
                Add to Cart
              </>
            )}
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

export default ProductCard;