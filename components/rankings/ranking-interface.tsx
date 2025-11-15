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
import { Button } from "@/components/ui/button";
import { GripVertical } from "lucide-react";
import Image from "next/image";

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  meetingDate: string;
  rank: number | null;
}

interface RankingInterfaceProps {
  bookClubId: string;
  year: number;
  initialBooks: Book[];
}

function SortableBookItem({
  book,
  rank,
  onMarkUnread,
}: {
  book: Book;
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
      className="flex items-center gap-3 p-4 bg-white border border-gold-600/20 rounded-lg"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-dark-500" />
      </div>

      {/* Rank badge */}
      <div className="flex items-center justify-center w-8 h-8 bg-gold-100 text-dark-900 font-bold font-inria rounded-full shrink-0">
        {rank}
      </div>

      {/* Book cover */}
      {book.coverUrl && (
        <Image
          src={book.coverUrl}
          alt={book.title}
          width={48}
          height={72}
          className="rounded shadow-sm shrink-0"
        />
      )}

      {/* Book info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold font-inria text-dark-900 truncate">{book.title}</h3>
        <p className="text-sm text-dark-600 truncate">{book.author}</p>
        <p className="text-xs text-dark-500 mt-1">
          {new Date(book.meetingDate).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
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
  book: Book;
  onMarkRead: (bookId: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-cream-100 border border-gold-600/20 rounded-lg opacity-60">
      {/* Book cover */}
      {book.coverUrl && (
        <Image
          src={book.coverUrl}
          alt={book.title}
          width={48}
          height={72}
          className="rounded shadow-sm shrink-0"
        />
      )}

      {/* Book info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold font-inria text-dark-600 truncate">{book.title}</h3>
        <p className="text-sm text-dark-600 truncate">{book.author}</p>
        <p className="text-xs text-dark-500 mt-1">
          {new Date(book.meetingDate).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
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
  const [rankedBooks, setRankedBooks] = useState<Book[]>(
    initialBooks.filter((b) => b.rank !== null).sort((a, b) => a.rank! - b.rank!)
  );
  const [unreadBooks, setUnreadBooks] = useState<Book[]>(
    initialBooks.filter((b) => b.rank === null)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setRankedBooks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Auto-save after reordering
        saveDraggedRankings(newOrder);

        return newOrder;
      });
    }
  }

  async function saveDraggedRankings(newRankedBooks: Book[]) {
    setIsSaving(true);
    setError(null);

    const rankedBooksWithRank = newRankedBooks.map((book, index) => ({
      bookId: book.id,
      rank: index + 1,
    }));

    const unreadBookIds = unreadBooks.map((b) => b.id);

    const result = await saveYearRankings(
      bookClubId,
      year,
      rankedBooksWithRank,
      unreadBookIds
    );

    if (result.error) {
      setError(result.error);
    } else {
      setLastSaved(new Date());
    }

    setIsSaving(false);
  }

  async function handleMarkUnread(bookId: string) {
    const book = rankedBooks.find((b) => b.id === bookId);
    if (book) {
      const newRankedBooks = rankedBooks.filter((b) => b.id !== bookId);
      const newUnreadBooks = [...unreadBooks, book];

      setRankedBooks(newRankedBooks);
      setUnreadBooks(newUnreadBooks);

      // Auto-save
      setIsSaving(true);
      setError(null);

      const rankedBooksWithRank = newRankedBooks.map((book, index) => ({
        bookId: book.id,
        rank: index + 1,
      }));

      const result = await saveYearRankings(
        bookClubId,
        year,
        rankedBooksWithRank,
        newUnreadBooks.map((b) => b.id)
      );

      if (result.error) {
        setError(result.error);
      } else {
        setLastSaved(new Date());
      }

      setIsSaving(false);
    }
  }

  async function handleMarkRead(bookId: string) {
    const book = unreadBooks.find((b) => b.id === bookId);
    if (book) {
      const newUnreadBooks = unreadBooks.filter((b) => b.id !== bookId);
      const newRankedBooks = [...rankedBooks, book];

      setUnreadBooks(newUnreadBooks);
      setRankedBooks(newRankedBooks);

      // Auto-save
      setIsSaving(true);
      setError(null);

      const rankedBooksWithRank = newRankedBooks.map((book, index) => ({
        bookId: book.id,
        rank: index + 1,
      }));

      const result = await saveYearRankings(
        bookClubId,
        year,
        rankedBooksWithRank,
        newUnreadBooks.map((b) => b.id)
      );

      if (result.error) {
        setError(result.error);
      } else {
        setLastSaved(new Date());
      }

      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Ranked books section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold font-inria text-dark-900">
            Your Ranking
            {rankedBooks.length > 0 && (
              <span className="ml-2 text-base font-normal text-dark-500">
                ({rankedBooks.length} {rankedBooks.length === 1 ? "book" : "books"})
              </span>
            )}
          </h3>
          {/* Auto-save status */}
          <div className="text-sm text-dark-600">
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-gold-500 rounded-full animate-pulse"></span>
                Saving...
              </span>
            ) : lastSaved ? (
              <span className="text-rust-700">
                ✓ Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {rankedBooks.length === 0 ? (
          <div className="text-center py-12 bg-cream-100 border border-gold-600/20 rounded-lg">
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
          <h3 className="text-lg font-semibold font-inria text-dark-900 mb-4">
            Not Read
            <span className="ml-2 text-base font-normal text-dark-500">
              ({unreadBooks.length} {unreadBooks.length === 1 ? "book" : "books"})
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
