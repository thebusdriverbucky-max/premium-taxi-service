"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  MapPin,
  Calendar,
  Clock,
  Users,
  Plane,
  FileText,
  CreditCard,
  Banknote,
  Phone,
  Info,
  Car,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LeaveReview } from "@/components/taxi/LeaveReview";

export default function TripDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const router = useRouter();

  const fetchTrip = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Trip not found");
        throw new Error("Failed to fetch trip");
      }
      const data = await res.json();
      setTrip(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  useEffect(() => {
    if (sessionId && params.id) {
      const confirmPayment = async () => {
        try {
          const res = await fetch(`/api/stripe/confirm?session_id=${sessionId}&tripId=${params.id}`);
          if (res.ok) {
            fetchTrip();
          }
        } catch (err) {
          console.error("Payment confirmation error:", err);
        }
      };
      confirmPayment();
    }
  }, [sessionId, params.id, fetchTrip]);

  useEffect(() => {
    if (!trip || trip.paymentStatus === "paid" || !trip.stripePaymentIntentId) return;

    const interval = setInterval(() => {
      fetchTrip();
    }, 3000);

    return () => clearInterval(interval);
  }, [trip, fetchTrip]);

  if (loading) {
    return (
      <div className="min-h-screen bg-taxi-dark-navy flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-taxi-gold-DEFAULT animate-spin" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-taxi-dark-navy flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-2xl font-bold mb-4">{error || "Trip not found"}</h1>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    );
  }

  const isCash = !trip.stripePaymentIntentId;
  const isPaid = trip.paymentStatus === "paid";

  return (
    <div className="min-h-screen bg-taxi-dark-navy text-white pt-32 pb-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-white/5 border border-taxi-gold-DEFAULT/30 rounded-2xl p-8 md:p-12 text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="bg-taxi-gold-DEFAULT/20 p-4 rounded-full">
              {isPaid || isCash ? (
                <CheckCircle2 className="w-16 h-16 text-taxi-gold-DEFAULT" />
              ) : (
                <Loader2 className="w-16 h-16 text-taxi-gold-DEFAULT animate-spin" />
              )}
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {trip.status === 'PENDING'
              ? (isCash ? "Booking Received!" : (isPaid ? "Payment Successful!" : "Processing Payment..."))
              : "Booking Details"}
          </h1>

          <div className="flex flex-col items-center gap-4 mb-6">
            <p className="text-gray-400 text-lg">
              Trip Number: <span className="text-white font-mono">{trip.tripNumber || trip.id.slice(0, 8)}</span>
            </p>
            <div className="flex gap-2">
              <StatusBadge status={trip.status} />
              <StatusBadge status={trip.paymentStatus === 'paid' ? 'PAID' : 'UNPAID'} />
            </div>
          </div>

          <p className="text-gray-400">
            {trip.status === 'PENDING'
              ? (isCash
                ? "Your booking has been registered. Please pay the driver upon arrival."
                : (isPaid
                  ? "Thank you for your payment. Your ride is confirmed."
                  : "We are verifying your payment. This page will update automatically."))
              : `Current status of your booking is ${trip.status.toLowerCase().replace('_', ' ')}.`}
          </p>
        </div>

        {/* Vehicle & Driver Info */}
        {(trip.status === "CONFIRMED" || trip.status === "IN_PROGRESS") && (trip.vehicle || trip.driverName) && (
          <div className="mb-8 bg-taxi-gold-DEFAULT/10 border border-taxi-gold-DEFAULT/30 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-taxi-gold-DEFAULT">
              <Car className="w-5 h-5 mr-2" />
              Vehicle & Driver Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trip.vehicle && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Vehicle</p>
                  <p className="text-lg font-medium">{trip.vehicle.make} {trip.vehicle.model}</p>
                  <p className="text-sm text-gray-400 font-mono">{trip.vehicle.licensePlate}</p>
                </div>
              )}
              {(trip.driverName || trip.driverPhone) && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Driver</p>
                  {trip.driverName && <p className="text-lg font-medium">{trip.driverName}</p>}
                  {trip.driverPhone && (
                    <a href={`tel:${trip.driverPhone}`} className="text-sm font-medium flex items-center text-taxi-gold-DEFAULT hover:underline">
                      <Phone className="w-3 h-3 mr-2" />
                      {trip.driverPhone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trip Details */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-taxi-gold-DEFAULT" />
              Trip Details
            </h2>
            <div className="space-y-4">
              <div className="relative pl-6 border-l-2 border-dashed border-taxi-gold-DEFAULT/30 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-taxi-gold-DEFAULT border-4 border-taxi-dark-navy" />
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pickup</p>
                  <p className="text-sm font-medium">{trip.pickupAddress}</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-white border-4 border-taxi-dark-navy" />
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Dropoff</p>
                  <p className="text-sm font-medium">{trip.dropoffAddress}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date</p>
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 mr-2 text-taxi-gold-DEFAULT" />
                    {trip.scheduledAt ? new Date(trip.scheduledAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : "N/A"}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Time</p>
                  <div className="flex items-center text-sm">
                    <Clock className="w-4 h-4 mr-2 text-taxi-gold-DEFAULT" />
                    {trip.scheduledAt ? new Date(trip.scheduledAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : "N/A"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Info & Price Breakdown */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-taxi-gold-DEFAULT" />
              Booking Info
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm text-gray-400">
                  <Users className="w-4 h-4 mr-2" />
                  Passengers
                </div>
                <span className="font-medium">{trip.passengerCount}</span>
              </div>
              {trip.flightNumber && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-sm text-gray-400">
                    <Plane className="w-4 h-4 mr-2" />
                    Flight
                  </div>
                  <span className="font-medium">{trip.flightNumber}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm text-gray-400">
                  {isCash ? <Banknote className="w-4 h-4 mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  Payment
                </div>
                <span className="font-medium">{isCash ? "Cash on Arrival" : (isPaid ? "Paid via Card" : "Pending Payment")}</span>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Price Breakdown</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{trip.tariffPlan?.name || "Standard Tariff"}</span>
                    <span>€{Number(trip.basePrice || 0).toFixed(2)}</span>
                  </div>
                  {trip.discountAmount && Number(trip.discountAmount) > 0 && (
                    <div className="flex justify-between text-sm text-green-500">
                      <span>Discount</span>
                      <span>-€{Number(trip.discountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-2 mt-2 border-t border-white/5 flex justify-between items-center">
                    <span className="text-lg font-bold">Total Price</span>
                    <span className="text-2xl font-bold text-taxi-gold-DEFAULT">€{Number(trip.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {trip.notes && (
          <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
              <Info className="w-4 h-4 mr-2" />
              Notes
            </h2>
            <p className="text-sm italic text-gray-300">"{trip.notes}"</p>
          </div>
        )}

        {trip.status === "COMPLETED" && (
          <LeaveReview
            tripId={trip.id}
            passengerName={trip.passengerName || undefined}
          />
        )}

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            // Авторизованный пользователь — показываем My Trips
            <Link href="/trips" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/20 hover:border-taxi-gold-DEFAULT/40 text-gray-300 hover:text-white px-6 py-3 rounded-xl transition-all font-medium">
                My Trips
              </button>
            </Link>
          ) : (
            // Гость — предлагаем зарегистрироваться для сохранения истории
            <Link href="/register" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto bg-taxi-gold-DEFAULT/10 hover:bg-taxi-gold-DEFAULT/20 border border-taxi-gold-DEFAULT/30 hover:border-taxi-gold-DEFAULT/60 text-taxi-gold-DEFAULT px-6 py-3 rounded-xl transition-all font-medium text-sm">
                💾 Save trip history — Register
              </button>
            </Link>
          )}
          <Link href="/" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto bg-transparent hover:bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 px-6 py-3 rounded-xl transition-all">
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
