import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-[rgba(22,15,6,0.16)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rose)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

export { Input };
