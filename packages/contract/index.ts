// Each domain module exports only contracts (types aside): the registry
// and the snapshot treat every runtime export as an operation.
import * as clubs from "./clubs";
import * as invites from "./invites";
import * as themes from "./themes";

/** Every operation contract, by domain. server/operations/ implements each. */
export const contracts = { clubs, invites, themes };
