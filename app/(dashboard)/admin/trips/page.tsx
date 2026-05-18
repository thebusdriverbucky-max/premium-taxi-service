// app/(dashboard)/admin/trips/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import TripsTable, { Trip } from "@/components/admin/TripsTable";
import { formatPrice } from "@/lib/utils";

const tripStatuses = [
  { value: "ALL", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
];

export default function AdminTripsPage() {
  const { data: session } = useSession();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const TRIPS_PER_PAGE = 50;

  useEffect(() => {
    fetchTrips();
    fetchVehicles();
    fetchDrivers();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await fetch("/api/trips");
      const data = await response.json();
      setTrips(data);
      setCurrentPage(1);
    } catch (error) {
      console.error("Failed to fetch trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles?activeOnly=true");
      const data = await response.json();
      if (Array.isArray(data)) {
        setVehicles(data);
      }
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch("/api/drivers?activeOnly=true");
      const data = await res.json();
      if (Array.isArray(data)) setDrivers(data);
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
    }
  };

  const handleStatusUpdate = async (tripId: string, status: string) => {
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await fetchTrips();
      }
    } catch (error) {
      console.error("Failed to update trip status:", error);
    }
  };

  const handleAssignVehicle = async () => {
    if (!selectedTrip || !selectedVehicleId) return;

    try {
      const response = await fetch(`/api/trips/${selectedTrip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: selectedVehicleId }),
      });

      if (response.ok) {
        await fetchTrips();
        setDetailsOpen(false);
      }
    } catch (error) {
      console.error("Failed to assign vehicle:", error);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedTrip) return;
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: selectedDriverId || null }),
      });
      if (res.ok) { await fetchTrips(); setDetailsOpen(false); }
    } catch (error) {
      console.error("Failed to assign driver:", error);
    }
  };

  const handleViewDetails = (trip: Trip) => {
    setSelectedTrip(trip);
    setSelectedVehicleId(trip.vehicleId || "");
    setSelectedDriverId(trip.driverId || "");
    setDetailsOpen(true);
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

  const filteredTrips = statusFilter === "ALL"
    ? trips
    : trips.filter(t => t.status === statusFilter);

  const totalPages = Math.ceil(filteredTrips.length / TRIPS_PER_PAGE);
  const paginatedTrips = filteredTrips.slice(
    (currentPage - 1) * TRIPS_PER_PAGE,
    currentPage * TRIPS_PER_PAGE
  );

  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) return [1, 2, 3, 4, "...", totalPages];
    if (currentPage >= totalPages - 2) return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold bg-taxi-gold-gradient-left bg-clip-text text-transparent">
          Trip Bookings
        </h1>

        <div className="w-full md:w-64">
          <Select
            options={tripStatuses}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-2 mb-3 md:hidden select-none">
        ← Scroll left/right to see all →
      </p>

      <TripsTable
        trips={paginatedTrips}
        onViewDetails={handleViewDetails}
        onUpdateStatus={handleStatusUpdate}
      />

      {totalPages > 1 && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="flex justify-center gap-1 items-center">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              &larr; Prev
            </Button>

            {getPageNumbers().map((page, index) => {
              if (page === "...") {
                return <span key={`ellipsis-${index}`} className="px-2 text-gray-500">...</span>;
              }
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  onClick={() => setCurrentPage(page as number)}
                >
                  {page}
                </Button>
              );
            })}

            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next &rarr;
            </Button>
          </div>
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}

      {/* Trip Details Modal */}
      <Dialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        title="Trip Details"
        onConfirm={() => setDetailsOpen(false)}
        confirmText=""
        cancelText=""
        size="2xl"
      >
        {selectedTrip && (() => {
          // Parse extras from notes
          const extrasMatch = selectedTrip.notes?.match(/\[EXTRAS:\s*([^\]]+)\]/);
          const parsedExtras: { label: string; detail: string }[] = [];
          if (extrasMatch) {
            extrasMatch[1].split(',').map(s => s.trim()).forEach(extra => {
              if (extra.startsWith('ADD_LUGGAGE')) {
                const parts = extra.split(':');
                const qty = parts[1] || '1';
                const size = parts[2] || 'Standard';
                parsedExtras.push({ label: '🧳 Extra Luggage', detail: `${qty}x ${size} (+€5)` });
              } else if (extra.startsWith('CHILD_SEAT')) {
                const parts = extra.split(':');
                const qty = parts[1] || '1';
                parsedExtras.push({ label: '👶 Child Seat / Booster', detail: `${qty}x (+€5)` });
              }
            });
          }
          // Strip [EXTRAS: ...] from notes for display
          const cleanNotes = selectedTrip.notes
            ?.replace(/\[EXTRAS:[^\]]+\]\n?/, '')
            ?.replace(/^Notes for driver:\s*/i, '')
            ?.trim();

          return (
            <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-6">

              {/* TOP GRID: 3 колонки на десктопе */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Колонка 1: Trip Info */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] text-taxi-gold font-bold uppercase tracking-wider mb-3">Trip Information</p>
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-400">Number</p>
                    <p className="text-sm font-mono font-bold text-white">{selectedTrip.tripNumber || selectedTrip.id}</p>
                    <p className="text-xs text-gray-400 mt-2">Status</p>
                    <span className="inline-block text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-white/10 text-white">{selectedTrip.status}</span>
                    <p className="text-xs text-gray-400 mt-2">Created</p>
                    <p className="text-xs text-white">{formatDate(selectedTrip.createdAt)}</p>
                    <p className="text-xs text-gray-400 mt-2">Scheduled</p>
                    <p className="text-xs font-semibold text-taxi-gold">{formatDate(selectedTrip.scheduledAt)}</p>
                  </div>
                </div>

                {/* Колонка 2: Passenger Details */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] text-taxi-gold font-bold uppercase tracking-wider mb-3">Passenger Details</p>
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-400">Name</p>
                    <p className="text-sm font-semibold text-white">{selectedTrip.passengerName || selectedTrip.user?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-400 mt-2">Email</p>
                    <p className="text-xs text-white break-all">{selectedTrip.passengerEmail || selectedTrip.user?.email || 'N/A'}</p>
                    <p className="text-xs text-gray-400 mt-2">Phone</p>
                    <p className="text-sm font-semibold text-white">{selectedTrip.passengerPhone || 'N/A'}</p>
                    {selectedTrip.passengerCount && (
                      <>
                        <p className="text-xs text-gray-400 mt-2">Passengers</p>
                        <p className="text-sm text-white">{selectedTrip.passengerCount}</p>
                      </>
                    )}
                    {selectedTrip.flightNumber && (
                      <>
                        <p className="text-xs text-gray-400 mt-2">✈️ Flight Number</p>
                        <p className="text-sm font-bold text-white bg-white/10 px-2 py-1 rounded-lg inline-block">{selectedTrip.flightNumber}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Колонка 3: Payment & Tariff */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] text-taxi-gold font-bold uppercase tracking-wider mb-3">Payment & Tariff</p>
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-400">Tariff</p>
                    <p className="text-sm font-semibold text-white">{selectedTrip.tariffPlan?.name || 'Standard'}</p>
                    <p className="text-xs text-gray-400 mt-2">Payment Status</p>
                    <span className="inline-block text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-taxi-gold/20 text-taxi-gold">{selectedTrip.paymentStatus}</span>
                    <p className="text-xs text-gray-400 mt-4">Total</p>
                    <p className="text-2xl font-bold bg-taxi-gold-gradient-left bg-clip-text text-transparent">{formatPrice(selectedTrip.total || 0, selectedTrip.currency)}</p>
                  </div>
                </div>
              </div>

              {/* ROUTE */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-[10px] text-taxi-gold font-bold uppercase tracking-wider mb-3">Route</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">📍 Pickup</p>
                    <p className="text-sm font-medium text-white break-words">{selectedTrip.pickupAddress}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">🏁 Dropoff</p>
                    <p className="text-sm font-medium text-white break-words">{selectedTrip.dropoffAddress}</p>
                  </div>
                </div>
              </div>

              {/* EXTRAS */}
              {parsedExtras.length > 0 && (
                <div className="bg-taxi-gold/5 border border-taxi-gold/20 rounded-2xl p-4">
                  <p className="text-[10px] text-taxi-gold font-bold uppercase tracking-wider mb-3">Extras Selected</p>
                  <div className="flex flex-wrap gap-2">
                    {parsedExtras.map((extra, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-taxi-gold/10 border border-taxi-gold/30 rounded-lg">
                        <span className="text-sm font-semibold text-taxi-gold">{extra.label}</span>
                        <span className="text-xs text-gray-300">{extra.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NOTES FOR DRIVER */}
              {cleanNotes && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4">
                  <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mb-2">Notes for Driver</p>
                  <p className="text-sm text-yellow-100 whitespace-pre-wrap break-words">{cleanNotes}</p>
                </div>
              )}

              {/* ASSIGN VEHICLE */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-[10px] text-taxi-gold font-bold uppercase tracking-wider mb-3">Assign Vehicle</p>
                <div className="space-y-3">
                  <Select
                    options={[
                      { value: "", label: "Select vehicle" },
                      ...vehicles.map(v => ({
                        value: v.id,
                        label: `${v.make} ${v.model} (${v.licensePlate})`
                      }))
                    ]}
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                  />
                  {selectedVehicleId !== (selectedTrip.vehicleId || "") && (
                    <Button
                      size="sm"
                      className="w-full bg-taxi-gold-gradient-left hover:opacity-90 text-taxi-dark-navy border-none font-bold"
                      onClick={handleAssignVehicle}
                    >
                      Update Vehicle
                    </Button>
                  )}
                </div>
              </div>

              {/* ASSIGN DRIVER */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-[10px] text-taxi-gold font-bold uppercase tracking-wider mb-3">Assign Driver</p>
                <div className="space-y-3">
                  <Select
                    options={[
                      { value: "", label: "No driver assigned" },
                      ...drivers.map(d => ({
                        value: d.id,
                        label: `${d.name}${d.phone ? ` · ${d.phone}` : ""}`
                      }))
                    ]}
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                  />
                  {selectedDriverId !== (selectedTrip.driverId || "") && (
                    <Button
                      size="sm"
                      className="w-full bg-taxi-gold-gradient-left hover:opacity-90 text-taxi-dark-navy border-none font-bold"
                      onClick={handleAssignDriver}
                    >
                      Update Driver
                    </Button>
                  )}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-white/10">
                {selectedTrip.status === "PENDING" && (
                  <Button
                    onClick={() => { handleStatusUpdate(selectedTrip.id, "CONFIRMED"); setDetailsOpen(false); }}
                    className="bg-taxi-gold-gradient-left hover:opacity-90 text-taxi-dark-navy border-none font-bold"
                  >
                    Confirm Trip
                  </Button>
                )}
                {(selectedTrip.status === "CONFIRMED" || selectedTrip.status === "IN_PROGRESS") && (
                  <Button
                    onClick={() => { handleStatusUpdate(selectedTrip.id, "COMPLETED"); setDetailsOpen(false); }}
                    className="bg-green-600 hover:bg-green-700 text-white border-none font-bold"
                  >
                    Complete Trip
                  </Button>
                )}
                {selectedTrip.status !== "CANCELLED" && selectedTrip.status !== "COMPLETED" && (
                  <Button
                    variant="destructive"
                    onClick={() => { handleStatusUpdate(selectedTrip.id, "CANCELLED"); setDetailsOpen(false); }}
                    className="font-bold"
                  >
                    Cancel Trip
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Dialog>
    </div>
  );
}
