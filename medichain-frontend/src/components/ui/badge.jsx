import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--paper3)] text-[var(--ink3)]",
        rose: "border-[color:var(--rose)]/40 bg-[var(--roseDim)] text-[var(--rose)]",
        sage: "border-[color:var(--sage)]/40 bg-[var(--sageDim)] text-[var(--sage)]",
        amber: "border-[color:var(--amber)]/40 bg-[var(--amberDim)] text-[var(--amber)]",
        navy: "border-[color:var(--navy)]/40 bg-[var(--navyDim)] text-[var(--navy)]",
        gold: "border-[color:var(--gold)]/40 bg-[color:rgba(192,128,0,0.1)] text-[var(--gold)]",
        plum: "border-[color:var(--plum)]/40 bg-[var(--plumDim)] text-[var(--plum)]",
        outline: "border-[rgba(22,15,6,0.16)] text-[var(--ink3)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
