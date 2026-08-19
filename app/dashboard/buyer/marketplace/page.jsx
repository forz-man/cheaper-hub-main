"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Search, Package, Star, Heart, X,
  ShoppingBag, Monitor, Shirt, Sofa, Utensils, Dumbbell,
  BookOpen, Globe, Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart-context";
import { mergeVendorProfiles } from "@/lib/vendor-display";

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Electronics", value: "Electronics", Icon: Monitor },
  { label: "Fashion", value: "Fashion", Icon: Shirt },
  { label: "Home", value: "Home", Icon: Sofa },
  { label: "Kitchen", value: "Kitchen", Icon: Utensils },
  { label: "Sports", value: "Sports", Icon: Dumbbell },
  { label: "Books", value: "Books", Icon: BookOpen },
  { label: "Other", value: "Other", Icon: Globe },
];

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low → High", value: "price_asc" },
  { label: "Price: High → Low", value: "price_desc" },
];

function pct(price, original) {
  if (!original || original <= price) return null;
  return Math.round((1 - price / original) * 100);
}

export default function MarketplacePage() {
  const router = useRouter();
  const { addItem, count, openCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [fromDb, setFromDb] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [maxPrice, setMaxPrice] = useState(500);
  const [wishlist, setWishlist] = useState([]);
  const [addedMap, setAddedMap] = useState({});

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    let q = supabase
      .from("products")
      .select("id, name, vendor_id, vendor_name, price, original_price, category, stock, status, images")
      .eq("approval_status", "approved")
      .eq("status", "active");

    if (category) q = q.eq("category", category);
    if (maxPrice < 500) q = q.lte("price", maxPrice);

    if (sort === "price_asc") q = q.order("price", { ascending: true });
    else if (sort === "price_desc") q = q.order("price", { ascending: false });
    else q = q.order("created_at", { ascending: false });

    const { data, error } = await q;

    if (!error) {
      const vendorIds = [...new Set(data.map((product) => product.vendor_id).filter(Boolean))];
      const { data: profiles } = vendorIds.length
        ? await supabase
            .from("profiles")
            .select("id, store_name, full_name, avatar_url")
            .in("id", vendorIds)
        : { data: [] };
      let liveProducts = mergeVendorProfiles(data, profiles || []);
      const normalizedSearch = search.trim().toLowerCase();
      if (normalizedSearch) {
        liveProducts = liveProducts.filter((product) =>
          [product.name, product.vendor_name, product.category]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch))
        );
      }
      setFromDb(true);
      setProducts(liveProducts);
    } else {
      setFromDb(false);
      setProducts([]);
    }
    setProductsLoading(false);
  }, [search, category, sort, maxPrice]);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(loadProducts, 300);
      return () => clearTimeout(t);
    }
  }, [loadProducts, loading]);

  const handleAddToCart = (product) => {
    addItem(product, 1);
    setAddedMap(m => ({ ...m, [product.id]: true }));
    setTimeout(() => setAddedMap(m => ({ ...m, [product.id]: false })), 1800);
    openCart();
  };

  const toggleWishlist = (product) => {
    setWishlist(w =>
      w.find(x => x.id === product.id) ? w.filter(x => x.id !== product.id) : [...w, product]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f3ef]">
        <Loader2 size={20} className="animate-spin text-[#ccc]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef]" style={{ fontFamily: "var(--font-inter), sans-serif" }}>

      <header className="bg-white border-b border-[#e2ddd6] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/buyer" className="flex items-center gap-1.5 text-sm text-[#888] hover:text-[#111] transition-colors">
              <ArrowLeft size={15} /> Dashboard
            </Link>
            <span className="text-[#ddd]">|</span>
            <span className="font-bold text-sm text-[#111]" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
              Marketplace
            </span>
            {fromDb && (
              <span className="hidden sm:block text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                Live
              </span>
            )}
          </div>
          <button
            onClick={openCart}
            className="relative w-9 h-9 rounded-lg bg-[#f5f3ef] border border-[#e2ddd6] flex items-center justify-center hover:border-[#999] transition-colors"
          >
            <ShoppingBag size={16} className="text-[#555]" />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#111] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 md:px-8 py-6">

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1 bg-white border border-[#e2ddd6] rounded-lg flex items-center focus-within:ring-2 focus-within:ring-[#4648d4]/20 transition-all">
            <Search size={15} className="mx-3 text-[#ccc] flex-shrink-0" />
            <input
              className="flex-1 text-sm py-2.5 outline-none text-[#111] placeholder:text-[#bbb]"
              placeholder="Search products, brands, sellers…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="mr-3 text-[#bbb] hover:text-[#888]">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="bg-white border border-[#e2ddd6] rounded-lg px-3 py-2 text-sm text-[#555] outline-none hover:border-[#999] cursor-pointer transition-colors"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <div className="bg-white border border-[#e2ddd6] rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-[#555]">
              <span className="text-xs text-[#999] hidden sm:block">Max $</span>
              <span className="font-semibold text-[#111] w-10 text-center text-xs">
                {maxPrice >= 500 ? "Any" : `$${maxPrice}`}
              </span>
              <input
                type="range" min={10} max={500} step={10}
                value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                className="w-20 accent-[#111]"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 [-ms-overflow-style:none] [scrollbar-width:none]">
          {CATEGORIES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setCategory(v => v === value ? "" : value)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                category === value
                  ? "bg-[#111] text-white border-[#111]"
                  : "bg-white text-[#555] border-[#e2ddd6] hover:border-[#999]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-[#888]">
            {productsLoading ? "Loading…" : (
              <>
                <span className="font-semibold text-[#111]">{products.length}</span> {products.length === 1 ? "product" : "products"}
                {search && <> matching <span className="font-semibold text-[#111]">&quot;{search}&quot;</span></>}
                {category && <> in <span className="font-semibold text-[#111]">{category}</span></>}
              </>
            )}
          </p>
          {(search || category || maxPrice < 500) && (
            <button
              onClick={() => { setSearch(""); setCategory(""); setMaxPrice(500); }}
              className="text-xs text-[#4648d4] font-semibold hover:underline flex items-center gap-1"
            >
              <X size={11} /> Clear filters
            </button>
          )}
        </div>

        {productsLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={22} className="animate-spin text-[#ccc]" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <Package size={32} className="text-[#ccc] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#888] mb-1">No products found</p>
            <p className="text-xs text-[#bbb] mb-4">Try adjusting your search or filters</p>
            <button
              onClick={() => { setSearch(""); setCategory(""); setMaxPrice(500); }}
              className="text-xs font-semibold text-[#4648d4] hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((product) => {
              const discount = pct(product.price, product.original_price);
              const inWishlist = wishlist.find(w => w.id === product.id);
              const added = addedMap[product.id];
              return (
                <div key={product.id} className="bg-white border border-[#e2ddd6] rounded-xl overflow-hidden hover:border-[#999] hover:shadow-md transition-all flex flex-col">
                  <div className="h-36 bg-[#f9f8f6] relative flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {(product.image || product.image_url || product.images?.[0]) ? (
                      <img src={product.image || product.image_url || product.images?.[0]} alt={product.name} className="w-full h-full object-contain p-3" />
                    ) : (
                      <Package size={30} className="text-[#ddd]" />
                    )}
                    {discount && (
                      <span className="absolute top-2 left-2 bg-[#111] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        {discount}% off
                      </span>
                    )}
                    <button
                      onClick={() => toggleWishlist(product)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white border border-[#e2ddd6] flex items-center justify-center hover:border-[#999] transition-colors"
                    >
                      <Heart size={11} className={inWishlist ? "text-red-500 fill-red-500" : "text-[#aaa]"} />
                    </button>
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <p className="text-[10px] text-[#999] font-medium mb-0.5 truncate">{product.vendor_name || "Marketplace"}</p>
                    <h3 className="font-semibold text-xs text-[#111] mb-1.5 leading-snug line-clamp-2 flex-1">{product.name}</h3>
                    {product.rating > 0 && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <Star size={10} className="text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-bold text-[#111]">{product.rating}</span>
                        {product.reviews > 0 && <span className="text-[#bbb] text-[10px]">({product.reviews})</span>}
                      </div>
                    )}
                    <div className="flex items-baseline gap-1 mb-2.5">
                      <span className="font-bold text-[#111] text-sm">${parseFloat(product.price).toFixed(2)}</span>
                      {product.original_price && product.original_price > product.price && (
                        <span className="text-[#bbb] text-[10px] line-through">${parseFloat(product.original_price).toFixed(2)}</span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          added ? "bg-emerald-500 text-white" : "bg-[#111] text-white hover:bg-[#333]"
                        }`}
                      >
                        {added ? "Added ✓" : "Add to cart"}
                      </button>
                      <Link
                        href={`/products/${product.id}`}
                        className="w-8 h-[30px] border border-[#e2ddd6] rounded-lg flex items-center justify-center text-[#888] hover:border-[#999] hover:text-[#111] transition-colors text-xs"
                      >
                        →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
