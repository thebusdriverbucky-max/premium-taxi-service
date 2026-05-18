"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "sonner";
import { UserCircle, Phone, Mail, Car, Plus, Edit2, PowerOff } from "lucide-react";

interface Driver {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  licenseNumber?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  photoUrl: "",
  licenseNumber: "",
  notes: "",
  isActive: true,
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchDrivers(); }, []);

  const fetchDrivers = async () => {
    try {
      const res = await fetch("/api/drivers");
      const data = await res.json();
      setDrivers(Array.isArray(data) ? data : []);
    } catch { toast.error("Failed to load drivers"); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditingDriver(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setForm({
      name: driver.name,
      phone: driver.phone || "",
      email: driver.email || "",
      photoUrl: driver.photoUrl || "",
      licenseNumber: driver.licenseNumber || "",
      notes: driver.notes || "",
      isActive: driver.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const url = editingDriver ? `/api/drivers/${editingDriver.id}` : "/api/drivers";
      const method = editingDriver ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(editingDriver ? "Driver updated" : "Driver added");
      setDialogOpen(false);
      fetchDrivers();
    } catch { toast.error("Failed to save driver"); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (driver: Driver) => {
    try {
      await fetch(`/api/drivers/${driver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !driver.isActive }),
      });
      fetchDrivers();
    } catch { toast.error("Failed to update driver"); }
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n).join("").toUpperCase().slice(0, 2);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold bg-taxi-gold-gradient-left bg-clip-text text-transparent">
          Drivers
        </h1>
        <Button
          onClick={openAdd}
          className="bg-taxi-gold-gradient-left hover:opacity-90 text-taxi-dark-navy border-none font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Driver
        </Button>
      </div>

      {drivers.length === 0 ? (
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
          <UserCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No drivers yet. Add your first driver.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {drivers.map(driver => (
            <div
              key={driver.id}
              className={`bg-white/5 border ${driver.isActive ? "border-white/10" : "border-white/5 opacity-60"} rounded-2xl p-5 flex gap-4`}
            >
              {/* Avatar */}
              <div className="shrink-0">
                {driver.photoUrl ? (
                  <img
                    src={driver.photoUrl}
                    alt={driver.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-taxi-gold/40"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-taxi-dark-navy font-bold text-lg border-2 border-taxi-gold/40"
                    style={{ background: "linear-gradient(135deg,#BF953F,#FCF6BA,#B38728)" }}
                  >
                    {getInitials(driver.name)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-white truncate">{driver.name}</p>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${driver.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                    {driver.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {driver.phone && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                    <Phone className="w-3 h-3" /> {driver.phone}
                  </p>
                )}
                {driver.email && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3" /> {driver.email}
                  </p>
                )}
                {driver.licenseNumber && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                    <Car className="w-3 h-3" /> {driver.licenseNumber}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(driver)}
                    className="text-xs border-white/10 hover:bg-white/10 flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleToggleActive(driver)}
                    className={`text-xs flex items-center gap-1 ${driver.isActive ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-green-500/30 text-green-400 hover:bg-green-500/10"}`}
                  >
                    <PowerOff className="w-3 h-3" />
                    {driver.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingDriver ? "Edit Driver" : "Add New Driver"}
        onConfirm={handleSave}
        confirmText={saving ? "Saving..." : (editingDriver ? "Save Changes" : "Add Driver")}
        cancelText="Cancel"
      >
        <div className="space-y-4">
          <Input label="Full Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+357..." />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="driver@..." />
          </div>
          <Input label="License Number" value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} placeholder="LIC-12345" />
          <Input label="Photo URL (Cloudinary)" value={form.photoUrl} onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))} placeholder="https://res.cloudinary.com/..." />
          <Input label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this driver..." />
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 accent-yellow-500"
            />
            <span className="text-sm text-white/80">Active (available for assignments)</span>
          </label>
        </div>
      </Dialog>
    </div>
  );
}
