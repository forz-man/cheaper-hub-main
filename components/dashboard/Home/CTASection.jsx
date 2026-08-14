"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const CTASection = () => {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="container">
        <motion.div 
          className="border border-gray-200 rounded-3xl p-12 md:p-16 text-center bg-gray-50 cursor-default"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
          whileHover={{ y: -8, scale: 1.015, borderColor: "#000000", boxShadow: "0 25px 50px rgba(0,0,0,0.06)" }}
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-black mb-4">
            Ready to join the <br className="sm:hidden" />
            <span className="text-gray-700">marketplace?</span>
          </h2>
          <p className="text-gray-400 text-base mb-10 max-w-md mx-auto">
            Free to get started. Takes less than two minutes. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                href="/register?role=buyer" 
                className="inline-flex items-center justify-center bg-black text-white px-9 py-4 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-all duration-300 hover:shadow-xl hover:shadow-black/20"
              >
                Start shopping
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                href="/register?role=vendor" 
                className="inline-flex items-center justify-center bg-white text-black border border-gray-300 px-9 py-4 rounded-xl font-semibold text-sm hover:border-black hover:shadow-xl transition-all duration-300"
              >
                Start selling
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;