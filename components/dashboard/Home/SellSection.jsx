"use client";

import Link from "next/link";
import { ArrowRight, Globe, Upload, ShieldCheck, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const integrations = [
  { name: "Shopify", bg: "#96bf48", initial: "S" },
  { name: "WooCommerce", bg: "#7f54b3", initial: "W" },
  { name: "Wix", bg: "#1a1a1a", initial: "W" },
  { name: "WordPress", bg: "#21759b", initial: "W" },
];

const SellSection = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
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
    <section id="sell" className="py-20 px-6 bg-black">
      <div className="container">
        <motion.div 
          className="grid lg:grid-cols-2 gap-16 items-start"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-5">For Sellers</p>
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-5">
              Your store, your products, <br />your buyers.
            </h2>
            <p className="text-gray-400 text-base leading-relaxed mb-10">
              Connect your existing store in seconds or list products manually. Either way, your items reach thousands of active buyers immediately.
            </p>

            <div className="space-y-5 mb-10">
              {[
                { icon: Globe, title: "Connect your store", sub: "Shopify, WooCommerce, Wix, WordPress — one-click sync" },
                { icon: Upload, title: "Manual upload", sub: "No store? Add products one by one or via CSV" },
                { icon: ShieldCheck, title: "Get verified", sub: "Verification badge builds trust and increases conversions" },
                { icon: TrendingUp, title: "Grow your revenue", sub: "Reach buyers who are actively looking for what you sell" },
              ].map(({ icon: Icon, title, sub }) => (
                <motion.div 
                  key={title} 
                  className="flex items-start gap-4 group cursor-default"
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:border-white/30 transition-colors">
                    <Icon size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">{title}</div>
                    <div className="text-gray-500 text-xs mt-0.5 leading-relaxed">{sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <Link href="/register?role=vendor" className="inline-flex items-center gap-2 bg-white text-black px-7 py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-all duration-300 hover:shadow-xl hover:shadow-white/10">
              Start selling free <ArrowRight size={15} />
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-5">Connect your store</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {integrations.map(({ name, bg, initial }) => (
                <motion.div 
                  key={name} 
                  className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-3 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: bg }}>
                    {initial}
                  </div>
                  <span className="text-white text-sm font-medium">{name}</span>
                </motion.div>
              ))}
            </div>
            <motion.div 
              className="bg-white/5 border border-dashed border-white/15 rounded-xl p-5 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
                <Upload size={15} className="text-gray-400" />
              </div>
              <div>
                <div className="text-white text-sm font-medium">Manual upload</div>
                <div className="text-gray-500 text-xs mt-0.5">No store needed — add products directly</div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default SellSection;