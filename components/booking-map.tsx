"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { GoogleMap, useJsApiLoader, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";
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
  pickup: string;
  dropoff: string;
  onDistanceChange: (distanceKm: number) => void;
  className?: string;
  mapCenter?: { lat: number; lng: number };
  mapZoom?: number;
}

export default function BookingMap({ 
  pickup, 
  dropoff, 
  onDistanceChange, 
  className,
  mapCenter,
  mapZoom = 10
}: BookingMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [response, setResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const defaultCenter = useMemo(() => mapCenter || center, [mapCenter]);

  // Use refs to track previous values to avoid infinite loops if props change but are effectively same
  const prevPickup = useRef(pickup);
  const prevDropoff = useRef(dropoff);

  const directionsCallback = useCallback((
    result: google.maps.DirectionsResult | null,
    status: google.maps.DirectionsStatus
  ) => {
    if (result !== null && status === 'OK') {
      // Only update state if the result is actually different or we don't have one yet
      // This is a basic check; for production, might need deeper comparison
      setResponse(prev => {
        // If we already have a response and the route looks the same (e.g. same distance), skip update
        // This helps prevent infinite loops if the API returns slightly different objects
        if (prev &&
          prev.routes[0]?.legs[0]?.distance?.value === result.routes[0]?.legs[0]?.distance?.value &&
          prev.routes[0]?.overview_polyline === result.routes[0]?.overview_polyline) {
          return prev;
        }
        return result;
      });

      const route = result.routes[0];
      if (route && route.legs && route.legs[0] && route.legs[0].distance) {
        const distanceInMeters = route.legs[0].distance.value;
        const distanceInKm = distanceInMeters / 1000;
        onDistanceChange(distanceInKm);
      }
    } else {
      console.error(`Directions request failed due to ${status}`);
    }
  }, [onDistanceChange]);

  const directionsOptions = useMemo(() => {
    if (!isLoaded || !pickup || !dropoff) return null;
    return {
      destination: dropoff,
      origin: pickup,
      travelMode: google.maps.TravelMode.DRIVING,
    };
  }, [isLoaded, pickup, dropoff]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    // Small delay to ensure map is actually rendered
    setTimeout(() => {
      setMapReady(true);
    }, 500);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
    setMapReady(false);
  }, []);

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
        {directionsOptions && (
          <DirectionsService
            options={directionsOptions}
            callback={directionsCallback}
          />
        )}

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

