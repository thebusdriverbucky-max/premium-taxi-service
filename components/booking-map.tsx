"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, DirectionsRenderer } from "@react-google-maps/api";
import { latestRequest } from "@/lib/latest-request";
import type { SelectedLocation, RouteMetrics } from "@/lib/booking-location";
import { Loader2 } from "lucide-react";

const libraries: ("places")[] = ["places"];

const mapContainerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "400px",
  borderRadius: "0.75rem",
};

const center = {
  lat: 34.9175, // Larnaca
  lng: 33.6290,
};

const darkLuxuryMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#212121" }]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#212121" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9e9e9e" }]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#bdbdbd" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#181818" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#1b1b1b" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#2c2c2c" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#8a8a8a" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [{ "color": "#373737" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#3c3c3c" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#d4af37" }, { "weight": 0.5 }] // Gold accent
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [{ "color": "#4e4e4e" }]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#000000" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#3d3d3d" }]
  }
];

interface BookingMapProps {
  pickup: SelectedLocation | null;
  dropoff: SelectedLocation | null;
  onRouteChange: (route: RouteMetrics | null, error?: string) => void;
  className?: string;
  mapCenter?: { lat: number; lng: number };
  mapZoom?: number;
}

export default function BookingMap({ 
  pickup, 
  dropoff, 
  onRouteChange,
  className,
  mapCenter,
  mapZoom = 10
}: BookingMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
    language: "en",
  });

  const [response, setResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const defaultCenter = useMemo(() => mapCenter || center, [mapCenter]);

  useEffect(() => {
    setResponse(null);
    if (!isLoaded || !pickup || !dropoff) return;
    // Google Directions callbacks cannot be aborted; invalidation prevents stale commits.
    const request = latestRequest();
    const commit = request.start();
    const service = new google.maps.DirectionsService();
    service.route({
      origin: { lat: pickup.latitude, lng: pickup.longitude },
      destination: { lat: dropoff.latitude, lng: dropoff.longitude },
      travelMode: google.maps.TravelMode.DRIVING,
    }, (result, status) => commit(() => {
      const leg = result?.routes[0]?.legs[0];
      if (status !== 'OK' || !leg?.distance?.value || !leg.duration?.value) {
        setResponse(null);
        onRouteChange(null, 'No driving route could be calculated. Select locations again or retry.');
        return;
      }
      setResponse(result);
      onRouteChange({ distanceMeters: leg.distance.value, durationSeconds: leg.duration.value });
    }));
    return () => request.cancel();
  }, [isLoaded, pickup, dropoff, onRouteChange]);

  const onLoad = useCallback(() => setMapReady(true), []);
  const onUnmount = useCallback(() => setMapReady(false), []);

  if (loadError) return <div role="alert" className="p-6 text-red-300">Maps could not load. Please reload or contact us.</div>;

  if (!isLoaded) {
    return (
      <div className={`w-full h-full min-h-[400px] bg-[#1a1a1a] rounded-xl relative overflow-hidden border border-white/10 ${className || ""}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="w-8 h-8 mb-2 animate-spin text-taxi-gold-DEFAULT" />
          <span className="text-sm font-medium tracking-wider uppercase">Initializing Map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full min-h-[400px] relative rounded-xl overflow-hidden border border-taxi-gold-DEFAULT/30 shadow-lg ${className || ""}`}>
      {!mapReady && (
        <div className="absolute inset-0 z-10 bg-taxi-dark-navy/80 backdrop-blur-sm flex flex-col items-center justify-center text-taxi-gold-DEFAULT">
          <Loader2 className="w-8 h-8 mb-2 animate-spin" />
          <span className="text-sm font-medium">Loading Map View...</span>
        </div>
      )}
      
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={mapZoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: darkLuxuryMapStyle,
          disableDefaultUI: true,
          zoomControl: true,
        }}
      >
        {response && (
          <DirectionsRenderer
            options={{
              directions: response,
              polylineOptions: {
                strokeColor: "#d4af37", // Gold route line
                strokeWeight: 5,
                strokeOpacity: 0.8,
              },
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
