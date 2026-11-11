import "server-only";
import * as themes from "./themes";

/**
 * Every implemented operation, by domain, mirroring `contracts` in
 * contract/index.ts (a test keeps the two in step). Transports (server
 * actions, and later the HTTP API) dispatch through here.
 */
export const operations = { themes };
