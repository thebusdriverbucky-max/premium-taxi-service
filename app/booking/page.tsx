"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import LocationAutocomplete from "@/components/location-autocomplete";
import BookingMap from "@/components/booking-map";
import { TariffPlan } from "@prisma/client";
import { ChevronDown, ArrowRight, Info } from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";

// Fallback UI components if shadcn/ui ones are missing or different
const SimpleCheckbox = ({ checked, onCheckedChange, id }: { checked: boolean; onCheckedChange: (c: boolean) => void; id: string }) => (
  <input
    type="checkbox"
    id={id}
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    className="w-4 h-4 text-taxi-gold-DEFAULT bg-gray-700 border-gray-600 rounded focus:ring-taxi-gold-DEFAULT focus:ring-2"
  />
);

const CustomSelect = ({ value, onChange, options, className = "" }: { value: string | number, onChange: (val: string) => void, options: { label: string, value: string | number }[], className?: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full">
      <div
        className={`flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white justify-between items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-taxi-gold-DEFAULT/50 focus:border-transparent transition-all duration-200 ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{options.find(o => String(o.value) === String(value))?.label || value}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 w-full mt-1 bg-taxi-dark-navy border border-white/20 rounded-xl shadow-lg max-h-60 overflow-auto py-1">
            {options.map((option) => (
              <div
                key={option.value}
                className="px-4 py-2 text-white text-sm hover:bg-white/10 cursor-pointer"
                onClick={() => {
                  onChange(String(option.value));
                  setIsOpen(false);
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default function BookingPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency === 'USD' ? '$'
    : settings?.currency === 'GBP' ? '£'
      : settings?.currency === 'CAD' ? 'CA$'
        : '€'; // default EUR

  // Map Settings
  const mapCountryCode = settings?.mapCountryCode || "cy";
  const mapCenter = useMemo(() => {
    if (settings?.mapCenterLat && settings?.mapCenterLng) {
      return { lat: settings.mapCenterLat, lng: settings.mapCenterLng };
    }
    return undefined;
  }, [settings]);
  const mapZoom = settings?.mapDefaultZoom || 10;

  // Payment Settings
  const enableCard = settings?.enableCardPayment !== false; // Default to true if not set
  const enableCash = settings?.enableCashPayment !== false; // Default to true if not set
  const onlyOnePayment = (enableCard && !enableCash) || (!enableCard && enableCash);

  // Tariff Plans
  const [tariffs, setTariffs] = useState<TariffPlan[]>([]);
  const [selectedTariffId, setSelectedTariffId] = useState<string>("");
  const [isLoadingTariffs, setIsLoadingTariffs] = useState(true);

  // Form State
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [passengerCount, setPassengerCount] = useState(1);
  const [flightNumber, setFlightNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"STRIPE" | "CASH">("STRIPE");

  // Auto-select payment method if only one is enabled
  useEffect(() => {
    if (enableCard && !enableCash) {
      setPaymentMethod("STRIPE");
    } else if (!enableCard && enableCash) {
      setPaymentMethod("CASH");
    }
  }, [enableCard, enableCash]);

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: string; value: number } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Options State
  const [hasLuggage, setHasLuggage] = useState(false);
  const [luggageQty, setLuggageQty] = useState(1);
  const [luggageSize, setLuggageSize] = useState("Standard");
  const [hasChildren, setHasChildren] = useState(false);
  const [childrenQty, setChildrenQty] = useState(1);

  // Pricing State
  const [distanceKm, setDistanceKm] = useState(0);
  const [price, setPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [breakdown, setBreakdown] = useState({
    base: 0,
    distanceCost: 0,
    airportSurcharge: 0,
    luggageFee: 0,
    childrenFee: 0,
  });

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.toUpperCase(),
          orderAmount: price + discountAmount // Use price before discount
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Invalid coupon code");
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon({
        code: data.code,
        type: data.type,
        value: data.value
      });
      toast.success("Coupon applied successfully!");
    } catch (error) {
      toast.error("Failed to validate coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Fetch tariff plans
  useEffect(() => {
    const fetchTariffs = async () => {
      try {
        const res = await fetch("/api/tariffs?activeOnly=true");
        if (res.ok) {
          const data = await res.json();
          setTariffs(data);
          if (data.length > 0) {
            setSelectedTariffId((prev) => prev ? prev : data[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch tariff plans", error);
      } finally {
        setIsLoadingTariffs(false);
      }
    };
    fetchTariffs();
  }, []);

  // Read pre-selected tariff from main page
  useEffect(() => {
    const savedTariffId = localStorage.getItem("selectedTariffId");
    if (savedTariffId) {
      setSelectedTariffId(savedTariffId);
      localStorage.removeItem("selectedTariffId"); // clean up after reading
    }
  }, []); // runs once on mount, before tariffs load

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem("bookingData");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.pickup) setPickup(parsed.pickup);
        if (parsed.dropoff) setDropoff(parsed.dropoff);
        if (parsed.date) {
          const d = new Date(parsed.date);
          setDate(d.toISOString().split('T')[0]);
          setTime(d.toTimeString().split(' ')[0].substring(0, 5));
        }
        if (parsed.phone) setPhone(parsed.phone);
      } catch (e) {
        console.error("Failed to parse booking data", e);
      }
    }
  }, []);

  // Pricing Logic
  useEffect(() => {
    const selectedTariff = tariffs.find(t => t.id === selectedTariffId);
    const BASE = selectedTariff ? Number(selectedTariff.basePrice) : 30;
    const RATE_PER_KM = selectedTariff ? Number(selectedTariff.pricePerKm) : 1.2;
    const MIN_PRICE = BASE;
    const AIRPORT_SURCHARGE_RATE = Number(settings?.airportSurcharge ?? 5);
    const LUGGAGE_FEE_RATE = Number(settings?.luggageFee ?? 5);
    const CHILDREN_FEE_RATE = Number(settings?.childSeatFee ?? 5);

    let calculatedPrice = BASE;
    const distanceCost = distanceKm * RATE_PER_KM;
    calculatedPrice += distanceCost;

    let airportSurcharge = 0;
    if (pickup.toLowerCase().includes('airport') || dropoff.toLowerCase().includes('airport')) {
      airportSurcharge = AIRPORT_SURCHARGE_RATE;
      calculatedPrice += airportSurcharge;
    }

    let luggageFee = 0;
    if (hasLuggage) {
      luggageFee = LUGGAGE_FEE_RATE;
      calculatedPrice += luggageFee;
    }

    let childrenFee = 0;
    if (hasChildren) {
      childrenFee = CHILDREN_FEE_RATE;
      calculatedPrice += childrenFee;
    }

    // Apply tariff minimum price
    const tariffMinPrice = Number((selectedTariff as any)?.minPrice ?? 0);
    let finalPrice = Math.max(Math.round(calculatedPrice), MIN_PRICE, tariffMinPrice);

    // Check zone-based minimum price
    if ((selectedTariff as any)?.zones && distanceKm) {
      try {
        const zones = typeof (selectedTariff as any).zones === 'string'
          ? JSON.parse((selectedTariff as any).zones)
          : (selectedTariff as any).zones;

        if (Array.isArray(zones)) {
          const activeZone = zones.find((z: any) => distanceKm >= z.minKm && distanceKm < z.maxKm);
          if (activeZone?.minPrice) {
            finalPrice = Math.max(finalPrice, Number(activeZone.minPrice));
          }
        }
      } catch (e) {
        console.error("Error parsing price zones:", e);
      }
    }

    // Apply Discount
    let currentDiscount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.type === "FIXED") {
        currentDiscount = appliedCoupon.value;
      } else if (appliedCoupon.type === "PERCENT") {
        currentDiscount = (finalPrice * appliedCoupon.value) / 100;
      }
    }

    setDiscountAmount(currentDiscount);
    setPrice(Math.max(0, finalPrice - currentDiscount));
    setBreakdown({
      base: BASE,
      distanceCost,
      airportSurcharge,
      luggageFee,
      childrenFee,
    });

  }, [distanceKm, pickup, dropoff, hasLuggage, hasChildren, selectedTariffId, tariffs, appliedCoupon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !phone || !pickup || !dropoff || !date || !time || !selectedTariffId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const extrasLabels: string[] = [];
      if (hasLuggage) extrasLabels.push(`ADD_LUGGAGE:${luggageQty}:${luggageSize}`);
      if (hasChildren) extrasLabels.push(`CHILD_SEAT:${childrenQty}`);

      const formattedNotes = [
        extrasLabels.length > 0 ? `[EXTRAS: ${extrasLabels.join(', ')}]` : '',
        notes ? `Notes for driver: ${notes}` : '',
      ].filter(Boolean).join('\n');

      const bookingData = {
        items: [
          {
            productId: selectedTariffId, // Using tariff ID as productId for backend compatibility
            quantity: 1,
            price: price // We send the calculated price
          }
        ],
        total: price,
        guestEmail: email || undefined,
        shippingAddress: {
          firstName: String(name).split(' ')?.shift()?.trim() || String(name).trim(),
          lastName: String(name).split(' ').slice(1).join(' ').trim() || "Guest",
          email: email || "guest@example.com",
          phone: phone,
          street: pickup,
          city: settings?.baseCity || "City",
          state: "",
          postalCode: "0000",
          country: settings?.serviceArea || "N/A"
        },
        pickupAddress: pickup,
        dropoffAddress: dropoff,
        pickupDateTime: `${date}T${time}:00`,
        passengerCount: passengerCount,
        flightNumber: flightNumber,
        notes: formattedNotes,
        couponCode: appliedCoupon?.code,
        paymentMethod: paymentMethod
      };

      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create order");
      }

      toast.success("Booking created successfully!");
      localStorage.removeItem("bookingData");

      if (result.url) {
        window.location.href = result.url;
      } else {
        router.push(`/trips/${result.tripId}?success=true`);
      }
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const minTime = date === today
    ? new Date().toTimeString().split(' ')[0].substring(0, 5)
    : undefined;

  return (
    <div className="min-h-screen bg-taxi-dark-navy text-white pt-24 pb-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-taxi-gold-DEFAULT mb-8 text-center">
          Complete Your Booking
        </h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column: Form (60%) */}
          <form onSubmit={handleSubmit} className="w-full lg:w-[60%] space-y-8">

            {/* Tariff Selection */}
            <section className="bg-white/5 p-6 rounded-xl border border-white/10">
              <h2 className="text-xl font-semibold mb-4 text-taxi-gold-DEFAULT">Select Vehicle Type</h2>
              {isLoadingTariffs ? (
                <div className="text-center py-4">Loading tariffs...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tariffs.map((tariff) => (
                    <div
                      key={tariff.id}
                      onClick={() => setSelectedTariffId(tariff.id)}
                      className={`cursor-pointer p-4 rounded-lg border-2 transition-all flex flex-col h-full ${selectedTariffId === tariff.id
                        ? "border-taxi-gold-DEFAULT bg-taxi-gold-DEFAULT/10"
                        : "border-white/10 bg-white/5 hover:border-white/30"
                        }`}
                    >
                      <div className="font-bold text-lg break-words leading-tight mb-1">{tariff.name}</div>
                      <div className="text-sm text-gray-400 line-clamp-2 flex-grow">{tariff.description}</div>
                      <div className="mt-3 text-taxi-gold-DEFAULT font-bold">From {currencySymbol}{Number(tariff.basePrice)}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {tariff.vehicleType} • Max {tariff.maxPassengers} pax
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Contact Details */}
            <section className="bg-white/5 p-6 rounded-xl border border-white/10">
              <h2 className="text-xl font-semibold mb-4 text-taxi-gold-DEFAULT">Contact Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Phone Number <span className="text-red-500">*</span></label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+357 ..."
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
            </section>

            {/* Mobile Map (Hidden on Desktop) */}
            <div className="lg:hidden w-full my-6">
              <BookingMap
                pickup={pickup}
                dropoff={dropoff}
                onDistanceChange={setDistanceKm}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                className="!min-h-[300px] !h-[300px] !border-taxi-gold-DEFAULT/40 !rounded-xl"
              />
            </div>

            {/* Trip Details */}
            <section className="bg-white/5 p-6 rounded-xl border border-white/10">
              <h2 className="text-xl font-semibold mb-4 text-taxi-gold-DEFAULT">Trip Details</h2>
              <div className="space-y-4">
                <LocationAutocomplete
                  label="Pickup Location"
                  placeholder="Enter pickup location"
                  value={pickup}
                  onChange={(val) => setPickup(val)}
                  required
                  pinned={true}
                  mapCountryCode={mapCountryCode}
                />
                <LocationAutocomplete
                  label="Dropoff Location"
                  placeholder="Enter dropoff location"
                  value={dropoff}
                  onChange={(val) => setDropoff(val)}
                  required
                  mapCountryCode={mapCountryCode}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Date <span className="text-red-500">*</span></label>
                    <Input
                      type="date"
                      value={date}
                      min={today}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-white/10 border-white/20 text-white [color-scheme:dark]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Time <span className="text-red-500">*</span></label>
                    <Input
                      type="time"
                      value={time}
                      min={minTime}
                      onChange={(e) => setTime(e.target.value)}
                      className="bg-white/10 border-white/20 text-white [color-scheme:dark]"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Passengers</label>
                    <CustomSelect
                      value={passengerCount}
                      onChange={(val) => setPassengerCount(Number(val))}
                      options={[...Array(8)].map((_, i) => ({ label: String(i + 1), value: i + 1 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Flight Number (Optional)</label>
                    <Input
                      value={flightNumber}
                      onChange={(e) => setFlightNumber(e.target.value)}
                      placeholder="e.g. EK108"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Notes for Driver (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests..."
                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-taxi-gold-DEFAULT min-h-[100px]"
                  />
                </div>
              </div>
            </section>

            {/* Options */}
            <section className="bg-white/5 p-6 rounded-xl border border-white/10">
              <h2 className="text-xl font-semibold mb-4 text-taxi-gold-DEFAULT">Options</h2>
              <div className="space-y-6">

                {/* Luggage */}
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center space-x-3">
                    <SimpleCheckbox
                      id="luggage"
                      checked={hasLuggage}
                      onCheckedChange={setHasLuggage}
                    />
                    <label htmlFor="luggage" className="text-white font-medium cursor-pointer">
                      Add Luggage (+{currencySymbol}{Number(settings?.luggageFee ?? 5)})
                    </label>
                  </div>

                  {hasLuggage && (
                    <div className="ml-7 grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg animate-in fade-in slide-in-from-top-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Quantity</label>
                        <CustomSelect
                          value={luggageQty}
                          onChange={(val) => setLuggageQty(Number(val))}
                          options={[...Array(10)].map((_, i) => ({ label: String(i + 1), value: i + 1 }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Size</label>
                        <CustomSelect
                          value={luggageSize}
                          onChange={setLuggageSize}
                          options={[
                            { label: "Standard", value: "Standard" },
                            { label: "Large", value: "Large" }
                          ]}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Children */}
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center space-x-3">
                    <SimpleCheckbox
                      id="children"
                      checked={hasChildren}
                      onCheckedChange={setHasChildren}
                    />
                    <label htmlFor="children" className="text-white font-medium cursor-pointer">
                      Child Seat / Booster (+{currencySymbol}{Number(settings?.childSeatFee ?? 5)})
                    </label>
                  </div>

                  {hasChildren && (
                    <div className="ml-7 p-4 bg-white/5 rounded-lg animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs text-gray-400 mb-1">Number of Children</label>
                      <CustomSelect
                        value={childrenQty}
                        onChange={(val) => setChildrenQty(Number(val))}
                        options={[...Array(4)].map((_, i) => ({ label: String(i + 1), value: i + 1 }))}
                      />
                    </div>
                  )}
                </div>

              </div>
            </section>

            {/* Payment Method */}
            <section className="bg-white/5 p-6 rounded-xl border border-white/10">
              <h2 className="text-xl font-semibold mb-4 text-taxi-gold-DEFAULT">Payment Method</h2>

              {onlyOnePayment ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-[#BF953F]/10 border border-[#BF953F]/30 text-gray-200">
                  <Info className="w-5 h-5 text-[#BF953F]" />
                  <p className="text-sm">
                    {enableCard
                      ? "Only card payments are currently accepted for this service."
                      : "Only cash payments are currently accepted for this service."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {enableCard && (
                    <div
                      onClick={() => setPaymentMethod("STRIPE")}
                      className={`cursor-pointer p-4 rounded-lg border-2 transition-all flex items-center space-x-3 ${paymentMethod === "STRIPE"
                        ? "border-[#BF953F] bg-[#BF953F]/20"
                        : "border-white/10 bg-white/5 hover:border-white/30"
                        }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "STRIPE" ? "border-[#BF953F]" : "border-gray-500"}`}>
                        {paymentMethod === "STRIPE" && <div className="w-2.5 h-2.5 rounded-full bg-[#BF953F]" />}
                      </div>
                      <span className="font-medium">Pay with Card (Stripe)</span>
                    </div>
                  )}
                  {enableCash && (
                    <div
                      onClick={() => setPaymentMethod("CASH")}
                      className={`cursor-pointer p-4 rounded-lg border-2 transition-all flex items-center space-x-3 ${paymentMethod === "CASH"
                        ? "border-[#BF953F] bg-[#BF953F]/20"
                        : "border-white/10 bg-white/5 hover:border-white/30"
                        }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "CASH" ? "border-[#BF953F]" : "border-gray-500"}`}>
                        {paymentMethod === "CASH" && <div className="w-2.5 h-2.5 rounded-full bg-[#BF953F]" />}
                      </div>
                      <span className="font-medium">Cash on Arrival</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Coupon Code */}
            <section className="bg-white/5 p-6 rounded-xl border border-white/10">
              <h2 className="text-xl font-semibold mb-4 text-taxi-gold-DEFAULT">Promo Code</h2>
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter promo code"
                  className="bg-white/10 border-white/20 text-white"
                  disabled={!!appliedCoupon}
                />
                <Button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={isApplyingCoupon || !!appliedCoupon || !couponCode.trim()}
                  className="bg-taxi-gold-DEFAULT hover:bg-taxi-gold-DEFAULT/80 text-taxi-dark-navy font-bold"
                >
                  {isApplyingCoupon ? "..." : appliedCoupon ? "Applied" : "Apply"}
                </Button>
                {appliedCoupon && (
                  <Button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode("");
                    }}
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-red-500/10"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </section>

            {/* Pricing Breakdown */}
            <section className="bg-taxi-navy/50 p-6 rounded-xl border border-taxi-gold-DEFAULT/30">
              <h2 className="text-xl font-semibold mb-4 text-taxi-gold-DEFAULT">Price Breakdown</h2>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Base Fare ({tariffs.find(t => t.id === selectedTariffId)?.name || "Selected Tariff"})</span>
                  <span>{currencySymbol}{breakdown.base.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Distance Cost ({distanceKm.toFixed(1)} km)</span>
                  <span>{currencySymbol}{breakdown.distanceCost.toFixed(2)}</span>
                </div>
                {breakdown.airportSurcharge > 0 && (
                  <div className="flex justify-between text-taxi-gold-DEFAULT">
                    <span>Airport Surcharge</span>
                    <span>{currencySymbol}{breakdown.airportSurcharge.toFixed(2)}</span>
                  </div>
                )}
                {breakdown.luggageFee > 0 && (
                  <div className="flex justify-between">
                    <span>Luggage Fee</span>
                    <span>{currencySymbol}{breakdown.luggageFee.toFixed(2)}</span>
                  </div>
                )}
                {breakdown.childrenFee > 0 && (
                  <div className="flex justify-between">
                    <span>Child Seat Fee</span>
                    <span>{currencySymbol}{breakdown.childrenFee.toFixed(2)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-500 font-medium">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-white/10 my-2 pt-2 flex justify-between items-center">
                  <span className="text-lg font-bold text-white">Total Price</span>
                  <span className="text-3xl font-bold text-taxi-gold-DEFAULT">{currencySymbol}{price}</span>
                </div>
              </div>
            </section>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="group relative overflow-hidden w-full bg-taxi-gold-gradient hover:brightness-110 transition-all text-taxi-dark-navy font-bold py-6 text-xl shadow-[0_0_30px_rgba(191,149,63,0.4)] border border-taxi-gold-light/20 rounded-xl before:absolute before:inset-0 before:-translate-x-full before:hover:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:z-0 disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isSubmitting ? "Processing..." : paymentMethod === "STRIPE" ? "Proceed to Payment" : "Confirm Booking"}
                {!isSubmitting && <ArrowRight className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" />}
              </span>
            </Button>

          </form>

          {/* Right Column: Map (40%) - Sticky on Desktop */}
          <div className="hidden lg:block w-full lg:w-[40%]">
            <div className="lg:sticky lg:top-24 h-[400px] lg:h-[calc(100vh-8rem)] rounded-xl overflow-hidden shadow-2xl border border-taxi-gold-DEFAULT/20">
              <BookingMap
                pickup={pickup}
                dropoff={dropoff}
                onDistanceChange={setDistanceKm}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
