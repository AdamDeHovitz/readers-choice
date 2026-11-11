"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { updateNominationNote } from "@/app/actions/nominations";
import { NominationNote } from "./nomination-note";
import { NominationNoteField } from "./nomination-note-field";
import { useAction } from "@/hooks/use-action";

interface EditableNominationNoteProps {
  bookOptionId: string;
  note: string | null;
}

/** The current user's note on their own nomination, editable in place. */
export function EditableNominationNote({
  bookOptionId,
  note,
}: EditableNominationNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const {
    run: save,
    pending: isSaving,
    error,
    reset,
  } = useAction(updateNominationNote, {
    onSuccess: () => setIsEditing(false),
  });

  function handleSave() {
    save(bookOptionId, draft);
  }

  if (!isEditing) {
    return (
      <div className="space-y-1">
        <NominationNote note={note} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-primary -ml-3"
          onClick={() => {
            setDraft(note ?? "");
            setIsEditing(true);
          }}
        >
          {note ? "Edit note" : "Add a note"}
        </Button>
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
          {isSaving ? "Saving…" : "Save note"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setIsEditing(false);
            reset();
          }}
          disabled={isSaving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
