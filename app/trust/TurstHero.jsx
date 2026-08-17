import React from "react";
import { Shield, Users, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function TrustHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      <div className="flex justify-center items-center gap-4">
        <Lock className="w-8 h-8 text-green-400" />
        <h1 className="text-5xl font-bold text-gradient">Your Trust is Our Priority</h1>
        <Users className="w-8 h-8 text-blue-400" />
      </div>
      <p className="text-xl text-gray-300 max-w-3xl mx-auto">
        We are committed to being transparent about how our platform works, how we protect your data, and how we create value for our community. Your security and privacy are at the core of everything we do.
      </p>
    </motion.div>
  );
}