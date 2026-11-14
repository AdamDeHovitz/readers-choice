import { oauthPreflight, tokenEndpoint } from "@/app/_operations/oauth-http";

// OAuth token endpoint for MCP clients. See app/_operations/oauth-http.ts.
export const POST = tokenEndpoint;
export const OPTIONS = oauthPreflight;
