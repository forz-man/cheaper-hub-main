"use client";

import { ShieldCheck, Star, CheckCircle, Truck, Headphones, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

const TrustSection = () => {
  const trustItems = [
    { Icon: ShieldCheck, title: "Verified sellers", desc: "Every seller goes through our verification process before going live." },
    { Icon: Star, title: "Real reviews", desc: "Authentic buyer reviews on every product. No fake ratings." },
    { Icon: CheckCircle, title: "Buyer protection", desc: "Payments held securely until you confirm your order arrived." },
    { Icon: Truck, title: "Fast delivery", desc: "Track your order in real-time from purchase to delivery." },
    { Icon: Headphones, title: "24/7 Support", desc: "Our support team is always here to help you." },
    { Icon: RefreshCw, title: "Easy returns", desc: "Hassle-free returns within 30 days of purchase." },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
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
    <section className="py-16 px-6 bg-gray-50 border-t border-gray-200">
      <div className="container">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-black">Why Choose Cheaper?</h2>
          <p className="text-sm text-gray-400 mt-1">Trusted by thousands of buyers and sellers</p>
        </motion.div>

        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {trustItems.map(({ Icon, title, desc }) => (
            <motion.div 
              key={title} 
              className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-gray-200 hover:border-black hover:shadow-xl transition-all duration-300"
              variants={itemVariants}
              whileHover={{ y: -4 }}
            >
              <div className="p-2 bg-black rounded-lg flex-shrink-0">
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-black text-sm mb-1">{title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;