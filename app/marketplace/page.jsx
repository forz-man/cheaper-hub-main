"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Grid, List, ChevronDown, SlidersHorizontal, X,
  Sparkles, Package, ShoppingBag, Filter,
  Zap, Star, TrendingUp, Clock, Award
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart-context";
import ProductCard from "@/components/ProductCard";

const MOCK_PRODUCTS = [
  { id: "m1", name: "Wireless Earbuds Pro", vendor_name: "TechHub Store", price: 29.99, original_price: 59.99, rating: 4.8, reviews: 342, category: "Electronics" },
  { id: "m2", name: "Linen Throw Blanket", vendor_name: "CozyNest Shop", price: 18.00, original_price: 36.00, rating: 4.9, reviews: 128, category: "Home" },
  { id: "m3", name: "Running Shoes X2", vendor_name: "SportZone", price: 44.99, original_price: 89.99, rating: 4.7, reviews: 215, category: "Sports" },
  { id: "m4", name: "Ceramic Mug Set (4)", vendor_name: "HomeGoods Co.", price: 12.50, original_price: 24.00, rating: 5.0, reviews: 87, category: "Home" },
  { id: "m5", name: "Standing Desk Pro", vendor_name: "WorkSpace Co.", price: 249.99, original_price: 349.99, rating: 4.7, reviews: 203, category: "Electronics" },
  { id: "m6", name: "Air Purifier HEPA", vendor_name: "CleanAir Shop", price: 89.00, original_price: 129.00, rating: 4.9, reviews: 87, category: "Home" },
  { id: "m7", name: "Leather Wallet Slim", vendor_name: "Craft & Co.", price: 34.00, original_price: 54.00, rating: 4.6, reviews: 145, category: "Fashion" },
  { id: "m8", name: "Smart Plug (4-pack)", vendor_name: "TechHub Store", price: 19.99, original_price: 29.99, rating: 4.8, reviews: 412, category: "Electronics" },
];

const CATEGORIES = [
  { id: "all",         label: "All Products",     icon: Package },
  { id: "Electronics", label: "Electronics",      icon: Zap },
  { id: "Fashion",     label: "Fashion",           icon: ShoppingBag },
  { id: "Home",        label: "Home & Living",     icon: Star },
  { id: "Kitchen",     label: "Kitchen",           icon: Award },
  { id: "Sports",      label: "Sports",            icon: TrendingUp },
  { id: "Books",       label: "Books",             icon: Clock },
];

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest" },
  { value: "featured",   label: "Featured" },
  { value: "price_asc",  label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 15, stiffness: 100 } },
};

