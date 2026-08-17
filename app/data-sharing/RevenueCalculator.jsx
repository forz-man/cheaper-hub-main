"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Calculator, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

export default function RevenueCalculator({ enabled }) {
  const [monthlySearches, setMonthlySearches] = useState([20]);

  const revenuePerSearch = 0.15; // $0.15 per search
  const userSharePercentage = 15; // 15% share
  const monthlyRevenue = monthlySearches[0] * revenuePerSearch * (userSharePercentage / 100);
  const yearlyRevenue = monthlyRevenue * 12;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
    >
      <Card className="dark-card border-gray-700 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white">
            <Calculator className="w-6 h-6 text-blue-400" />
            Revenue Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="font-medium text-white">
                Monthly Searches: {monthlySearches[0]}
              </label>
              <span className="text-sm text-gray-400">
                Adjust based on your usage
              </span>
            </div>
            <Slider
              value={monthlySearches}
              onValueChange={setMonthlySearches}
              max={200}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-6 bg-green-900/30 rounded-xl border border-green-500/50">
              <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-300">${monthlyRevenue.toFixed(2)}</p>
              <p className="text-sm text-green-400/80">Monthly Earnings</p>
            </div>
            <div className="text-center p-6 bg-blue-900/30 rounded-xl border border-blue-500/50">
              <DollarSign className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-300">${yearlyRevenue.toFixed(2)}</p>
              <p className="text-sm text-blue-400/80">Yearly Earnings</p>
            </div>
          </div>

          <div className="text-center text-sm text-gray-400 space-y-2">
            <p>
              <strong>How it works:</strong> We earn revenue when companies use aggregated, anonymized data insights.
            </p>
            <p>
              You get 15% of the revenue generated from your contribution.
            </p>
            {!enabled && (
              <p className="text-orange-400 font-medium">
                Enable data sharing above to start earning!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}