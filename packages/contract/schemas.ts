import { z } from "zod";

/** A row id (Postgres uuid). Malformed ids fail here, not in the database. */
export const rowId = z.guid("Invalid id");
