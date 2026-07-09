import Link from "next/link";

export default function AuthShell({ children }) {
  return (
    <main className="min-h-screen bg-[#f5f3ef] flex items-center justify-center px-4 py-8" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="w-full max-w-5xl bg-white rounded-2xl border border-[#e2ddd6] shadow-sm overflow-hidden grid lg:grid-cols-2">

        {/* Left panel */}
        <section className="hidden lg:flex bg-[#111] text-white p-10 flex-col justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center">
              <span className="text-white font-bold text-xs" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>C</span>
            </div>
            <span className="font-bold text-base" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Cheaper</span>
          </Link>

          <div>
            <p className="text-xs font-semibold text-[#555] tracking-widest uppercase mb-5">The marketplace for everyone</p>
            <h1 className="text-4xl font-extrabold leading-tight mb-5" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
              Buy smart.<br />Sell more.
            </h1>
            <p className="text-[#666] text-sm leading-relaxed max-w-xs">
              Sellers list from any platform — Shopify, WooCommerce, Wix, or manually. Buyers find the best prices. One marketplace.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { val: "50k+", label: "Products" },
              { val: "8.2k+", label: "Sellers" },
              { val: "120k+", label: "Buyers" },
            ].map(({ val, label }) => (
              <div key={label} className="rounded-xl bg-white/5 border border-white/8 p-4">
                <p className="text-lg font-bold" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>{val}</p>
                <p className="text-[#555] text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Right panel */}
        <section className="flex items-center justify-center p-7 sm:p-10">
          {children}
        </section>
      </div>
    </main>
  );
}
