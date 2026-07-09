"use client";

import Link from "next/link";
import {
  Monitor, CheckCircle, ArrowRight, Bell, TrendingDown,
  BarChart3, Star, Zap, Search, ShieldCheck,
  Share2, Globe, Smartphone, BadgeCheck,
} from "lucide-react";
import { useState } from "react";

export default function B2CPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="bg-[#f7f9fb] text-[#191c1e] min-h-screen">

      {/* ── Header ── */}
      <header className="fixed top-0 w-full z-50 glass border-b border-white/20 shadow-sm">
        <div className="flex justify-between items-center max-w-[1280px] mx-auto px-4 md:px-10 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#4648d4] flex items-center justify-center">
              <span className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>C</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Cheaper</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link className="text-[#45464d] font-medium text-sm hover:text-[#4648d4] transition-colors" href="/b2b">For Business</Link>
            <Link className="text-[#4648d4] font-semibold text-sm" href="/b2c">For Individuals</Link>
            <a className="text-[#45464d] font-medium text-sm hover:text-[#4648d4] transition-colors" href="#">Flash Deals</a>
          </nav>
          <Link href="/register?role=buyer" className="bg-[#4648d4] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:scale-105 transition-transform">
            Find Deals Free
          </Link>
        </div>
      </header>

      <main>

        {/* ── Hero ── */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#6ffbbe]/40 text-[#005236] rounded-full text-xs font-bold tracking-widest mb-6">
                <Zap size={14} /> FOR INDIVIDUALS
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 tracking-tight" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
                Stop Overpaying.<br />
                <span className="text-[#4648d4]">Start Saving</span><br />
                on Everything.
              </h1>
              <p className="text-[#45464d] text-lg mb-8 max-w-xl">
                Live price alerts, 6-month price history charts, and factory-direct deals — so you always buy at the right time, at the right price.
              </p>

              {/* Search */}
              <div className="glass p-2 rounded-2xl shadow-xl flex items-center border border-white/40 mb-4">
                <Search size={20} className="mx-4 text-[#76777d] flex-shrink-0" />
                <input
                  className="flex-1 bg-transparent border-none outline-none text-sm py-3 placeholder:text-[#76777d]"
                  placeholder="Search any product to track its price..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Link href="/register?role=buyer" className="bg-[#4648d4] text-white px-6 py-3 rounded-xl font-bold text-sm hidden sm:block hover:bg-[#3a3cbf] transition-colors">
                  Track It
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 mb-10">
                <span className="text-sm text-[#45464d] py-1">Popular:</span>
                {["AirPods", "Standing Desk", "Laptop", "Office Chair"].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-[#e6e8ea] rounded-full text-xs font-semibold text-[#45464d] hover:bg-[#4648d4]/10 hover:text-[#4648d4] transition-colors cursor-pointer">{tag}</span>
                ))}
              </div>

              <div className="flex flex-wrap gap-8 border-t border-[#c6c6cd]/30 pt-8">
                <div>
                  <div className="text-2xl font-bold text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>50,000+</div>
                  <div className="text-[#45464d] text-sm">Products Tracked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>$840</div>
                  <div className="text-[#45464d] text-sm">Avg. Annual Savings</div>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck size={20} className="text-[#4edea3]" />
                  <div className="text-[#45464d] text-sm">Verified Deals</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden shadow-2xl">
              <img
                className="w-full h-[420px] object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDg_LaA5mig0XQReFmZkZlO9G3xgtML8QX4LzWFDRsN1DeHE1Swtn9Ro57gu4lcUZ0k8kXC2k7xXgwdW7Sb2XVoBd98-nLK0l--nWlvgCBq-9fdR-CxSQiARyAHhYhMo_dTZ6-19VVSLf9wZVY3HYQWIxH_dbBzS2Py9wylQQ9UsYAyKm0IdMTBKQFMTRz--D949b0ziHbnchVbg4YvqLtWrzeGUzo82p3OASCQxjSgc1CQ7qTJJOnDOmx_62-ce_FuDDNMfDtsXmY1"
                alt="Smart consumer shopping"
              />
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-24 px-4 bg-white">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Smart Tools for Smart Shoppers</h2>
              <p className="text-[#45464d] max-w-2xl mx-auto">Never overpay again. Our tools give you the data you need to buy at the perfect moment.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { Icon: Bell, bg: "bg-[#4648d4]/10", color: "text-[#4648d4]", title: "Live Price Alerts", desc: "Set your target price and get notified instantly when any product drops to it. Never miss a deal." },
                { Icon: BarChart3, bg: "bg-[#6ffbbe]/20", color: "text-[#005236]", title: "6-Month Price History", desc: "See how prices trend over time. Know if today's sale is a genuine deal or a fake discount." },
                { Icon: TrendingDown, bg: "bg-[#131b2e]", color: "text-white", title: "Price Drop Predictions", desc: "Our AI forecasts when prices are likely to drop based on historical patterns and seasonal trends." },
                { Icon: ShieldCheck, bg: "bg-[#4648d4]/10", color: "text-[#4648d4]", title: "Verified Deals", desc: "Every deal is cross-checked across multiple sources. No fake discounts or inflated list prices." },
                { Icon: Star, bg: "bg-[#6ffbbe]/20", color: "text-[#005236]", title: "Wishlist Tracking", desc: "Save items to your wishlist and we'll automatically track prices and send alerts for you." },
                { Icon: Zap, bg: "bg-[#131b2e]", color: "text-white", title: "Flash Deals", desc: "Exclusive limited-time offers from verified sellers. First-come, first-served at below-market prices." },
              ].map(({ Icon, bg, color, title, desc }) => (
                <div key={title} className="p-8 rounded-2xl shadow-sm border border-[#c6c6cd]/20 hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className={`w-14 h-14 ${bg} ${color} rounded-xl flex items-center justify-center mb-6`}>
                    <Icon size={28} />
                  </div>
                  <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>{title}</h3>
                  <p className="text-[#45464d] text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="py-24 px-4 bg-[#eceef0]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Start Saving in 3 Steps</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { n: "1", Icon: Search, title: "Search Any Product", desc: "Enter the product name or model number. We'll find it across hundreds of stores instantly." },
                { n: "2", Icon: Bell, title: "Set Your Price", desc: "Tell us your target price. We'll monitor it 24/7 and send you an alert the moment it drops." },
                { n: "3", Icon: TrendingDown, title: "Buy at the Right Time", desc: "See the full price history, buy with confidence, and never overpay again." },
              ].map(({ n, Icon, title, desc }) => (
                <div key={n} className="text-center p-8 bg-white rounded-2xl shadow-sm border border-[#c6c6cd]/20">
                  <div className="w-16 h-16 bg-[#4648d4] text-white rounded-full flex items-center justify-center font-bold text-2xl mx-auto mb-6" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>{n}</div>
                  <Icon size={28} className="text-[#4648d4] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>{title}</h3>
                  <p className="text-[#45464d] text-sm">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 px-4">
          <div className="max-w-[1280px] mx-auto bg-[#131b2e] rounded-[2rem] p-12 md:p-20 text-center">
            <h2 className="text-white text-3xl md:text-4xl font-bold mb-6" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
              Start Saving Today — It's Free
            </h2>
            <p className="text-[#7c839b] text-base mb-10 max-w-2xl mx-auto">
              Join thousands of smart shoppers who never overpay. Track your first product in under 30 seconds.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/register?role=buyer" className="bg-[#4648d4] text-white px-10 py-5 rounded-2xl font-bold text-sm hover:scale-105 transition-transform">
                Create Free Account
              </Link>
              <Link href="/" className="bg-white/10 text-white px-10 py-5 rounded-2xl font-bold text-sm hover:bg-white/20 transition-all border border-white/10">
                Back to Home
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#e0e3e5] border-t border-[#c6c6cd]">
        <div className="max-w-[1280px] mx-auto px-10 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#4648d4] flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-bold text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Cheaper</span>
          </Link>
          <div className="flex gap-6 text-sm text-[#45464d]">
            <a href="#" className="hover:text-black">Privacy</a>
            <a href="#" className="hover:text-black">Terms</a>
            <Link href="/b2b" className="hover:text-black">For Business</Link>
          </div>
          <div className="flex gap-3">
            <a className="text-[#45464d] hover:text-[#4648d4]" href="#"><Share2 size={18} /></a>
            <a className="text-[#45464d] hover:text-[#4648d4]" href="#"><Globe size={18} /></a>
          </div>
        </div>
      </footer>

    </div>
  );
}
