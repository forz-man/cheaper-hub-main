"use client";

import StarRating from "./StarRating";

export default function ReviewCard({ review, isOwn, className = "" }) {
  const dateStr = review.date
    ? new Date(review.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className={`pb-5 border-b border-gray-100 last:border-0 last:pb-0 ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-black">{review.author}</span>
            {review.verified && (
              <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                Verified
              </span>
            )}
            {isOwn && (
              <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                You
              </span>
            )}
          </div>
          <StarRating value={review.rating} size={10} className="mt-1" />
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">{dateStr}</span>
      </div>
      {review.comment && (
        <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
      )}
    </div>
  );
}
