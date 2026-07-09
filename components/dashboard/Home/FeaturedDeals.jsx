"use client";

import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import ProductCard from "@/components/ProductCard";


const FeaturedDeals = ({ products, loading }) => {
  return (
    <section className="py-16 px-6 bg-gray-50 border-t border-b border-gray-200">
      <div className="container">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-black">Today's Deals</h2>
            <p className="text-sm text-gray-400 mt-1">Curated daily by our team</p>
          </div>
          <a href="#" className="flex items-center gap-1 text-sm font-semibold text-black hover:text-gray-600 transition-colors">
            View all <ChevronRight size={15} />
          </a>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-400">Loading products...</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedDeals;