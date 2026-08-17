"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X } from "lucide-react";

export default function VerificationQueue({ deals, onDealVerified }) {
  const handleVerification = async (id, status) => {
    await supabase.from("deals").update({ verification_status: status }).eq("id", id);
    onDealVerified(id);
  };

  return (
    <div className="space-y-4">
      {deals.map(deal => (
        <Card key={deal.id}>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold">{deal.product_name}</p>
              <p className="text-sm text-gray-500">{deal.retailer}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleVerification(deal.id, 'failed')}><X size={16} /></Button>
              <Button size="sm" onClick={() => handleVerification(deal.id, 'verified')}><Check size={16} /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}