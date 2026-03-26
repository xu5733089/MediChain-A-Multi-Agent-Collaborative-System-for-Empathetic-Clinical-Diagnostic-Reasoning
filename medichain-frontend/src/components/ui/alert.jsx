import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full rounded-md border px-4 py-3 text-sm", {
  variants: {
    variant: {
      info: "border-[color:var(--navy)]/40 bg-[var(--navyPale)] text-[var(--ink2)]",
      success: "border-[color:var(--sage)]/40 bg-[var(--sagePale)] text-[var(--ink2)]",
      warn: "border-[color:var(--amber)]/40 bg-[var(--amberPale)] text-[var(--ink2)]",
      error: "border-[color:var(--rose)]/40 bg-[var(--rosePale)] text-[var(--ink2)]",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

function Alert({ className, variant, ...props }) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export { Alert };
