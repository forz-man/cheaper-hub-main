"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, MessageCircle, LogOut, User, Menu, X,
  ShoppingBag, Heart, Bell, Home, Package, Store,
  Tag, HelpCircle, Settings, ChevronDown, ShoppingCart,
  TrendingUp, Sparkles, Layers, Megaphone,
  BadgePercent, AlertCircle, CheckCircle2, XCircle
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import useNotifications from "@/hooks/useNotifications";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart-context";
import { dashboardTabHref } from "@/lib/auth";
import { GrDashboard } from "react-icons/gr";
import { label } from "framer-motion/client";

function formatNotifTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  return "Earlier";
}

function AwardIcon({ size = 20, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

function ChevronDownIcon({ size = 20, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function Navbar() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { count: cartCount, openCart } = useCart();
  const metadataRole = user?.user_metadata?.role || user?.app_metadata?.role || null;
  const [profileRole, setProfileRole] = useState(null);
  const userRole = profileRole || metadataRole;

  // Always fetch the latest role from the profiles table so that admin
  // role changes are reflected immediately (the JWT may still carry the
  // old user_metadata.role until the next token refresh).
  useEffect(() => {
    if (!user?.id || !supabase) return;
    let cancelled = false;
    supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data }) => {
      if (!cancelled && data?.role) setProfileRole(data.role);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const {
    items: notifItems,
    unreadMessages,
    unreadCount: notifUnreadCount,
    markAllSeen,
    markMessageRead,
    markAsRead,
  } = useNotifications(user?.id, userRole);
  const [wishlistCount, setWishlistCount] = useState(3);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeLink, setActiveLink] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const mobileMenuRef = useRef(null);


  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || window.pageYOffset;
          setScrolled(scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
       
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/marketplace?q=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery("");
    }
  };

  // "Sell" is only shown to visitors who haven't signed up yet.
  // Buyers don't need it (they're buyers). Vendors are already selling.
  const navLinks = [
    { label: "Home",        href: "/",           icon: Home,         id: "home"        },
    { label: "Marketplace", href: "/marketplace", icon: Package,      id: "marketplace" },
    { label: "Deals",       href: "/deals",       icon: BadgePercent, id: "deals"       },
    { label: "Contact",     href: "/contact",     icon: Megaphone,    id: "contact"     },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 w-full z-50 transition-colors duration-300 ${
          scrolled
            ? 'bg-white shadow-lg border-b border-gray-200'
            : 'bg-white border-b border-gray-100'
        }`}
      >
        <div className="container">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-[72px]">

 
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 md:gap-3 group flex-shrink-0">
              <div className="relative">
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg bg-black flex items-center justify-center shadow-md shadow-black/20">
                  <span className="text-white font-bold text-xs sm:text-sm md:text-lg tracking-tight">C</span>
                </div>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-sm sm:text-base md:text-xl tracking-tight text-black">
                  Cheaper
                </span>
                <span className="hidden xs:inline-block ml-1 text-[6px] sm:text-[7px] md:text-[8px] font-bold text-white bg-black px-1 sm:px-1.5 md:px-2 py-0.5 rounded-full">
                  BETA
                </span>
                <TrendingUp size={10} className="hidden sm:inline-block ml-0.5 md:ml-1 text-green-500" />
              </div>
            </Link>

  
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 ml-2 xl:ml-4">
              {navLinks.map(({ label, href, id, icon: Icon }) => (
                <Link
                  key={id}
                  href={href}
                  onClick={() => setActiveLink(id)}
                  className={`relative px-2 xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-medium rounded-lg whitespace-nowrap ${
                    activeLink === id
                      ? 'text-black bg-gray-100'
                      : 'text-gray-500 hover:text-black hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-1 xl:gap-1.5">
                    <Icon size={14} className={activeLink === id ? 'text-black' : 'text-gray-400'} />
                    <span className="hidden xl:inline">{label}</span>
                  </span>
                  {activeLink === id && (
                    <span className="absolute bottom-0 left-1/2 w-4 xl:w-6 h-0.5 bg-black -translate-x-1/2"></span>
                  )}
                </Link>
              ))}
            </nav>

      
            <div className="hidden xl:flex flex-1 max-w-xs 2xl:max-w-sm mx-4">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-full overflow-hidden focus-within:border-black focus-within:ring-1 focus-within:ring-black">
                  <Search size={16} className="ml-3 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm py-2 px-2 text-black placeholder:text-gray-400 min-w-[80px]"
                    placeholder="Search products..."
                  />
                  <button 
                    type="submit"
                    className="mr-1 px-3 py-1 bg-black text-white text-xs font-medium rounded-full hover:bg-gray-800 flex-shrink-0"
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>

      
            <div className="flex items-center gap-0.5 sm:gap-1 md:gap-1.5 xl:gap-2">

              {user ? (
                <>
         
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="xl:hidden p-1.5 sm:p-2 rounded-full hover:bg-gray-100"
                  >
                    <Search size={18} className="text-gray-600 sm:w-5 sm:h-5" />
                  </button>

                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={() => {
                        const opening = !showNotifDropdown;
                        setShowNotifDropdown(opening);
                        setShowDropdown(false);
                        if (opening) markAllSeen();
                      }}
                      className="relative p-1.5 sm:p-2 rounded-full hover:bg-gray-100"
                    >
                      <Bell size={20} className="text-gray-600 sm:w-5 sm:h-5 md:w-[22px] md:h-[22px]" />
                      {notifUnreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></span>
                      )}
                    </button>

                    {showNotifDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifDropdown(false)}></div>
                        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-black"></div>
                          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <p className="text-sm font-semibold text-black">Notifications</p>
                            {notifItems.length > 0 && (
                              <button onClick={markAllSeen} className="text-[11px] font-medium text-gray-400 hover:text-black">
                                Mark all read
                              </button>
                            )}
                          </div>
                          <div className="max-h-96 overflow-y-auto">
                            {notifItems.length === 0 ? (
                              <div className="px-4 py-10 text-center">
                                <Bell size={22} className="text-gray-300 mx-auto mb-2" />
                                <p className="text-xs text-gray-400">You&apos;re all caught up</p>
                              </div>
                            ) : (
                              notifItems.slice(0, 5).map((item) => {
                                const Icon = item.type === "message" ? MessageCircle : item.type === "payout" || item.type === "payout_release" ? AwardIcon : item.type === "product_pending" ? AlertCircle : item.type === "product_approved" ? CheckCircle2 : item.type === "product_rejected" ? XCircle : Package;
                                const isProductType = ["product_pending", "product_approved", "product_rejected"].includes(item.type);
                                const iconBg = item.unread && isProductType
                                  ? { product_pending: "bg-amber-50 text-amber-600", product_approved: "bg-emerald-50 text-emerald-600", product_rejected: "bg-red-50 text-red-600" }[item.type]
                                  : item.unread ? "bg-black text-white" : "bg-gray-50 text-gray-400";
                                return (
                                  <button
                                    key={item.id}
                                    onClick={async () => {
                                      setShowNotifDropdown(false);
                                      if (item.type === "message") {
                                        await markMessageRead(item.id.replace("message-", ""));
                                      } else if (item.dbId && item.unread) {
                                        await markAsRead(item.dbId);
                                      }
                                      if (item.href && item.href !== "#") router.push(item.href);
                                    }}
                                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0"
                                  >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                                      <Icon size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs truncate ${item.unread ? "font-bold text-black" : "font-medium text-gray-700"}`}>{item.title}</p>
                                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.body}</p>
                                      <p className="text-[10px] text-gray-300 mt-0.5">{formatNotifTime(item.timestamp)}</p>
                                    </div>
                                    {item.unread && <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>}
                                  </button>
                                );
                              })
                            )}
                          </div>
                          <Link
                            href="/notifications"
                            onClick={() => setShowNotifDropdown(false)}
                            className="block text-center text-xs font-semibold text-black py-2.5 border-t border-gray-100 hover:bg-gray-50"
                          >
                            View all
                          </Link>
                        </div>
                      </>
                    )}
                  </div>

              
                  {userRole !== "vendor" && userRole !== "admin" && (
                    <Link href={dashboardTabHref(userRole, "wishlist")} className="relative p-1.5 sm:p-2 rounded-full hover:bg-gray-100 hidden sm:flex">
                      <div className="relative">
                        <Heart size={20} className="text-gray-600 sm:w-5 sm:h-5 md:w-[22px] md:h-[22px]" />
                        {wishlistCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] bg-red-500 text-white text-[7px] sm:text-[8px] md:text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                            {wishlistCount > 9 ? '9+' : wishlistCount}
                          </span>
                        )}
                      </div>
                    </Link>
                  )}

                  <button onClick={openCart} className="relative p-1.5 sm:p-2 rounded-full hover:bg-gray-100">
                    <div className="relative">
                      <ShoppingCart size={20} className="text-gray-600 sm:w-5 sm:h-5 md:w-[22px] md:h-[22px]" />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] bg-black text-white text-[7px] sm:text-[8px] md:text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                          {cartCount > 9 ? '9+' : cartCount}
                        </span>
                      )}
                    </div>
                  </button>

                 
                  <Link href="/messages" className="relative p-1.5 sm:p-2 rounded-full hover:bg-gray-100 hidden sm:flex">
                    <div className="relative">
                      <MessageCircle size={20} className="text-gray-600 sm:w-5 sm:h-5 md:w-[22px] md:h-[22px]" />
                      {unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] bg-black text-white text-[7px] sm:text-[8px] md:text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                          {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                      )}
                    </div>
                  </Link>

         
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => { setShowDropdown(!showDropdown); setShowNotifDropdown(false); }}
                      className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-full hover:bg-gray-100 border-2 border-transparent hover:border-black/20"
                    >
                      <div className="relative">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-black flex items-center justify-center text-white text-[10px] sm:text-xs md:text-sm font-bold shadow-md">
                          {user?.name?.[0] || user?.email?.[0] || "U"}
                          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                      </div>
                      <ChevronDownIcon size={12} className={`text-gray-400 ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>

          
                    {showDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
                        <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white border border-gray-200 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-black"></div>

                          <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-md">
                                {user?.name?.[0] || user?.email?.[0] || "U"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-black truncate">
                                  {user?.name || "User"}
                                </p>
                                <p className="text-[10px] sm:text-xs text-gray-500 truncate max-w-[80px] sm:max-w-[150px]">
                                  {user?.email}
                                </p>
                              </div>
                            </div>
                            <div className="mt-1.5 sm:mt-2 flex items-center gap-1">
                              <AwardIcon size={10} className="text-yellow-500" />
                              <span className="text-[8px] sm:text-[10px] font-semibold text-yellow-600 bg-yellow-50 px-1.5 sm:px-2 py-0.5 rounded-full">
                                Premium
                              </span>
                            </div>
                          </div>

                          <div className="py-1">
                            {[
                              { icon: User, label: "Profile", href: dashboardTabHref(userRole, "overview") },
                              { icon: GrDashboard, label: "Dashboard", href: dashboardTabHref(userRole) },
                              { icon: ShoppingBag, label: "Orders", href: dashboardTabHref(userRole, "orders") },
                              ...(userRole !== "vendor" && userRole !== "admin"
                                ? [{ icon: Heart, label: "Wishlist", href: dashboardTabHref(userRole, "wishlist"), badge: wishlistCount }]
                                : []),
                              { icon: ShoppingCart, label: "Cart", action: () => { setShowDropdown(false); openCart(); }, badge: cartCount },
                              { icon: MessageCircle, label: "Messages", href: "/messages", badge: unreadMessages },
                              { icon: Settings, label: "Settings", href: dashboardTabHref(userRole, "settings") },
                            ].map(({ icon: Icon, label, href, badge, action }) => {
                              const cls = "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-600 hover:bg-gray-50 hover:text-black w-full text-left";
                              const inner = (
                                <>
                                  <Icon size={14} className="text-gray-400" />
                                  <span>{label}</span>
                                  {badge && badge > 0 && (
                                    <span className="ml-auto bg-black text-white text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full">
                                      {badge}
                                    </span>
                                  )}
                                </>
                              );
                              return action ? (
                                <button key={label} onClick={action} className={cls}>{inner}</button>
                              ) : (
                                <Link key={label} href={href} className={cls} onClick={() => setShowDropdown(false)}>{inner}</Link>
                              );
                            })}
                          </div>

                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1"
                          >
                            <LogOut size={14} className="text-red-400" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
            
                <div className="flex items-center gap-1 sm:gap-2">
                  <Link
                    href="/login"
                    className="hidden sm:block text-xs sm:text-sm font-medium text-gray-600 hover:text-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-gray-100"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/select-role"
                    className="bg-black text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold hover:bg-gray-800 whitespace-nowrap"
                  >
                    Get started
                  </Link>
                </div>
              )}

          
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-1.5 sm:p-2 rounded-full hover:bg-gray-100 relative"
              >
                <div className="relative">
                  {isMobileMenuOpen ? (
                    <X size={20} className="text-black sm:w-5 sm:h-5" />
                  ) : (
                    <Menu size={20} className="text-black sm:w-5 sm:h-5" />
                  )}
                  {(unreadMessages > 0 || notifUnreadCount > 0) && !isMobileMenuOpen && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full"></span>
                  )}
                </div>
              </button>
            </div>
          </div>

      
          {showSearch && (
            <div className="lg:hidden py-2 border-t border-gray-100">
              <form onSubmit={handleSearch} className="relative">
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full overflow-hidden focus-within:border-black focus-within:ring-1 focus-within:ring-black">
                  <Search size={16} className="ml-3 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm py-2.5 px-2 text-black placeholder:text-gray-400 min-w-[60px]"
                    placeholder="Search products..."
                    autoFocus
                  />
                  <button 
                    type="submit"
                    className="mr-1 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-full hover:bg-gray-800 flex-shrink-0"
                  >
                    Go
                  </button>
                </div>
              </form>
            </div>
          )}

    
          {isMobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 top-[56px] sm:top-[64px] md:top-[72px] z-40 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
              <div 
                className="absolute right-0 top-0 w-full max-w-sm h-full bg-white overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                ref={mobileMenuRef}
              >
                <div className="py-3 px-3 space-y-1">
                  <div className="grid grid-cols-2 gap-1">
                    {navLinks.map(({ label, href, id, icon: Icon }) => (
                      <Link
                        key={id}
                        href={href}
                        className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium ${
                          activeLink === id
                            ? 'text-black bg-gray-100'
                            : 'text-gray-600 hover:text-black hover:bg-gray-50'
                        } rounded-lg`}
                        onClick={() => {
                          setActiveLink(id);
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Icon size={14} className={activeLink === id ? 'text-black' : 'text-gray-400'} />
                        {label}
                      </Link>
                    ))}
                  </div>

                 
                  <div className="border-t border-gray-200 mt-2 pt-2">
                    <div className="grid grid-cols-4 gap-1">
                      <Link
                        href={dashboardTabHref(userRole, "wishlist")}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex flex-col items-center gap-0.5 py-2 rounded-lg hover:bg-gray-50 ${userRole === "vendor" || userRole === "admin" ? "hidden" : ""}`}
                      >
                        <Heart size={20} className="text-gray-600" />
                        <span className="text-[8px] text-gray-400">Wishlist</span>
                      </Link>
                      <button onClick={() => { setIsMobileMenuOpen(false); openCart(); }} className="flex flex-col items-center gap-0.5 py-2 rounded-lg hover:bg-gray-50 relative">
                        <ShoppingCart size={20} className="text-gray-600" />
                        {cartCount > 0 && (
                          <span className="absolute -top-0.5 -right-1 min-w-[16px] h-[16px] bg-black text-white text-[8px] font-bold rounded-full flex items-center justify-center px-1">
                            {cartCount}
                          </span>
                        )}
                        <span className="text-[8px] text-gray-400">Cart</span>
                      </button>
                      <Link href="/messages" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center gap-0.5 py-2 rounded-lg hover:bg-gray-50 relative">
                        <MessageCircle size={20} className="text-gray-600" />
                        {unreadMessages > 0 && (
                          <span className="absolute -top-0.5 -right-1 min-w-[16px] h-[16px] bg-black text-white text-[8px] font-bold rounded-full flex items-center justify-center px-1">
                            {unreadMessages}
                          </span>
                        )}
                        <span className="text-[8px] text-gray-400">Messages</span>
                      </Link>
                      <Link href="/notifications" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center gap-0.5 py-2 rounded-lg hover:bg-gray-50 relative">
                        <Bell size={20} className="text-gray-600" />
                        {notifUnreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        )}
                        <span className="text-[8px] text-gray-400">Alerts</span>
                      </Link>
                    </div>
                  </div>

                  {!user && (
                    <div className="pt-2 space-y-2 border-t border-gray-200 mt-2">
                      <Link
                        href="/login"
                        className="block px-3 py-2.5 text-xs font-medium text-center text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/select-role"
                        className="block px-3 py-2.5 text-xs font-semibold text-center text-white bg-black rounded-lg hover:bg-gray-800"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Get started
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}