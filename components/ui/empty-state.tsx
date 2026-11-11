import * as React from "react";
import { cn } from "@/lib/utils";

/** Placeholder for a list or page with nothing to show yet. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border flex flex-col items-center rounded-2xl border border-dashed px-6 py-10 text-center",
        className
      )}
    >
      {icon && (
        <div className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-full [&_svg]:size-6">
          {icon}
        </div>
      )}
      <h3 className="font-inria text-foreground text-lg font-bold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
