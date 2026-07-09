"use client";

import Link from "next/link";
import {
  Building2, CheckCircle, ArrowRight, BarChart3,
  ShieldCheck, Package, TrendingUp, Users, FileText,
  Headphones, Globe, Share2, Rss, Smartphone,
} from "lucide-react";

export default function B2BPage() {
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
            <Link className="text-[#4648d4] font-semibold text-sm" href="/b2b">For Business</Link>
            <Link className="text-[#45464d] font-medium text-sm hover:text-[#4648d4] transition-colors" href="/b2c">For Individuals</Link>
            <a className="text-[#45464d] font-medium text-sm hover:text-[#4648d4] transition-colors" href="#">Support</a>
          </nav>
          <Link href="/register?role=vendor" className="bg-[#4648d4] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:scale-105 transition-transform">
            Start for Free
          </Link>
        </div>
      </header>

      <main>

        {/* ── Hero ── */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#4648d4]/10 text-[#4648d4] rounded-full text-xs font-bold tracking-widest mb-6">
                <Building2 size={14} /> BUSINESS SOLUTIONS
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 tracking-tight" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
                Bulk Procurement<br />
                <span className="text-[#4648d4]">Made Simple.</span>
              </h1>
              <p className="text-[#45464d] text-lg mb-8 max-w-xl">
                Instant RFQ engine, verified supplier network, enterprise pricing, and dedicated account management — everything your business needs to source smarter.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/register?role=buyer" className="flex items-center justify-center gap-2 bg-[#4648d4] text-white px-8 py-4 rounded-xl font-bold text-sm shadow-lg shadow-[#4648d4]/20 hover:scale-105 transition-transform">
                  Access B2B Portal <ArrowRight size={16} />
                </Link>
                <a href="#features" className="flex items-center justify-center gap-2 bg-white text-[#4648d4] border-2 border-[#4648d4]/20 px-8 py-4 rounded-xl font-bold text-sm hover:bg-[#4648d4]/5 transition-colors">
                  See How It Works
                </a>
              </div>
              <div className="flex flex-wrap gap-8 border-t border-[#c6c6cd]/30 pt-8">
                {[["10,000+", "Verified Suppliers"], ["$25M+", "Procurement Processed"], ["18%", "Avg. Cost Reduction"]].map(([val, label]) => (
                  <div key={label}>
                    <div className="text-2xl font-bold text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>{val}</div>
                    <div className="text-[#45464d] text-sm">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl overflow-hidden shadow-2xl">
              <img
                className="w-full h-[420px] object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVeFs_nafYFfCc8HWl4kuK_KKC2FBX0ZZy4YSACfiQXPSPckOFov2_aMqeAnTd8CgKXF7Rm9JPJhgXWNXAvbkUWNYRcXE_ERoLSsRiDurnn0H6D-pYig-pIa7iKLAfAYdNEJYnbDhlyQfFVlkUVvYq1B_m_SbqMjKD4_Jou6D89MTKVsX1neJOahOuBXMPOjxshmXHhDIMiwphJDDKy5EkDK3Tea4ycWEq70mgc2oKsrbAwErumUuxsXQ0Yf7-y0BAMfNpf2feaSzH"
                alt="Industrial warehouse procurement"
              />
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-24 px-4 bg-white">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Built for Enterprise Procurement</h2>
              <p className="text-[#45464d] max-w-2xl mx-auto">Every feature designed to cut costs, reduce lead times, and give you full visibility into your supply chain.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { Icon: FileText, bg: "bg-[#4648d4]/10", color: "text-[#4648d4]", title: "Instant RFQ Engine", desc: "Send quote requests to multiple suppliers simultaneously and compare responses in one place." },
                { Icon: ShieldCheck, bg: "bg-[#6ffbbe]/20", color: "text-[#005236]", title: "Verified Suppliers", desc: "Every supplier is pre-vetted. View certifications, reviews, and compliance documents before buying." },
                { Icon: BarChart3, bg: "bg-[#131b2e]", color: "text-white", title: "Spend Analytics", desc: "Real-time dashboards showing category spend, supplier performance, and savings opportunities." },
                { Icon: Package, bg: "bg-[#4648d4]/10", color: "text-[#4648d4]", title: "Bulk Pricing Tiers", desc: "Automatic volume discounts applied at checkout — from 10 units to 10,000." },
                { Icon: Users, bg: "bg-[#6ffbbe]/20", color: "text-[#005236]", title: "Team Accounts", desc: "Multi-user access with role-based permissions and approval workflows for your procurement team." },
                { Icon: Headphones, bg: "bg-[#131b2e]", color: "text-white", title: "Dedicated Support", desc: "A dedicated account manager for enterprise accounts. Priority SLA for all business customers." },
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

        {/* ── Checklist ── */}
        <section className="py-24 px-4">
          <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block px-4 py-1 bg-[#4648d4]/10 text-[#4648d4] rounded-full text-xs font-bold tracking-widest mb-6">WHY CHEAPER B2B</div>
              <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Everything Your Procurement Team Needs</h2>
              <ul className="space-y-5">
                {[
                  "Instant Request for Quote (RFQ) engine for custom bulk pricing",
                  "Tax-exempt purchasing profiles for verified enterprises",
                  "Dedicated account management for large-scale operations",
                  "ERP & procurement software integrations",
                  "Multi-currency and global supplier network",
                  "Compliance documentation and audit trails",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle size={20} className="text-[#4648d4] flex-shrink-0 mt-0.5" />
                    <span className="text-[#45464d] text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register?role=buyer" className="inline-flex items-center gap-2 mt-10 bg-black text-white px-8 py-4 rounded-xl font-bold text-sm hover:scale-105 transition-transform">
                Access B2B Portal <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: "48hr", label: "Average RFQ turnaround" },
                { val: "500+", label: "Verified global suppliers" },
                { val: "18%", label: "Average cost savings" },
                { val: "99.9%", label: "Platform uptime SLA" },
              ].map(({ val, label }) => (
                <div key={label} className="p-8 bg-white rounded-2xl shadow-sm border border-[#c6c6cd]/20 text-center">
                  <div className="text-3xl font-bold text-[#4648d4] mb-2" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>{val}</div>
                  <div className="text-[#45464d] text-sm">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 px-4">
          <div className="max-w-[1280px] mx-auto bg-[#131b2e] rounded-[2rem] p-12 md:p-20 text-center">
            <h2 className="text-white text-3xl md:text-4xl font-bold mb-6" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
              Ready to Optimize Your Procurement?
            </h2>
            <p className="text-[#7c839b] text-base mb-10 max-w-2xl mx-auto">
              Join 10,000+ businesses already saving with Cheaper's B2B marketplace.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/register?role=buyer" className="bg-[#4648d4] text-white px-10 py-5 rounded-2xl font-bold text-sm hover:scale-105 transition-transform">
                Get Started Free
              </Link>
              <button className="bg-white/10 text-white px-10 py-5 rounded-2xl font-bold text-sm hover:bg-white/20 transition-all border border-white/10">
                Talk to Sales
              </button>
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
            <Link href="/b2c" className="hover:text-black">For Individuals</Link>
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
