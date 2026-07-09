"use client";

import { Monitor, Shirt, Sofa, Utensils, Dumbbell, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

const categories = [
  { Icon: Monitor, label: "Electronics", count: "12,400+" },
  { Icon: Shirt, label: "Fashion", count: "8,200+" },
  { Icon: Sofa, label: "Home & Living", count: "6,800+" },
  { Icon: Utensils, label: "Food & Bev", count: "3,100+" },
  { Icon: Dumbbell, label: "Sports", count: "4,500+" },
  { Icon: BookOpen, label: "Books", count: "9,700+" },
];

const CategoriesSection = () => {
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
    <section id="categories" className="py-16 px-6 bg-white">
      <div className="container">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-black">Shop by Category</h2>
            <p className="text-sm text-gray-400 mt-1">Find what you're looking for</p>
          </div>
        </div>
        
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {categories.map(({ Icon, label, count }) => (
            <motion.button 
              key={label} 
              className="group bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-black hover:shadow-xl transition-all duration-300 text-center"
              variants={itemVariants}
              whileHover={{ y: -4 }}
            >
              <div className="p-3 bg-gray-50 rounded-full group-hover:bg-black transition-colors duration-300">
                <Icon size={28} className="text-gray-500 group-hover:text-white transition-colors duration-300" />
              </div>
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