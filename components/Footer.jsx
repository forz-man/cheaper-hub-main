"use client";

// Active Next.js Links
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import { 
  FaFacebook, FaTwitter, FaInstagram, FaYoutube, 
  FaLinkedin, FaGithub 
} from 'react-icons/fa';
import { 
  FiMail, FiSend, FiShield, FiHeart, FiMapPin, 
  FiPhone, FiClock, FiZap, FiChevronDown
} from 'react-icons/fi';
import { BsSignNoParkingFill } from 'react-icons/bs';
import { motion } from 'framer-motion';
import useReducedMotion from '@/hooks/useReducedMotion';


const Footer = () => {
  const shouldReduceMotion = useReducedMotion();
  const { user } = useAuth();
  const router = useRouter();

  const [openSections, setOpenSections] = useState({});
  const toggleSection = (title) => {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 3000);
      setEmail('');
    }
  };

  const handleSellerDashboardClick = (e) => {
    e.preventDefault();
    if (user) {
      router.push("/vendor/profile");
    } else {
      router.push("/login?redirect=/vendor/profile");
    }
  };

  const footerLinks = {
    "Marketplace": [
      { label: "Browse Products", href: "/marketplace" },
      { label: "Top Deals", href: "/deals" },
      { label: "New Arrivals", href: "/marketplace?sort=newest" },
      // { label: "Verified Sellers", href: "#" },
    ],
    "For Sellers": [
      { label: "Start Selling", href: "/select-role" },
      { label: "Seller Dashboard", href: "#" },
      // { label: "Pricing Plans", href: "#" },
    ],
    "Support": [
      { label: "Help Center", href: "/contact" },
      { label: "Contact Us", href: "/contact" },
      { label: "FAQ", href: "/faq" },
      { label: "Returns Policy", href: "/contact" },
    ],
    "Company": [
      { label: "Sustainability", href: "/sustainability" },
      { label: "Careers", href: "/careers" },
      // { label: "Success Stories", href: "#" },
      // { label: "Press Kit", href: "#" },
    ],
  };

  const socialLinks = [
    { Icon: FaFacebook, href: "https://facebook.com", label: "Facebook" },
    { Icon: FaTwitter, href: "https://twitter.com", label: "Twitter" },
    { Icon: FaInstagram, href: "https://instagram.com", label: "Instagram" },
    { Icon: FaYoutube, href: "https://youtube.com", label: "Youtube" },
    { Icon: FaLinkedin, href: "https://linkedin.com", label: "LinkedIn" },
    { Icon: FaGithub, href: "https://github.com", label: "GitHub" },
  ];

  return (
    <footer className="bg-white text-[#0a0a0a] relative overflow-hidden border-t border-gray-200">
      
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-black rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gray-700 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-6">
          
          <div className="sm:col-span-2 lg:col-span-1">
            <Link 
              href="/" 
              className="flex items-center gap-2 group"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div className="relative">
                <div className={`absolute inset-0 bg-black rounded-lg blur-xl transition-opacity duration-500 ${isHovered ? 'opacity-20' : 'opacity-5'}`}></div>
                <div className="relative w-9 h-9 rounded-lg bg-black flex items-center justify-center shadow-lg shadow-black/20 group-hover:shadow-black/40 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <span className="text-white font-bold text-base">C</span>
                  {isHovered && (
                    <BsSignNoParkingFill size={10} className="absolute -top-1 -right-1 text-yellow-400 animate-pulse" />
                  )}
                </div>
              </div>
              <span className="font-bold text-lg tracking-tight text-[#0a0a0a]">
                Cheaper
              </span>
            </Link>
            
            <p className="text-gray-500 text-sm leading-relaxed mt-3 max-w-xs">
              The marketplace where sellers meet buyers and everyone wins.
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2.5 text-sm text-gray-500 hover:text-gray-800 transition-colors duration-300 group">
                <FiMail size={14} className="text-gray-400 flex-shrink-0 group-hover:text-gray-800 transition-colors" />
                <span>support@cheaper.com</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-500 hover:text-gray-800 transition-colors duration-300 group">
                <FiPhone size={14} className="text-gray-400 flex-shrink-0 group-hover:text-gray-800 transition-colors" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-500 hover:text-gray-800 transition-colors duration-300 group">
                <FiMapPin size={14} className="text-gray-400 flex-shrink-0 group-hover:text-gray-800 transition-colors" />
                <span>San Francisco, CA</span>
              </div>
            </div>

            <div className="flex gap-1.5 mt-4">
              {socialLinks.map(({ Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group cursor-pointer"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  whileHover={{ y: -4, scale: 1.15, backgroundColor: "#e5e7eb" }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Icon size={14} className="text-gray-500 group-hover:text-gray-800 transition-colors duration-300" />
                </motion.a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="border-b border-gray-100 lg:border-none pb-4 lg:pb-0">
              <button
                onClick={() => toggleSection(title)}
                className="w-full lg:pointer-events-none flex items-center justify-between text-left py-2 lg:py-0 mb-1 lg:mb-3 group focus:outline-none"
              >
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {title}
                </h3>
                <motion.div
                  animate={shouldReduceMotion ? {} : { rotate: openSections[title] ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="lg:hidden text-gray-400 group-hover:text-black"
                >
                  <FiChevronDown size={14} />
                </motion.div>
              </button>
              <motion.div
                initial={false}
                animate={shouldReduceMotion ? { height: "auto", opacity: 1 } : {
                  height: openSections[title] ? "auto" : 0,
                  opacity: openSections[title] ? 1 : 0
                }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden lg:!h-auto lg:!opacity-100 lg:!overflow-visible"
              >
                <ul className="space-y-2 mt-2 lg:mt-0">
                  {links.map(({ label, href }) => {
                    if (label === "Seller Dashboard") {
                      return (
                        <li key={label}>
                          <motion.button
                            onClick={handleSellerDashboardClick}
                            whileHover={{ x: 6, color: "#000" }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="text-gray-500 text-sm inline-block text-left bg-transparent border-none p-0 cursor-pointer outline-none w-full py-1 lg:py-0"
                          >
                            {label}
                          </motion.button>
                        </li>
                      );
                    }
                    return (
                      <li key={label}>
                        <Link href={href} className="inline-block w-full py-1 lg:py-0">
                          <motion.span 
                            whileHover={{ x: 6, color: "#000" }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="text-gray-500 text-sm inline-block w-full"
                          >
                            {label}
                          </motion.span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            </div>
          ))}
        </div>

        <div className="relative mt-10 pt-6 border-t border-gray-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0a0a0a] flex items-center gap-2">
                <FiMail size={16} className="text-gray-400" />
                Subscribe for updates
                <FiZap size={12} className="text-yellow-500" />
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">
                Get the latest deals straight to your inbox.
              </p>
            </div>
            
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <motion.div 
                className="relative flex-1 min-w-[180px]"
                animate={{ scale: inputFocused ? 1.02 : 1 }}
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[#0a0a0a] text-sm placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all duration-300"
                />
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                type="submit"
                className="group px-4 py-2 bg-black text-white font-semibold text-xs rounded-lg hover:bg-gray-800 hover:shadow-lg hover:shadow-black/20 transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                Subscribe
                <FiSend size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
              </motion.button>
            </form>
          </div>
        </div>
      </div>

      <div className="relative border-t border-gray-200 bg-gray-50">
        <div className="container py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-xs">
                © 2026 Cheaper Marketplace
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-400 text-xs flex items-center gap-1">
                <FiHeart size={10} className="text-red-500" />
                Made with love
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Link href="/privacy" className="text-gray-400 text-xs hover:text-gray-800 transition-colors duration-300">
                Privacy
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/terms" className="text-gray-400 text-xs hover:text-gray-800 transition-colors duration-300">
                Terms
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/cookies" className="text-gray-400 text-xs hover:text-gray-800 transition-colors duration-300">
                Cookies
              </Link>
            </div>

            <div className="flex items-center gap-1.5">
              <FiShield size={12} className="text-green-500" />
              <span className="text-gray-400 text-[9px] font-medium tracking-wider">SECURE</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;