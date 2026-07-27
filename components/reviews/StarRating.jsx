"use client";

import { Star } from "lucide-react";

const LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export default function StarRating({ value, onChange, size = 18, showLabel, interactive, className = "" }) {
  const stars = [1, 2, 3, 4, 5];

  if (interactive && onChange) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {stars.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
            aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
          >
            <Star
              size={size}
              className={s <= value ? "text-amber-500 fill-amber-500" : "text-gray-200"}
            />
          </button>
        ))}
        {showLabel && value > 0 && (
          <span className="text-xs text-gray-400 ml-1">{LABELS[value]}</span>
        )}
      </div>
    );
  }

  const fullStars = Math.floor(value);
  const hasHalf = value % 1 >= 0.5;

  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-label={`${value} out of 5 stars`}>
      {stars.map((s) => (
        <Star
          key={s}
          size={size}
          className={
            s <= fullStars
              ? "text-amber-500 fill-amber-500"
              : s === fullStars + 1 && hasHalf
                ? "text-amber-500 fill-amber-500 opacity-50"
                : "text-gray-200"
          }
        />
      ))}
    </div>
  );
}
