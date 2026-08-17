"use client";

import React from "react";
import { Zap, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function DataSharingHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      <div className="flex justify-center items-center gap-4">
        <Zap className="w-8 h-8 text-blue-400" />
        <h1 
          className="text-4xl md:text-5xl font-bold text-white" 
          style={{ fontFamily: "var(--font-hanken), sans-serif" }}
        >
          Join the Data Sharing Program
        </h1>
        <Shield className="w-8 h-8 text-green-400" />
      </div>
      <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
        Turn your anonymized shopping data into passive income while helping our AI find better deals for the entire community. It&apos;s secure, transparent, and you&apos;re always in control.
      </p>
    </motion.div>
  );
}