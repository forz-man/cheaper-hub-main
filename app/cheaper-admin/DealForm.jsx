"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function DealForm({ onDealCreated }) {
  const [formData, setFormData] = useState({
    product_name: "", original_price: "", discounted_price: "",
    retailer: "", product_url: "", image_url: "",
    coupon_code: "", expires_at: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    const payload = {
      product_name: formData.product_name,
      retailer: formData.retailer,
      original_price: parseFloat(formData.original_price),
      discounted_price: parseFloat(formData.discounted_price),
      discount_percentage: (1 - parseFloat(formData.discounted_price) / parseFloat(formData.original_price)) * 100,
      product_url: formData.product_url,
      image_url: formData.image_url,
      coupon_code: formData.coupon_code,
      expires_at: formData.expires_at || null,
      deal_type: "manual_entry",
      verification_status: "verified"
    };

    const { data, error } = await supabase.from("deals").insert([payload]).select().single();
    
    if (!error) onDealCreated(data);
    setIsSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader><CardTitle>Add a New Manual Deal</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="product_name" placeholder="Product Name" onChange={handleChange} required />
            <div className="grid grid-cols-2 gap-4">
              <Input name="original_price" type="number" step="0.01" placeholder="Original Price" onChange={handleChange} required />
              <Input name="discounted_price" type="number" step="0.01" placeholder="Discounted Price" onChange={handleChange} required />
            </div>
            <Input name="retailer" placeholder="Retailer" onChange={handleChange} required />
            <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : "Save Deal"}</Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}