"use client";

import { motion } from "framer-motion";
import {
  Leaf,
  Wind,
  Droplets,
  Sun,
  Recycle,
  Globe,
  TrendingDown,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  TreePine,
  Zap,
  Factory,
} from "lucide-react";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
});

const PILLARS = [
  {
    icon: Wind,
    title: "Climate action",
    body:
      "We track and offset the carbon footprint of every shipment brokered through Cheaper, partnering with certified reforestation and renewable-energy programmes.",
  },
  {
    icon: Recycle,
    title: "Circular economy",
    body:
      "Re-selling is inherently sustainable. Every secondhand or surplus product bought on Cheaper is one fewer new item that needs to be manufactured.",
  },
  {
    icon: Droplets,
    title: "Pollution reduction",
    body:
      "We favour vendors who use recycled or minimal packaging and flag 'eco-packaged' listings so buyers can make informed choices.",
  },
  {
    icon: Sun,
    title: "Clean energy",
    body:
      "Our cloud infrastructure runs on providers with verified renewable-energy commitments, and we are working toward 100% renewable operations by 2027.",
  },
  {
    icon: TreePine,
    title: "Biodiversity",
    body:
      "A portion of every platform fee goes to biodiversity-protection projects — wetland restoration, native planting, and ocean conservation.",
  },
  {
    icon: Factory,
    title: "Responsible sourcing",
    body:
      "New-goods vendors on Cheaper must meet our Responsible Sourcing Standard — covering labour conditions, material provenance, and emissions disclosures.",
  },
];

const STATS = [
  { value: "12 k+", label: "tonnes of CO₂ avoided through re-sale" },
  { value: "1 M+", label: "items diverted from landfill" },
  { value: "40 %", label: "lower carbon footprint vs. buying new" },
  { value: "2027", label: "target year for net-zero operations" },
];

