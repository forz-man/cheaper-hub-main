import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Shield, Eye, Server } from "lucide-react";
import { motion } from "framer-motion";

export default function SecurityMeasures() {
  const measures = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description: "All data transmission is encrypted using industry-standard SSL/TLS protocols"
    },
    {
      icon: Shield,
      title: "Data Anonymization",
      description: "Personal information is separated from shopping patterns before any analysis"
    },
    {
      icon: Eye,
      title: "Privacy by Design",
      description: "Built from the ground up with privacy as a core principle, not an afterthought"
    },
    {
      icon: Server,
      title: "Secure Infrastructure",
      description: "Hosted on enterprise-grade servers with regular security audits and updates"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="dark-card border-gray-700 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl text-white">
            <Lock className="w-8 h-8 text-blue-400" />
            Security & Privacy Measures
          </CardTitle>
          <p className="text-gray-400 mt-2">
            Your security and privacy are protected by multiple layers of safeguards
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {measures.map((measure, index) => (
              <motion.div
                key={measure.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700"
              >
                <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <measure.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">{measure.title}</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">{measure.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
