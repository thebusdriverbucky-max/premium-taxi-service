"use client";

import { Button } from "@/components/ui/Button";
import { Trash2, Edit2, CheckCircle, XCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface TariffPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  vehicleType: string | null;
  basePrice: number | string | any;
  pricePerKm: number | string | any;
  pricePerMin: number | string | any;
  minPrice?: number | string | any;
  zones?: any;
  currency: string;
  maxPassengers: number;
  maxLuggage: number;
  features: string[];
  image: string | null;
  isActive: boolean;
  isFeatured: boolean;
}

interface TariffsTableProps {
  tariffs: TariffPlan[];
  onEdit: (tariff: TariffPlan) => void;
  onDelete: (id: string) => void;
  onToggleActive: (tariff: TariffPlan) => void;
}

export default function TariffsTable({
  tariffs,
  onEdit,
  onDelete,
  onToggleActive,
}: TariffsTableProps) {
  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="w-full">
        <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="text-left px-6 py-3 font-semibold">Name</th>
            <th className="text-left px-6 py-3 font-semibold">Vehicle Type</th>
            <th className="text-left px-6 py-3 font-semibold">Base Price</th>
            <th className="text-left px-6 py-3 font-semibold">Price per km</th>
            <th className="text-left px-6 py-3 font-semibold">Max Pass.</th>
            <th className="text-left px-6 py-3 font-semibold">Status</th>
            <th className="text-left px-6 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tariffs.map((tariff) => (
            <tr
              key={tariff.id}
              className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td className="px-6 py-4 font-medium">{tariff.name}</td>
              <td className="px-6 py-4">{tariff.vehicleType || "N/A"}</td>
              <td className="px-6 py-4">{formatPrice(tariff.basePrice, tariff.currency)}</td>
              <td className="px-6 py-4">{formatPrice(tariff.pricePerKm, tariff.currency)}/km</td>
              <td className="px-6 py-4">{tariff.maxPassengers}</td>
              <td className="px-6 py-4">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${tariff.isActive
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                >
                  {tariff.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-6 py-4 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleActive(tariff)}
                  title={tariff.isActive ? "Deactivate" : "Activate"}
                  className="bg-slate-800/50 border border-slate-700 hover:bg-slate-700 text-taxi-gold-DEFAULT"
                >
                  {tariff.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(tariff)}
                  className="bg-slate-800/50 border border-slate-700 hover:bg-slate-700 text-taxi-gold-DEFAULT"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(tariff.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
