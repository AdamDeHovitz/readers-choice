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
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveYearRankings } from "@/app/actions/rankings";
import { useAction } from "@/hooks/use-action";
import { Button } from "@/components/ui/button";
import { GripVertical } from "lucide-react";
import Image from "next/image";
import { Alert } from "@/components/ui/alert";
import { LocalDate } from "@/components/ui/local-date";
import type { YearBook } from "@/server/rankings";

interface RankingInterfaceProps {
  bookClubId: string;
  year: number;
  initialBooks: YearBook[];
}

function SortableBookItem({
  book,
  rank,
  onMarkUnread,
}: {
  book: YearBook;
  rank: number;
  onMarkUnread: (bookId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: book.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-border bg-card flex items-center gap-3 rounded-2xl border p-3 shadow-xs"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="-m-2 cursor-grab touch-none p-2 active:cursor-grabbing"
      >
        <GripVertical className="text-dark-500 h-5 w-5" />
      </div>

      {/* Rank badge */}
      <div className="bg-sage-100 text-dark-900 font-inria flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold">
        {rank}
      </div>

      {/* Book cover */}
      {book.coverUrl && (
        <Image
          src={book.coverUrl}
          alt={book.title}
          width={48}
          height={72}
          className="shrink-0 rounded shadow-sm"
        />
      )}

      {/* Book info */}
      <div className="min-w-0 flex-1">
        <h3 className="font-inria text-dark-900 truncate font-semibold">
          {book.title}
        </h3>
        <p className="text-dark-600 truncate text-sm">{book.author}</p>
        <p className="text-dark-500 mt-1 text-xs">
          <LocalDate iso={book.meetingDate} format="shortMonthYear" />
        </p>
      </div>

      {/* Mark as unread button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onMarkUnread(book.id)}
        className="shrink-0"
      >
        Mark Unread
      </Button>
    </div>
  );
}

function UnreadBookItem({
  book,
  onMarkRead,
}: {
  book: YearBook;
  onMarkRead: (bookId: string) => void;
}) {
  return (
    <div className="bg-muted/50 border-border flex items-center gap-3 rounded-2xl border p-3 opacity-70">
      {/* Book cover */}
      {book.coverUrl && (
        <Image
          src={book.coverUrl}
          alt={book.title}
          width={48}
          height={72}
          className="shrink-0 rounded shadow-sm"
        />
      )}

      {/* Book info */}
      <div className="min-w-0 flex-1">
        <h3 className="font-inria text-dark-600 truncate font-semibold">
          {book.title}
        </h3>
        <p className="text-dark-600 truncate text-sm">{book.author}</p>
        <p className="text-dark-500 mt-1 text-xs">
          <LocalDate iso={book.meetingDate} format="shortMonthYear" />
        </p>
      </div>

      {/* Add to ranking button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onMarkRead(book.id)}
        className="shrink-0"
      >
        Add to Ranking
      </Button>
    </div>
  );
}

export function RankingInterface({
  bookClubId,
  year,
  initialBooks,
}: RankingInterfaceProps) {
  const [rankedBooks, setRankedBooks] = useState<YearBook[]>(
    initialBooks
      .filter((b) => b.rank !== null)
      .sort((a, b) => a.rank! - b.rank!)
  );
  const [unreadBooks, setUnreadBooks] = useState<YearBook[]>(
    initialBooks.filter((b) => b.rank === null)
  );
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const {
    run: save,
    pending: isSaving,
    error,
  } = useAction(saveYearRankings, {
    refresh: false,
    onSuccess: () => setLastSaved(new Date()),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /** Show the new ranking immediately and auto-save it. */
  function update(ranked: YearBook[], unread: YearBook[]) {
    setRankedBooks(ranked);
    setUnreadBooks(unread);
    save(
      bookClubId,
      year,
      ranked.map((book, index) => ({ bookId: book.id, rank: index + 1 })),
      unread.map((book) => book.id)
    );
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = rankedBooks.findIndex((book) => book.id === active.id);
    const to = rankedBooks.findIndex((book) => book.id === over.id);
    update(arrayMove(rankedBooks, from, to), unreadBooks);
  }

  function handleMarkUnread(bookId: string) {
    const book = rankedBooks.find((b) => b.id === bookId);
    if (!book) return;
    update(
      rankedBooks.filter((b) => b.id !== bookId),
      [...unreadBooks, book]
    );
  }

  function handleMarkRead(bookId: string) {
    const book = unreadBooks.find((b) => b.id === bookId);
    if (!book) return;
    update(
      [...rankedBooks, book],
      unreadBooks.filter((b) => b.id !== bookId)
    );
  }

  return (
    <div className="space-y-6">
      {/* Ranked books section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-inria text-dark-900 text-lg font-semibold">
            Your Ranking
            {rankedBooks.length > 0 && (
              <span className="text-dark-500 ml-2 text-base font-normal">
                ({rankedBooks.length}{" "}
                {rankedBooks.length === 1 ? "book" : "books"})
              </span>
            )}
          </h3>
          {/* Auto-save status */}
          <div className="text-dark-600 text-sm">
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="bg-sage-500 inline-block h-2 w-2 animate-pulse rounded-full"></span>
                Saving...
              </span>
            ) : lastSaved ? (
              <span className="text-rust-700">
                ✓ Saved{" "}
                {lastSaved.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : null}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        {rankedBooks.length === 0 ? (
          <div className="border-border rounded-2xl border border-dashed py-12 text-center">
            <p className="text-dark-600">
              No books in your ranking yet. Add books from below to get started!
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rankedBooks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {rankedBooks.map((book, index) => (
                  <SortableBookItem
                    key={book.id}
                    book={book}
                    rank={index + 1}
                    onMarkUnread={handleMarkUnread}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Unread books section */}
      {unreadBooks.length > 0 && (
        <div>
          <h3 className="font-inria text-dark-900 mb-4 text-lg font-semibold">
            Not Read
            <span className="text-dark-500 ml-2 text-base font-normal">
              ({unreadBooks.length}{" "}
              {unreadBooks.length === 1 ? "book" : "books"})
            </span>
          </h3>
          <div className="space-y-2">
            {unreadBooks.map((book) => (
              <UnreadBookItem
                key={book.id}
                book={book}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
