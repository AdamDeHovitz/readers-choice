import { z } from "zod";

/** A row id (Postgres uuid). Malformed ids fail here, not in the database. */
export const rowId = z.guid("Invalid id");

/** A book as both apps show it. */
export const book = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  coverUrl: z.string().nullable(),
  /** Untrusted HTML: render through sanitizeDescription (or descriptionToPlainText). */
  description: z.string().nullable(),
  pageCount: z.number().int().nullable(),
  publishedYear: z.number().int().nullable(),
});
export type Book = z.output<typeof book>;
