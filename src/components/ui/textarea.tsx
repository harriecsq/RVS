import * as React from "react";

import { cn } from "./utils";

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  isAutoFilled?: boolean;
}

function Textarea({ className, isAutoFilled, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-input placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-base transition-[color,box-shadow] outline-none md:text-sm",
        // Focus states
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        // Error states
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // Disabled state (Priority 1) - Gray
        "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500",
        // Auto-filled state (Priority 2) - Neuron Light Green
        !props.disabled && isAutoFilled && "bg-emerald-50 border-emerald-200 text-emerald-900 focus:bg-white focus:border-input focus:text-foreground",
        // Default state (Priority 3) - White
        !props.disabled && !isAutoFilled && "bg-white",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
