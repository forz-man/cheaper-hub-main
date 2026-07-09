"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, ShoppingBag, Heart, Settings, LogOut,
  Package, Star, ArrowUpRight, ChevronRight,
  X, CheckCircle, Truck, Clock, Store, Loader2,
  Search, ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logout } from "@/lib/auth";

const mockWishlist = [
  { id: "5", name: "Standing Desk Pro", seller: "WorkSpace Co.", price: 249.99, was: 349.99, rating: 4.7, reviews: 203 },
  { id: "6", name: "Air Purifier HEPA", seller: "CleanAir Shop", price: 89.00, was: 129.00, rating: 4.9, reviews: 87 },
  { id: "7", name: "Leather Wallet Slim", seller: "Craft & Co.", price: 34.00, was: 54.00, rating: 4.6, reviews: 145 },
  { id: "8", name: "Smart Plug (4-pack)", seller: "TechHub Store", price: 19.99, was: 29.99, rating: 4.8, reviews: 412 },
];

const statusConfig = {
  delivered: { label: "Delivered", color: "text-emerald-700 bg-emerald-50 border-emerald-100", Icon: CheckCircle },
  shipped:   { label: "Shipped",   color: "text-blue-700 bg-blue-50 border-blue-100",         Icon: Truck       },
  processing:{ label: "Processing",color: "text-amber-700 bg-amber-50 border-amber-100",       Icon: Clock       },
  cancelled: { label: "Cancelled", color: "text-red-700 bg-red-50 border-red-100",             Icon: X           },
};

const navItems = [
  { id: "overview", label: "Overview",  Icon: LayoutDashboard },
  { id: "orders",   label: "My Orders", Icon: ShoppingBag     },
  { id: "wishlist", label: "Wishlist",  Icon: Heart           },
  { id: "settings", label: "Settings",  Icon: Settings        },
];

