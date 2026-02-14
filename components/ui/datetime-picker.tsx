"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Generate time slots in 30-minute increments
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? "00" : "30";
  const period = hours < 12 ? "AM" : "PM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const value = `${String(hours).padStart(2, "0")}:${minutes}`;
  const label = `${displayHours}:${minutes} ${period}`;
  return { value, label };
});

interface DateTimePickerProps {
  id?: string;
  name?: string;
  value?: string; // ISO string or datetime-local format
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DateTimePicker({
  id,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:00");
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeButtonRef = useRef<HTMLButtonElement>(null);

  // Parse incoming value
  useEffect(() => {
    if (value) {
      try {
        // Handle both ISO strings and datetime-local format
        const dateObj = new Date(value);
        if (!isNaN(dateObj.getTime())) {
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const day = String(dateObj.getDate()).padStart(2, "0");
          setDate(`${year}-${month}-${day}`);

          const hours = String(dateObj.getHours()).padStart(2, "0");
          const minutes = dateObj.getMinutes() >= 30 ? "30" : "00";
          setTime(`${hours}:${minutes}`);
        }
      } catch {
        // Invalid date, ignore
      }
    }
  }, [value]);

  // Emit combined value when date or time changes
  useEffect(() => {
    if (date && onChange) {
      const combinedValue = `${date}T${time}`;
      onChange(combinedValue);
    }
  }, [date, time, onChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        timeButtonRef.current &&
        !timeButtonRef.current.contains(event.target as Node)
      ) {
        setShowTimeDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll to selected time when dropdown opens
  useEffect(() => {
    if (showTimeDropdown && dropdownRef.current) {
      const selectedElement = dropdownRef.current.querySelector(
        '[data-selected="true"]'
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "center" });
      }
    }
  }, [showTimeDropdown]);

  const selectedTimeSlot = TIME_SLOTS.find((slot) => slot.value === time);
  const displayTime = selectedTimeSlot?.label || "Select time";

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Hidden input for form submission */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={date ? `${date}T${time}` : ""}
        />
      )}

      {/* Date picker */}
      <Input
        id={id}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required={required}
        disabled={disabled}
        className="flex-1"
      />

      {/* Time selector */}
      <div className="relative">
        <button
          ref={timeButtonRef}
          type="button"
          onClick={() => !disabled && setShowTimeDropdown(!showTimeDropdown)}
          disabled={disabled}
          className={cn(
            "font-inria h-9 min-w-[110px] rounded-md border bg-transparent px-3 text-left text-sm",
            "border-input shadow-xs transition-[color,box-shadow] outline-none",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            disabled && "pointer-events-none cursor-not-allowed opacity-50"
          )}
        >
          {displayTime}
        </button>

        {showTimeDropdown && (
          <div
            ref={dropdownRef}
            className="border-gold-600/20 absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-white shadow-lg"
          >
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot.value}
                type="button"
                data-selected={slot.value === time}
                onClick={() => {
                  setTime(slot.value);
                  setShowTimeDropdown(false);
                }}
                className={cn(
                  "font-inria text-dark-900 w-full px-4 py-2 text-left text-sm",
                  "hover:bg-cream-100 first:rounded-t-lg last:rounded-b-lg",
                  slot.value === time && "bg-gold-50 font-medium"
                )}
              >
                {slot.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
