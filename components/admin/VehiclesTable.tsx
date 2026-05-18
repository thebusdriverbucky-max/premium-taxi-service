"use client";

import { Button } from "@/components/ui/Button";
import { Trash2, Edit2, CheckCircle, XCircle, Car } from "lucide-react";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  licensePlate: string;
  color: string | null;
  type: string | null;
  capacity: number;
  luggageCapacity: number;
  image: string | null;
  isActive: boolean;
}

interface VehiclesTableProps {
  vehicles: Vehicle[];
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
  onToggleActive: (vehicle: Vehicle) => void;
}

export default function VehiclesTable({
  vehicles,
  onEdit,
  onDelete,
  onToggleActive,
}: VehiclesTableProps) {
  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="w-full">
        <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="text-left px-6 py-3 font-semibold">Vehicle</th>
            <th className="text-left px-6 py-3 font-semibold">License Plate</th>
            <th className="text-left px-6 py-3 font-semibold">Type</th>
            <th className="text-left px-6 py-3 font-semibold">Capacity</th>
            <th className="text-left px-6 py-3 font-semibold">Status</th>
            <th className="text-left px-6 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <tr
              key={vehicle.id}
              className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    {vehicle.image ? (
                      <img src={vehicle.image} alt={vehicle.make} className="w-full h-full object-cover" />
                    ) : (
                      <Car className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                    <div className="text-xs text-gray-500">{vehicle.year} {vehicle.color}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 font-mono text-sm">{vehicle.licensePlate}</td>
              <td className="px-6 py-4">{vehicle.type || "N/A"}</td>
              <td className="px-6 py-4 text-sm">
                {vehicle.capacity} Pass. / {vehicle.luggageCapacity} Lugg.
              </td>
              <td className="px-6 py-4">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${vehicle.isActive
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                >
                  {vehicle.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-6 py-4 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleActive(vehicle)}
                  title={vehicle.isActive ? "Deactivate" : "Activate"}
                  className="bg-slate-800/50 border border-slate-700 hover:bg-slate-700 text-taxi-gold-DEFAULT"
                >
                  {vehicle.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(vehicle)}
                  className="bg-slate-800/50 border border-slate-700 hover:bg-slate-700 text-taxi-gold-DEFAULT"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(vehicle.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
          {vehicles.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                No vehicles found. Add your first vehicle to the fleet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
