import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type {
  InputOf,
  OperationContract,
  OutputOf,
} from "@readers-choice/contract/operation";
import { sessions } from "@/auth";
import { OperationError } from "./operation-error";

/**
 * The cache key for a query: its contract's `cacheKey`, the same key the
 * server returns from writes that make it stale.
 */
export function queryKeyFor<C extends OperationContract>(
  contract: C,
  input: InputOf<C>
): QueryKey {
  return contract.cacheKey
    ? contract.cacheKey(contract.input.parse(input))
    : [contract.name, input];
}

async function run<C extends OperationContract>(
  contract: C,
  input: InputOf<C>
) {
  const response = await sessions.call(contract, input);
  if (!response.success) {
    throw new OperationError(response.code, response.error);
  }
  return response;
}

/** Read through a query operation, cached under its contract's key. */
export function useOperationQuery<C extends OperationContract>(
  contract: C,
  input: InputOf<C>
) {
  return useQuery<OutputOf<C>, OperationError>({
    queryKey: queryKeyFor(contract, input),
    queryFn: async () => (await run(contract, input)).data,
  });
}

/**
 * Call a mutation operation. On success, refetches every query whose key
 * starts with one the server reported stale.
 */
export function useOperationMutation<C extends OperationContract>(contract: C) {
  const queryClient = useQueryClient();
  return useMutation<OutputOf<C>, OperationError, InputOf<C>>({
    mutationFn: async (input) => {
      const response = await run(contract, input);
      await Promise.all(
        response.invalidate.map((key) =>
          queryClient.invalidateQueries({ queryKey: [...key] })
        )
      );
      return response.data;
    },
  });
}
