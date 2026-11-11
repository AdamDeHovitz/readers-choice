"use client";

import { useState, type ReactNode } from "react";
import { SearchIcon } from "lucide-react";
import { searchBooks } from "@/app/actions/books";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookSearchResult } from "@/lib/open-library";
import { BookCard } from "./book-card";

interface BookSearchProps {
  selectedBook: BookSearchResult | null;
  /** Called with the tapped result, or null when the reader changes books. */
  onSelectBook: (book: BookSearchResult | null) => void;
  /** Why a result can't be picked (e.g. "Already nominated"), if it can't. */
  unavailableReason?: (book: BookSearchResult) => string | null;
  /** Accessible label for the search box. */
  label?: string;
  /**
   * The next step for the picked book (a note field and submit button),
   * shown right under it so the reader never has to scroll to find it.
   */
  children?: ReactNode;
}

/**
 * Search, then tap a book. The results collapse to the picked book with
 * `children` beneath it; "Change book" brings the results back.
 */
export function BookSearch({
  selectedBook,
  onSelectBook,
  unavailableReason,
  label = "Search for a book",
  children,
}: BookSearchProps) {
  const [query, setQuery] = useState("");
  const { results, searching: isSearching } = useDebouncedSearch(
    query,
    searchBooks,
    { delayMs: 250 }
  );

  if (selectedBook) {
    return (
      <div className="space-y-4">
        <BookCard
          title={selectedBook.title}
          author={selectedBook.author}
          coverUrl={selectedBook.coverUrl}
          publishedYear={selectedBook.publishedYear}
          selected
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => onSelectBook(null)}
          >
            Change book
          </Button>
        </BookCard>
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon
          className="text-dark-500 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          aria-label={label}
          placeholder="Title or author"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          enterKeyHint="search"
        />
      </div>

      {isSearching && (
        <p className="text-dark-500 text-sm" aria-live="polite">
          Searching…
        </p>
      )}

      {results.length > 0 && (
        <ul aria-label="Search results" className="space-y-2">
          {results.map((book) => {
            const reason = unavailableReason?.(book) ?? null;
            return (
              <li key={book.id}>
                <BookCard
                  title={book.title}
                  author={book.author}
                  coverUrl={book.coverUrl}
                  publishedYear={book.publishedYear}
                  onClick={reason ? undefined : () => onSelectBook(book)}
                  disabled={!!reason}
                >
                  {reason && <Badge>{reason}</Badge>}
                </BookCard>
              </li>
            );
          })}
        </ul>
      )}

      {query.trim().length >= 2 && results.length === 0 && !isSearching && (
        <p className="text-dark-500 py-6 text-center text-sm">
          No books found. Try a different search.
        </p>
      )}
    </div>
  );
}
