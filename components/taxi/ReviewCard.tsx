"use client";

import { useState } from "react";
import { Star, Quote } from "lucide-react";
import Image from "next/image";
import { Modal } from "@/components/ui/Modal";

interface ReviewCardProps {
  review: {
    id: string;
    authorName: string;
    authorImage: string | null;
    rating: number;
    content: string;
    tripType: string | null;
    createdAt: Date | string;
  };
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-taxi-gold/30 transition-all duration-500 group backdrop-blur-sm flex flex-col relative cursor-pointer h-full"
      >
        <Quote className="absolute top-6 right-8 w-12 h-12 text-white/5 group-hover:text-taxi-gold/10 transition-colors" />

        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="relative w-14 h-14 rounded-full overflow-hidden bg-white/10 border border-white/10 shrink-0">
            {review.authorImage ? (
              <Image
                src={review.authorImage}
                alt={review.authorName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-taxi-gold font-bold text-xl">
                {review.authorName.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-white font-bold group-hover:text-taxi-gold transition-colors">{review.authorName}</h4>
            {review.tripType && (
              <p className="text-taxi-gold/70 text-[10px] uppercase tracking-[0.2em] font-bold">
                {review.tripType}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-1 mb-6">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < review.rating ? "text-taxi-gold fill-taxi-gold" : "text-gray-700"
                }`}
            />
          ))}
        </div>

        <p className="text-gray-300 italic leading-relaxed flex-grow relative z-10 line-clamp-3 min-h-[4.5rem]">
          "{review.content}"
        </p>

        <div className="mt-8 pt-6 border-t border-white/5 text-gray-500 text-xs font-medium">
          {new Date(review.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          })}
        </div>
      </div>

      <Modal
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Review Details"
        size="lg"
      >
        <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white/10 border border-white/10 shrink-0">
              {review.authorImage ? (
                <Image
                  src={review.authorImage}
                  alt={review.authorName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-taxi-gold font-bold text-2xl">
                  {review.authorName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-white text-xl font-bold">{review.authorName}</h4>
              {review.tripType && (
                <p className="text-taxi-gold/70 text-xs uppercase tracking-[0.2em] font-bold">
                  {review.tripType}
                </p>
              )}
              <div className="flex gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < review.rating ? "text-taxi-gold fill-taxi-gold" : "text-gray-700"
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <Quote className="absolute -top-4 -left-4 w-10 h-10 text-white/5" />
            <p className="text-gray-200 text-lg italic leading-relaxed relative z-10 break-words whitespace-pre-wrap">
              {review.content}
            </p>
          </div>

          <div className="text-gray-500 text-sm border-t border-white/5 pt-4">
            Posted on {new Date(review.createdAt).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </div>
        </div>
      </Modal>
    </>
  );
}
