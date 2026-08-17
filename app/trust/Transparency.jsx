import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, DollarSign, BarChart3, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function Transparency() {
  const revenueStreams = [
    {
      source: "Affiliate Commissions",
      percentage: "60%",
      description: "When users make purchases through our deal links"
    },
    {
      source: "Data Insights (Optional)",
      percentage: "25%",
      description: "Anonymized shopping pattern insights (85% goes to users)"
    },
    {
      source: "Premium Features",
      percentage: "15%",
      description: "Advanced features and priority support"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-white">Complete Transparency</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          We believe you should know exactly how we operate and make money
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Revenue Breakdown */}
        <Card className="dark-card border-gray-700 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              Our Revenue Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {revenueStreams.map((stream, index) => (
              <motion.div
                key={stream.source}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{stream.source}</h4>
                  <p className="text-sm text-gray-400 mt-1">{stream.description}</p>
                </div>
                <Badge className="bg-blue-900/50 text-blue-300 border-blue-500/50 font-bold">
                  {stream.percentage}
                </Badge>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* User Benefits */}
        <Card className="dark-card border-gray-700 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <Users className="w-6 h-6 text-green-400" />
              How You Benefit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-green-900/30 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Always Free Core Features</h4>
                  <p className="text-sm text-gray-400">Deal finding, price comparisons, and basic features are always free</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-green-900/30 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Revenue Sharing Program</h4>
                  <p className="text-sm text-gray-400">Opt-in to earn 15% of revenue from your anonymized data</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-green-900/30 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Better Deals Over Time</h4>
                  <p className="text-sm text-gray-400">As our AI improves, you get access to better and more exclusive deals</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
