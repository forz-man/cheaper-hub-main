"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

export default function PayoutSetupCard() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSetupPayouts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/vendor/payout", {
        method: "POST",
      });
      
      const data = await response.json();
      
      if (data.url) {
        // Redirect the user to the Stripe hosted onboarding page
        window.location.href = data.url;
      } else {
        console.error("Failed to generate link:", data.error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Network error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white border rounded-xl shadow-sm max-w-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Get Paid</h2>
          <p className="text-sm text-gray-500">Connect your bank account to receive payouts.</p>
        </div>
      </div>
      
      <button
        onClick={handleSetupPayouts}
        disabled={isLoading}
        className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-70"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Connecting...
          </>
        ) : (
          "Set up Payouts with Stripe"
        )}
      </button>
    </div>
  );
}