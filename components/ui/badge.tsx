import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 font-inria text-xs font-bold whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        /** Neutral metadata: "Admin", "Past". */
        default: "bg-muted text-muted-foreground",
        /** Needs the reader's action now: nominating, voting. */
        active: "bg-sage-200 text-sage-800",
        /** Settled: finalized, selected. */
        primary: "bg-rust-600 text-primary-foreground",
        outline: "border border-border text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
