"use client";

import CategoriesSection from "@/components/dashboard/Home/CategoriesSection";
import FeaturedDeals from "@/components/dashboard/Home/FeaturedDeals";
import HeroSection from "@/components/dashboard/Home/HeroSection";
import { useState, useEffect } from "react";

const FALLBACK_PRODUCTS = [
  { id: "1", name: "Wireless Earbuds Pro", vendor_name: "TechHub Store", price: 29.99, original_price: 59.99, rating: 4.8, reviews: 342 },
  { id: "2", name: "Linen Throw Blanket", vendor_name: "CozyNest Shop", price: 18.00, original_price: 36.00, rating: 4.9, reviews: 128 },
  { id: "3", name: "Running Shoes X2", vendor_name: "SportZone", price: 44.99, original_price: 89.99, rating: 4.7, reviews: 215 },
  { id: "4", name: "Ceramic Mug Set (4)", vendor_name: "HomeGoods Co.", price: 12.50, original_price: 24.00, rating: 5.0, reviews: 87 },
];

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const fetchPromise = (async () => {
          const response = await fetch('/api/products');
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              return data;
            }
          }
          return FALLBACK_PRODUCTS;
        })();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 3000)
        );

        const data = await Promise.race([fetchPromise, timeoutPromise]);
        if (isMounted) setProducts(data);
      } catch (err) {
        console.warn("Tunnel fetch delayed, rendering fallback UI:", err);
        if (isMounted) setProducts(FALLBACK_PRODUCTS);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="bg-white text-black min-h-screen">
      <main>
        <HeroSection />
        <FeaturedDeals products={products} loading={loading} />
        <CategoriesSection />
      </main>
    </div>
  );
}
