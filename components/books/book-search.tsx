"use client";

import { useState } from "react";
import { searchBooks } from "@/app/actions/books";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { Input } from "@/components/ui/input";
import { BookCard } from "./book-card";
import type { BookSearchResult } from "@/lib/open-library";

interface BookSearchProps {
  onSelectBook: (book: BookSearchResult) => void;
  selectedBookId?: string;
}

export function BookSearch({ onSelectBook, selectedBookId }: BookSearchProps) {
  const [query, setQuery] = useState("");
  const { results, searching: isSearching } = useDebouncedSearch(
    query,
    searchBooks,
    { delayMs: 250 }
  );

  function handleInputChange(value: string) {
    setQuery(value);
  }

  return (
    <div className="space-y-4">
      <div>
        <Input
          type="text"
          placeholder="Search for books..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-full"
        />
        {isSearching && (
          <p className="text-dark-500 mt-2 text-sm">Searching...</p>
        )}
      </div>

      {results.length > 0 && (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {results.map((book) => (
            <BookCard
              key={book.id}
              title={book.title}
              author={book.author}
              coverUrl={book.coverUrl}
              publishedYear={book.publishedYear}
              onClick={() => onSelectBook(book)}
              selected={selectedBookId === book.id}
            />
          ))}
        </div>
      )}

      {query.trim().length >= 2 && results.length === 0 && !isSearching && (
        <p className="text-dark-500 py-8 text-center text-sm">
          No books found. Try a different search term.
        </p>
      )}
    </div>
  );
}
