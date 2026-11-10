import type { Db } from "@/server/db";

type Result = { data?: unknown; error?: unknown };

/**
 * A minimal stand-in for the Supabase client in unit tests. Every builder
 * method chains; awaiting a query (or calling single/maybeSingle) resolves
 * the next queued result. `calls` records each query's method chain.
 */
export function fakeDb(results: Result[]) {
  const queue = [...results];
  const calls: string[][] = [];

  const next = () => {
    const result = queue.shift();
    if (!result) throw new Error("fakeDb: no queued result for this query");
    return Promise.resolve({ data: null, error: null, ...result });
  };

  const query = (chain: string[]): unknown =>
    new Proxy(
      {},
      {
        get(_, prop: string) {
          if (prop === "then") {
            return (
              resolve: (v: unknown) => void,
              reject: (e: unknown) => void
            ) => next().then(resolve, reject);
          }
          if (prop === "single" || prop === "maybeSingle") {
            return () => {
              chain.push(prop);
              return next();
            };
          }
          return (...args: unknown[]) => {
            chain.push(
              `${prop}(${args.map((a) => JSON.stringify(a)).join(", ")})`
            );
            return query(chain);
          };
        },
      }
    );

  const start =
    (method: string) =>
    (...args: unknown[]) => {
      const chain = [
        `${method}(${args.map((a) => JSON.stringify(a)).join(", ")})`,
      ];
      calls.push(chain);
      return query(chain);
    };

  const db = { from: start("from"), rpc: start("rpc") } as unknown as Db;
  return { db, calls, remaining: () => queue.length };
}
