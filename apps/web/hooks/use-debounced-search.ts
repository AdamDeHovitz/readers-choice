"use client";

import { useEffect, useState } from "react";
import type { ActionResult } from "@readers-choice/contract/result";

interface Options {
  /** Queries shorter than this (after trimming) don't search. */
  minLength?: number;
  delayMs?: number;
}

/**
 * Search as the user types, via a server action, after a pause in typing.
 *
 * Results are keyed to the query that produced them, so a slow response for
 * an older query never replaces newer results. `search` must be a stable
 * reference (an imported server action is).
 */
export function useDebouncedSearch<T>(
  query: string,
  search: (query: string) => Promise<ActionResult<T[]>>,
  { minLength = 2, delayMs = 300 }: Options = {}
) {
  const [settled, setSettled] = useState<{
    query: string;
    results: T[];
    error: string | null;
  } | null>(null);

  const trimmed = query.trim();
  const active = trimmed.length >= minLength;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let result: ActionResult<T[]>;
      try {
        result = await search(trimmed);
      } catch {
        result = { success: false, error: "Search is unavailable right now." };
      }
      if (cancelled) return;
      setSettled({
        query: trimmed,
        results: result.success ? result.data : [],
        error: result.success ? null : result.error,
      });
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, trimmed, search, delayMs]);

  const current = active && settled?.query === trimmed ? settled : null;
  return {
    results: current?.results ?? [],
    error: current?.error ?? null,
    searching: active && !current,
  };
}
