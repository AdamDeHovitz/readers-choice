"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMyLibraries, searchLibraries } from "@/app/actions/libraries";
import {
  MAX_LIBRARIES,
  type Library,
  type LibrarySearchResult,
} from "@/lib/libraries/overdrive";
import { LibraryIcon, SearchIcon, XIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LibraryPickerProps {
  initialLibraries: Library[];
}

export function LibraryPicker({ initialLibraries }: LibraryPickerProps) {
  const router = useRouter();
  const inputId = useId();
  const [libraries, setLibraries] = useState(initialLibraries);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibrarySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const trimmed = query.trim();
  const full = libraries.length >= MAX_LIBRARIES;

  useEffect(() => {
    if (trimmed.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      const response = await searchLibraries(trimmed);
      if (cancelled) return;
      setSearching(false);
      if ("error" in response) {
        setError(response.error);
        setResults([]);
      } else {
        setError(null);
        setResults(response.results);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  function save(next: Library[]) {
    const previous = libraries;
    setLibraries(next);
    setError(null);
    startSaving(async () => {
      const result = await saveMyLibraries(next.map((library) => library.key));
      if ("error" in result) {
        setLibraries(previous);
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function add(library: LibrarySearchResult) {
    if (full || libraries.some((saved) => saved.key === library.key)) return;
    save([...libraries, { key: library.key, name: library.name }]);
    setQuery("");
    setResults([]);
  }

  const visibleResults = trimmed.length >= 2 ? results : [];

  return (
    <div className="font-inria space-y-5">
      <div>
        <h3 className="text-dark-900 text-sm font-bold">Your libraries</h3>
        {libraries.length > 0 ? (
          <ul
            className="border-gold-600/20 divide-gold-600/15 mt-2 divide-y overflow-hidden rounded-lg border bg-white"
            aria-label="Your libraries"
          >
            {libraries.map((library) => (
              <li
                key={library.key}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <LibraryIcon
                  className="text-gold-700 size-4 shrink-0"
                  aria-hidden
                />
                <span className="text-dark-900 flex-1 text-sm">
                  {library.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    save(libraries.filter((saved) => saved.key !== library.key))
                  }
                  disabled={saving}
                  aria-label={`Remove ${library.name}`}
                  className="text-dark-500 hover:text-rust-600 h-8 px-2"
                >
                  <XIcon className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-dark-900/15 text-dark-500 mt-2 rounded-lg border border-dashed bg-white px-3 py-4 text-center text-sm">
            No libraries yet. Search below to add one.
          </p>
        )}
      </div>

      {full ? (
        <p className="text-dark-500 text-xs">
          You can add up to {MAX_LIBRARIES} libraries. Remove one to add
          another.
        </p>
      ) : (
        <div>
          <Label htmlFor={inputId} className="text-dark-900 text-sm font-bold">
            Add a library
          </Label>
          <div className="relative mt-2">
            <SearchIcon
              className="text-dark-500 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id={inputId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Library name, city, or ZIP code"
              autoComplete="off"
              className="h-10 bg-white pl-9 [&::-webkit-search-cancel-button]:appearance-none"
            />
          </div>
          {searching && (
            <p className="text-dark-500 mt-2 text-xs" role="status">
              Searching…
            </p>
          )}
          {!searching && visibleResults.length > 0 && (
            <ul
              className="border-gold-600/20 divide-gold-600/15 mt-2 divide-y overflow-hidden rounded-lg border bg-white"
              aria-label="Matching libraries"
            >
              {visibleResults.map((result) => {
                const added = libraries.some(
                  (library) => library.key === result.key
                );
                return (
                  <li
                    key={result.key}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-dark-900 truncate text-sm">
                        {result.name}
                      </p>
                      <p className="text-dark-500 truncate text-xs">
                        {[result.type, result.location]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => add(result)}
                      disabled={added || saving}
                      aria-label={`Add ${result.name}`}
                    >
                      {added ? "Added" : "Add"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          {!searching &&
            trimmed.length >= 2 &&
            visibleResults.length === 0 &&
            !error && (
              <p className="text-dark-500 mt-2 text-xs">
                No libraries found. Try a city or ZIP code.
              </p>
            )}
        </div>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}
    </div>
  );
}
