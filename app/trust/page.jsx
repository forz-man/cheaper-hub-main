"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, Code, Award } from "lucide-react";
import { motion } from "framer-motion";

import TrustHero from "@/components/trust/TrustHero";
import HowItWorks from "@/components/trust/HowItWorks";
import SecurityMeasures from "@/components/trust/SecurityMeasures";
import Transparency from "@/components/trust/Transparency";

export default function TrustPage() {
  return (
    <div className="min-h-screen bg-[#f5f3ef] p-8" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="max-w-6xl mx-auto space-y-16">
        <TrustHero />
        <HowItWorks />
        <SecurityMeasures />
        <Transparency />

        {/* Trust Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          {[
            { icon: Users, title: "100K+ Users", subtitle: "Trust our platform" },
            { icon: Shield, title: "100%", subtitle: "Data anonymized" },
            { icon: Award, title: "A+", subtitle: "Security rating" },
            { icon: Code, title: "Open", subtitle: "Source available" }
          ].map((stat, index) => (
            <Card key={stat.title} className="bg-white border border-[#e2ddd6] text-center shadow-sm">
              <CardContent className="p-6">
                <stat.icon className="w-8 h-8 text-black mx-auto mb-3" />
                <h3 className="text-2xl font-bold mb-1 text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
                  {stat.title}
                </h3>
                <p className="text-gray-500 text-sm">{stat.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </div>
    </div>
  );
}