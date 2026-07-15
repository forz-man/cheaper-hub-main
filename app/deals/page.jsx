"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Tag, Clock, TrendingUp, Zap, Sparkles,
  ChevronDown, Search, Filter, Grid, List,
  ShoppingBag, Heart, Star, Eye, Package,
  ArrowRight, Percent, Flame, Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '@/components/ProductCard';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'Electronics', label: 'Electronics' },
  { id: 'Fashion', label: 'Fashion' },
  { id: 'Home & Living', label: 'Home & Living' },
  { id: 'Food & Bev', label: 'Food & Beverages' },
  { id: 'Sports', label: 'Sports' },
  { id: 'Books', label: 'Books' },
];

const SORT_OPTIONS = [
  { value: 'discount', label: 'Biggest Discount' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
];

// Tabs map to real signals computed from the products/order data — no
// randomized placeholders:
//  - flash:     deepest markdowns (>= 30% off)
//  - trending:  highest units sold (from real order_items)
//  - new:       listed within the last 14 days
//  - clearance: deepest markdowns (>= 50% off)
const TABS = [
  { id: 'all', label: 'All Deals', icon: Tag },
  { id: 'flash', label: 'Flash Sales', icon: Zap },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'new', label: 'New Arrivals', icon: Sparkles },
  { id: 'clearance', label: 'Clearance', icon: Percent },
];

const NEW_ARRIVAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 15, stiffness: 100 } },
};

const DealsPage = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('discount');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const response = await fetch('/api/deals');
        if (!response.ok) throw new Error('Failed to load deals');
        const data = await response.json();
        setDeals(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching deals:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      flash: deals.filter(d => d.discount_pct >= 30).length,
      newArrivals: deals.filter(d => d.created_at && now - new Date(d.created_at).getTime() <= NEW_ARRIVAL_WINDOW_MS).length,
      clearance: deals.filter(d => d.discount_pct >= 50).length,
      trending: deals.filter(d => d.sold_count > 0).length,
    };
  }, [deals]);

  const filtered = useMemo(() => {
    const now = Date.now();
    let list = [...deals];

    if (activeTab === 'flash') list = list.filter(d => d.discount_pct >= 30);
    else if (activeTab === 'trending') list = list.filter(d => d.sold_count > 0);
    else if (activeTab === 'new') list = list.filter(d => d.created_at && now - new Date(d.created_at).getTime() <= NEW_ARRIVAL_WINDOW_MS);
    else if (activeTab === 'clearance') list = list.filter(d => d.discount_pct >= 50);

    if (selectedCategory !== 'all') list = list.filter(d => d.category === selectedCategory);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.vendor_name?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'price-low':  list.sort((a, b) => Number(a.price) - Number(b.price)); break;
      case 'price-high': list.sort((a, b) => Number(b.price) - Number(a.price)); break;
      case 'newest':     list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
      case 'popular':    list.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0)); break;
      default:           list.sort((a, b) => (b.discount_pct || 0) - (a.discount_pct || 0)); // discount
    }

    return list;
  }, [deals, activeTab, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-black rounded-xl">
              <Tag size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-black">Hot Deals</h1>
            <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-semibold">
              {deals.length} deals
            </span>
          </div>
          <p className="text-gray-400 text-sm">Real markdowns from real sellers — don't miss out</p>
        </motion.div>

        <motion.div
          className="flex flex-wrap gap-2 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {TABS.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-black text-white shadow-lg shadow-black/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <tab.icon size={14} />
              {tab.label}
            </motion.button>
          ))}
        </motion.div>

        <motion.div
          className="flex flex-col lg:flex-row gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex-1 relative">
            <motion.div
              className={`relative flex items-center bg-white border transition-all duration-300 rounded-2xl overflow-hidden ${
                isSearchFocused
                  ? 'border-black shadow-2xl shadow-black/10 ring-2 ring-black/5'
                  : 'border-gray-200 hover:border-gray-400 hover:shadow-lg'
              }`}
              animate={isSearchFocused ? { scale: 1.02 } : { scale: 1 }}
            >
              <Search size={18} className={`ml-4 transition-colors duration-300 ${isSearchFocused ? 'text-black' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="flex-1 bg-transparent outline-none text-sm py-3.5 px-3 text-black placeholder:text-gray-400"
              />
            </motion.div>
          </div>

          <div className="flex flex-wrap gap-3">
            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-5 py-3 bg-white border rounded-2xl text-sm font-medium text-black hover:border-black hover:shadow-lg transition-all duration-300 flex items-center gap-2 group ${showFilters ? 'border-black' : 'border-gray-200'}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Filter size={16} className="group-hover:rotate-12 transition-transform" />
              Filters
            </motion.button>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-black appearance-none cursor-pointer hover:border-black hover:shadow-lg transition-all duration-300 pr-10"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="flex border border-gray-200 rounded-2xl overflow-hidden bg-white">
              <motion.button
                onClick={() => setViewMode('grid')}
                className={`p-3 transition-all duration-300 ${
                  viewMode === 'grid'
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-400 hover:text-black hover:bg-gray-50'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Grid size={18} />
              </motion.button>
              <motion.button
                onClick={() => setViewMode('list')}
                className={`p-3 transition-all duration-300 border-l border-gray-200 ${
                  viewMode === 'list'
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-400 hover:text-black hover:bg-gray-50'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <List size={18} />
              </motion.button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-black text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-black'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Flame, label: 'Flash Deals (30%+ off)', value: stats.flash, bg: 'bg-black' },
            { icon: Sparkles, label: 'New Arrivals', value: stats.newArrivals, bg: 'bg-gray-800' },
            { icon: TrendingUp, label: 'Trending', value: stats.trending, bg: 'bg-gray-700' },
            { icon: Percent, label: 'Clearance (50%+ off)', value: stats.clearance, bg: 'bg-gray-900' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-black hover:shadow-xl transition-all duration-300"
              whileHover={{ y: -4 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-black">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
                <div className={`p-3 ${stat.bg} rounded-xl`}>
                  <stat.icon size={20} className="text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sparkles size={16} className="text-gray-400" />
            <p className="text-sm text-gray-400">
              Showing <span className="text-black font-semibold">{filtered.length}</span> deals
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
            <p className="text-xs text-gray-400">Live Deals</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 border-2 border-gray-200 border-t-black rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Tag size={16} className="text-gray-400" />
                </div>
              </div>
              <p className="text-gray-400 text-sm">Loading deals...</p>
            </div>
          </div>
        ) : error ? (
          <motion.div
            className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border border-gray-200"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="p-6 bg-white rounded-full mb-4">
              <Tag size={56} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-black">Couldn't load deals</h3>
            <p className="text-gray-400 text-sm mt-1">Please try refreshing the page</p>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border border-gray-200"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-6 bg-white rounded-full mb-4">
              <Tag size={56} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-black">No deals found</h3>
            <p className="text-gray-400 text-sm mt-1">
              {deals.length === 0 ? "Check back later for new offers" : "Try a different filter or search"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            className={viewMode === 'grid'
              ? 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
              : 'flex flex-col gap-5'
            }
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filtered.map((product) => (
              <motion.div key={product.id} variants={itemVariants}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DealsPage;
