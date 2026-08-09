"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, MessageSquare, ArrowRight, HelpCircle, Sparkles, X } from "lucide-react";

const FAQ_DATA = [
  {
    id: "price-comparison",
    category: "buying",
    question: "How does Cheaper help me find the best prices?",
    answer: "Cheaper aggregates listings from verified multi-vendor stores, allowing you to compare price differences, shipping costs, and seller ratings side-by-side."
  },
  {
    id: "authenticity",
    category: "buying",
    question: "Are the products listed on Cheaper genuine?",
    answer: "Yes. All sellers on Cheaper go through account verification to ensure reliable fulfillment and authentic product listings."
  },
  {
    id: "become-vendor",
    category: "selling",
    question: "How do I become a seller on Cheaper?",
    answer: "Click 'Start Selling' in the footer or menu, select 'Vendor' during account registration, and set up your vendor profile to begin listing items immediately."
  },
  {
    id: "selling-fees",
    category: "selling",
    question: "What are the fees for selling?",
    answer: "Account creation is free for sellers. A standard marketplace transaction fee applies only when a order is successfully placed."
  },
  {
    id: "return-policy",
    category: "support",
    question: "What is Cheaper's return policy?",
    answer: "Return policies are handled according to seller guidelines, generally offering a 14 to 30-day window. You can reach out directly via our Contact page for return assistance."
  },
  {
    id: "contact-support",
    category: "support",
    question: "How do I contact customer support?",
    answer: "You can reach out anytime through our Contact Us page or email support@cheaper.com."
  }
];

const CATEGORIES = [
  { id: "all", label: "All Questions" },
  { id: "buying", label: "Buying & Price Comparison" },
  { id: "selling", label: "Selling on Cheaper" },
  { id: "support", label: "Orders & Support" }
];

function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border-b border-[#f0ede8] last:border-b-0 py-4 sm:py-5">
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between text-left gap-4 group focus:outline-none"
      >
        <span className="font-bold text-[#111] text-base sm:text-lg group-hover:text-gray-600 transition-colors">
          {faq.question}
        </span>
        <span className={`p-1.5 rounded-lg bg-gray-50 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-black text-white' : 'group-hover:bg-gray-100'}`}>
          <ChevronDown size={16} />
        </span>
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-[#555] text-sm sm:text-base leading-relaxed pt-3 pb-1 max-w-3xl">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openId, setOpenId] = useState(null);

  // Filter FAQ list based on search and tab selections
  const filteredFAQs = useMemo(() => {
    return FAQ_DATA.filter((faq) => {
      const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
      const matchesSearch = 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  const handleToggle = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-[#fcfbfa] pb-20">
      {/* Premium Hero Section */}
      <div className="relative bg-black text-white overflow-hidden py-16 sm:py-24 border-b border-[#222]">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-100 via-yellow-200 to-amber-500 blur-3xl"></div>
        <div className="container relative max-w-4xl mx-auto px-4 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-yellow-400 text-xs font-semibold mb-6 tracking-wide"
          >
            <Sparkles size={12} />
            Help Center
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4"
          >
            Frequently Asked Questions
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-base sm:text-lg mb-8 max-w-xl mx-auto"
          >
            Have a question about comparing prices, sourcing products, or vendor rules? We have answers.
          </motion.p>

          {/* Large Search Bar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-xl mx-auto relative group"
          >
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-white transition-colors">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search for questions, terms, or policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-13 pl-12 pr-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white placeholder:text-gray-400 text-sm focus:outline-none focus:bg-white/15 focus:border-white/30 focus:ring-4 focus:ring-white/5 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </motion.div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 mt-12">
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide border-b border-[#f0ede8]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setOpenId(null); // Close active accordion when changing categories
              }}
              className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeCategory === cat.id
                  ? "bg-black text-white shadow-sm"
                  : "bg-white border border-[#e2ddd6] text-[#555] hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQs List */}
        <div className="mt-6 bg-white rounded-3xl border border-gray-200 shadow-sm px-6 py-4">
          <AnimatePresence mode="wait">
            {filteredFAQs.length > 0 ? (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="divide-y divide-gray-100"
              >
                {filteredFAQs.map((faq) => (
                  <FAQItem
                    key={faq.id}
                    faq={faq}
                    isOpen={openId === faq.id}
                    onToggle={() => handleToggle(faq.id)}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-16 space-y-4"
              >
                <div className="w-14 h-14 bg-gray-50 rounded-full border border-gray-100 flex items-center justify-center mx-auto text-gray-300">
                  <HelpCircle size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-[#111]">No matching questions</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto">
                    We couldn&apos;t find any answers for &quot;{searchQuery}&quot;. Try adjusting your keywords.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                  className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition"
                >
                  Reset Filter
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Support Call-Out */}
        <div className="mt-8 bg-amber-50/50 border border-amber-100 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100/50 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5">
              <MessageSquare size={20} />
            </div>
            <div>
              <h4 className="font-bold text-[#111] text-sm sm:text-base">Still have questions?</h4>
              <p className="text-xs sm:text-sm text-gray-500">
                Our support agents are ready to assist you 24 hours a day, 7 days a week.
              </p>
            </div>
          </div>
          <Link
            href="/contact"
            className="flex items-center gap-1 px-4 py-2.5 bg-black text-white hover:bg-gray-800 text-xs sm:text-sm font-semibold rounded-xl transition whitespace-nowrap self-stretch sm:self-auto justify-center"
          >
            Contact Support
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
