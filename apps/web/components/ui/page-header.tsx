import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  /** Small line above the title, e.g. a status badge or date. */
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  /** Primary page actions. They sit under the title on phones. */
  actions?: React.ReactNode;
  className?: string;
}

/** The title block at the top of every page. One per page, renders the h1. */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <div className="flex flex-wrap gap-2">{eyebrow}</div>}
        <h1 className="font-display text-foreground text-3xl leading-tight text-balance sm:text-4xl">
          {title}
        </h1>
        {description && (
          <div className="text-muted-foreground text-sm sm:text-base">
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          {actions}
        </div>
      )}
    </header>
  );
}

/** A titled group of content within a page (renders an h2). */
export function Section({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-3", className)} {...props}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-inria text-foreground text-xl font-bold">
            {title}
          </h2>
          {description && (
            <p className="text-muted-foreground mt-0.5 text-sm">
              {description}
            </p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
