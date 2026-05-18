"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Plus, Upload, Image as ImageIcon, X, Trash2 } from "lucide-react";
import TariffsTable from "@/components/admin/TariffsTable";
import { CldUploadWidget } from "next-cloudinary";

interface TariffPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  vehicleType: string | null;
  basePrice: number | string;
  pricePerKm: number | string;
  pricePerMin: number | string;
  minPrice?: number | string;
  zones?: any;
  currency: string;
  maxPassengers: number;
  maxLuggage: number;
  features: string[];
  image: string | null;
  isActive: boolean;
  isFeatured: boolean;
}

export default function AdminTariffsPage() {
  const { data: session } = useSession();
  const [tariffs, setTariffs] = useState<TariffPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    vehicleType: "Sedan",
    basePrice: "",
    pricePerKm: "",
    pricePerMin: "0",
    minPrice: "0",
    zones: [] as any[],
    currency: "EUR",
    maxPassengers: "4",
    maxLuggage: "2",
    features: "",
    image: "",
    isActive: true,
    isFeatured: false,
  });

  useEffect(() => {
    if (session && session.user?.role !== "ADMIN") {
      redirect("/");
    }
  }, [session]);

  useEffect(() => {
    fetchTariffs();
  }, []);

  const fetchTariffs = async () => {
    try {
      const response = await fetch("/api/tariffs");
      const data = await response.json();
      if (Array.isArray(data)) {
        setTariffs(data);
      }
    } catch (error) {
      console.error("Failed to fetch tariffs:", error);
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
      const url = editingId ? `/api/tariffs/${editingId}` : "/api/tariffs";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchTariffs();
        setDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Failed to save tariff:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const response = await fetch(`/api/tariffs/${deleteId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchTariffs();
        setDeleteDialogOpen(false);
        setDeleteId(null);
      }
    } catch (error) {
      console.error("Failed to delete tariff:", error);
    }
  };

  const handleToggleActive = async (tariff: TariffPlan) => {
    try {
      const response = await fetch(`/api/tariffs/${tariff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !tariff.isActive }),
      });
      if (response.ok) {
        await fetchTariffs();
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };

  const addZone = () => {
    setFormData({
      ...formData,
      zones: [
        ...formData.zones,
        { name: "", minKm: 0, maxKm: 999, minPrice: 0 }
      ]
    });
  };

  const removeZone = (index: number) => {
    const newZones = [...formData.zones];
    newZones.splice(index, 1);
    setFormData({ ...formData, zones: newZones });
  };

  const updateZone = (index: number, field: string, value: any) => {
    const newZones = [...formData.zones];
    newZones[index] = { ...newZones[index], [field]: value };
    setFormData({ ...formData, zones: newZones });
  };

  const handleEdit = (tariff: TariffPlan) => {
    setEditingId(tariff.id);
    let zonesArr = [];
    if (tariff.zones) {
      zonesArr = Array.isArray(tariff.zones) ? tariff.zones : (typeof tariff.zones === 'string' ? JSON.parse(tariff.zones) : []);
    }
    setFormData({
      name: tariff.name,
      description: tariff.description || "",
      vehicleType: tariff.vehicleType || "Sedan",
      basePrice: tariff.basePrice.toString(),
      pricePerKm: tariff.pricePerKm.toString(),
      pricePerMin: tariff.pricePerMin.toString(),
      minPrice: (tariff.minPrice ?? 0).toString(),
      zones: zonesArr,
      currency: tariff.currency,
      maxPassengers: tariff.maxPassengers.toString(),
      maxLuggage: tariff.maxLuggage.toString(),
      features: Array.isArray(tariff.features) ? tariff.features.join(", ") : "",
      image: tariff.image || "",
      isActive: tariff.isActive,
      isFeatured: tariff.isFeatured,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      vehicleType: "Sedan",
      basePrice: "",
      pricePerKm: "",
      pricePerMin: "0",
      minPrice: "0",
      zones: [],
      currency: "EUR",
      maxPassengers: "4",
      maxLuggage: "2",
      features: "",
      image: "",
      isActive: true,
      isFeatured: false,
    });
    setEditingId(null);
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const vehicleTypes = [
    { value: "Sedan", label: "Sedan" },
    { value: "SUV", label: "SUV" },
    { value: "Van", label: "Van" },
    { value: "Minibus", label: "Minibus" },
  ];

  const currencies = [
    { value: "EUR", label: "EUR (€)" },
    { value: "USD", label: "USD ($)" },
    { value: "GBP", label: "GBP (£)" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold bg-taxi-gold-gradient-left bg-clip-text text-transparent">
          Tariff Plans
        </h1>
        <Button
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="gap-2 bg-taxi-gold-gradient-left hover:opacity-90 text-taxi-dark-navy border-none shadow-lg shadow-taxi-gold/20"
        >
          <Plus className="w-5 h-5" />
          New Tariff
        </Button>
      </div>

      <p className="text-xs text-gray-400 text-center mt-2 mb-3 md:hidden select-none">
        ← Scroll left/right to see all →
      </p>

      <TariffsTable
        tariffs={tariffs}
        onEdit={handleEdit}
        onDelete={(id) => { setDeleteId(id); setDeleteDialogOpen(true); }}
        onToggleActive={handleToggleActive}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingId ? "Edit Tariff" : "New Tariff"}
        onConfirm={handleSubmit}
        confirmText={editingId ? "Update" : "Create"}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          <Input
            label="Name*"
            placeholder="e.g. Economy"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <Select
            label="Vehicle Type"
            options={vehicleTypes}
            value={formData.vehicleType}
            onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Base Price*"
              type="number"
              step="0.01"
              value={formData.basePrice}
              onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
              required
            />
            <Input
              label="Price per km*"
              type="number"
              step="0.01"
              value={formData.pricePerKm}
              onChange={(e) => setFormData({ ...formData, pricePerKm: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price per minute"
              type="number"
              step="0.01"
              value={formData.pricePerMin}
              onChange={(e) => setFormData({ ...formData, pricePerMin: e.target.value })}
            />
            <Input
              label="Minimum Trip Price (€)"
              type="number"
              step="0.5"
              min="0"
              value={formData.minPrice}
              onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
              placeholder="0 = no minimum"
            />
          </div>
          <Select
            label="Currency"
            options={currencies}
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            required
          />

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-white/90">
                Price Zones
                <span className="text-xs text-gray-400 ml-2">Define minimum prices per distance zone</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addZone}
                className="h-8 px-2 text-taxi-gold hover:text-taxi-gold/80 hover:bg-taxi-gold/10"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Zone
              </Button>
            </div>

            {formData.zones.length === 0 ? (
              <div className="text-xs text-gray-500 italic p-3 bg-white/5 rounded-lg border border-dashed border-white/10 text-center">
                No custom zones defined. Using global minimum price.
              </div>
            ) : (
              <div className="space-y-3">
                {formData.zones.map((zone: any, index: number) => (
                  <div key={index} className="p-3 bg-white/5 rounded-xl border border-white/10 relative group">
                    <button
                      type="button"
                      onClick={() => removeZone(index)}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 uppercase font-bold px-1">Zone Name</span>
                        <Input
                          placeholder="e.g. Airport"
                          value={zone.name}
                          onChange={(e) => updateZone(index, "name", e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 uppercase font-bold px-1">Min Price</span>
                        <Input
                          type="number"
                          placeholder="Min Price"
                          value={zone.minPrice}
                          onChange={(e) => updateZone(index, "minPrice", e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 uppercase font-bold">Min KM</span>
                        <Input
                          type="number"
                          value={zone.minKm}
                          onChange={(e) => updateZone(index, "minKm", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 uppercase font-bold">Max KM</span>
                        <Input
                          type="number"
                          value={zone.maxKm}
                          onChange={(e) => updateZone(index, "maxKm", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Passengers"
              type="number"
              value={formData.maxPassengers}
              onChange={(e) => setFormData({ ...formData, maxPassengers: e.target.value })}
            />
            <Input
              label="Max Luggage"
              type="number"
              value={formData.maxLuggage}
              onChange={(e) => setFormData({ ...formData, maxLuggage: e.target.value })}
            />
          </div>
          <Textarea
            label="Features (comma separated)"
            placeholder="Free WiFi, Air Conditioning, Bottled Water"
            value={formData.features}
            onChange={(e) => setFormData({ ...formData, features: e.target.value })}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">Tariff Image (Cloudinary or Direct URL)</label>
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
                        <img src={formData.image} alt="Tariff" className="w-full h-full object-cover" />
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

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-5 h-5 rounded border-white/10 bg-white/5 text-taxi-gold focus:ring-taxi-gold/50"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-white/90 cursor-pointer">
                Is Active
              </label>
            </div>
            <div className="flex-1 flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <input
                type="checkbox"
                id="isFeatured"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-5 h-5 rounded border-white/10 bg-white/5 text-taxi-gold focus:ring-taxi-gold/50"
              />
              <label htmlFor="isFeatured" className="text-sm font-medium text-white/90 cursor-pointer">
                Is Featured
              </label>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Tariff"
        description="Are you sure you want to delete this tariff plan? This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete"
        isDangerous
      />
    </div>
  );
}
