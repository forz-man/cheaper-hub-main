"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import StarRating from "./StarRating";

export default function ReviewModal({
  open,
  onClose,
  productName,
  onSubmit,
  submitting,
  error,
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  if (!open) return null;

  const handleSubmit = async () => {
    if (rating < 1) return;
    await onSubmit({ rating, comment: comment.trim() });
    setRating(0);
    setComment("");
  };

  const handleClose = () => {
    setRating(0);
    setComment("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-black transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <h3 className="text-base font-bold text-black mb-1" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
          Review product
        </h3>
        <p className="text-xs text-gray-400 mb-4">{productName}</p>

        <StarRating value={rating} onChange={setRating} size={22} showLabel interactive />

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this product..."
          maxLength={2000}
          rows={3}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white resize-none focus:outline-none focus:border-gray-400 transition-colors mt-4"
        />

        {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}

        <div className="flex items-center justify-between mt-4">
          <span className="text-[10px] text-gray-300">{comment.length}/2000</span>
          <button
            onClick={handleSubmit}
            disabled={submitting || rating < 1}
            className="bg-black text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {submitting ? (
              <><Loader2 size={12} className="animate-spin" /> Submitting...</>
            ) : (
              "Submit review"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
