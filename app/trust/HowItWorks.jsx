import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Brain, Users, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

export default function HowItWorks() {
  const steps = [
    {
      icon: Search,
      title: "You Search for Deals",
      description: "Use our AI to find the best prices and discounts across the internet",
      color: "text-blue-400",
      bgColor: "bg-blue-900/30"
    },
    {
      icon: Brain,
      title: "AI Learns & Improves",
      description: "Our AI gets smarter with each search, finding better deals over time",
      color: "text-purple-400",
      bgColor: "bg-purple-900/30"
    },
    {
      icon: Users,
      title: "Community Benefits",
      description: "Better AI means better deals for everyone in our community",
      color: "text-green-400",
      bgColor: "bg-green-900/30"
    },
    {
      icon: DollarSign,
      title: "Optional Revenue Share",
      description: "Choose to share anonymized data and earn a percentage of revenue",
      color: "text-orange-400",
      bgColor: "bg-orange-900/30"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-white">How Our Platform Works</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Our platform is designed to be simple, transparent, and beneficial for everyone
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            <Card className="dark-card border-gray-700 hover:shadow-lg transition-all duration-300 h-full">
              <CardContent className="p-6 text-center space-y-4">
                <div className="relative">
                  <div className={`w-16 h-16 mx-auto ${step.bgColor} rounded-2xl flex items-center justify-center`}>
                    <step.icon className={`w-8 h-8 ${step.color}`} />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-700 rounded-full border-2 border-gray-600 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-300">{index + 1}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
