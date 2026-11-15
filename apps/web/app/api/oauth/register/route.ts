import {
  oauthPreflight,
  registrationEndpoint,
} from "@/app/_operations/oauth-http";

// Dynamic Client Registration for MCP clients. See app/_operations/oauth-http.ts.
export const POST = registrationEndpoint;
export const OPTIONS = oauthPreflight;
