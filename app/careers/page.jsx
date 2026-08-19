"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Calendar, Clock, Briefcase, Mail, ChevronRight, X, Sparkles, Building } from "lucide-react";

const JOBS_DATA = [
  {
    id: "devops-intern",
    title: "DevOps Internship",
    category: "Engineering",
    location: "Remote",
    date: "Oct 2025",
    type: "Unpaid (Paid transition possible)",
    hours: "15–20 hrs/week",
    duration: "3–6 months",
    role: "Support MVP launch, setup CI/CD pipeline, configure cloud infrastructure (AWS/GCP/Azure), containerize applications with Docker/Kubernetes, write Terraform templates, and implement uptime/performance monitoring.",
    requirements: "Currently pursuing or recently graduated with a degree in Computer Science, Software Engineering, or related fields. Solid understanding of Linux/Unix, Git, and shell/python scripting.",
    benefits: "Practical hands-on experience in cloud infrastructure, recommendation letters, flexible scheduling, and potential for paid transition based on funding and performance.",
    email: "careers@evu.com"
  },
  {
    id: "uiux-intern",
    title: "UI/UX Design Internship",
    category: "Design",
    location: "Remote",
    date: "Oct 2025",
    type: "Unpaid Internship",
    hours: "Flexible",
    duration: "2–3 months",
    role: "Perform comprehensive website UI/UX audits, sketch wireframes, design high-fidelity interactive prototypes in Figma, craft responsive design interfaces, and contribute to brand guidelines and component libraries.",
    requirements: "Portfolio demonstrating digital design projects, high proficiency in Figma, and a strong understanding of modern web usability and responsive design principles.",
    benefits: "Direct experience with live startup product launches, official internship completion certificate, and LinkedIn recommendation.",
    email: "careers@evu.com"
  },
  {
    id: "bizdev-intern",
    title: "Business Development Internship",
    category: "Business",
    location: "Remote",
    date: "Oct 2025",
    type: "Unpaid base (Commission per client)",
    hours: "Flexible",
    duration: "3 months",
    role: "Focus on B2B international client acquisition, conduct outbound outreach campaigns, build investor and sales pitch decks, and track the business development pipeline using CRM tools.",
    requirements: "MBA, Business, or Marketing candidate. Fluent English communications, outstanding presentation skills, and prior experience with LinkedIn sales outreach.",
    benefits: "Attractive commissions per signed B2B client, high-growth sales training, and networking opportunities within the tech ecosystem.",
    email: "careers@evu.com"
  },
  {
    id: "nocode-developer",
    title: "No-code Developer Internship",
    category: "Engineering",
    location: "Remote / Manhattan",
    date: "Sep 2025",
    type: "Part/Full-time Internship",
    hours: "Flexible / Structured",
    duration: "3-6 months",
    role: "Design, build, and maintain robust no-code applications. Analyze software requirements, design workflows, and perform QA testing to optimize application performance.",
    requirements: "Strong analytical and logical reasoning skills, CS/IT background or familiarity with software engineering concepts, and interest in visual program analysis.",
    benefits: "Exposure to modern visual programming environments, mentorship, and experience building full-stack workflows rapidly.",
    email: "careers@evu.com"
  },
  {
    id: "marketing-intern",
    title: "Marketing Intern for Venture Startup",
    category: "Marketing",
    location: "Remote",
    date: "Aug 2025",
    type: "Internship (Potential paid/equity path)",
    hours: "Flexible",
    duration: "3 months",
    role: "Participate in hands-on startup marketing campaigns, contribute to digital growth strategies, create engaging copy/graphics, and foster audience engagement across major social networks.",
    requirements: "Pursuing or completed a Marketing or Business degree, strong verbal and written communication skills, and high self-initiative to test creative outreach channels.",
    benefits: "Fast-paced startup marketing experience, certificate, and potential paid/equity path upon project seed funding.",
    email: "careers@evu.com"
  },
  {
    id: "vibe-code-jockey",
    title: "Vibe Code Jockey (Low Code/No Code) Equity Co-Founder",
    category: "Tech",
    location: "Remote",
    date: "Aug 2025",
    type: "Equity Co-Founder / Partner",
    hours: "Part-time to Full-time transition",
    duration: "Permanent Co-Founder",
    role: "Launch, iterate, and scale digital products. Collaborate directly on managing domain assets, integrating the developer backbone, and scaling product-market-fit.",
    requirements: "Proven product launch experience, speed-building in low-code/no-code stacks, and entrepreneurial drive to co-found a high-growth SaaS startup.",
    benefits: "Significant co-founder equity package, co-ownership of venture assets, and leadership of product vision.",
    email: "careers@evu.com"
  },
  {
    id: "fundraiser-saas",
    title: "Fundraiser for SAAS startup",
    category: "Finance",
    location: "Remote (Vallejo, CA)",
    date: "Aug 2025",
    type: "Contract / Performance-based pay",
    hours: "Flexible",
    duration: "Rolling Contract",
    role: "Develop fundraising strategy, seek individual and institutional donors, organize pitching events, and manage long-term relationships with startup investors.",
    requirements: "Proven track record of fundraising results in high-tech startups or non-profits, familiarity with the venture ecosystem, and strong pitching capabilities.",
    benefits: "Attractive commission/success-fee structure on closed investment rounds.",
    email: "abrar@evu.com"
  },
  {
    id: "grantwriter",
    title: "Grantwriter",
    category: "Writing",
    location: "Remote",
    date: "Jul 2025",
    type: "Performance-based contract",
    hours: "Flexible",
    duration: "Rolling Contract",
    role: "Write persuasive grant proposals, respond to government RFPs, and draft applications for patented SaaS ventures to unlock non-dilutive startup funding.",
    requirements: "Prior startup grant writing or proposal submission experience, outstanding financial narration, and clear technical copywriting skills.",
    benefits: "High commission on successfully funded grants and non-dilutive financing.",
    email: "abrar@evu.com"
  }
];

