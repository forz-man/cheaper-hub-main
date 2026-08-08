"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";
import {
  Leaf,
  Wind,
  Droplets,
  Sun,
  Recycle,
  Globe,
  TreePine,
  Factory,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Zap,
  Award,
  TrendingUp,
  BarChart3,
  Handshake,
  Star,
  ArrowRight,
  Check,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Count-up hook — animates from 0 to `to`
   ───────────────────────────────────────────── */
function useCountUp(to, duration = 2, shouldStart = false) {
  const spring = useSpring(0, { duration: duration * 1000, bounce: 0 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!shouldStart) return;
    spring.set(to);
  }, [shouldStart, to, spring]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      if (Number.isInteger(to)) {
        setDisplay(Math.round(v).toLocaleString());
      } else {
        setDisplay(v.toFixed(1));
      }
    });
    return unsub;
  }, [spring, to]);

  return display;
}

/* ─── Individual stat counter ─── */
function StatCounter({ value, suffix = "", prefix = "", label, decimal = false }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const numericValue = parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;
  const count = useCountUp(numericValue, 2, inView);

  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl sm:text-4xl font-bold text-black mb-1.5 tabular-nums">
        {prefix}{count}{suffix}
      </p>
      <p className="text-xs text-gray-400 leading-snug max-w-[120px] mx-auto">{label}</p>
    </div>
  );
}

