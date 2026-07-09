"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const HowItWorks = () => {
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

  return (
    <section id="how" className="py-20 px-6 bg-white">
      <div className="container">
        <motion.div 
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold text-black tracking-widest uppercase mb-3">Simple by design</p>
          <h2 className="text-3xl font-extrabold text-black">How it works</h2>
          <p className="text-gray-400 text-sm mt-2">Get started in minutes</p>
        </motion.div>
        
        <motion.div 
          className="grid md:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="bg-gray-50 border border-gray-200 rounded-2xl p-8 hover:border-black transition-all duration-300"
            variants={itemVariants}
            whileHover={{ y: -4 }}
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">For Buyers</p>
            <div className="space-y-7">
              {[
                { n: "01", title: "Create a free account", desc: "Sign up as a buyer in under 30 seconds. No credit card needed." },
                { n: "02", title: "Browse or search", desc: "Find products across thousands of verified sellers, sorted by price." },
                { n: "03", title: "Compare and buy", desc: "See ratings and reviews, compare prices, then buy with confidence." },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex items-start gap-5">
                  <span className="text-xs font-bold text-gray-300 mt-0.5 w-5 flex-shrink-0">{n}</span>
                  <div>
                    <div className="font-semibold text-black text-sm">{title}</div>
                    <div className="text-gray-400 text-xs mt-1 leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Link href="/register?role=buyer" className="inline-flex items-center gap-2 text-sm font-semibold text-black hover:text-gray-600 transition-colors">
                Shop now <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>

          <motion.div 
            className="bg-black border border-gray-800 rounded-2xl p-8 hover:border-gray-600 transition-all duration-300"
            variants={itemVariants}
            whileHover={{ y: -4 }}
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6">For Sellers</p>
            <div className="space-y-7">
              {[
                { n: "01", title: "Create a seller account", desc: "Sign up as a vendor — free, no monthly fees, ever." },
                { n: "02", title: "List your products", desc: "Connect Shopify, WooCommerce, Wix, or WordPress — or upload manually." },
                { n: "03", title: "Receive orders", desc: "Your listings go live to thousands of active buyers immediately." },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex items-start gap-5">
                  <span className="text-xs font-bold text-gray-600 mt-0.5 w-5 flex-shrink-0">{n}</span>
                  <div>
                    <div className="font-semibold text-white text-sm">{title}</div>
                    <div className="text-gray-500 text-xs mt-1 leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-800">
              <Link href="/register?role=vendor" className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-gray-400 transition-colors">
                Start selling <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;