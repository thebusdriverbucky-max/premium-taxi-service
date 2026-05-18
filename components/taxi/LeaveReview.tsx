"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface LeaveReviewProps {
  tripId: string;
  passengerName?: string;
}

export function LeaveReview({ tripId, passengerName }: LeaveReviewProps) {
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.length < 10) {
      toast.error("Please write at least 10 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: passengerName || "Anonymous",
          rating,
          content: content.trim(),
          tripId,
          source: "post_trip",
        }),
      });

      if (!res.ok) throw new Error("Failed to submit");

      setSubmitted(true);
      toast.success("Thank you for your review! It will appear after moderation.");
    } catch (error) {
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
        <p className="text-green-400 font-medium">✓ Review submitted!</p>
        <p className="text-sm text-gray-400 mt-1">It will appear on the site after moderation.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Star className="w-5 h-5 text-taxi-gold-DEFAULT" />
        Leave a Review
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star rating */}
        <div>
          <p className="text-sm text-gray-400 mb-2">Your rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-7 h-7 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? "text-taxi-gold-DEFAULT fill-taxi-gold-DEFAULT"
                      : "text-gray-600"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Review text */}
        <div>
          <p className="text-sm text-gray-400 mb-2">Your experience</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tell us about your trip experience..."
            rows={3}
            maxLength={500}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-taxi-gold-DEFAULT/50 resize-none"
          />
          <p className="text-xs text-gray-600 mt-1 text-right">{content.length}/500</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || content.length < 10}
          className="w-full py-3 rounded-xl bg-taxi-gold-gradient text-taxi-dark-navy font-bold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
}
