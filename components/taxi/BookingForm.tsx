"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import LocationAutocomplete from "@/components/location-autocomplete";
import { useSettings } from "@/components/providers/settings-provider";

import { bookingDraftSchema as bookingSchema } from "@/lib/booking-draft";

type BookingFormData = z.infer<typeof bookingSchema>;

export function BookingForm() {
  const router = useRouter();
  const { settings } = useSettings();
  const mapCountryCode = settings?.mapCountryCode || "cy";

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      pickup: "",
      dropoff: "",
      date: "",
      phone: "",
    }
  });

  const onSubmit = (data: BookingFormData) => {
    const bookingData = {
      version: 2,
      pickup: data.pickup,
      pickupCoords: { ...data.pickupCoords, address: data.pickup },
      dropoff: data.dropoff,
      dropoffCoords: { ...data.dropoffCoords, address: data.dropoff },
      date: data.date,
      time: new Date(data.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      phone: data.phone
    };

    localStorage.setItem("bookingData", JSON.stringify(bookingData));
    toast.success("Booking request initiated!");
    router.push("/booking");
  };

  return (
    <section id="booking" className="py-28 bg-taxi-dark-navy">
      <div className="container mx-auto px-4">
        <div className="backdrop-blur-md bg-taxi-dark-navy/60 border border-taxi-gold-DEFAULT/30 p-8 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-taxi-white">
            Book Your Ride
          </h2>

          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Controller
                  name="pickup"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <LocationAutocomplete
                      label="Pickup Location"
                      placeholder="e.g. Airport"
                      value={value}
                      pinned={true}
                      mapCountryCode={mapCountryCode}
                      onChange={(address, lat, lng, placeId) => {
                        onChange(address);
                        if (lat !== undefined && lng !== undefined) {
                          setValue("pickupCoords", { lat, lng, placeId }, { shouldValidate: true });
                        } else {
                          setValue("pickupCoords", undefined as never, { shouldValidate: true });
                        }
                      }}
                      error={errors.pickup?.message || (errors.pickupCoords && "Select a pickup location from the suggestions")}
                      required
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Controller
                  name="dropoff"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <LocationAutocomplete
                      label="Dropoff Location"
                      placeholder="e.g. Hotel"
                      value={value}
                      mapCountryCode={mapCountryCode}
                      onChange={(address, lat, lng, placeId) => {
                        onChange(address);
                        if (lat !== undefined && lng !== undefined) {
                          setValue("dropoffCoords", { lat, lng, placeId }, { shouldValidate: true });
                        } else {
                          setValue("dropoffCoords", undefined as never, { shouldValidate: true });
                        }
                      }}
                      error={errors.dropoff?.message || (errors.dropoffCoords && "Select a dropoff location from the suggestions")}
                      required
                    />
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-taxi-white">Date & Time <span className="text-red-500">*</span></label>
                <Input
                  type="datetime-local"
                  {...register("date")}
                  aria-label="Pickup date and time"
                  error={errors.date?.message}
                  className="bg-taxi-dark-navy text-white text-left placeholder:text-gray-400 border-taxi-gold-DEFAULT/30 focus:border-taxi-gold-DEFAULT focus:ring-taxi-gold-DEFAULT [color-scheme:dark] pr-10 relative [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-taxi-white">Phone Number <span className="text-red-500">*</span></label>
                <Input
                  {...register("phone")}
                  aria-label="Phone number"
                  error={errors.phone?.message}
                  placeholder="+357 ..."
                  className="bg-taxi-dark-navy text-white placeholder:text-gray-400 border-taxi-gold-DEFAULT/30 focus:border-taxi-gold-DEFAULT focus:ring-taxi-gold-DEFAULT"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-taxi-gold-gradient hover:brightness-110 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-taxi-dark-navy font-bold py-6 text-lg shadow-[0_0_30px_rgba(191,149,63,0.4)] hover:shadow-[0_0_50px_rgba(191,149,63,0.6)] border border-taxi-gold-light/20 relative overflow-hidden group"
            >
              <span className="relative z-10">Confirm Booking</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform" />
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
