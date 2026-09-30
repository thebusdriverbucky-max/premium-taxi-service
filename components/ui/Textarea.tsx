// components/ui/Textarea.tsx

import { cn } from "@/lib/utils";
import React from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || props.name || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium mb-2 text-white/90">
            {label}
            {props.required && <span className="text-red-600">*</span>}
          </label>
        )}
        <textarea
          className={cn(
            "flex min-h-24 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-taxi-gold/50 focus:border-transparent transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-600 focus:ring-red-600",
            className
          )}
          ref={ref}
          id={textareaId}
          {...props}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${textareaId}-error` : props["aria-describedby"]}
        />
        {error && (
          <p id={`${textareaId}-error`} role="alert" className="text-xs text-red-400 mt-1">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