function pct(price, original) {
  if (!original || original <= price) return null;
  return Math.round((1 - price / original) * 100);
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function BuyerDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState(mockWishlist);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersFilter, setOrdersFilter] = useState("all");

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const role = profile?.role || user.user_metadata?.role;
      if (role !== "buyer") { router.replace("/dashboard"); return; }

      setUser(user);
      setLoading(false);
      loadOrders(user.id);
    }
    checkAuth();
  }, [router]);

  async function loadOrders(uid) {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, status, total, created_at, order_items(product_name, vendor_name, qty, price)")
      .eq("buyer_id", uid)
      .order("created_at", { ascending: false });

    if (!error && data) setOrders(data);
    setOrdersLoading(false);
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const removeFromWishlist = (id) => setWishlist(w => w.filter(item => item.id !== id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f3ef]">
        <div className="text-[#888] text-sm">Loading your dashboard…</div>
      </div>
    );
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Buyer";
  const initials = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const deliveredCount = orders.filter(o => o.status === "delivered").length;
  const totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

  const filteredOrders = ordersFilter === "all"
    ? orders
    : orders.filter(o => o.status === ordersFilter);

  return (
    <div className="min-h-screen bg-[#f5f3ef] flex" style={{ fontFamily: "var(--font-inter), sans-serif" }}>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-60 bg-white border-r border-[#e2ddd6] flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#e2ddd6] flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#111] flex items-center justify-center">
              <span className="text-white font-bold text-xs" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>C</span>
            </div>
            <span className="font-bold text-base" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Cheaper</span>
          </Link>
          <button className="lg:hidden text-[#888]" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-0.5">
            {navItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === id
                    ? "bg-[#111] text-white"
                    : "text-[#555] hover:bg-[#f5f3ef] hover:text-[#111]"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
            <Link
              href="/dashboard/buyer/marketplace"
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-[#555] hover:bg-[#f5f3ef] hover:text-[#111]"
            >
              <Search size={16} />
              Marketplace
              <ExternalLink size={11} className="ml-auto text-[#ccc]" />
            </Link>
          </div>
        </nav>

        <div className="border-t border-[#e2ddd6] p-3 flex-shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-[#111] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#111] truncate">{displayName}</div>
              <div className="text-[10px] text-[#aaa] truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#888] hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">

        <div className="lg:hidden h-14 bg-white border-b border-[#e2ddd6] flex items-center justify-between px-5 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-[#555]">
            <LayoutDashboard size={20} />
          </button>
          <span className="font-semibold text-sm text-[#111] capitalize">{activeTab}</span>
          <div className="w-6" />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-5 md:px-8 py-8">

            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && (
              <div>
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-[#111]" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
                    Welcome back, {displayName.split(" ")[0]}
                  </h1>
                  <p className="text-sm text-[#888] mt-1">Your shopping activity at a glance</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: "Orders placed",  value: ordersLoading ? "…" : String(orders.length), sub: "All time",         Icon: ShoppingBag  },
                    { label: "Items delivered", value: ordersLoading ? "…" : String(deliveredCount), sub: "Completed",      Icon: CheckCircle  },
                    { label: "Saved items",    value: String(wishlist.length), sub: "In your wishlist",                      Icon: Heart        },
                    { label: "Total spent",    value: ordersLoading ? "…" : `$${totalSpent.toFixed(2)}`, sub: "All orders",  Icon: Store        },
                  ].map(({ label, value, sub, Icon }) => (
                    <div key={label} className="bg-white border border-[#e2ddd6] rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-[#888]">{label}</span>
                        <Icon size={15} className="text-[#ccc]" />
                      </div>
                      <div className="text-2xl font-bold text-[#111]" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>{value}</div>
                      <div className="text-xs text-[#aaa] mt-1">{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Recent orders */}
                <div className="bg-white border border-[#e2ddd6] rounded-xl mb-5">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2ddd6]">
                    <h2 className="text-sm font-semibold text-[#111]">Recent orders</h2>
                    <button onClick={() => setActiveTab("orders")} className="text-xs text-[#4648d4] font-medium hover:underline flex items-center gap-1">
                      View all <ChevronRight size={13} />
                    </button>
                  </div>
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={18} className="animate-spin text-[#ccc]" />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <Package size={24} className="text-[#ccc] mx-auto mb-2" />
                      <p className="text-sm text-[#888]">No orders yet</p>
                      <p className="text-xs text-[#bbb] mt-1">Start shopping on the marketplace</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#f0ede8]">
                      {orders.slice(0, 3).map((order) => {
                        const sc = statusConfig[order.status] || statusConfig.processing;
                        const firstItem = order.order_items?.[0];
                        return (
                          <div key={order.id} className="flex items-center justify-between px-5 py-3.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-[#f5f3ef] border border-[#e2ddd6] flex items-center justify-center flex-shrink-0">
                                <Package size={14} className="text-[#ccc]" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[#111] truncate">
                                  {firstItem?.product_name || "Order"}
                                  {order.order_items?.length > 1 && (
                                    <span className="text-[#aaa] font-normal"> +{order.order_items.length - 1} more</span>
                                  )}
                                </div>
                                <div className="text-xs text-[#aaa]">{firstItem?.vendor_name || "Marketplace"} · {formatDate(order.created_at)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="font-semibold text-sm text-[#111]">${parseFloat(order.total).toFixed(2)}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { label: "Browse marketplace", sub: "Shop thousands of products from verified sellers", icon: Search, action: () => router.push("/dashboard/buyer/marketplace") },
                    { label: "My wishlist",         sub: `${wishlist.length} saved items`,                  icon: Heart,  action: () => setActiveTab("wishlist") },
                    { label: "All orders",          sub: "Track your recent purchases",                     icon: ShoppingBag, action: () => setActiveTab("orders") },
                  ].map(({ label, sub, icon: Icon, action }) => (
                    <button key={label} onClick={action} className="bg-white border border-[#e2ddd6] rounded-xl p-5 flex items-start gap-4 hover:border-[#999] transition-colors group text-left">
                      <div className="w-9 h-9 rounded-lg bg-[#f5f3ef] flex items-center justify-center flex-shrink-0">
                        <Icon size={16} className="text-[#555]" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#111]">{label}</div>
                        <div className="text-xs text-[#aaa] mt-0.5">{sub}</div>
                      </div>
                      <ArrowUpRight size={14} className="text-[#ccc] ml-auto group-hover:text-[#111] transition-colors mt-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── ORDERS ── */}
            {activeTab === "orders" && (
              <div>
                <h1 className="text-2xl font-bold text-[#111] mb-6" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>My Orders</h1>

                <div className="flex gap-1 bg-white border border-[#e2ddd6] rounded-lg p-1 mb-5 w-fit">
                  {[
                    { label: "All",        value: "all"        },
                    { label: "Processing", value: "processing" },
                    { label: "Shipped",    value: "shipped"    },
                    { label: "Delivered",  value: "delivered"  },
                  ].map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => setOrdersFilter(value)}
                      className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        ordersFilter === value ? "bg-[#111] text-white" : "text-[#555] hover:bg-[#f5f3ef] hover:text-[#111]"
                      }`}
                    >
                      {label}
                      {value !== "all" && (
                        <span className={`ml-1.5 text-[9px] ${ordersFilter === value ? "opacity-70" : "text-[#bbb]"}`}>
                          {orders.filter(o => o.status === value).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {ordersLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 size={20} className="animate-spin text-[#ccc]" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-16">
                    <Package size={28} className="text-[#ccc] mx-auto mb-3" />
                    <p className="text-sm font-semibold text-[#888] mb-1">
                      {ordersFilter === "all" ? "No orders yet" : `No ${ordersFilter} orders`}
                    </p>
                    <p className="text-xs text-[#bbb] mb-5">
                      {ordersFilter === "all" ? "Your orders will appear here after checkout" : "Nothing to show for this status"}
                    </p>
                    <button
                      onClick={() => router.push("/dashboard/buyer/marketplace")}
                      className="bg-[#111] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors"
                    >
                      Browse marketplace
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.map((order) => {
                      const sc = statusConfig[order.status] || statusConfig.processing;
                      const StatusIcon = sc.Icon;
                      const firstItem = order.order_items?.[0];
                      return (
                        <div key={order.id} className="bg-white border border-[#e2ddd6] rounded-xl p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 min-w-0">
                              <div className="w-12 h-12 rounded-lg bg-[#f5f3ef] border border-[#e2ddd6] flex items-center justify-center flex-shrink-0">
                                <Package size={18} className="text-[#ccc]" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-[#111] text-sm truncate">
                                  {firstItem?.product_name || "Order"}
                                  {order.order_items?.length > 1 && (
                                    <span className="text-[#aaa] font-normal text-xs"> +{order.order_items.length - 1} item{order.order_items.length > 2 ? "s" : ""}</span>
                                  )}
                                </div>
                                <div className="text-xs text-[#aaa] mt-0.5">{firstItem?.vendor_name || "Marketplace"}</div>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.color}`}>
                                    <StatusIcon size={10} /> {sc.label}
                                  </span>
                                  <span className="text-[10px] text-[#bbb]">{formatDate(order.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className="font-bold text-[#111] text-sm">${parseFloat(order.total).toFixed(2)}</div>
                              <div className="text-[10px] text-[#bbb] font-mono mt-1">#{order.id.slice(0, 8)}</div>
                            </div>
                          </div>
                          {order.order_items?.length > 1 && (
                            <div className="mt-3 pt-3 border-t border-[#f0ede8] space-y-1">
                              {order.order_items.slice(1).map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs text-[#888]">
                                  <span className="truncate">{item.product_name} × {item.qty}</span>
                                  <span className="flex-shrink-0 ml-4">${parseFloat(item.price * item.qty).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── WISHLIST ── */}
            {activeTab === "wishlist" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-[#111]" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Wishlist</h1>
                  <span className="text-sm text-[#888]">{wishlist.length} {wishlist.length === 1 ? "item" : "items"}</span>
                </div>

                {wishlist.length === 0 ? (
                  <div className="text-center py-20">
                    <Heart size={32} className="text-[#ccc] mx-auto mb-4" />
                    <p className="text-sm font-semibold text-[#888] mb-1">Your wishlist is empty</p>
                    <p className="text-xs text-[#bbb] mb-5">Save products you love and come back to them later</p>
                    <button
                      onClick={() => router.push("/dashboard/buyer/marketplace")}
                      className="bg-[#111] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors"
                    >
                      Browse marketplace
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {wishlist.map((item) => {
                      const discount = pct(item.price, item.was);
                      return (
                        <div key={item.id} className="bg-white border border-[#e2ddd6] rounded-xl p-5 flex gap-4">
                          <div className="w-16 h-16 rounded-lg bg-[#f5f3ef] border border-[#e2ddd6] flex items-center justify-center flex-shrink-0">
                            <Package size={20} className="text-[#ccc]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-[#999] mb-0.5 font-medium truncate">{item.seller}</div>
                            <div className="font-semibold text-sm text-[#111] mb-1 leading-snug truncate">{item.name}</div>
                            <div className="flex items-center gap-1 mb-2">
                              <Star size={10} className="text-amber-500 fill-amber-500" />
                              <span className="text-[10px] font-bold text-[#111]">{item.rating}</span>
                              <span className="text-[#bbb] text-[10px]">({item.reviews})</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-bold text-[#111] text-sm">${item.price.toFixed(2)}</span>
                                {item.was && <span className="text-[#bbb] text-xs line-through">${item.was.toFixed(2)}</span>}
                                {discount && <span className="text-emerald-600 text-[10px] font-semibold">{discount}% off</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <button onClick={() => removeFromWishlist(item.id)} className="text-[#bbb] hover:text-red-500 transition-colors">
                              <X size={15} />
                            </button>
                            <Link
                              href={`/products/${item.id}`}
                              className="text-[10px] font-semibold text-[#4648d4] hover:underline mt-auto"
                            >
                              View →
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── SETTINGS ── */}
            {activeTab === "settings" && (
              <div>
                <h1 className="text-2xl font-bold text-[#111] mb-6" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Settings</h1>
                <div className="space-y-4">
                  {[
                    { title: "Full name",     desc: "Your name shown on orders and reviews",      value: displayName    },
                    { title: "Email address", desc: "Used for order confirmations and account access", value: user?.email },
                  ].map(({ title, desc, value }) => (
                    <div key={title} className="bg-white border border-[#e2ddd6] rounded-xl p-5 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-[#111] mb-0.5">{title}</div>
                        <div className="text-xs text-[#aaa]">{desc}</div>
                        <div className="text-sm text-[#555] mt-2 font-medium">{value}</div>
                      </div>
                      <button className="text-xs font-semibold text-[#4648d4] hover:underline flex-shrink-0">Edit</button>
                    </div>
                  ))}

                  <div className="bg-white border border-[#e2ddd6] rounded-xl p-5">
                    <div className="text-sm font-semibold text-[#111] mb-0.5">Password</div>
                    <div className="text-xs text-[#aaa] mb-3">Update your account password</div>
                    <button className="text-xs font-semibold text-[#4648d4] hover:underline">Change password</button>
                  </div>

                  <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                    <div className="text-sm font-semibold text-red-700 mb-0.5">Danger zone</div>
                    <div className="text-xs text-red-400 mb-3">Permanently delete your account and all data</div>
                    <button className="text-xs font-semibold text-red-600 hover:underline">Delete account</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
