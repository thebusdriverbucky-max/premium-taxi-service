"use client";

import { useState, useEffect } from "react";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";

// Libraries must be defined outside the component to avoid re-renders
const libraries: ("places")[] = ["places"];

interface LocationAutocompleteProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  error?: string;
  required?: boolean;
  className?: string;
  pinned?: boolean;
  mapCountryCode?: string;
}

export default function LocationAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  error,
  required,
  className = "",
  pinned = false,
  mapCountryCode,
}: LocationAutocompleteProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
    language: "en", // Force English to avoid "Zracna luka" issues
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value);

  // Sync internal state with prop value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();

      // If no geometry, it might be a partial match or invalid
      if (!place.geometry || !place.geometry.location) {
        return;
      }

      const name = place.name ?? "";
      const formatted = place.formatted_address ?? "";
      const types = place.types ?? [];

      const isAirport =
        types.includes("airport") ||
        /airport/i.test(name) ||
        /airport/i.test(formatted);

      // IMPORTANT: for airport prefer name (usually "Larnaca International Airport")
      // and DO NOT let formatted_address like "Larnaca, Cyprus" overwrite the selection.
      let address = formatted || name;

      if (isAirport) {
        address = name || formatted;

        // Get country name from country code for airport address formatting
        const countryName = mapCountryCode
          ? new Intl.DisplayNames(['en'], { type: 'region' }).of(mapCountryCode.toUpperCase()) || ''
          : '';

        // If formatted_address is too generic (just "City, Country"), use name + country
        const isGenericFormatted = formatted.split(',').length <= 2;
        if (isGenericFormatted && name && countryName) {
          address = `${name}, ${countryName}`;
        }
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      setInputValue(address);
      onChange(address, lat, lng);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue); // Update parent with just string, no coords yet
  };

  return (
    <div className={`w-full ${className}`}>
      <label className="block text-sm font-medium text-taxi-white mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative z-20">
        {isLoaded ? (
          <Autocomplete
            onLoad={onLoad}
            onPlaceChanged={onPlaceChanged}
            options={{
              componentRestrictions: { country: mapCountryCode || "cy" },
              fields: ["formatted_address", "geometry", "name", "types", "place_id"],
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              required={required}
              className={`w-full bg-taxi-dark-navy border ${error ? "border-red-500" : "border-taxi-gold-DEFAULT/30"
                } rounded-md px-4 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:border-taxi-gold-DEFAULT transition-colors`}
            />
          </Autocomplete>
        ) : (
          <div className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2 text-gray-400 flex items-center">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading maps...
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {/* Custom Styles for Google Maps Autocomplete Dropdown */}
      <style jsx global>{`
        .pac-container {
          background-color: #1a1a1a;
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-family: inherit;
          border-radius: 0.375rem;
          margin-top: 4px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          z-index: 9999 !important; /* Ensure it sits above other elements */
        }

        .pac-item {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          color: #e5e5e5;
          padding: 10px;
          cursor: pointer;
        }
        .pac-item:hover {
          background-color: rgba(212, 175, 55, 0.1);
        }
        .pac-item-query {
          color: #fff;
        }
        .pac-matched {
          color: #d4af37;
        }
      `}</style>
    </div>
  );
}