export default function SustainabilityPage() {
  return (
    <div className="min-h-screen bg-white pt-20">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#f3f7f2] border-b border-[#ddecd8]">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-green-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-0 w-80 h-80 rounded-full bg-emerald-300/30 blur-3xl" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center relative z-10">
          <motion.div {...fadeUp(0)}>
            <div className="inline-flex items-center gap-2 bg-green-900/10 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-green-200">
              <Leaf size={12} />
              Our commitment to the planet
            </div>
          </motion.div>

          <motion.h1
            {...fadeUp(0.08)}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black leading-tight mb-5"
          >
            Commerce that<br />
            <span className="text-green-700">cares for tomorrow</span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.16)}
            className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Cheaper was built on the belief that a marketplace can grow while the planet
            does too. Every product sold, every shipment made, every vendor we onboard
            is held to a standard that puts climate and community first.
          </motion.p>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl sm:text-3xl font-bold text-black mb-1">{value}</p>
                <p className="text-xs text-gray-400 leading-snug">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Philosophy ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <motion.div {...fadeUp(0)} className="max-w-3xl mb-12">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-3">Our philosophy</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">
            We believe markets shape behaviour — so ours should shape good behaviour.
          </h2>
          <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
            The cheapest price should not come at the cost of the environment. We design
            every part of Cheaper — our incentives, our fees, our vendor standards — to
            reward sustainability. Sellers who cut waste pay lower platform fees. Buyers
            who choose secondhand get priority search placement. The planet isn't a
            stakeholder we report to once a year; it is part of every product decision we make.
          </p>
        </motion.div>

        {/* Pillars grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PILLARS.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              {...fadeUp(i * 0.07)}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-green-400 hover:shadow-lg transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
                <Icon size={18} className="text-green-700" />
              </div>
              <h3 className="text-sm font-semibold text-black mb-2">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── EVERCOVE partnership ── */}
      <section className="bg-[#f3f7f2] border-y border-[#ddecd8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <motion.div {...fadeUp(0)}>
              <div className="inline-flex items-center gap-2 bg-green-900/10 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full mb-5 border border-green-200">
                <ShieldCheck size={12} />
                ESG partner
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">
                Guided by{" "}
                <span className="text-green-700">Evercove</span>
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">
                Cheaper partners with <strong className="text-black">Evercove</strong>, a leading ESG advisory
                firm, for independent measurement, target-setting, and accountability
                across our environmental, social, and governance commitments. Evercove
                audits our emissions data, reviews vendor compliance, and helps us align
                with globally recognised frameworks — including the UN Sustainable
                Development Goals and the Paris Agreement.
              </p>
              <ul className="space-y-2.5">
                {[
                  "Annual independent ESG audit & public report",
                  "Vendor supply-chain emissions screening",
                  "Science-based targets aligned with 1.5 °C pathway",
                  "Biodiversity-positive investment guidance",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                    <ChevronRight size={13} className="text-green-600 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="https://evercove.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-6 text-xs font-semibold text-green-700 hover:text-green-900 transition-colors"
              >
                Learn more about Evercove <ExternalLink size={12} />
              </a>
            </motion.div>

            {/* ESG score card */}
            <motion.div {...fadeUp(0.12)}>
              <div className="bg-white rounded-3xl border border-[#ddecd8] shadow-sm p-7">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
                  Evercove ESG scorecard — FY 2025
                </p>
                {[
                  { label: "Environmental", score: 87, color: "bg-green-500" },
                  { label: "Social", score: 79, color: "bg-emerald-400" },
                  { label: "Governance", score: 91, color: "bg-teal-500" },
                ].map(({ label, score, color }) => (
                  <div key={label} className="mb-4 last:mb-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-black">{label}</span>
                      <span className="text-xs font-bold text-black">{score} / 100</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-gray-400 mt-5 leading-relaxed">
                  Scores independently verified by Evercove. Based on GRI Standards and
                  SASB Multiline Retail disclosure framework.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Investors who believe in sustainability ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <motion.div {...fadeUp(0)} className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-3">Why it matters to investors</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">
            The world's most respected families bet on green
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Sustainable business isn't a trade-off against returns — it's the foundation
            for durable ones. The world's most influential capital allocators have
            recognised that companies which internalise environmental costs outperform
            over the long run.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp(0.1)}
          className="bg-white border border-gray-200 rounded-3xl p-7 sm:p-10 max-w-3xl mx-auto"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <TrendingDown size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black mb-1">The Gates family office</h3>
              <p className="text-xs text-gray-400">Cascade Investment, LLC</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            Bill Gates and the Gates family — through their private investment vehicle,
            Cascade Investment — have been outspoken advocates for deploying capital
            toward climate solutions. Their portfolio spans clean energy, sustainable
            agriculture, water purification, and waste reduction — sectors that directly
            intersect with the problems Cheaper is working to address in e-commerce.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            Gates has written extensively that the next wave of breakthrough companies
            will be those that make the green choice also the cheap choice — which is
            precisely our mission. Re-sale, circular supply chains, and emission-conscious
            logistics aren't just ethical; they are structurally cheaper, and we are
            building the marketplace that proves it.
          </p>
          <div className="bg-[#f3f7f2] rounded-2xl px-5 py-4 border border-[#ddecd8]">
            <p className="text-xs text-gray-500 italic leading-relaxed">
              "The world needs new approaches to fighting climate change — ones that make
              clean energy and sustainable choices the affordable option for everyone."
            </p>
            <p className="text-[11px] text-gray-400 mt-2 not-italic">— Inspired by Bill Gates, <em>How to Avoid a Climate Disaster</em></p>
          </div>
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <motion.div {...fadeUp(0)}>
            <div className="inline-flex p-3 bg-green-700/20 rounded-2xl mb-5">
              <Globe size={22} className="text-green-400" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Join us in buying better</h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto mb-8 leading-relaxed">
              Every purchase on Cheaper is a vote for a more sustainable economy. Shop
              secondhand, choose eco-packaged goods, and help us close the loop.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/marketplace"
                className="inline-flex items-center gap-2 bg-white text-black text-sm font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Leaf size={15} className="text-green-600" />
                Shop sustainably
              </a>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 border border-white/20 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                Partner with us
                <ChevronRight size={14} />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
