"use client";

import { useState, useEffect, useId, useRef } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";
import { latestRequest } from "@/lib/latest-request";
import { selectedLocation } from "@/lib/booking-location";

const libraries: ("places")[] = ["places"];

interface LocationAutocompleteProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (address: string, lat?: number, lng?: number, placeId?: string) => void;
  required?: boolean;
  error?: string;
  pinned?: boolean;
  className?: string;
  mapCountryCode?: string;
}

export default function LocationAutocomplete({ label, placeholder, value, onChange, required, error, className = "", mapCountryCode = "cy" }: LocationAutocompleteProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
    language: "en",
  });
  const inputId = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [providerError, setProviderError] = useState<string>();
  const predictions = useRef(latestRequest());
  const details = useRef(latestRequest());
  const session = useRef<google.maps.places.AutocompleteSessionToken>();
  const currentValue = useRef(value);
  currentValue.current = value;

  useEffect(() => () => { predictions.current.cancel(); details.current.cancel(); }, []);

  useEffect(() => {
    setSuggestions([]);
    if (!isLoaded || query === null || query !== value || query.trim().length < 2) return;
    const request = predictions.current;
    const commit = request.start();
    const timer = setTimeout(() => {
      session.current ??= new google.maps.places.AutocompleteSessionToken();
      new google.maps.places.AutocompleteService().getPlacePredictions({
        input: query,
        componentRestrictions: { country: mapCountryCode || 'cy' },
        sessionToken: session.current,
      }, (results, status) => commit(() => {
        if (currentValue.current !== query) return;
        setSuggestions(status === 'OK' ? results || [] : []);
        setActiveIndex(0);
        setProviderError(status === 'OK' ? undefined : status === 'ZERO_RESULTS'
          ? 'No matching locations. Try a more specific address.'
          : 'Address suggestions are unavailable. Please try again.');
      }));
    }, 200);
    return () => { clearTimeout(timer); request.cancel(); };
  }, [query, value, isLoaded, mapCountryCode]);

  const select = (suggestion: google.maps.places.AutocompletePrediction) => {
    predictions.current.cancel();
    const commit = details.current.start();
    setQuery(null);
    setSuggestions([]);
    setProviderError(undefined);
    setPending(true);
    // Clear the previous coordinates before loading the newly selected place.
    currentValue.current = suggestion.description;
    onChange(suggestion.description);
    new google.maps.places.PlacesService(document.createElement('div')).getDetails({
      placeId: suggestion.place_id,
      fields: ['formatted_address', 'geometry', 'name', 'types', 'place_id'],
      sessionToken: session.current,
    }, (place, status) => commit(() => {
      if (currentValue.current !== suggestion.description) return;
      setPending(false);
      session.current = undefined;
      const geometry = place?.geometry?.location;
      const address = place?.types?.includes('airport')
        ? `${place.name || suggestion.structured_formatting.main_text}, ${place.formatted_address || suggestion.description}`
        : place?.formatted_address || suggestion.description;
      const point = selectedLocation(address, geometry?.lat(), geometry?.lng(), place?.place_id);
      if (status !== 'OK' || !point || place?.place_id !== suggestion.place_id) {
        setProviderError('Unable to resolve this location. Select a suggestion again.');
        return;
      }
      currentValue.current = point.address;
      onChange(point.address, point.latitude, point.longitude, point.placeId);
    }));
  };

  const message = error || providerError || (loadError ? 'Maps could not load. Please reload or contact us.' : undefined);
  return (
    <div className={`w-full ${className}`}>
      <label htmlFor={inputId} className="block text-sm font-medium text-taxi-white mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls={`${inputId}-list`}
          aria-activedescendant={suggestions.length ? `${inputId}-option-${activeIndex}` : undefined}
          aria-invalid={Boolean(message)}
          aria-describedby={message ? `${inputId}-error` : undefined}
          value={value}
          onChange={event => {
            predictions.current.cancel();
            details.current.cancel();
            setPending(false);
            setProviderError(undefined);
            setSuggestions([]);
            currentValue.current = event.target.value;
            setQuery(event.target.value);
            onChange(event.target.value);
          }}
          onBlur={() => { predictions.current.cancel(); setQuery(null); setSuggestions([]); }}
          onKeyDown={event => {
            if (event.key === 'Escape') { predictions.current.cancel(); setQuery(null); setSuggestions([]); }
            if (!suggestions.length) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex(index => (index + (event.key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length);
            }
            if (event.key === 'Enter') { event.preventDefault(); select(suggestions[activeIndex]); }
          }}
          placeholder={placeholder}
          required={required}
          className={`w-full bg-taxi-dark-navy border ${message ? 'border-red-400' : 'border-taxi-gold-DEFAULT/30'} rounded-md px-4 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:border-taxi-gold-DEFAULT`}
        />
        {(!isLoaded || pending) && !loadError && <span role="status" className="text-sm text-gray-300 flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" />{pending ? 'Resolving location...' : 'Loading maps...'}</span>}
        <ul id={`${inputId}-list`} role="listbox" className={suggestions.length ? 'absolute z-50 w-full bg-taxi-dark-navy border border-white/20 rounded-md shadow-lg' : 'hidden'}>
          {suggestions.map((suggestion, index) => <li
            id={`${inputId}-option-${index}`}
            key={suggestion.place_id}
            role="option"
            aria-selected={activeIndex === index}
            className={`px-4 py-3 cursor-pointer ${activeIndex === index ? 'bg-white/10' : ''}`}
            onMouseDown={event => { event.preventDefault(); select(suggestion); }}
          >{suggestion.description}</li>)}
          {suggestions.length > 0 && <li role="presentation" className="text-xs text-gray-400 p-2 text-right">Powered by Google</li>}
        </ul>
      </div>
      {message && <p id={`${inputId}-error`} role="alert" className="text-red-400 text-xs mt-1">{message}</p>}
    </div>
  );
}
