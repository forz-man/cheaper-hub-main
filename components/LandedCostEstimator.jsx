"use client";

import { useState } from "react";
import { Calculator, Truck, MapPin, Package } from "lucide-react";

export default function LandedCostEstimator({ initialPrice = 100, itemWeight = 10 }) {
  const [basePrice, setBasePrice] = useState(initialPrice);
  const [zone, setZone] = useState("local");
  const [deliveryBlock, setDeliveryBlock] = useState("standard");
  const [quantity, setQuantity] = useState(1);

  // Logistics math
  const getFreightCost = () => {
    const zoneMultipliers = { local: 1, regional: 2.5, national: 5 };
    return (itemWeight * quantity) * zoneMultipliers[zone];
  };

  const getLocalDeliveryCost = () => {
    // Standard routes vs dedicated local blocks
    const blockRates = { standard: 15, priority: 35, dedicated_block: 75 };
    return blockRates[deliveryBlock];
  };

  const freightCost = getFreightCost();
  const localDeliveryCost = getLocalDeliveryCost();
  const totalLandedCost = (basePrice * quantity) + freightCost + localDeliveryCost;
  const costPerUnit = totalLandedCost / quantity;

  return (
    <div className="max-w-md p-6 bg-white border rounded-xl shadow-sm">
      <div className="flex items-center gap-2 mb-6 border-b pb-4">
        <Calculator className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-gray-800">Landed Cost Estimator</h2>
      </div>

      <div className="space-y-5">
        {/* Order Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Unit Price ($)</label>
            <input
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Freight Zone */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
            <MapPin className="w-4 h-4" /> Freight Zone
          </label>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="w-full p-2 border rounded-lg bg-gray-50"
          >
            <option value="local">Local (In-State)</option>
            <option value="regional">Regional (Neighboring States)</option>
            <option value="national">National (Cross-Country)</option>
          </select>
        </div>

        {/* Final Mile Block */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
            <Truck className="w-4 h-4" /> Final Mile Route
          </label>
          <select
            value={deliveryBlock}
            onChange={(e) => setDeliveryBlock(e.target.value)}
            className="w-full p-2 border rounded-lg bg-gray-50"
          >
            <option value="standard">Standard Route ($15)</option>
            <option value="priority">Priority Commute ($35)</option>
            <option value="dedicated_block">Dedicated Delivery Block ($75)</option>
          </select>
        </div>

        {/* Cost Breakdown */}
        <div className="pt-4 mt-4 border-t space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal ({quantity} units)</span>
            <span>${(basePrice * quantity).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Freight (Weight × Zone)</span>
            <span>${freightCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Final Mile Delivery</span>
            <span>${localDeliveryCost.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center pt-3 mt-3 border-t">
            <span className="font-bold text-gray-800">Total Landed Cost</span>
            <span className="text-xl font-black text-blue-600">${totalLandedCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">True Cost Per Unit</span>
            <span className="text-sm font-semibold text-gray-700">${costPerUnit.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}