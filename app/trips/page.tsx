import { getMyTrips } from "@/app/actions/trips";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MapPin, Calendar, Clock, CreditCard, Banknote } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function MyTripsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/trips");
  }

  const trips = await getMyTrips();

  return (
    <div className="min-h-screen bg-taxi-dark-navy text-white pt-32 pb-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-taxi-gold-DEFAULT">My Trips</h1>

        {trips.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-6">You haven't booked any trips yet.</p>
            <Link
              href="/booking"
              className="inline-block bg-taxi-gold-gradient text-taxi-dark-navy font-bold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Book a Ride
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {trips.map((trip: any) => {
              const isCash = !trip.stripePaymentIntentId;

              return (
                <Link href={`/trips/${trip.id}`} key={trip.id} className="block">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-taxi-gold-DEFAULT/50 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Trip #{trip.tripNumber || trip.id.slice(0, 8)}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-taxi-gold-DEFAULT" />
                            {trip.scheduledAt ? new Date(trip.scheduledAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            }) : "N/A"}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-taxi-gold-DEFAULT" />
                            {trip.scheduledAt ? new Date(trip.scheduledAt).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : "N/A"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-taxi-gold-DEFAULT">€{Number(trip.total).toFixed(2)}</p>
                          <div className="flex items-center text-xs text-gray-400 justify-end mt-1">
                            {isCash ? <Banknote className="w-3 h-3 mr-1" /> : <CreditCard className="w-3 h-3 mr-1" />}
                            {isCash ? "Cash" : "Card"}
                          </div>
                        </div>
                        <StatusBadge status={trip.status} />
                      </div>
                    </div>

                    <div className="relative pl-6 border-l-2 border-dashed border-taxi-gold-DEFAULT/30 space-y-4 mt-6">
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
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
