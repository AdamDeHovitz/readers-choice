import { mcpPreflight, serveMcp } from "@/app/_operations/mcp";

// The MCP server for AI apps (Claude, ChatGPT, …). See app/_operations/mcp.ts.
// GET and DELETE reach the SDK, which answers 405 (no SSE streams or
// sessions), after the same token check.
export const POST = serveMcp;
export const GET = serveMcp;
export const DELETE = serveMcp;
export const OPTIONS = mcpPreflight;
