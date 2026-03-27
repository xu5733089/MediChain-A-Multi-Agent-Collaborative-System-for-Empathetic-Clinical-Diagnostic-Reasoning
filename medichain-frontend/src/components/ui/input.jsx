import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(function Input({ className, type = "text", style, ...props }, ref) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-md border border-[rgba(22,15,6,0.16)] bg-[var(--paper)] px-5 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rose)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{
        height: 48,
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 12,
        paddingBottom: 12,
        ...style,
      }}
      ref={ref}
      {...props}
    />
  );
});

export { Input };
