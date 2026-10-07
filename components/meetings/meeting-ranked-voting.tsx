"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { saveRankedVotes } from "@/app/actions/meeting-voting";
import { Alert } from "@/components/ui/alert";
import {
  BookDragOverlay,
  DroppableRankedZone,
  RANKED_ZONE_ID,
  SortableRankedBookItem,
  SortableUnrankedBookItem,
} from "./ranked-voting-items";
import type { MeetingBookOption } from "./types";

interface MeetingRankedVotingProps {
  meetingId: string;
  bookOptions: MeetingBookOption[];
  initialRankings: { bookOptionId: string; rank: number }[];
  currentUserIsAdmin: boolean;
}

export function MeetingRankedVoting({
  meetingId,
  bookOptions,
  initialRankings,
  currentUserIsAdmin,
}: MeetingRankedVotingProps) {
  // Sort initial rankings by rank
  const sortedInitial = [...initialRankings].sort((a, b) => a.rank - b.rank);
  const initialRankedIds = sortedInitial.map((r) => r.bookOptionId);

  const [rankedIds, setRankedIds] = useState<string[]>(initialRankedIds);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const rankedBooks = rankedIds
    .map((id) => bookOptions.find((bo) => bo.id === id))
    .filter((bo): bo is MeetingBookOption => bo !== undefined);

  const unrankedBooks = bookOptions.filter((bo) => !rankedIds.includes(bo.id));
  const unrankedIds = unrankedBooks.map((bo) => bo.id);

  const activeBook = activeId
    ? bookOptions.find((bo) => bo.id === activeId)
    : null;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function saveRankings(newRankedIds: string[]) {
    setIsSaving(true);
    setError(null);

    const rankings = newRankedIds.map((id, index) => ({
      bookOptionId: id,
      rank: index + 1,
    }));

    const result = await saveRankedVotes(meetingId, rankings);

    if (result.error) {
      setError(result.error);
    } else {
      setLastSaved(new Date());
    }

    setIsSaving(false);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    const isActiveInRanked = rankedIds.includes(activeIdStr);
    const isOverRankedZone = overIdStr === RANKED_ZONE_ID;
    const isOverInRanked = rankedIds.includes(overIdStr);

    // Dragging from unranked to ranked zone or onto a ranked item
    if (!isActiveInRanked && (isOverRankedZone || isOverInRanked)) {
      setRankedIds((prev) => {
        if (prev.includes(activeIdStr)) return prev;

        if (isOverInRanked) {
          // Insert at the position of the item we're over
          const overIndex = prev.indexOf(overIdStr);
          const newRanked = [...prev];
          newRanked.splice(overIndex, 0, activeIdStr);
          return newRanked;
        }

        // Add to end of ranked list
        return [...prev, activeIdStr];
      });
    }

    // Dragging from ranked to unranked area
    if (
      isActiveInRanked &&
      !isOverInRanked &&
      !isOverRankedZone &&
      unrankedIds.includes(overIdStr)
    ) {
      setRankedIds((prev) => prev.filter((id) => id !== activeIdStr));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Both in ranked - reorder
    if (rankedIds.includes(activeIdStr) && rankedIds.includes(overIdStr)) {
      if (activeIdStr !== overIdStr) {
        setRankedIds((items) => {
          const oldIndex = items.indexOf(activeIdStr);
          const newIndex = items.indexOf(overIdStr);
          const newOrder = arrayMove(items, oldIndex, newIndex);
          saveRankings(newOrder);
          return newOrder;
        });
      } else {
        // Position may have changed during drag over, save current state
        saveRankings(rankedIds);
      }
    } else if (rankedIds.includes(activeIdStr)) {
      // Was moved during dragOver, save
      saveRankings(rankedIds);
    }
  }

  function handleRemove(bookOptionId: string) {
    const newRankedIds = rankedIds.filter((id) => id !== bookOptionId);
    setRankedIds(newRankedIds);
    saveRankings(newRankedIds);
  }

  function handleAdd(bookOptionId: string) {
    const newRankedIds = [...rankedIds, bookOptionId];
    setRankedIds(newRankedIds);
    saveRankings(newRankedIds);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Ranked books section */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-inria text-dark-900 text-sm font-semibold">
              Your Ranking
              {rankedBooks.length > 0 && (
                <span className="text-dark-500 ml-2 text-xs font-normal">
                  ({rankedBooks.length}{" "}
                  {rankedBooks.length === 1 ? "book" : "books"})
                </span>
              )}
            </h4>
            {/* Auto-save status */}
            <div className="text-dark-600 text-xs">
              {isSaving ? (
                <span className="flex items-center gap-1">
                  <span className="bg-gold-500 inline-block h-1.5 w-1.5 animate-pulse rounded-full"></span>
                  Saving...
                </span>
              ) : lastSaved ? (
                <span className="text-rust-700">
                  Saved{" "}
                  {lastSaved.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : null}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-3 p-2 text-xs">
              {error}
            </Alert>
          )}

          <SortableContext
            items={rankedIds}
            strategy={verticalListSortingStrategy}
          >
            <DroppableRankedZone isEmpty={rankedBooks.length === 0}>
              {rankedBooks.length === 0 ? (
                <>
                  <p className="text-dark-600 text-sm">
                    Drag books here to rank them, or click &quot;Add to
                    Ranking&quot; below.
                  </p>
                  <p className="text-dark-500 mt-1 text-xs">
                    Your #1 choice gets the most weight in determining the
                    winner.
                  </p>
                </>
              ) : (
                <div className="space-y-2">
                  {rankedBooks.map((bookOption, index) => (
                    <SortableRankedBookItem
                      key={bookOption.id}
                      bookOption={bookOption}
                      rank={index + 1}
                      onRemove={handleRemove}
                      currentUserIsAdmin={currentUserIsAdmin}
                    />
                  ))}
                </div>
              )}
            </DroppableRankedZone>
          </SortableContext>
        </div>

        {/* Unranked books section */}
        {unrankedBooks.length > 0 && (
          <div>
            <h4 className="font-inria text-dark-900 mb-3 text-sm font-semibold">
              Not Ranked
              <span className="text-dark-500 ml-2 text-xs font-normal">
                ({unrankedBooks.length}{" "}
                {unrankedBooks.length === 1 ? "book" : "books"})
              </span>
            </h4>
            <p className="text-dark-500 mb-2 text-xs">
              These books will receive 0 points from your ballot.
            </p>
            <SortableContext
              items={unrankedIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {unrankedBooks.map((bookOption) => (
                  <SortableUnrankedBookItem
                    key={bookOption.id}
                    bookOption={bookOption}
                    onAdd={handleAdd}
                    currentUserIsAdmin={currentUserIsAdmin}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        )}
      </div>

      {/* Drag overlay for better visual feedback */}
      <DragOverlay>
        {activeBook ? <BookDragOverlay bookOption={activeBook} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
