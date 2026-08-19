"use client";

import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";


const FeaturedDeals = ({ products, loading }) => {
  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gray-50 border-t border-b border-gray-200">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-black">Today&apos;s Deals</h2>
            <p className="text-sm text-gray-400 mt-1">Curated daily by our team</p>
          </div>
          <Link href="/deals" className="flex items-center gap-1 text-sm font-semibold text-black hover:text-gray-600 transition-colors">
            View all <ChevronRight size={15} />
          </Link>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-400">Loading products...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            No live deals available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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