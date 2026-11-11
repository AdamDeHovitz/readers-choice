// Each domain module exports only contracts (types aside): the registry
// and the snapshot treat every runtime export as an operation.
import * as themes from "./themes";

/** Every operation contract, by domain. server/operations/ implements each. */
export const contracts = { themes };
