"use client";

import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BookMeta } from "@/components/books/book-meta";
import { sanitizeDescription } from "@/lib/sanitize-description";
import { NominationNote } from "@/components/nominations/nomination-note";
import { EditBookOptionMetadataDialog } from "./edit-book-option-metadata-dialog";
import type { MeetingBook, MeetingBookOption } from "./types";

export const RANKED_ZONE_ID = "ranked-zone";

function CoverThumbnail({ book }: { book: MeetingBook }) {
  if (!book.coverUrl) return null;

  return (
    <Image
      src={book.coverUrl}
      alt={book.title}
      width={40}
      height={60}
      className="shrink-0 rounded shadow-sm"
    />
  );
}

function BookDetails({
  bookOption,
  muted = false,
}: {
  bookOption: MeetingBookOption;
  muted?: boolean;
}) {
  const { book } = bookOption;
  return (
    <div className="min-w-0 flex-1">
      <h4
        className={`font-inria ${muted ? "text-dark-600" : "text-dark-900"} truncate text-sm font-semibold`}
      >
        {book.title}
      </h4>
      <p
        className={`${muted ? "text-dark-500" : "text-dark-600"} truncate text-xs`}
      >
        {book.author}
      </p>
      <BookMeta
        pageCount={book.pageCount}
        publishedYear={book.publishedYear}
        className="text-dark-500 text-xs"
      />
      <NominationNote
        note={bookOption.nominationNote}
        nominatorName={bookOption.nominatorName}
        compact
        className="mt-1"
      />
      {book.description && (
        <div
          className="text-dark-600 mt-1 line-clamp-2 text-xs"
          dangerouslySetInnerHTML={{
            __html: sanitizeDescription(book.description),
          }}
        />
      )}
    </div>
  );
}

function BookOptionActions({
  bookOption,
  currentUserIsAdmin,
  actionLabel,
  onAction,
}: {
  bookOption: MeetingBookOption;
  currentUserIsAdmin: boolean;
  actionLabel: string;
  onAction: (id: string) => void;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
      {currentUserIsAdmin && (
        <EditBookOptionMetadataDialog
          bookOptionId={bookOption.id}
          bookTitle={bookOption.book.title}
          currentDescription={bookOption.book.description}
          currentPageCount={bookOption.book.pageCount}
        />
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAction(bookOption.id)}
        className="text-xs"
      >
        {actionLabel}
      </Button>
    </div>
  );
}

export function SortableRankedBookItem({
  bookOption,
  rank,
  onRemove,
  currentUserIsAdmin,
}: {
  bookOption: MeetingBookOption;
  rank: number;
  onRemove: (id: string) => void;
  currentUserIsAdmin: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: bookOption.id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-gold-600/20 flex items-center gap-3 rounded-lg border bg-white p-3"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none active:cursor-grabbing"
      >
        <GripVertical className="text-dark-500 h-5 w-5" />
      </div>

      {/* Rank badge */}
      <div className="bg-gold-100 text-dark-900 font-inria flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold">
        {rank}
      </div>

      <CoverThumbnail book={bookOption.book} />
      <BookDetails bookOption={bookOption} />
      <BookOptionActions
        bookOption={bookOption}
        currentUserIsAdmin={currentUserIsAdmin}
        actionLabel="Remove"
        onAction={onRemove}
      />
    </div>
  );
}

export function SortableUnrankedBookItem({
  bookOption,
  onAdd,
  currentUserIsAdmin,
}: {
  bookOption: MeetingBookOption;
  onAdd: (id: string) => void;
  currentUserIsAdmin: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: bookOption.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-cream-100 border-gold-600/20 flex items-center gap-3 rounded-lg border p-3 ${isDragging ? "opacity-50" : "opacity-70"}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none active:cursor-grabbing"
      >
        <GripVertical className="text-dark-500 h-5 w-5" />
      </div>

      <CoverThumbnail book={bookOption.book} />
      <BookDetails bookOption={bookOption} muted />
      <BookOptionActions
        bookOption={bookOption}
        currentUserIsAdmin={currentUserIsAdmin}
        actionLabel="Add to Ranking"
        onAction={onAdd}
      />
    </div>
  );
}

export function BookDragOverlay({
  bookOption,
}: {
  bookOption: MeetingBookOption;
}) {
  return (
    <div className="border-gold-600/20 flex items-center gap-3 rounded-lg border bg-white p-3 shadow-lg">
      <GripVertical className="text-dark-500 h-5 w-5" />
      <CoverThumbnail book={bookOption.book} />
      <div className="min-w-0 flex-1">
        <h4 className="font-inria text-dark-900 truncate text-sm font-semibold">
          {bookOption.book.title}
        </h4>
        <p className="text-dark-600 truncate text-xs">
          {bookOption.book.author}
        </p>
      </div>
    </div>
  );
}

export function DroppableRankedZone({
  children,
  isEmpty,
}: {
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: RANKED_ZONE_ID,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[60px] rounded-lg transition-colors ${
        isOver ? "bg-gold-100/50 ring-gold-500/30 ring-2" : ""
      } ${isEmpty ? "bg-cream-100 border-gold-600/20 border py-6 text-center" : ""}`}
    >
      {children}
    </div>
  );
}
