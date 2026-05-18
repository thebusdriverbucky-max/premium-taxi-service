"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { Plus, Upload, Image as ImageIcon, X } from "lucide-react";
import VehiclesTable from "@/components/admin/VehiclesTable";
import { CldUploadWidget } from "next-cloudinary";

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

export default function AdminVehiclesPage() {
  const { data: session } = useSession();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear().toString(),
    licensePlate: "",
    color: "",
    type: "Sedan",
    capacity: "4",
    luggageCapacity: "2",
    image: "",
    isActive: true,
  });

  useEffect(() => {
    if (session && session.user?.role !== "ADMIN") {
      redirect("/");
    }
  }, [session]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles");
      const data = await response.json();
      if (Array.isArray(data)) {
        setVehicles(data);
      }
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateImageUrl = (url: string) => {
    if (!url) return true;
    const allowedDomains = ["imgur.com", "cloudinary.com", "unsplash.com"];
    try {
      const parsedUrl = new URL(url);
      return allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain));
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (formData.image && !validateImageUrl(formData.image)) {
      alert("Invalid image URL. Only imgur.com, cloudinary.com, and unsplash.com are allowed.");
      return;
    }

    try {
      const url = editingId ? `/api/vehicles/${editingId}` : "/api/vehicles";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchVehicles();
        setDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Failed to save vehicle:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const response = await fetch(`/api/vehicles/${deleteId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchVehicles();
        setDeleteDialogOpen(false);
        setDeleteId(null);
      }
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
    }
  };

  const handleToggleActive = async (vehicle: Vehicle) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !vehicle.isActive }),
      });
      if (response.ok) {
        await fetchVehicles();
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year?.toString() || "",
      licensePlate: vehicle.licensePlate,
      color: vehicle.color || "",
      type: vehicle.type || "Sedan",
      capacity: vehicle.capacity.toString(),
      luggageCapacity: vehicle.luggageCapacity.toString(),
      image: vehicle.image || "",
      isActive: vehicle.isActive,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      make: "",
      model: "",
      year: new Date().getFullYear().toString(),
      licensePlate: "",
      color: "",
      type: "Sedan",
      capacity: "4",
      luggageCapacity: "2",
      image: "",
      isActive: true,
    });
    setEditingId(null);
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const vehicleTypes = [
    { value: "Sedan", label: "Sedan" },
    { value: "SUV", label: "SUV" },
    { value: "Van", label: "Van" },
    { value: "Minibus", label: "Minibus" },
    { value: "Luxury", label: "Luxury" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold bg-taxi-gold-gradient-left bg-clip-text text-transparent">
          Fleet Management
        </h1>
        <Button
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="gap-2 bg-taxi-gold-gradient-left hover:opacity-90 text-taxi-dark-navy border-none shadow-lg shadow-taxi-gold/20"
        >
          <Plus className="w-5 h-5" />
          Add Vehicle
        </Button>
      </div>

      <p className="text-xs text-gray-400 text-center mt-2 mb-3 md:hidden select-none">
        ← Scroll left/right to see all →
      </p>

      <VehiclesTable
        vehicles={vehicles}
        onEdit={handleEdit}
        onDelete={(id) => { setDeleteId(id); setDeleteDialogOpen(true); }}
        onToggleActive={handleToggleActive}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingId ? "Edit Vehicle" : "Add Vehicle"}
        onConfirm={handleSubmit}
        confirmText={editingId ? "Update" : "Add"}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Make*"
              placeholder="e.g. Toyota"
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              required
            />
            <Input
              label="Model*"
              placeholder="e.g. Camry"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Year"
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            />
            <Input
              label="License Plate*"
              placeholder="ABC-1234"
              value={formData.licensePlate}
              onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Color"
              placeholder="e.g. Black"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
            <Select
              label="Vehicle Type"
              options={vehicleTypes}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Capacity (Passengers)"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            />
            <Input
              label="Luggage Capacity"
              type="number"
              value={formData.luggageCapacity}
              onChange={(e) => setFormData({ ...formData, luggageCapacity: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">Vehicle Image (Cloudinary or Direct URL)</label>
            <div className="flex flex-col gap-4">
              <Input
                placeholder="https://imgur.com/..."
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              />
              <CldUploadWidget
                uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
                onSuccess={(result: any) => {
                  if (result.info?.secure_url) {
                    setFormData({ ...formData, image: result.info.secure_url });
                  }
                }}
              >
                {(widget) => (
                  <div className="flex flex-col gap-4">
                    {formData.image && (formData.image.startsWith('http') || formData.image.startsWith('/')) && (
                      <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-white/10 group">
                        <img src={formData.image} alt="Vehicle" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, image: "" })}
                            className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                    <Button
                      type="button"
                      onClick={() => widget?.open?.()}
                      variant="ghost"
                      className="w-full gap-2 bg-white/10 border border-white/10 text-taxi-gold hover:bg-white/20 hover:border-taxi-gold/30 h-12 rounded-xl border-dashed transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      Upload via Cloudinary
                    </Button>
                  </div>
                )}
              </CldUploadWidget>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5 rounded border-white/10 bg-white/5 text-taxi-gold focus:ring-taxi-gold/50"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-white/90 cursor-pointer">
              Vehicle is Active and available for bookings
            </label>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Vehicle"
        description="Are you sure you want to delete this vehicle? This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete"
        isDangerous
      />
    </div>
  );
}
