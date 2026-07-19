import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          // text-base (16px) en mobile: iOS hace zoom al enfocar inputs con
          // fuente <16px. En desktop volvemos a 14px, donde el zoom no aplica.
          "flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 max-sm:min-h-[44px] sm:text-sm",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
