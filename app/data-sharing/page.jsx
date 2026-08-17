"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Zap, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

import DataSharingHero from "@/components/datasharing/DataSharingHero";
import BenefitsGrid from "@/components/datasharing/BenefitsGrid";
import RevenueCalculator from "@/components/datasharing/RevenueCalculator";
import PrivacyGuarantees from "@/components/datasharing/PrivacyGuarantees";

export default function DataSharingPage() {
  const [userPrefs, setUserPrefs] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (prefs) {
          setUserPrefs(prefs);
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
    setIsLoading(false);
  };

  const handleToggleDataSharing = async (enabled) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { data } = await supabase
        .from('user_preferences')
        .upsert({ 
          user_id: user.id, 
          data_sharing_enabled: enabled, 
          revenue_share_percentage: enabled ? 15 : 0 
        })
        .select()
        .single();
        
      if (data) setUserPrefs(data);
    } catch (error) {
      console.error("Error updating preferences:", error);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] p-8 pt-24">
        <div className="max-w-4xl mx-auto animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
          <div className="h-64 bg-white rounded-xl border border-gray-200"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef] p-8 pt-24" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="max-w-6xl mx-auto space-y-12">
        <DataSharingHero />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-white border-gray-200 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-black">
                <Zap className="w-6 h-6 text-blue-500" />
                Your Data Sharing Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label htmlFor="data-sharing" className="text-lg font-semibold text-black">
                    Enable Data Sharing Program
                  </Label>
                  <p className="text-gray-500">
                    Share anonymized shopping data to help improve deals for everyone and earn revenue
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={userPrefs?.data_sharing_enabled ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}>
                    {userPrefs?.data_sharing_enabled ? "Active" : "Inactive"}
                  </Badge>
                  <Switch
                    id="data-sharing"
                    checked={userPrefs?.data_sharing_enabled || false}
                    onCheckedChange={handleToggleDataSharing}
                    disabled={isSaving || !user}
                  />
                </div>
              </div>

              {userPrefs?.data_sharing_enabled && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h4 className="font-semibold text-green-800">You&apos;re earning revenue!</h4>
                  </div>
                  <p className="text-green-700 text-sm">
                    You receive {userPrefs.revenue_share_percentage}% of revenue generated from your anonymized data.
                  </p>
                </motion.div>
              )}
              {!user && (
                <p className="text-sm text-red-500 font-medium mt-4">Please log in to manage your data sharing preferences.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <BenefitsGrid dataSharing={userPrefs?.data_sharing_enabled || false} />
        <RevenueCalculator enabled={userPrefs?.data_sharing_enabled} />
        <PrivacyGuarantees />
      </div>
    </div>
  );
}