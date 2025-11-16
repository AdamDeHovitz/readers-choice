"use client";

import { useState, useEffect, useRef } from "react";
import { searchBooks } from "@/app/actions/books";
import { Input } from "@/components/ui/input";
import { BookCard } from "./book-card";
import type { BookSearchResult } from "@/lib/open-library";

interface BookSearchProps {
  onSelectBook: (book: BookSearchResult) => void;
  selectedBookId?: string;
}

export function BookSearch({ onSelectBook, selectedBookId }: BookSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search effect with request cancellation
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    setIsSearching(true);

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(async () => {
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const books = await searchBooks(query);
        setResults(books);
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Search error:', error);
        }
      } finally {
        setIsSearching(false);
      }
    }, 250); // Slightly faster debounce

    // Cleanup on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query]);

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
          <p className="text-sm text-dark-500 mt-2">Searching...</p>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
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
        <p className="text-sm text-dark-500 text-center py-8">
          No books found. Try a different search term.
        </p>
      )}
    </div>
  );
}
