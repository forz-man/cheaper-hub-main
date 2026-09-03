"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Briefcase,
  Mail,
  Check,
  Share2,
  Sparkles,
  Building,
  ChevronRight,
  Award,
  Laptop,
  CheckCircle2
} from "lucide-react";

export default function JobDetailsClient({ job, otherJobs }) {
  const [copied, setCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyEmail = () => {
    if (typeof window !== "undefined" && job?.email) {
      navigator.clipboard?.writeText(job.email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  const mailtoUrl = `mailto:${job.email}?subject=${encodeURIComponent(
    `Application for ${job.title} - Cheaper Hub`
  )}&body=${encodeURIComponent(
    `Hi Cheaper Hub Team,\n\nI am interested in applying for the ${job.title} position.\n\nPlease find my resume and relevant portfolio details attached.\n\nBest regards,\n[Your Name]`
  )}`;

  return (
    <div className="min-h-screen bg-[#fcfbfa] pb-24 pt-14 sm:pt-16 md:pt-[72px]">
      {/* Header Banner */}
      <div className="bg-black text-white py-12 sm:py-16 border-b border-[#222] relative overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500 via-purple-600 to-black blur-3xl pointer-events-none"></div>

        <div className="container max-w-5xl mx-auto px-4 relative z-10">
          {/* Back Navigation */}
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Careers
          </Link>

          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/15 rounded-full text-xs font-semibold text-indigo-300">
              {job.category}
            </span>
            <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/15 rounded-full text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Laptop size={12} />
              {job.workMode || job.location}
            </span>
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-300">
              Actively Hiring
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            {job.title}
          </h1>

          <p className="text-gray-300 text-base sm:text-lg max-w-3xl leading-relaxed mb-6">
            {job.summary || job.role}
          </p>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-xs sm:text-sm text-gray-400 border-t border-white/10 pt-6">
            <div className="flex items-center gap-1.5">
              <MapPin size={15} className="text-gray-400" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Briefcase size={15} className="text-gray-400" />
              <span>{job.type}</span>
            </div>
            {job.hours && (
              <div className="flex items-center gap-1.5">
                <Clock size={15} className="text-gray-400" />
                <span>{job.hours}</span>
              </div>
            )}
            {job.duration && (
              <div className="flex items-center gap-1.5">
                <Calendar size={15} className="text-gray-400" />
                <span>{job.duration}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container max-w-5xl mx-auto px-4 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 items-start">
          {/* Left Column: Detailed Job Information */}
          <div className="space-y-10">
            {/* About the Role */}
            <motion.section
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-4"
            >
              <h2 className="text-xl font-extrabold text-black flex items-center gap-2">
                <Building size={20} className="text-indigo-600" />
                About the Role
              </h2>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                {job.role}
              </p>
            </motion.section>

            {/* Key Responsibilities */}
            {job.responsibilities && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6"
              >
                <h2 className="text-xl font-extrabold text-black flex items-center gap-2">
                  <Sparkles size={20} className="text-indigo-600" />
                  Key Responsibilities
                </h2>
                {Array.isArray(job.responsibilities) ? (
                  <ul className="space-y-3.5">
                    {job.responsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-gray-600 leading-relaxed">
                        <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mt-0.5 flex-shrink-0">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                    {job.responsibilities}
                  </p>
                )}
              </motion.section>
            )}

            {/* Requirements & Qualifications */}
            {job.requirements && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6"
              >
                <h2 className="text-xl font-extrabold text-black flex items-center gap-2">
                  <Award size={20} className="text-indigo-600" />
                  Requirements & Qualifications
                </h2>
                {Array.isArray(job.requirements) ? (
                  <ul className="space-y-3.5">
                    {job.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-gray-600 leading-relaxed">
                        <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 flex-shrink-0">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                    {job.requirements}
                  </p>
                )}
              </motion.section>
            )}

            {/* Preferred Skills */}
            {job.preferredSkills && job.preferredSkills.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6"
              >
                <h2 className="text-xl font-extrabold text-black flex items-center gap-2">
                  <Sparkles size={20} className="text-amber-500" />
                  Preferred / Nice-to-Have Skills
                </h2>
                <ul className="space-y-3.5">
                  {job.preferredSkills.map((skill, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-gray-600 leading-relaxed">
                      <div className="w-5 h-5 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mt-0.5 flex-shrink-0">
                        <Check size={12} className="stroke-[3]" />
                      </div>
                      <span>{skill}</span>
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}

            {/* Experience Requirements */}
            {job.experience && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-4"
              >
                <h2 className="text-xl font-extrabold text-black flex items-center gap-2">
                  <Clock size={20} className="text-indigo-600" />
                  Experience Level
                </h2>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                  {job.experience}
                </p>
              </motion.section>
            )}

            {/* What You'll Gain / Benefits */}
            {job.benefits && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 rounded-3xl border border-indigo-100 p-6 sm:p-8 shadow-sm space-y-4"
              >
                <h2 className="text-xl font-extrabold text-black flex items-center gap-2">
                  <Award size={20} className="text-indigo-600" />
                  What You Will Gain & Benefits
                </h2>
                <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                  {job.benefits}
                </p>
              </motion.section>
            )}
          </div>

          {/* Right Column: Sticky Apply & Details Card */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold text-black mb-1">Interested in this role?</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Submit your application and resume directly to our hiring team.
                </p>
              </div>

              {/* Primary Apply Button */}
              <a
                href={mailtoUrl}
                className="w-full bg-black text-white hover:bg-gray-800 py-3.5 px-6 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-black/5 group"
              >
                <Mail size={18} className="group-hover:scale-110 transition-transform" />
                Apply Now via Email
              </a>

              {/* Share & Copy Action */}
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 py-2.5 px-3 rounded-xl text-xs font-semibold text-gray-700 transition flex items-center justify-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span className="text-emerald-600">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={14} />
                      <span>Share Job</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopyEmail}
                  className="border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 py-2.5 px-3 rounded-xl text-xs font-semibold text-gray-700 transition flex items-center justify-center gap-1.5"
                  title="Copy application email"
                >
                  {emailCopied ? (
                    <span className="text-emerald-600 text-[11px]">Email Copied!</span>
                  ) : (
                    <span className="text-gray-600 text-[11px]">Copy Email</span>
                  )}
                </button>
              </div>

              {/* Overview Details */}
              <div className="border-t border-gray-100 pt-5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Position Overview
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Employment Type</span>
                  <span className="font-semibold text-gray-800 text-right">{job.type}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Location</span>
                  <span className="font-semibold text-gray-800 text-right">{job.location}</span>
                </div>

                {job.workMode && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Work Mode</span>
                    <span className="font-semibold text-gray-800 text-right">{job.workMode}</span>
                  </div>
                )}

                {job.hours && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Hours</span>
                    <span className="font-semibold text-gray-800 text-right">{job.hours}</span>
                  </div>
                )}

                {job.duration && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-semibold text-gray-800 text-right">{job.duration}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Contact Email</span>
                  <span className="font-semibold text-gray-800">{job.email}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-xs text-gray-500 leading-relaxed flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  Please include your resume, portfolio / GitHub links, and position title in your email.
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Other Open Positions */}
        {otherJobs && otherJobs.length > 0 && (
          <div className="mt-20 pt-12 border-t border-gray-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-extrabold text-black">Other Open Roles</h2>
                <p className="text-sm text-gray-500 mt-1">Explore other opportunities at Cheaper Hub</p>
              </div>
              <Link
                href="/careers"
                className="text-xs sm:text-sm font-semibold text-black hover:text-indigo-600 flex items-center gap-1 transition-colors"
              >
                View all positions
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {otherJobs.slice(0, 3).map((other) => (
                <Link
                  key={other.id}
                  href={`/careers/${other.slug}`}
                  className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-full">
                        {other.category}
                      </span>
                      <span className="text-xs text-gray-400">{other.location}</span>
                    </div>
                    <h3 className="text-base font-bold text-black group-hover:text-indigo-600 transition-colors mb-2">
                      {other.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">
                      {other.summary || other.role}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs font-semibold text-black">
                    <span>{other.type.split(" ")[0]}</span>
                    <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-indigo-600">
                      Learn More <ChevronRight size={12} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
