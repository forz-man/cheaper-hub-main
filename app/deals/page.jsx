"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Tag, Clock, TrendingUp, Zap, Sparkles, 
  ChevronDown, Search, Filter, Grid, List,
  ShoppingBag, Heart, Star, Eye, Package,
  ArrowRight, Percent, Flame, Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '@/components/ProductCard';

const DealsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('discount');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all', label: 'All Deals', icon: Tag },
    { id: 'flash', label: 'Flash Sales', icon: Zap },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'new', label: 'New Arrivals', icon: Sparkles },
    { id: 'clearance', label: 'Clearance', icon: Percent },
  ];

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'fashion', label: 'Fashion' },
    { id: 'home', label: 'Home & Living' },
    { id: 'food', label: 'Food & Beverages' },
    { id: 'sports', label: 'Sports' },
  ];

  const sortOptions = [
    { value: 'discount', label: 'Biggest Discount' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most Popular' },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        const dealsData = data.map(product => ({
          ...product,
          discount: Math.floor(Math.random() * 40) + 10,
          isFlashSale: Math.random() > 0.7,
          timeLeft: Math.floor(Math.random() * 12) + 1,
        }));
        setProducts(dealsData);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 100
      }
    }
  };

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
              {products.length} deals
            </span>
          </div>
          <p className="text-gray-400 text-sm">Don't miss out on these amazing discounts</p>
        </motion.div>

        <motion.div 
          className="flex flex-wrap gap-2 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {tabs.map((tab) => (
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
              <kbd className="hidden sm:inline-block mr-3 px-2 py-1 text-[10px] font-semibold text-gray-400 bg-gray-50 rounded border border-gray-200">
                ⌘K
              </kbd>
            </motion.div>
          </div>

          <div className="flex flex-wrap gap-3">
            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              className="px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-black hover:border-black hover:shadow-lg transition-all duration-300 flex items-center gap-2 group"
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
                {sortOptions.map((option) => (
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Flame, label: 'Flash Deals', value: '12', bg: 'bg-black' },
            { icon: Gift, label: 'Today Only', value: '48', bg: 'bg-gray-800' },
            { icon: Clock, label: 'Ending Soon', value: '6', bg: 'bg-gray-700' },
            { icon: TrendingUp, label: 'Top Picks', value: '24', bg: 'bg-gray-900' },
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
              Showing <span className="text-black font-semibold">{products.length}</span> deals
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
        ) : products.length === 0 ? (
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
            <p className="text-gray-400 text-sm mt-1">Check back later for new offers</p>
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
            {products.map((product) => (
              <motion.div key={product.id} variants={itemVariants}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && products.length > 0 && (
          <motion.div 
            className="flex justify-center items-center gap-2 mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.button 
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-black hover:text-black hover:shadow-lg transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Previous
            </motion.button>
            <motion.button 
              className="px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-lg shadow-black/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              1
            </motion.button>
            <motion.button 
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-black hover:text-black hover:shadow-lg transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              2
            </motion.button>
            <motion.button 
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-black hover:text-black hover:shadow-lg transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              3
            </motion.button>
            <span className="text-gray-400 text-sm px-2">...</span>
            <motion.button 
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-black hover:text-black hover:shadow-lg transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              10
            </motion.button>
            <motion.button 
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-black hover:text-black hover:shadow-lg transition-all duration-300 flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Next
              <ChevronDown size={14} className="rotate-[-90deg]" />
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DealsPage;