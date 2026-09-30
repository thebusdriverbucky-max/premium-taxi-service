// components/ui/Input.tsx

import { cn } from "@/lib/utils";
import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, helperText, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || props.name || generatedId;
    const descriptionId = `${inputId}-description`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium mb-2 text-white/90">
            {label}
            {props.required && <span className="text-red-600">*</span>}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-taxi-gold/50 focus:border-transparent transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-600 focus:ring-red-600",
            className
          )}
          ref={ref}
          id={inputId}
          {...props}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={[props['aria-describedby'], (error || helperText) && descriptionId].filter(Boolean).join(' ') || undefined}
        />
        {error && (
          <p id={descriptionId} role="alert" className="text-xs text-red-400 mt-1">{error}</p>
        )}
        {helperText && !error && (
          <p id={descriptionId} className="text-xs text-gray-500 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
