import * as React from "react";

import { cn } from "./utils";

export interface InputProps extends React.ComponentProps<"input"> {
  isAutoFilled?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, isAutoFilled, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium md:text-sm",
          // Focus states
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          // Error states
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          // Disabled state (Priority 1) - Gray
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500",
          // Auto-filled state (Priority 2) - Neuron Light Green
          !props.disabled && isAutoFilled && "bg-emerald-50 border-emerald-200 text-emerald-900 focus:bg-white focus:border-input focus:text-foreground",
          // Default state (Priority 3) - White
          !props.disabled && !isAutoFilled && "bg-white",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
