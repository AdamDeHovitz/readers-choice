"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { updateNominationNote } from "@/app/actions/nominations";
import { NominationNote } from "./nomination-note";
import { NominationNoteField } from "./nomination-note-field";

interface EditableNominationNoteProps {
  bookOptionId: string;
  note: string | null;
  nominatorName: string | null;
}

/** The current user's note on their own nomination, editable in place. */
export function EditableNominationNote({
  bookOptionId,
  note,
  nominatorName,
}: EditableNominationNoteProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    const result = await updateNominationNote(bookOptionId, draft);
    setIsSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setIsEditing(false);
    router.refresh();
  }

  if (!isEditing) {
    return (
      <div className="space-y-1">
        <NominationNote note={note} nominatorName={nominatorName} />
        <button
          type="button"
          onClick={() => {
            setDraft(note ?? "");
            setIsEditing(true);
          }}
          className="text-gold-700 hover:text-gold-800 text-xs font-medium"
        >
          {note ? "Edit note" : "Add a note"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <NominationNoteField
        id={`nomination-note-${bookOptionId}`}
        value={draft}
        onChange={setDraft}
        disabled={isSaving}
      />
      {error && <Alert variant="destructive">{error}</Alert>}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Note"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setIsEditing(false);
            setError(null);
          }}
          disabled={isSaving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
