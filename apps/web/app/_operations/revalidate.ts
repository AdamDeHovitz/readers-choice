import "server-only";
import { revalidatePath } from "next/cache";
import type { InvalidationKey } from "@readers-choice/contract/keys";

/**
 * Revalidate the web pages behind each key, whichever client made the
 * change, so a write from the mobile app also refreshes the website.
 */
export function revalidateKeys(keys: readonly InvalidationKey[]): void {
  for (const key of keys) {
    for (const path of pathsFor(key)) revalidatePath(path);
  }
}

/** The pages that show the data behind an invalidation key. */
export function pathsFor(key: InvalidationKey): string[] {
  switch (key[0]) {
    case "me":
      return ["/dashboard"];
    case "club":
      return [`/book-clubs/${key[1]}/themes`];
  }
}
