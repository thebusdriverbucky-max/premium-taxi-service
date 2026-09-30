"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import LocationAutocomplete from "@/components/location-autocomplete";
import BookingMap from "@/components/booking-map";
import { TariffPlan } from "@prisma/client";
import { TariffZone } from "@/types/tariff";
import { ArrowRight, Info } from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";
import { calculatePrice, decimalToMinor, type PricingZone } from "@/lib/pricing";

import { selectedLocation, restoreDraftLocation, routeKey, localDate, type SelectedLocation, type RouteMetrics } from "@/lib/booking-location";
import { createBookingSchema } from "@/lib/validations";
import { validationFieldErrors } from "@/lib/validation-errors";
import { paymentAvailability } from "@/lib/payment-availability";

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

const CustomSelect = ({ value, onChange, options, className = "" }: { value: string | number, onChange: (val: string) => void, options: { label: string, value: string | number }[], className?: string }) => (
  <select value={value} onChange={event => onChange(event.target.value)} className={`h-12 w-full rounded-xl border border-white/10 bg-taxi-dark-navy px-4 text-white ${className}`}>
    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>
);

export default function BookingPage() {
  const router = useRouter();
  const { settings, cardPaymentsConfigured } = useSettings();

  // Map Settings
  const mapCountryCode = settings?.mapCountryCode || "cy";
  const mapCenter = useMemo(() => {
    if (settings?.mapCenterLat != null && settings?.mapCenterLng != null) {
      return { lat: settings.mapCenterLat, lng: settings.mapCenterLng };
    }
    return undefined;
  }, [settings]);
  const mapZoom = settings?.mapDefaultZoom || 10;

  // Payment Settings
  const { card: enableCard, cash: enableCash } = paymentAvailability(settings, cardPaymentsConfigured);
  const onlyOnePayment = (enableCard && !enableCash) || (!enableCard && enableCash);

  // Tariff Plans
  const [tariffs, setTariffs] = useState<TariffPlan[]>([]);
  const [selectedTariffId, setSelectedTariffId] = useState<string>("");
  const [isLoadingTariffs, setIsLoadingTariffs] = useState(true);
  const selectedTariff = tariffs.find(t => t.id === selectedTariffId);
  const displayedCurrency = selectedTariff?.currency || settings?.currency || "EUR";
  const currencySymbol = displayedCurrency === 'USD' ? '$'
    : displayedCurrency === 'GBP' ? '£'
      : displayedCurrency === 'CAD' ? 'CA$'
        : '€'; // default EUR

  // Form State
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupLocation, setPickupLocation] = useState<SelectedLocation | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<SelectedLocation | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [passengerCount, setPassengerCount] = useState(1);
  const [flightNumber, setFlightNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"STRIPE" | "CASH">("STRIPE");
  const requestIdentity = useRef({ fingerprint: '', id: crypto.randomUUID() });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const errorSummary = useRef<HTMLDivElement>(null);
  const showErrors = (errors: Record<string, string>) => {
    setFieldErrors(errors);
    requestAnimationFrame(() => errorSummary.current?.focus());
  };

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
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [price, setPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [breakdown, setBreakdown] = useState({
    base: 0,
    distanceCost: 0,
    durationCost: 0,
    airportSurcharge: 0,
    luggageFee: 0,
    childrenFee: 0,
  });

  const currentRouteKey = routeKey(pickupLocation, dropoffLocation);
  const latestRouteKey = useRef(currentRouteKey);
  latestRouteKey.current = currentRouteKey;
  const [routeState, setRouteState] = useState<{ key: string; metrics: RouteMetrics | null; error?: string } | null>(null);
  const routeReady = routeState?.key === currentRouteKey && Boolean(routeState.metrics) &&
    pickupLocation?.address === pickup && dropoffLocation?.address === dropoff;
  const handleRouteChange = useCallback((route: RouteMetrics | null, error?: string) => {
    if (latestRouteKey.current !== currentRouteKey) return;
    setRouteState({ key: currentRouteKey, metrics: route, error });
    setDistanceKm(route ? route.distanceMeters / 1_000 : 0);
    setDurationMinutes(route ? route.durationSeconds / 60 : 0);
  }, [currentRouteKey]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    try {
      const response = await fetch("/api/discounts/validate", {
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
        if (typeof parsed.pickup === "string" && parsed.pickup) {
          setPickup(parsed.pickup);
          setPickupLocation(restoreDraftLocation(parsed.version, parsed.pickup, parsed.pickupCoords));
        }
        if (typeof parsed.dropoff === "string" && parsed.dropoff) {
          setDropoff(parsed.dropoff);
          setDropoffLocation(restoreDraftLocation(parsed.version, parsed.dropoff, parsed.dropoffCoords));
        }
        if (parsed.date) {
          const d = new Date(parsed.date);
          if (!Number.isFinite(d.getTime())) throw new Error("Invalid saved date");
          setDate(localDate(d));
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
    if (!selectedTariff || !routeReady) { setPrice(0); setDiscountAmount(0); return; }

    const BASE = Number(selectedTariff.basePrice);
    const RATE_PER_KM = Number(selectedTariff.pricePerKm);
    const RATE_PER_MINUTE = Number(selectedTariff.pricePerMin);
    const AIRPORT_SURCHARGE_RATE = Number(settings?.airportSurcharge ?? 5);
    const LUGGAGE_FEE_RATE = Number(settings?.luggageFee ?? 5);
    const CHILDREN_FEE_RATE = Number(settings?.childSeatFee ?? 5);

    try {
      let rawZones: TariffZone[] = [];
      if (typeof selectedTariff.zones === "string") {
        rawZones = JSON.parse(selectedTariff.zones) as TariffZone[];
      } else if (Array.isArray(selectedTariff.zones)) {
        rawZones = selectedTariff.zones as unknown as TariffZone[];
      }
      const zones: PricingZone[] = rawZones.map((zone, index) => ({
        name: zone.name || `Zone ${index + 1}`,
        minDistanceMeters: Math.round(Number(zone.minKm) * 1_000),
        maxDistanceMeters: Math.round(Number(zone.maxKm) * 1_000),
        minimumMinor: decimalToMinor(String(zone.minPrice), `zones[${index}].minPrice`),
      }));
      const pricing = calculatePrice({
        distanceMeters: Math.round(distanceKm * 1_000),
        durationSeconds: Math.round(durationMinutes * 60),
        baseFareMinor: decimalToMinor(String(selectedTariff.basePrice), "basePrice"),
        pricePerKmMinor: decimalToMinor(String(selectedTariff.pricePerKm), "pricePerKm"),
        pricePerMinuteMinor: decimalToMinor(String(selectedTariff.pricePerMin), "pricePerMin"),
        minimumFareMinor: decimalToMinor(String(selectedTariff.minPrice), "minPrice"),
        zones,
        includesAirport: /airport/i.test(`${pickup} ${dropoff}`),
        airportSurchargeMinor: decimalToMinor(String(AIRPORT_SURCHARGE_RATE), "airportSurcharge"),
        luggageFeeMinor: decimalToMinor(String(LUGGAGE_FEE_RATE), "luggageFee"),
        luggageQuantity: hasLuggage ? luggageQty : 0,
        childSeatFeeMinor: decimalToMinor(String(CHILDREN_FEE_RATE), "childSeatFee"),
        childSeatQuantity: hasChildren ? childrenQty : 0,
        discount: appliedCoupon?.type === "FIXED"
          ? { type: "FIXED", amountMinor: decimalToMinor(String(appliedCoupon.value), "coupon.value") }
          : appliedCoupon?.type === "PERCENT"
            ? { type: "PERCENT", basisPoints: Math.round(appliedCoupon.value * 100) }
            : undefined,
      });

      setDiscountAmount(pricing.discountMinor / 100);
      setPrice(pricing.totalMinor / 100);
      setBreakdown({
        base: BASE,
        distanceCost: pricing.distanceFareMinor / 100,
        durationCost: pricing.durationFareMinor / 100,
        airportSurcharge: pricing.airportSurchargeMinor / 100,
        luggageFee: pricing.luggageFeeMinor / 100,
        childrenFee: pricing.childSeatFeeMinor / 100,
      });
    } catch (error) {
      console.error("Unable to calculate booking price:", error);
    }
  }, [routeReady, distanceKm, durationMinutes, pickup, dropoff, hasLuggage, luggageQty, hasChildren, childrenQty, selectedTariffId, tariffs, appliedCoupon, settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    const selectionErrors: Record<string, string> = {};
    if (!pickupLocation || pickupLocation.address !== pickup) selectionErrors.pickup = 'Select a pickup location from the suggestions';
    if (!dropoffLocation || dropoffLocation.address !== dropoff) selectionErrors.dropoff = 'Select a dropoff location from the suggestions';
    if (!date || !time) selectionErrors.pickupDateTime = 'Enter both pickup date and time';
    if (!selectedTariffId) selectionErrors.tariffPlanId = 'Select an available vehicle type';
    if (!routeReady) selectionErrors.route = 'Select both locations and wait for a valid driving route';
    if ((paymentMethod === 'STRIPE' && !enableCard) || (paymentMethod === 'CASH' && !enableCash)) selectionErrors.paymentMethod = 'Selected payment method is unavailable';
    if (selectedTariff && passengerCount > selectedTariff.maxPassengers) selectionErrors['passenger.count'] = `This vehicle allows at most ${selectedTariff.maxPassengers} passengers`;
    if (Object.keys(selectionErrors).length) { showErrors(selectionErrors); return; }
    setFieldErrors({});

    try {
      const bookingData = {
        bookingRequestId: requestIdentity.current.id,
        tariffPlanId: selectedTariffId,
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        pickupDateTime: Number.isFinite(new Date(`${date}T${time}:00`).getTime()) ? new Date(`${date}T${time}:00`).toISOString() : "",
        passenger: {
          name,
          email,
          phone,
          count: passengerCount,
        },
        extras: {
          ...(hasLuggage ? { luggage: { quantity: luggageQty, size: luggageSize } } : {}),
          ...(hasChildren ? { childSeats: { quantity: childrenQty } } : {}),
        },
        flightNumber: flightNumber || undefined,
        notes: notes || undefined,
        couponCode: appliedCoupon?.code,
        paymentMethod,
      };

      const parsed = createBookingSchema.safeParse(bookingData);
      if (!parsed.success) { showErrors(validationFieldErrors(parsed.error.issues)); return; }
      // Preserve retries of an identical request, but never reuse an old booking for edited input.
      const fingerprint = JSON.stringify({ ...parsed.data, bookingRequestId: undefined });
      if (requestIdentity.current.fingerprint !== fingerprint) {
        requestIdentity.current = { fingerprint, id: crypto.randomUUID() };
      }
      parsed.data.bookingRequestId = requestIdentity.current.id;
      setIsSubmitting(true);

      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json();

      if (!response.ok) {
        showErrors(result.fieldErrors || { form: result.error || "Failed to create order" });
        return;
      }

      toast.success("Booking created successfully!");
      localStorage.removeItem("bookingData");
      requestIdentity.current = { fingerprint: "", id: crypto.randomUUID() };

      if (result.url) {
        window.location.href = result.url;
      } else {
        router.push(`/trips/${result.tripId}?success=true`);
      }
    } catch (error: any) {
      console.error("Booking error:", error);
      showErrors({ form: error.message || "Something went wrong" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = localDate(new Date());

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
          <form noValidate onSubmit={handleSubmit} className="w-full lg:w-[60%] space-y-8">
            <div ref={errorSummary} tabIndex={-1} role="alert" aria-live="assertive">
              {Object.keys(fieldErrors).length > 0 && <div className="border border-red-400 rounded-xl p-4 text-red-300"><p>Please correct the following:</p><ul>{Object.entries(fieldErrors).map(([field, message]) => <li key={field}>{field}: {message}</li>)}</ul></div>}
            </div>
            <fieldset disabled={isSubmitting} className="space-y-8" onClickCapture={e => { if (isSubmitting) { e.preventDefault(); e.stopPropagation(); } }}>

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
                    aria-label="Full name"
                    error={fieldErrors["passenger.name"]}
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
                    aria-label="Phone number"
                    error={fieldErrors["passenger.phone"]}
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
                    aria-label="Email address"
                    error={fieldErrors["passenger.email"]}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
            </section>

            {/* Trip Details */}
            <section className="bg-white/5 p-6 rounded-xl border border-white/10">
              <h2 className="text-xl font-semibold mb-4 text-taxi-gold-DEFAULT">Trip Details</h2>
              <div className="space-y-4">
                <LocationAutocomplete
                  label="Pickup Location"
                  error={fieldErrors.pickup}
                  placeholder="Enter pickup location"
                  value={pickup}
                  onChange={(address, latitude, longitude, placeId) => {
                    setRouteState(null);
                    setPickup(address);
                    setPickupLocation(selectedLocation(address, latitude, longitude, placeId));
                  }}
                  required
                  pinned={true}
                  mapCountryCode={mapCountryCode}
                />
                <LocationAutocomplete
                  label="Dropoff Location"
                  error={fieldErrors.dropoff}
                  placeholder="Enter dropoff location"
                  value={dropoff}
                  onChange={(address, latitude, longitude, placeId) => {
                    setRouteState(null);
                    setDropoff(address);
                    setDropoffLocation(selectedLocation(address, latitude, longitude, placeId));
                  }}
                  required
                  mapCountryCode={mapCountryCode}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Date <span className="text-red-500">*</span></label>
                    <Input
                      type="date"
                      aria-label="Pickup date"
                    error={fieldErrors["pickupDateTime"]}
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
                      aria-label="Pickup time"
                    error={fieldErrors["pickupDateTime"]}
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

              {!enableCard && <p className="text-sm text-gray-300 mb-3">Card payments are currently unavailable.</p>}
              {!enableCard && !enableCash && <p role="alert" className="text-red-300">Online booking is unavailable: no payment method is available. Please contact us.</p>}
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
              {!routeReady && <p role="status" className="text-gray-300">{routeState?.key === currentRouteKey && routeState.error ? routeState.error : 'Select both locations to calculate the route and estimate.'}</p>}
              {routeReady && <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Base Fare ({tariffs.find(t => t.id === selectedTariffId)?.name || "Selected Tariff"})</span>
                  <span>{currencySymbol}{breakdown.base.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Distance Cost ({routeReady ? distanceKm.toFixed(1) : "—"} km)</span>
                  <span>{currencySymbol}{breakdown.distanceCost.toFixed(2)}</span>
                </div>
                {breakdown.durationCost > 0 && (
                  <div className="flex justify-between">
                    <span>Time Cost ({durationMinutes.toFixed(0)} min)</span>
                    <span>{currencySymbol}{breakdown.durationCost.toFixed(2)}</span>
                  </div>
                )}
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
                  <span className="text-lg font-bold text-white">Estimated total (confirmed at checkout)</span>
                  <span className="text-3xl font-bold text-taxi-gold-DEFAULT">{currencySymbol}{routeReady ? price.toFixed(2) : "—"}</span>
                </div>
              </div>}
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

            </fieldset>
          </form>

          {/* Right Column: Map (40%) - Sticky on Desktop */}
          <div className=" w-full lg:w-[40%]">
            <div className="lg:sticky lg:top-24 h-[400px] lg:h-[calc(100vh-8rem)] rounded-xl overflow-hidden shadow-2xl border border-taxi-gold-DEFAULT/20">
              <BookingMap
                key={currentRouteKey}
                pickup={pickupLocation}
                dropoff={dropoffLocation}
                onRouteChange={handleRouteChange}
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
