import {
  authorizationServerMetadata,
  oauthPreflight,
} from "@/app/_operations/oauth-http";

// RFC 8414 metadata for the MCP server's authorization server.
export const GET = authorizationServerMetadata;
export const OPTIONS = oauthPreflight;
