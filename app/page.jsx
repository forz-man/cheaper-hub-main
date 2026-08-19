"use client";

import CategoriesSection from "@/components/dashboard/Home/CategoriesSection";
import CTASection from "@/components/dashboard/Home/CTASection";
import FeaturedDeals from "@/components/dashboard/Home/FeaturedDeals";
import HeroSection from "@/components/dashboard/Home/HeroSection";
import HowItWorks from "@/components/dashboard/Home/HowItWorks";
import SellSection from "@/components/dashboard/Home/SellSection";
import TrustSection from "@/components/dashboard/Home/TrustSection";
import { useState, useEffect } from "react";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const fetchPromise = fetch("/api/products?surface=todays-deals").then(async (response) => {
          if (!response.ok) throw new Error("Failed to load products");
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 3000)
        );

        const data = await Promise.race([fetchPromise, timeoutPromise]);
        if (isMounted) setProducts(data);
      } catch (err) {
        console.warn("Unable to load live products:", err);
        if (isMounted) setProducts([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="bg-white text-black min-h-screen">
      <main className="pt-14 sm:pt-16 md:pt-[72px]">
        <HeroSection />
        <HowItWorks />
        <FeaturedDeals products={products} loading={loading} />
        <CategoriesSection />
        <SellSection />
        <TrustSection />
        <CTASection />
      </main>
    </div>
  );
}
