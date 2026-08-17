"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Percent, Database } from "lucide-react";
import { motion } from "framer-motion";

export default function BenefitsGrid({ totalSavings = 0, totalSpent = 0, totalPurchases = 0, dataSharing = false }) {
  const stats = [
    {
      title: "Total Purchases",
      value: totalPurchases,
      icon: TrendingUp,
      color: "text-blue-400",
      bgColor: "bg-blue-900/30"
    },
    {
      title: "Total Spent",
      value: `$${totalSpent.toFixed(2)}`,
      icon: DollarSign,
      color: "text-purple-400",
      bgColor: "bg-purple-900/30"
    },
    {
      title: "Total Saved",
      value: `$${totalSavings.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-400",
      bgColor: "bg-green-900/30"
    },
    {
      title: "Data Sharing",
      value: dataSharing ? "Active" : "Inactive",
      icon: Database,
      color: dataSharing ? "text-orange-400" : "text-gray-400",
      bgColor: dataSharing ? "bg-orange-900/30" : "bg-gray-700"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="dark-card hover:shadow-2xl transition-all duration-300 border-gray-700 hover:border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1 text-white">{stat.value}</p>
                  {stat.title === "Data Sharing" && dataSharing && (
                    <Badge className="mt-2 bg-orange-500/20 text-orange-300 border-orange-400">
                      Earning Revenue
                    </Badge>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}