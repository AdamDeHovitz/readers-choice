import type { z } from "zod";

/**
 * The client-facing shape of an operation: its name, whether it reads or
 * writes, and its input schema and output type. Both the web app and the
 * mobile app call operations through this contract; server/operations/
 * implements them.
 */
export interface OperationContract<
  Name extends string = string,
  Input extends z.ZodType = z.ZodType,
  Output = unknown,
> {
  readonly name: Name;
  readonly kind: "query" | "mutation";
  /** Validated on the server for every call; clients may reuse it for forms. */
  readonly input: Input;
  /** Type-only marker for the output; never set at runtime. */
  readonly __output?: Output;
}

/** What a client passes (before schema defaults and transforms). */
export type InputOf<C> =
  C extends OperationContract<string, infer I, unknown> ? z.input<I> : never;

/** What the implementation receives (after parsing). */
export type ParsedInputOf<C> =
  C extends OperationContract<string, infer I, unknown> ? z.output<I> : never;

export type OutputOf<C> =
  C extends OperationContract<string, z.ZodType, infer O> ? O : never;

/**
 * Declare an operation. Curried so the output type is explicit while the
 * name and input schema are inferred:
 *
 *     defineContract<{ themeId: string }>()({ name, kind, input })
 */
export function defineContract<Output = void>() {
  return <const Name extends string, Input extends z.ZodType>(def: {
    name: Name;
    kind: "query" | "mutation";
    input: Input;
  }): OperationContract<Name, Input, Output> => def;
}