export default function MarketplacePage() {
  const { count, openCart } = useCart();

  const [products, setProducts]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [fromDb, setFromDb]               = useState(false);
  const [viewMode, setViewMode]           = useState("grid");
  const [showFilters, setShowFilters]     = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy]               = useState("newest");
  const [priceRange, setPriceRange]       = useState([0, 1000]);

  const loadProducts = useCallback(async () => {
    setLoading(true);

    let q = supabase
      .from("products")
      .select("id, name, vendor_name, price, original_price, category, stock, status")
      .eq("status", "active");

    if (searchQuery.trim()) {
      const safe = searchQuery.trim().replace(/[%_'(),]/g, " ");
      q = q.or(`name.ilike.%${safe}%,vendor_name.ilike.%${safe}%,category.ilike.%${safe}%`);
    }
    if (selectedCategory !== "all") q = q.eq("category", selectedCategory);
    if (priceRange[1] < 1000)       q = q.lte("price", priceRange[1]);
    if (priceRange[0] > 0)          q = q.gte("price", priceRange[0]);

    if (sortBy === "price_asc")  q = q.order("price", { ascending: true });
    else if (sortBy === "price_desc") q = q.order("price", { ascending: false });
    else q = q.order("created_at", { ascending: false });

    q = q.limit(96);

    const { data, error } = await q;

    if (!error) {
      setFromDb(true);
      setProducts(data ?? []);
    } else {
      setFromDb(false);
      let filtered = [...MOCK_PRODUCTS];
      if (searchQuery) filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.vendor_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (selectedCategory !== "all") filtered = filtered.filter(p => p.category === selectedCategory);
      if (priceRange[1] < 1000) filtered = filtered.filter(p => p.price <= priceRange[1]);
      if (sortBy === "price_asc")  filtered.sort((a, b) => a.price - b.price);
      if (sortBy === "price_desc") filtered.sort((a, b) => b.price - a.price);
      setProducts(filtered);
    }
    setLoading(false);
  }, [searchQuery, selectedCategory, sortBy, priceRange]);

  useEffect(() => {
    const t = setTimeout(loadProducts, 300);
    return () => clearTimeout(t);
  }, [loadProducts]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setPriceRange([0, 1000]);
    setSortBy("newest");
    setShowFilters(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container py-8">

        {/* ── Page header ── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-black rounded-xl">
              <Package size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-black">Marketplace</h1>
            <span className="px-3 py-1 bg-gray-200 rounded-full text-xs font-semibold text-gray-600">
              {products.length} items
            </span>
            {fromDb && (
              <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-[10px] font-semibold text-emerald-600">
                Live
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm">Browse and shop from verified sellers</p>
        </motion.div>

        {/* ── Search + controls ── */}
        <motion.div
          className="flex flex-col lg:flex-row gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Search */}
          <div className="flex-1 relative">
            <motion.div
              className={`relative flex items-center bg-white border transition-all duration-300 rounded-2xl overflow-hidden ${
                isSearchFocused
                  ? "border-black shadow-2xl shadow-black/10 ring-2 ring-black/5"
                  : "border-gray-200 hover:border-gray-400 hover:shadow-lg"
              }`}
              animate={isSearchFocused ? { scale: 1.02 } : { scale: 1 }}
            >
              <Search size={18} className={`ml-4 transition-colors duration-300 ${isSearchFocused ? "text-black" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Search products, brands, sellers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="flex-1 bg-transparent outline-none text-sm py-3.5 px-3 text-black placeholder:text-gray-400"
              />
              {searchQuery ? (
                <button onClick={() => setSearchQuery("")} className="mr-3 p-1 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={14} className="text-gray-400" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block mr-3 px-2 py-1 text-[10px] font-semibold text-gray-400 bg-gray-50 rounded border border-gray-200">
                  ⌘K
                </kbd>
              )}
            </motion.div>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Filters toggle */}
            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              className="px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-black hover:border-black hover:shadow-lg transition-all duration-300 flex items-center gap-2 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <SlidersHorizontal size={16} className="group-hover:rotate-12 transition-transform" />
              Filters
              {selectedCategory !== "all" || priceRange[0] > 0 || priceRange[1] < 1000 ? (
                <span className="ml-1 px-2 py-0.5 bg-black text-white text-[10px] rounded-full">!</span>
              ) : null}
            </motion.button>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-black appearance-none cursor-pointer hover:border-black hover:shadow-lg transition-all duration-300 pr-10"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Grid / List */}
            <div className="flex border border-gray-200 rounded-2xl overflow-hidden bg-white">
              <motion.button
                onClick={() => setViewMode("grid")}
                className={`p-3 transition-all duration-300 ${viewMode === "grid" ? "bg-black text-white" : "text-gray-400 hover:text-black hover:bg-gray-50"}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Grid size={18} />
              </motion.button>
              <motion.button
                onClick={() => setViewMode("list")}
                className={`p-3 transition-all duration-300 border-l border-gray-200 ${viewMode === "list" ? "bg-black text-white" : "text-gray-400 hover:text-black hover:bg-gray-50"}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <List size={18} />
              </motion.button>
            </div>

            {/* Cart */}
            <motion.button
              onClick={openCart}
              className="relative p-3 bg-white border border-gray-200 rounded-2xl hover:border-black hover:shadow-lg transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ShoppingBag size={18} className="text-gray-600" />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* ── Filter panel ── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              className="bg-white border border-gray-200 rounded-3xl p-6 mb-8 shadow-xl"
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.4, type: "spring" }}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <Filter size={20} className="text-black" />
                  <h3 className="font-semibold text-black text-lg">Filters</h3>
                </div>
                <motion.button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.3 }}
                >
                  <X size={18} className="text-gray-400" />
                </motion.button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</label>
                  <div className="mt-2 space-y-1">
                    {CATEGORIES.map(cat => (
                      <motion.button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm rounded-xl transition-all duration-200 ${
                          selectedCategory === cat.id
                            ? "bg-black text-white shadow-lg shadow-black/20"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                        whileHover={{ x: 4 }}
                      >
                        <cat.icon size={14} />
                        {cat.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Price range */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Price Range</label>
                  <div className="mt-4 space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="10"
                      value={priceRange[1]}
                      onChange={e => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                      style={{
                        background: `linear-gradient(to right, black 0%, black ${(priceRange[1] / 1000) * 100}%, #e5e7eb ${(priceRange[1] / 1000) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-black">${priceRange[0]}</span>
                      <span className="font-semibold text-black">
                        {priceRange[1] >= 1000 ? "Any" : `$${priceRange[1]}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rating</label>
                  <div className="mt-2 space-y-1">
                    {[5, 4, 3, 2, 1].map(star => (
                      <motion.button
                        key={star}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 w-full"
                        whileHover={{ x: 4 }}
                      >
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} className={i < star ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">& up</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
                <motion.button
                  onClick={() => setShowFilters(false)}
                  className="px-6 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-lg shadow-black/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Apply Filters
                </motion.button>
                <motion.button
                  onClick={clearFilters}
                  className="px-6 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Clear All
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Result count ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sparkles size={16} className="text-yellow-400" />
            <p className="text-sm text-gray-400">
              Showing{" "}
              <span className="text-black font-semibold">{products.length}</span>{" "}
              {products.length === 1 ? "product" : "products"}
              {searchQuery && (
                <> for <span className="text-black font-semibold">"{searchQuery}"</span></>
              )}
              {selectedCategory !== "all" && (
                <> in <span className="text-black font-semibold">{selectedCategory}</span></>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-xs text-gray-400">
              {fromDb ? "Live data" : "Demo data"} · {viewMode === "grid" ? "Grid" : "List"} view
            </p>
          </div>
        </div>

        {/* ── Product grid ── */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Package size={16} className="text-gray-400" />
                </div>
              </div>
              <p className="text-gray-400 text-sm animate-pulse">Loading products...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-6 bg-gray-50 rounded-full mb-4">
              <Package size={56} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-black">No products found</h3>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search terms</p>
            <motion.button
              onClick={clearFilters}
              className="mt-6 px-6 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Clear Filters
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            className={
              viewMode === "grid"
                ? "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                : "flex flex-col gap-5"
            }
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key={`${selectedCategory}-${sortBy}-${searchQuery}`}
          >
            {products.map(product => (
              <motion.div key={product.id} variants={itemVariants}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
