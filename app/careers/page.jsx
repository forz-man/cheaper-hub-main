"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Calendar, Briefcase, ChevronRight, X, Sparkles, Building } from "lucide-react";
import { JOBS_DATA, CATEGORIES } from "@/lib/careers-data";

export default function CareersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Filter positions
  const filteredJobs = useMemo(() => {
    return JOBS_DATA.filter((job) => {
      const matchesCategory = activeCategory === "All" || job.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        (job.role && job.role.toLowerCase().includes(q)) ||
        (job.summary && job.summary.toLowerCase().includes(q)) ||
        (Array.isArray(job.requirements)
          ? job.requirements.some((r) => r.toLowerCase().includes(q))
          : typeof job.requirements === "string" && job.requirements.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="min-h-screen bg-[#fcfbfa] pb-24 pt-14 sm:pt-16 md:pt-[72px]">
      {/* Hero Banner */}
      <div className="relative bg-black text-white py-20 sm:py-28 overflow-hidden border-b border-[#222]">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-300 via-indigo-600 to-purple-800 blur-3xl pointer-events-none"></div>
        <div className="container max-w-5xl mx-auto px-4 text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-indigo-300 text-xs font-semibold mb-6 tracking-wide"
          >
            <Sparkles size={12} />
            We Are Hiring
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6"
          >
            Build the Future of Commerce
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-base sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Join our mission to democratize price comparison and multi-vendor scaling. Explore internships and co-founder roles below.
          </motion.p>

          {/* Search Input */}
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
              placeholder="Search by role, skills, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-13 pl-12 pr-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white placeholder:text-gray-400 text-sm focus:outline-none focus:bg-white/15 focus:border-white/30 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-white transition-colors"
                aria-label="Clear search query"
              >
                <X size={16} />
              </button>
            )}
          </motion.div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 mt-12">
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide border-b border-[#f0ede8]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-black text-white shadow-sm"
                  : "bg-white border border-[#e2ddd6] text-[#555] hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Open Positions Header */}
        <div className="mt-10 mb-6 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-extrabold text-black flex items-center gap-2">
            <Building size={20} className="text-gray-400" />
            Open Positions ({filteredJobs.length})
          </h2>
          <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase">Remote / Flexible</span>
        </div>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex"
                >
                  <Link
                    href={`/careers/${job.slug}`}
                    className="w-full bg-white rounded-3xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300 flex flex-col justify-between group focus:outline-none focus:ring-2 focus:ring-black/10"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <span className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-full text-xs font-semibold text-gray-500">
                          {job.category}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar size={12} />
                          {job.date}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-black group-hover:text-indigo-600 transition-colors mb-2">
                        {job.title}
                      </h3>

                      <p className="text-sm text-gray-500 line-clamp-2 mb-6">
                        {job.summary || job.role}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#f0ede8] pt-4 mt-auto">
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase size={12} />
                          {job.type.split(" ")[0]}
                        </span>
                      </div>

                      <span className="text-xs font-bold text-black flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        View Job
                        <ChevronRight size={14} className="text-gray-400 group-hover:text-black transition-colors" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full text-center py-20 bg-white border border-gray-200 rounded-3xl space-y-4"
              >
                <div className="w-14 h-14 bg-gray-50 rounded-full border border-gray-100 flex items-center justify-center mx-auto text-gray-300">
                  <Briefcase size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-black">No openings match your search</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto">
                    Try adjusting your category filter or clearing the search terms.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("All");
                  }}
                  className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition"
                >
                  Clear Filters
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