const CATEGORIES = ["All", "Engineering", "Design", "Business", "Marketing", "Tech", "Finance", "Writing"];

export default function CareersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedJob, setSelectedJob] = useState(null);

  // Filter positions
  const filteredJobs = useMemo(() => {
    return JOBS_DATA.filter((job) => {
      const matchesCategory = activeCategory === "All" || job.category === activeCategory;
      const matchesSearch = 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        job.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.requirements.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="min-h-screen bg-[#fcfbfa] pb-24 pt-14 sm:pt-16 md:pt-[72px]">
      {/* Hero Banner */}
      <div className="relative bg-black text-white py-20 sm:py-28 overflow-hidden border-b border-[#222]">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-300 via-indigo-600 to-purple-800 blur-3xl"></div>
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

        {/* Open Openings Header */}
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
                  onClick={() => setSelectedJob(job)}
                  className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between group"
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
                      {job.role}
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
                      Learn More
                      <ChevronRight size={14} className="text-gray-400 group-hover:text-black transition-colors" />
                    </span>
                  </div>
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

      {/* Interactive Detail Modal */}
      <AnimatePresence>
        {selectedJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden border border-gray-200 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="bg-gray-50 border-b border-gray-100 p-6 flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                    {selectedJob.category}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-black mt-3">
                    {selectedJob.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {selectedJob.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {selectedJob.date}
                    </span>
                    {selectedJob.hours && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {selectedJob.hours}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-6 overflow-y-auto space-y-6">
                <div>
                  <h4 className="font-extrabold text-black text-sm uppercase tracking-wider mb-2">
                    Role Description
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {selectedJob.role}
                  </p>
                </div>

                <div>
                  <h4 className="font-extrabold text-black text-sm uppercase tracking-wider mb-2">
                    Requirements
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {selectedJob.requirements}
                  </p>
                </div>

                {selectedJob.benefits && (
                  <div>
                    <h4 className="font-extrabold text-black text-sm uppercase tracking-wider mb-2">
                      What You Gain / Benefits
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {selectedJob.benefits}
                    </p>
                  </div>
                )}

                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <h4 className="font-bold text-black text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Briefcase size={12} className="text-gray-400" />
                    Employment Details
                  </h4>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li><strong className="text-gray-700">Commitment Type:</strong> {selectedJob.type}</li>
                    {selectedJob.duration && (
                      <li><strong className="text-gray-700">Duration:</strong> {selectedJob.duration}</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Action Footer */}
              <div className="border-t border-gray-100 p-6 flex flex-col sm:flex-row items-center gap-4 bg-gray-50/50">
                <div className="text-xs text-gray-400 text-center sm:text-left">
                  Ready to apply? Click button or send resume to: <strong className="text-gray-600">{selectedJob.email}</strong>
                </div>
                <a
                  href={`mailto:${selectedJob.email}?subject=Application for ${encodeURIComponent(selectedJob.title)}`}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white hover:bg-gray-800 text-xs sm:text-sm font-semibold rounded-xl transition w-full sm:w-auto ml-auto whitespace-nowrap shadow-lg shadow-black/5"
                >
                  <Mail size={16} />
                  Apply via Email
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
