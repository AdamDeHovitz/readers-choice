import type { z } from "zod";

/**
 * The client-facing shape of an operation: its name, whether it reads or
 * writes, and its input and output schemas. Both the web app and the mobile
 * app call operations through this contract; apps/web/server/operations/
 * implements them.
 */
export interface OperationContract<
  Name extends string = string,
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
> {
  readonly name: Name;
  readonly kind: "query" | "mutation";
  /** Parsed on the server for every call; clients may reuse it for forms. */
  readonly input: Input;
  /**
   * Parsed on the server before every response, so clients get exactly
   * these fields and nothing the contract doesn't declare.
   */
  readonly output: Output;
}

/** What a client passes (before schema defaults and transforms). */
export type InputOf<C> =
  C extends OperationContract<string, infer I, z.ZodType> ? z.input<I> : never;

/** What the implementation receives (after parsing). */
export type ParsedInputOf<C> =
  C extends OperationContract<string, infer I, z.ZodType> ? z.output<I> : never;

/** What the implementation returns, checked against the output schema. */
export type ImplementationOutputOf<C> =
  C extends OperationContract<string, z.ZodType, infer O> ? z.input<O> : never;

/** What a client receives. */
export type OutputOf<C> =
  C extends OperationContract<string, z.ZodType, infer O> ? z.output<O> : never;

/** Declare an operation. Its name is permanent once mobile apps ship (#75). */
export function defineContract<
  const Name extends string,
  Input extends z.ZodType,
  Output extends z.ZodType,
>(def: {
  name: Name;
  kind: "query" | "mutation";
  input: Input;
  output: Output;
}): OperationContract<Name, Input, Output> {
  return def;
}
