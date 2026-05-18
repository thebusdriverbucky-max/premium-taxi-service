"use client";

import { Trash2, Edit, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
}

interface FaqTableProps {
  items: FaqItem[];
  onEdit: (item: FaqItem) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (item: FaqItem) => void;
}

export default function FaqTable({
  items,
  onEdit,
  onDelete,
  onToggleVisibility,
}: FaqTableProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Question</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Category</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Order</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No FAQ items found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white line-clamp-1 max-w-xs">{item.question}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.category || "General"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.sortOrder}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onToggleVisibility(item)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${item.isVisible
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200"
                        }`}
                    >
                      {item.isVisible ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          Hidden
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                        className="h-8 w-8 p-0 bg-slate-800/50 border border-slate-700 hover:bg-slate-700 text-taxi-gold-DEFAULT"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(item.id)}
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
