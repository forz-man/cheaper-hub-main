"use client";

import { Monitor, Shirt, Sofa, Utensils, Dumbbell, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

import useReducedMotion from "@/hooks/useReducedMotion";

const categories = [
  { Icon: Monitor, label: "Electronics", count: "12,400+" },
  { Icon: Shirt, label: "Fashion", count: "8,200+" },
  { Icon: Sofa, label: "Home & Living", count: "6,800+" },
  { Icon: Utensils, label: "Food & Bev", count: "3,100+" },
  { Icon: Dumbbell, label: "Sports", count: "4,500+" },
  { Icon: BookOpen, label: "Books", count: "9,700+" },
];

const CategoriesSection = () => {
  const shouldReduceMotion = useReducedMotion();

  // Staggers the entrance from left to right
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.12,
        delayChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  // 1. Entrance: Slides in smoothly from the left (x: -40 -> x: 0)
  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        damping: 18,
        stiffness: 90,
      },
    },
  };

  return (
    <section id="categories" className="py-16 px-6 bg-white">
      <div className="container mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-black">Shop by Category</h2>
            <p className="text-sm text-gray-400 mt-1">Find what you&apos;re looking for</p>
          </div>
        </div>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {categories.map(({ Icon, label, count }, index) => (
             <motion.button
              key={label}
              variants={itemVariants}
              whileTap={{ scale: 0.96 }}
              whileHover={shouldReduceMotion ? {} : { y: -8, scale: 1.05, boxShadow: "0 15px 30px rgba(0,0,0,0.08)" }}
              className="group bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-black transition-all duration-300 text-center cursor-pointer outline-none"
            >
              <motion.div 
                className="p-3 bg-gray-50 rounded-full group-hover:bg-black transition-colors duration-300"
                animate={shouldReduceMotion ? {} : {
                  y: [0, -4, 0],
                }}
                whileTap={shouldReduceMotion ? {} : { scale: 1.15 }}
                transition={{
                  y: {
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                    delay: index * 0.2,
                  },
                  scale: { type: "spring", stiffness: 350, damping: 10 }
                }}
              >
                <Icon
                  size={28}
                  className="text-gray-500 group-hover:text-white transition-colors duration-300"
                />
              </motion.div>
              <div>
                <div className="text-sm font-semibold text-black">{label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{count} items</div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default CategoriesSection;