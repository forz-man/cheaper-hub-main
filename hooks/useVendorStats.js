import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const initialStats = {
  listings: 0,
  inventory: 0,
  deals: 0,
  revenue: 0,
  loading: true,
};

export default function useVendorStats(vendorId) {
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;

    async function loadStats() {
      setStats((current) => ({ ...current, loading: true }));

      const [productsResult, orderItemsResult] = await Promise.all([
        supabase
          .from("products")
          .select("stock, status, approval_status, price, original_price")
          .eq("vendor_id", vendorId),
        supabase
          .from("order_items")
          .select("subtotal")
          .eq("vendor_id", vendorId),
      ]);

      if (cancelled) return;

      const products = productsResult.data || [];
      const orderItems = orderItemsResult.data || [];
      const liveProducts = products.filter(
        (product) =>
          product.status === "active" &&
          product.approval_status !== "rejected" &&
          product.approval_status !== "pending"
      );

      setStats({
        listings: products.length,
        inventory: liveProducts.reduce(
          (total, product) => total + Math.max(0, Number(product.stock) || 0),
          0
        ),
        deals: products.filter(
          (product) =>
            Number(product.original_price) > Number(product.price) &&
            Number(product.original_price) > 0
        ).length,
        revenue: orderItems.reduce(
          (total, item) => total + (Number(item.subtotal) || 0),
          0
        ),
        loading: false,
      });
    }

    loadStats().catch((error) => {
      console.warn("Unable to load live vendor stats:", error);
      if (!cancelled) setStats((current) => ({ ...current, loading: false }));
    });

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  return stats;
}