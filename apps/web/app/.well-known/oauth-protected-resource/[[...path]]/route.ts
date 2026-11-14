import {
  oauthPreflight,
  protectedResourceMetadata,
} from "@/app/_operations/oauth-http";

// RFC 9728 metadata for the MCP server, at both the path-specific URL
// (/.well-known/oauth-protected-resource/api/mcp) and the root one.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params;
  const suffix = path.join("/");
  if (suffix !== "" && suffix !== "api/mcp") {
    return new Response(null, { status: 404 });
  }
  return protectedResourceMetadata(request);
}

export const OPTIONS = oauthPreflight;
