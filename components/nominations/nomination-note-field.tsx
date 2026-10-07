"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NOMINATION_NOTE_MAX_LENGTH } from "@/lib/nomination-note";

interface NominationNoteFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Textarea for a nominator's note, with a character counter. */
export function NominationNoteField({
  id,
  value,
  onChange,
  disabled,
}: NominationNoteFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Note (Optional)</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Why this book? Check the meeting details for anything to include."
        maxLength={NOMINATION_NOTE_MAX_LENGTH}
        rows={3}
        disabled={disabled}
      />
      <p className="text-dark-500 text-right text-xs">
        {value.length}/{NOMINATION_NOTE_MAX_LENGTH}
      </p>
    </div>
  );
}
