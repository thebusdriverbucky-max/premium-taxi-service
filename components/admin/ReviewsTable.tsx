"use client";

import { Star, Trash2, CheckCircle, XCircle, Edit } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Review {
  id: string;
  authorName: string;
  authorImage: string | null;
  rating: number;
  content: string;
  tripType: string | null;
  isApproved: boolean;
  createdAt: string;
}

interface ReviewsTableProps {
  reviews: Review[];
  onEdit: (review: Review) => void;
  onDelete: (id: string) => void;
  onToggleApproval: (review: Review) => void;
}

export default function ReviewsTable({
  reviews,
  onEdit,
  onDelete,
  onToggleApproval,
}: ReviewsTableProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Author</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Rating</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Content</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No reviews found.
                </td>
              </tr>
            ) : (
              reviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{review.authorName}</div>
                    <div className="text-xs text-gray-500">{review.tripType || "General"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 dark:text-gray-600"
                            }`}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 max-w-xs">
                      {review.content}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onToggleApproval(review)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${review.isApproved
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-200"
                        }`}
                    >
                      {review.isApproved ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approved
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          Pending
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(review)}
                        className="h-8 w-8 p-0 bg-slate-800/50 border border-slate-700 hover:bg-slate-700 text-taxi-gold-DEFAULT"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(review.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
