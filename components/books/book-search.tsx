"use client";

import { useState } from "react";
import { searchBooks } from "@/app/actions/books";
import { Input } from "@/components/ui/input";
import { BookCard } from "./book-card";
import type { BookSearchResult } from "@/lib/google-books";

interface BookSearchProps {
  onSelectBook: (book: BookSearchResult) => void;
  selectedBookId?: string;
}

export function BookSearch({ onSelectBook, selectedBookId }: BookSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(searchQuery: string) {
    setQuery(searchQuery);

    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const books = await searchBooks(searchQuery);
    setResults(books);
    setIsSearching(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <Input
          type="text"
          placeholder="Search for books..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full"
        />
        {isSearching && (
          <p className="text-sm text-slate-500 mt-2">Searching...</p>
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
        <p className="text-sm text-slate-500 text-center py-8">
          No books found. Try a different search term.
        </p>
      )}
    </div>
  );
}
