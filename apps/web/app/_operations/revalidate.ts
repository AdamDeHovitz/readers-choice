import "server-only";
import { revalidatePath } from "next/cache";
import type { InvalidationKey } from "@readers-choice/contract/keys";

/**
 * Revalidate the web pages behind each key, whichever client made the
 * change, so a write from the mobile app also refreshes the website. Each
 * path is revalidated with the pages nested under it.
 */
export function revalidateKeys(keys: readonly InvalidationKey[]): void {
  for (const key of keys) {
    for (const path of pathsFor(key)) revalidatePath(path, "layout");
  }
}

/** The pages (and the pages nested under them) that show a key's data. */
export function pathsFor(key: InvalidationKey): string[] {
  switch (key[0]) {
    case "me":
      return key[1] === "connectedApps" ? ["/settings"] : ["/dashboard"];
    case "clubs":
      return ["/browse"];
    case "club":
      if (key.length === 2) {
        // Membership decides who sees and votes on the club's meetings.
        return [`/book-clubs/${key[1]}`, "/meetings"];
      }
      switch (key[2]) {
        case "meetings":
          // The club home and schedule, and the meeting pages.
          return [`/book-clubs/${key[1]}`, "/meetings"];
        case "themes":
          return [`/book-clubs/${key[1]}/themes`];
      }
  }
}
