"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

/** A month calendar styled for the app; wraps react-day-picker. */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("font-inria", className)}
      classNames={{
        months: "relative",
        month: "space-y-2",
        month_caption: "flex h-11 items-center px-2",
        caption_label: "text-base font-bold",
        nav: "absolute inset-x-0 top-0 flex h-11 items-center justify-end gap-1",
        button_previous:
          "inline-flex size-11 items-center justify-center rounded-xl text-dark-600 hover:bg-muted disabled:opacity-40 sm:size-9",
        button_next:
          "inline-flex size-11 items-center justify-center rounded-xl text-dark-600 hover:bg-muted disabled:opacity-40 sm:size-9",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-dark-500 flex-1 text-center text-xs font-bold",
        week: "mt-1 flex w-full",
        day: "flex flex-1 justify-center p-0 text-center",
        day_button:
          "inline-flex size-11 items-center justify-center rounded-full text-base transition-colors hover:bg-sage-100 sm:size-9 sm:text-sm",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-bold [&>button]:hover:bg-rust-700",
        today: "[&>button]:ring-1 [&>button]:ring-sage-600",
        outside: "text-dark-500/60",
        disabled: "opacity-40 [&>button]:pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className={cn("size-5", chevronClass)} />
          ) : (
            <ChevronRightIcon className={cn("size-5", chevronClass)} />
          ),
      }}
      {...props}
    />
  );
}
