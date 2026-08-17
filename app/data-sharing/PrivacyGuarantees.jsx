"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, UserX } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyGuarantees() {
  const guarantees = [
    {
      icon: Shield,
      title: "Never Sell Personal Data",
      description: "We will never sell your name, email, address, or any personally identifiable information."
    },
    {
      icon: Lock,
      title: "Anonymized Only",
      description: "All shared data is completely anonymized - patterns and trends, not personal details."
    },
    {
      icon: Eye,
      title: "Full Transparency",
      description: "See exactly what data is shared, when, and how much revenue it generates."
    },
    {
      icon: UserX,
      title: "Opt-Out Anytime",
      description: "Stop data sharing instantly. Your past data contributions remain anonymized but no new data is shared."
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
    >
      <Card className="dark-card border-gray-700 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl text-white">
            <Shield className="w-8 h-8 text-blue-400" />
            Our Privacy Guarantees
          </CardTitle>
          <p className="text-gray-400 mt-2">
            Your privacy and trust are our top priorities. Here&apos;s our commitment to you:
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {guarantees.map((guarantee, index) => (
              <motion.div
                key={guarantee.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + index * 0.1 }}
                className="flex gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700"
              >
                <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <guarantee.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">{guarantee.title}</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">{guarantee.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}