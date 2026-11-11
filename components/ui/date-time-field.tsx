"use client";

import { useState } from "react";
import { CalendarIcon, ChevronDownIcon, XIcon } from "lucide-react";
import {
  TIME_SLOTS,
  formatTimeOfDay,
  joinDateTimeInput,
  parseDateInput,
  splitDateTimeInput,
  toDateInput,
} from "@/lib/datetime-input";
import { cn } from "@/lib/utils";
import { Calendar } from "./calendar";

const fieldClass =
  "border-dark-900/20 bg-card font-inria h-11 rounded-xl border px-3 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 md:text-sm";

interface DateTimeFieldProps {
  /** Id of the date button, for the field's `<Label htmlFor>`. */
  id: string;
  /** Local "YYYY-MM-DDTHH:mm", or "" when unset. */
  value: string;
  onChange: (value: string) => void;
  /** "HH:mm" used when a date is picked before a time. */
  defaultTime: string;
  /** Show a clear button once set, for optional fields. */
  clearable?: boolean;
  disabled?: boolean;
}

/**
 * A date and a time, picked separately: a tap-to-expand calendar and a time
 * list in 15-minute steps (the phone's own wheel on mobile).
 */
export function DateTimeField({
  id,
  value,
  onChange,
  defaultTime,
  clearable = false,
  disabled,
}: DateTimeFieldProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  // The time chosen before any date, so it isn't lost.
  const [pendingTime, setPendingTime] = useState(defaultTime);
  const parts = splitDateTimeInput(value);
  const time = parts.time || pendingTime;
  const selected = parts.date ? parseDateInput(parts.date) : undefined;

  // Keep a saved time that isn't on the 15-minute grid selectable.
  const timeOptions = TIME_SLOTS.includes(time)
    ? TIME_SLOTS
    : [...TIME_SLOTS, time].sort();

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          id={id}
          type="button"
          aria-expanded={calendarOpen}
          disabled={disabled}
          onClick={() => setCalendarOpen((open) => !open)}
          className={cn(
            fieldClass,
            // w-0 so the truncated label can't widen the row past its container.
            "flex w-0 min-w-0 flex-1 items-center gap-2 text-left",
            !selected && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="text-dark-500 size-4 shrink-0" aria-hidden />
          <span className="truncate">
            {selected
              ? selected.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year:
                    selected.getFullYear() === new Date().getFullYear()
                      ? undefined
                      : "numeric",
                })
              : "Pick a date"}
          </span>
        </button>

        <div className="relative w-32 shrink-0">
          <select
            aria-label="Time"
            value={time}
            disabled={disabled}
            onChange={(e) => {
              setPendingTime(e.target.value);
              if (parts.date) {
                onChange(joinDateTimeInput(parts.date, e.target.value));
              }
            }}
            className={cn(fieldClass, "w-full appearance-none pr-8")}
          >
            {timeOptions.map((slot) => (
              <option key={slot} value={slot}>
                {formatTimeOfDay(slot)}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            className="text-dark-500 pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
            aria-hidden
          />
        </div>

        {clearable && value && (
          <button
            type="button"
            aria-label="Clear"
            disabled={disabled}
            onClick={() => {
              onChange("");
              setCalendarOpen(false);
            }}
            className="text-dark-500 hover:bg-muted inline-flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-10"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {calendarOpen && (
        <div className="bg-card border-border rounded-xl border p-2">
          <Calendar
            mode="single"
            required
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(joinDateTimeInput(toDateInput(date), time));
              setCalendarOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
