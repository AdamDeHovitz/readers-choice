/**
 * Whether a value is shaped like a row id (a Postgres uuid). The same check
 * as `rowId` in packages/contract/schemas.ts, without zod, for the proxy.
 */
export function isRowId(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );
}