/* ─── Section fade-up wrapper ─── */
const FadeUp = ({ children, delay = 0, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
  >
    {children}
  </motion.div>
);

/* ─── Data ─── */
const PILLARS = [
  {
    icon: Wind,
    color: "bg-blue-50 text-blue-600",
    title: "Climate action",
    body: "Every shipment brokered through Cheaper is tracked and offset through certified reforestation and renewable-energy programmes.",
  },
  {
    icon: Recycle,
    color: "bg-emerald-50 text-emerald-600",
    title: "Circular economy",
    body: "Re-selling is inherently sustainable. Every pre-owned item sold is one fewer product that needs to be manufactured.",
  },
  {
    icon: Droplets,
    color: "bg-cyan-50 text-cyan-600",
    title: "Pollution reduction",
    body: "We favour vendors using recycled or minimal packaging and surface 'eco-packaged' listings so buyers choose with confidence.",
  },
  {
    icon: Sun,
    color: "bg-amber-50 text-amber-600",
    title: "Clean energy",
    body: "Our infrastructure runs on providers with verified renewable commitments. Target: 100% renewable operations by 2027.",
  },
  {
    icon: TreePine,
    color: "bg-green-50 text-green-600",
    title: "Biodiversity",
    body: "A share of every platform fee funds biodiversity projects — wetland restoration, native planting, and ocean conservation.",
  },
  {
    icon: Factory,
    color: "bg-violet-50 text-violet-600",
    title: "Responsible sourcing",
    body: "New-goods vendors must meet our Responsible Sourcing Standard covering labour, material provenance, and emissions disclosures.",
  },
];

const EVERCOVE_DELIVERABLES = [
  "Annual independent ESG audit & public report",
  "Vendor supply-chain emissions screening",
  "Science-based targets aligned with 1.5 °C pathway",
  "GRI & SASB Multiline Retail disclosure framework",
  "Biodiversity-positive investment guidance",
  "Quarterly progress reviews & corrective action plans",
];

const ESG_SCORES = [
  { label: "Environmental", score: 87, color: "bg-emerald-500", track: "bg-emerald-100" },
  { label: "Social",        score: 79, color: "bg-blue-500",    track: "bg-blue-100"    },
  { label: "Governance",    score: 91, color: "bg-violet-500",  track: "bg-violet-100"  },
];

/* ─── ESG bar with count-up score ─── */
function ESGBar({ label, score, color, track }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const spring = useSpring(0, { duration: 1400, bounce: 0 });
  const width = useTransform(spring, (v) => `${v}%`);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    spring.set(score);
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return unsub;
  }, [inView, score, spring]);

  return (
    <div ref={ref} className="mb-5 last:mb-0">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-black">{label}</span>
        <span className="text-sm font-bold text-black tabular-nums">{display} <span className="text-gray-400 font-normal">/ 100</span></span>
      </div>
      <div className={`h-2.5 ${track} rounded-full overflow-hidden`}>
        <motion.div className={`h-full rounded-full ${color}`} style={{ width }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Page
   ═══════════════════════════════════════════ */
export default function SustainabilityPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20">

      {/* ── Hero ── */}
      <section className="bg-white border-b border-gray-200 overflow-hidden relative">
        {/* subtle grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* green glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <FadeUp>
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
                <Leaf size={12} />
                Our commitment to the planet
              </div>
            </FadeUp>

            <FadeUp delay={0.07}>
              <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-bold text-black leading-tight mb-5 tracking-tight">
                Commerce that<br />
                <span className="text-emerald-600">cares for tomorrow</span>
              </h1>
            </FadeUp>

            <FadeUp delay={0.14}>
              <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">
                We believe the cheapest price should never come at the cost of the planet.
                Sustainability is built into every decision we make — from how vendors are
                onboarded to how every shipment is offset.
              </p>
            </FadeUp>

            <FadeUp delay={0.2}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="/marketplace"
                  className="inline-flex items-center justify-center gap-2 bg-black text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  <Leaf size={15} />
                  Shop sustainably
                </a>
                <a
                  href="https://evercove.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-black text-sm font-semibold px-6 py-3 rounded-xl hover:border-black hover:shadow-lg transition-all"
                >
                  Our ESG partner <ExternalLink size={13} className="text-gray-400" />
                </a>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            <StatCounter value={12000}  suffix="+"  label="tonnes of CO₂ avoided through re-sale" />
            <StatCounter value={1000000} prefix="" suffix="+" label="items diverted from landfill" />
            <StatCounter value={40}     suffix="%" label="lower carbon footprint vs. buying new" />
            <StatCounter value={2027}   suffix=""  label="target year for net-zero operations" />
          </div>
        </div>
      </section>

      {/* ── Our philosophy ── */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <FadeUp className="max-w-2xl mb-12">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-3">Our philosophy</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4 tracking-tight">
            Markets shape behaviour —<br className="hidden sm:block" /> ours should shape good behaviour.
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Every incentive on Cheaper is tuned to reward sustainability. Sellers who reduce
            waste pay lower platform fees. Buyers who choose pre-owned get priority
            placement. The planet is a stakeholder in every product decision we make.
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map(({ icon: Icon, color, title, body }, i) => (
            <FadeUp key={title} delay={i * 0.06}>
              <motion.div
                className="bg-white border border-gray-200 rounded-2xl p-6 h-full cursor-default"
                whileHover={{ y: -6, boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <div className={`w-10 h-10 rounded-xl ${color} bg-opacity-100 flex items-center justify-center mb-4`}>
                  <Icon size={18} />
                </div>
                <h3 className="text-sm font-semibold text-black mb-2">{title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{body}</p>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Evercove partnership ── */}
      <section className="bg-white border-y border-gray-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">

          {/* heading */}
          <FadeUp className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-5">
              <Handshake size={12} />
              ESG partnership
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4 tracking-tight">
              Independently held accountable<br className="hidden sm:block" /> by{" "}
              <span className="text-violet-600">Evercove</span>
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Evercove is a specialist ESG advisory firm. We&apos;ve embedded their team into
              our operations — not to tick a box, but to make sure every sustainability
              claim we make is independently measured, verified, and published.
            </p>
          </FadeUp>

          <div className="grid lg:grid-cols-2 gap-8 items-start">

            {/* left — deliverables */}
            <FadeUp>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-7">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Award size={18} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-black">What Evercove does for us</p>
                    <p className="text-xs text-gray-400">Ongoing independent oversight</p>
                  </div>
                </div>

                <ul className="space-y-3.5">
                  {EVERCOVE_DELIVERABLES.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={11} className="text-emerald-600" />
                      </div>
                      <span className="text-xs text-gray-600 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 pt-5 border-t border-gray-200">
                  <a
                    href="https://evercove.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                  >
                    Visit Evercove <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </FadeUp>

            {/* right — ESG scorecard + impact cards */}
            <div className="space-y-4">
              <FadeUp delay={0.1}>
                <div className="bg-white border border-gray-200 rounded-2xl p-7">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm font-semibold text-black">ESG scorecard</p>
                      <p className="text-xs text-gray-400">FY 2025 · Verified by Evercove</p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                      <ShieldCheck size={10} />
                      Verified
                    </div>
                  </div>

                  {ESG_SCORES.map((s) => (
                    <ESGBar key={s.label} {...s} />
                  ))}

                  <p className="text-[10px] text-gray-400 mt-5 leading-relaxed">
                    Based on GRI Standards and SASB Multiline Retail disclosure framework.
                    Full report published annually at evercove.com/reports/cheaper.
                  </p>
                </div>
              </FadeUp>

              {/* impact snapshot cards */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: TrendingUp, color: "text-emerald-600 bg-emerald-50", title: "Carbon neutral", sub: "all platform ops since Q3 2024" },
                  { icon: Star,       color: "text-amber-600 bg-amber-50",     title: "Top 5%",         sub: "of e-commerce platforms globally" },
                ].map(({ icon: Icon, color, title, sub }, i) => (
                  <FadeUp key={title} delay={0.15 + i * 0.07}>
                    <motion.div
                      className="bg-white border border-gray-200 rounded-2xl p-5"
                      whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.07)" }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    >
                      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
                        <Icon size={16} />
                      </div>
                      <p className="text-sm font-bold text-black mb-0.5">{title}</p>
                      <p className="text-[11px] text-gray-400 leading-snug">{sub}</p>
                    </motion.div>
                  </FadeUp>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission statement ── */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <FadeUp>
          <div className="relative bg-black rounded-3xl overflow-hidden px-8 sm:px-14 py-14 sm:py-16 text-center">
            {/* radial glow */}
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-emerald-500/20 blur-3xl" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <div className="inline-flex p-3 bg-emerald-500/20 rounded-2xl mb-6">
                <Globe size={22} className="text-emerald-400" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
                Our mission: make the green<br className="hidden sm:block" /> choice the cheap choice
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-xl mx-auto">
                Re-sale, circular supply chains, and emission-conscious logistics aren&apos;t
                just ethical — they are structurally cheaper. We&apos;re building the
                marketplace that proves it, one sustainable purchase at a time.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="/marketplace"
                  className="inline-flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Leaf size={14} className="text-emerald-600" />
                  Start shopping
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 border border-white/20 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
                >
                  Partner with us <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

    </div>
  );
}
