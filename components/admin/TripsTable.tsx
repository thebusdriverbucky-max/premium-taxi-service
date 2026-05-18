// components/admin/TripsTable.tsx
"use client";

import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { Eye, Check, X, CheckCircle } from "lucide-react";

export interface Trip {
  id: string;
  tripNumber?: string | null;
  user?: { email: string; name: string } | null;
  passengerName?: string | null;
  passengerEmail?: string | null;
  passengerPhone?: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledAt?: string | null;
  status: string;
  paymentStatus: string;
  total: string | number | null;
  currency: string;
  createdAt: string;
  notes?: string | null;
  passengerCount?: number | null;
  flightNumber?: string | null;
  tariffPlan?: {
    name: string;
  } | null;
  vehicleId?: string | null;
  vehicle?: {
    make: string;
    model: string;
    licensePlate: string;
  } | null;
  driverId?: string | null;
  driver?: {
    name: string;
    phone?: string | null;
  } | null;
}

interface TripsTableProps {
  trips: Trip[];
  onViewDetails: (trip: Trip) => void;
  onUpdateStatus: (tripId: string, status: string) => void;
}

export default function TripsTable({ trips, onViewDetails, onUpdateStatus }: TripsTableProps) {
  const getPassengerName = (trip: Trip) => {
    return trip.passengerName || trip.user?.name || "Guest Passenger";
  };

  const getPassengerEmail = (trip: Trip) => {
    return trip.passengerEmail || trip.user?.email || "No email";
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "IN_PROGRESS":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "COMPLETED":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "CANCELLED":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      case "REFUNDED":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  if (!trips || trips.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <p className="text-gray-500">No trips found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="w-full">
        <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-sm">Trip #</th>
            <th className="text-left px-4 py-3 font-semibold text-sm">Passenger</th>
            <th className="text-left px-4 py-3 font-semibold text-sm">Pickup → Dropoff</th>
            <th className="text-left px-4 py-3 font-semibold text-sm">Scheduled</th>
            <th className="text-left px-4 py-3 font-semibold text-sm">Tariff</th>
            <th className="text-left px-4 py-3 font-semibold text-sm">Status</th>
            <th className="text-left px-4 py-3 font-semibold text-sm">Payment</th>
            <th className="text-left px-4 py-3 font-semibold text-sm">Total</th>
            <th className="text-left px-4 py-3 font-semibold text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => (
            <tr
              key={trip.id}
              className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td className="px-4 py-4 font-mono text-xs">
                {trip.tripNumber || trip.id.slice(0, 8)}
              </td>
              <td className="px-4 py-4">
                <div className="text-sm">
                  <p className="font-medium">{getPassengerName(trip)}</p>
                  <p className="text-gray-500 text-xs truncate max-w-[120px]">
                    {getPassengerEmail(trip)}
                  </p>
                </div>
              </td>
              <td className="px-4 py-4 text-xs">
                <div className="max-w-[200px] space-y-1">
                  <p className="truncate" title={trip.pickupAddress}>
                    <span className="text-green-600 font-bold">↑</span> {trip.pickupAddress}
                  </p>
                  <p className="truncate" title={trip.dropoffAddress}>
                    <span className="text-red-600 font-bold">↓</span> {trip.dropoffAddress}
                  </p>
                </div>
              </td>
              <td className="px-4 py-4 text-xs">
                {formatDate(trip.scheduledAt)}
              </td>
              <td className="px-4 py-4 text-xs">
                {trip.tariffPlan?.name || "Standard"}
              </td>
              <td className="px-4 py-4">
                <span className={`text-[10px] px-2 py-1 rounded-full font-medium uppercase ${getStatusColor(trip.status)}`}>
                  {trip.status.replace("_", " ")}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className={`text-[10px] px-2 py-1 rounded-full font-medium uppercase ${trip.paymentStatus === "paid"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
                  }`}>
                  {trip.paymentStatus}
                </span>
              </td>
              <td className="px-4 py-4 font-semibold text-sm">
                {formatPrice(trip.total || 0, trip.currency)}
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onViewDetails(trip)}
                    title="View Details"
                    className="h-8 w-8"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>

                  {trip.status === "PENDING" && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onUpdateStatus(trip.id, "CONFIRMED")}
                      title="Confirm Trip"
                      className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}

                  {(trip.status === "CONFIRMED" || trip.status === "IN_PROGRESS") && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onUpdateStatus(trip.id, "COMPLETED")}
                      title="Complete Trip"
                      className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}

                  {trip.status !== "CANCELLED" && trip.status !== "COMPLETED" && trip.status !== "REFUNDED" && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onUpdateStatus(trip.id, "CANCELLED")}
                      title="Cancel Trip"
                      className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
