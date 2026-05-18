"use client";

import { cn } from "@/lib/utils";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  error?: string;
  label?: string;
  options: Array<{ value: string; label: string }>;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  searchable?: boolean;
  placeholder?: string;
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ className, error, label, options, id, value, onChange, disabled, searchable = false, placeholder = "Select...", ...props }, ref) => {
    const selectId = id || props.name;
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // FIX: не падаем на options если value не найден
    const selectedOption = options.find((opt) => opt.value === value) || null;

    const filteredOptions = useMemo(() => {
      if (!searchQuery.trim()) return options;
      const q = searchQuery.toLowerCase();
      return options.filter(opt => opt.label.toLowerCase().includes(q));
    }, [options, searchQuery]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchQuery("");
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
      if (isOpen && searchable && searchRef.current) {
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (!isOpen) setSearchQuery("");
    }, [isOpen, searchable]);

    const handleSelect = (optionValue: string) => {
      if (onChange) {
        onChange({ target: { value: optionValue, name: props.name } });
      }
      setIsOpen(false);
      setSearchQuery("");
    };

    return (
      <div className="w-full" ref={containerRef}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium mb-2 text-white/90">
            {label}
            {props.required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}
        <div className="relative" ref={ref}>
          <button
            type="button"
            id={selectId}
            disabled={disabled}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={cn(
              "flex h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-taxi-gold/50 focus:border-transparent transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-red-600 focus:ring-red-600",
              className
            )}
          >
            <span className={cn("truncate", !selectedOption && "text-gray-500")}>
              {selectedOption?.label || placeholder}
            </span>
            <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
          </button>

          {isOpen && (
            <div className="absolute z-50 mt-2 w-full rounded-xl border border-white/10 bg-[#1a1f2e] shadow-lg shadow-black/50">
              {searchable && (
                <div className="p-2 border-b border-white/10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-taxi-gold/50"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSearchQuery(""); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              <ul className="max-h-60 overflow-auto py-1">
                {filteredOptions.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-gray-500 text-center">No results found</li>
                ) : (
                  filteredOptions.map((option) => (
                    <li
                      key={option.value}
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        "cursor-pointer px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors",
                        value === option.value && "bg-taxi-gold/20 text-taxi-gold"
                      )}
                    >
                      {option.label}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
