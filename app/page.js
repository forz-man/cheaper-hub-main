"use client";

import CategoriesSection from "@/components/dashboard/Home/CategoriesSection";
import CTASection from "@/components/dashboard/Home/CTASection";
import FeaturedDeals from "@/components/dashboard/Home/FeaturedDeals";
import HeroSection from "@/components/dashboard/Home/HeroSection";
import HowItWorks from "@/components/dashboard/Home/HowItWorks";
import SellSection from "@/components/dashboard/Home/SellSection";
import TrustSection from "@/components/dashboard/Home/TrustSection";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";

const FALLBACK_PRODUCTS = [
  { id: "1", name: "Wireless Earbuds Pro", vendor_name: "TechHub Store", price: 29.99, original_price: 59.99, rating: 4.8, reviews: 342 },
  { id: "2", name: "Linen Throw Blanket", vendor_name: "CozyNest Shop", price: 18.00, original_price: 36.00, rating: 4.9, reviews: 128 },
  { id: "3", name: "Running Shoes X2", vendor_name: "SportZone", price: 44.99, original_price: 89.99, rating: 4.7, reviews: 215 },
  { id: "4", name: "Ceramic Mug Set (4)", vendor_name: "HomeGoods Co.", price: 12.50, original_price: 24.00, rating: 5.0, reviews: 87 },
];

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirect authenticated users straight to their dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error("API error");
        const data = await response.json();
        setProducts(Array.isArray(data) && data.length > 0 ? data : FALLBACK_PRODUCTS);
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts(FALLBACK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Hold rendering while auth is resolving OR while a redirect is in flight.
  // Without the `user` check, the landing page flashes for one frame between
  // "auth resolved" and "router.replace('/dashboard') takes effect".
  if (authLoading || user) return null;

  return (
    <div className="bg-white text-black min-h-screen">
      <main>
        <HeroSection/>
        <FeaturedDeals products={products} loading={loading} />
        <CategoriesSection />
        <SellSection />
        <HowItWorks />
        <TrustSection />
        <CTASection />
      </main>
    </div>
  );
}