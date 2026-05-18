import React from "react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  PENDING: {
    label: "Pending",
    classes: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 border-yellow-200 dark:border-yellow-800",
  },
  CONFIRMED: {
    label: "Confirmed",
    classes: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500 border-blue-200 dark:border-blue-800",
  },
  IN_PROGRESS: {
    label: "In Progress",
    classes: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-500 border-purple-200 dark:border-purple-800",
  },
  COMPLETED: {
    label: "Completed",
    classes: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500 border-green-200 dark:border-green-800",
  },
  CANCELLED: {
    label: "Cancelled",
    classes: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500 border-red-200 dark:border-red-800",
  },
  REFUNDED: {
    label: "Refunded",
    classes: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-500 border-gray-200 dark:border-gray-800",
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
  const config = statusConfig[status] || {
    label: status,
    classes: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
};
