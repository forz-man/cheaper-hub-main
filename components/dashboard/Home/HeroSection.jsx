"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Package, Store, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

const HeroSection = () => {
  const [query, setQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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

  const imageVariants = {
    animate: {
      y: [0, -20, 0],
      rotate: [0, 5, 0, -5, 0],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const floatingVariants = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.03, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <section className="relative min-h-[65vh] flex items-center overflow-hidden bg-white">
      
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-gray-100 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          
          <motion.div
            variants={containerVariants}
            initial="visible"
            animate="visible"
            className="text-center lg:text-left"
          >
            <motion.div 
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-black/5 rounded-full mb-4 border border-black/10"
            >
              <motion.span 
                className="w-1.5 h-1.5 bg-black rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-[10px] font-semibold text-black/60 tracking-widest uppercase">
                Marketplace for everyone
              </span>
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight mb-3 text-black"
            >
              Buy smart.
              <br />
              <span className="text-gray-700">Sell more.</span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-gray-500 text-sm sm:text-base leading-relaxed mb-5 max-w-lg mx-auto lg:mx-0"
            >
              Sellers list from any platform. Buyers find the best prices. 
              One marketplace, no middlemen.
            </motion.p>

            <motion.form 
              variants={itemVariants}
              onSubmit={handleSearch} 
              className="max-w-lg mx-auto lg:mx-0 mb-5"
            >
              <motion.div 
                className="bg-white border border-gray-200 rounded-full flex items-center shadow-md hover:shadow-lg transition-shadow duration-300 focus-within:ring-2 focus-within:ring-black/10 focus-within:border-black"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", damping: 20 }}
              >
                <Search size={18} className="ml-4 text-gray-400 flex-shrink-0" />
                <input
                  className="flex-1 bg-transparent outline-none text-sm py-3 px-3 text-black placeholder:text-gray-400"
                  placeholder="Search products, brands, stores…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <motion.button 
                  type="submit"
                  className="bg-black text-white px-5 py-2 rounded-full text-sm font-semibold m-1.5 hover:bg-gray-800 transition-all duration-300 flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Search
                  <ArrowRight size={14} />
                </motion.button>
              </motion.div>
            </motion.form>

            <motion.div 
              variants={itemVariants}
              className="flex flex-wrap justify-center lg:justify-start gap-2 mb-5"
            >
              {["Wireless Earbuds", "Sneakers", "Home Decor", "Organic Food"].map((tag, index) => (
                <motion.button 
                  key={tag} 
                  className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] text-gray-600 font-medium hover:border-black hover:text-black hover:shadow-md transition-all duration-300"
                  whileHover={{ scale: 1.05, y: -2 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                >
                  {tag}
                </motion.button>
              ))}
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link 
                  href="/register?role=buyer" 
                  className="group flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-gray-800 transition-all duration-300 hover:shadow-xl hover:shadow-black/20"
                >
                  <Package size={16} />
                  Start shopping
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link 
                  href="/register?role=vendor" 
                  className="group flex items-center justify-center gap-2 bg-white text-black border border-gray-300 px-6 py-3 rounded-full font-semibold text-sm hover:border-black hover:shadow-lg transition-all duration-300"
                >
                  <Store size={16} />
                  Start selling
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div 
            className="hidden lg:flex items-center justify-center"
            variants={imageVariants}
            animate="animate"
          >
            <div className="relative w-full max-w-md">
              <motion.div 
                className="absolute -top-10 -left-10 w-20 h-20 bg-black/5 rounded-full blur-2xl"
                variants={floatingVariants}
                animate="animate"
              />
              <motion.div 
                className="absolute -bottom-10 -right-10 w-20 h-20 bg-black/5 rounded-full blur-2xl"
                variants={floatingVariants}
                animate="animate"
                transition={{ delay: 1 }}
              />
              
              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 overflow-hidden">
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white"
                  variants={pulseVariants}
                  animate="animate"
                />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
                      <span className="text-white font-bold text-sm">C</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-black">Cheaper</p>
                      <p className="text-[10px] text-gray-400">Marketplace</p>
                    </div>
                  </div>
                  
                  <motion.div 
                    className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-200"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package size={20} className="text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-black">Wireless Headphones</p>
                        <p className="text-xs text-gray-400">$49.99</p>
                      </div>
                      <motion.div 
                        className="w-8 h-8 bg-black rounded-full flex items-center justify-center"
                        whileHover={{ scale: 1.1 }}
                      >
                        <ArrowRight size={14} className="text-white" />
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                    whileHover={{ scale: 1.02 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Store size={20} className="text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-black">Premium Seller</p>
                        <p className="text-xs text-gray-400">Verified Store</p>
                      </div>
                      <motion.div 
                        className="w-8 h-8 bg-black rounded-full flex items-center justify-center"
                        whileHover={{ scale: 1.1 }}
                      >
                        <ArrowRight size={14} className="text-white" />
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div 
        className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
       
      </motion.div>
    </section>
  );
};

export default HeroSection;