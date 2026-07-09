"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  FaFacebook, FaTwitter, FaInstagram, FaYoutube, 
  FaLinkedin, FaGithub 
} from 'react-icons/fa';
import { 
  FiMail, FiSend, FiShield, FiHeart, FiMapPin, 
  FiPhone, FiClock, FiZap
} from 'react-icons/fi';
import { BsSignNoParkingFill } from 'react-icons/bs';


const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 3000);
      setEmail('');
    }
  };

  const footerLinks = {
    "Marketplace": [
      { label: "Browse Products", href: "/products" },
      { label: "Top Deals", href: "/deals" },
      { label: "New Arrivals", href: "/new" },
      { label: "Verified Sellers", href: "/sellers" },
    ],
    "For Sellers": [
      { label: "Start Selling", href: "/sell" },
      { label: "Seller Dashboard", href: "/dashboard" },
      { label: "Pricing Plans", href: "/pricing" },
      { label: "Success Stories", href: "/stories" },
    ],
    "Support": [
      { label: "Help Center", href: "/help" },
      { label: "Contact Us", href: "/contact" },
      { label: "FAQ", href: "/faq" },
      { label: "Returns Policy", href: "/returns" },
    ],
    "Company": [
      { label: "Careers", href: "/careers" },
      { label: "Press Kit", href: "/press" },
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
      
      <div className="absolute inset-0 opacity-5">
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
                <a
                  key={label}
                  href={href}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-300 hover:scale-110 group"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                >
                  <Icon size={14} className="text-gray-500 group-hover:text-gray-800 transition-colors duration-300" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                {title}
              </h3>
              <ul className="space-y-2">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link 
                      href={href} 
                      className="text-gray-500 text-sm hover:text-gray-800 transition-all duration-300 hover:translate-x-1 inline-block"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
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
              <div className="relative flex-1 min-w-[180px]">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[#0a0a0a] text-sm placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all duration-300"
                />
              </div>
              <button
                type="submit"
                className="group px-4 py-2 bg-black text-white font-semibold text-xs rounded-lg hover:bg-gray-800 hover:shadow-lg hover:shadow-black/20 transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap"
              >
                Subscribe
                <FiSend size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
              </button>
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