/**
 * Execution context for a MisarSEO MCP tool call.
 *
 * The same tool implementations run under two transports:
 *   - stdio  (npm `@misarseo/mcp`) — credentials come from the environment or
 *            ~/.misarseo/config.json, resolved at call time.
 *   - http   (`api.misar.io/seo/mcp`) — credentials arrive per request on the
 *            Authorization header and MUST NOT be cached in module state.
 *
 * Passing the context explicitly (rather than reading process.env inside a
 * handler) is what makes a single tool registry safe to share between them:
 * one server process serves many users, so any module-level credential would
 * leak across requests.
 */
export interface McpContext {
  /** Raw MisarSEO API key (`mseo_…`), without the `Bearer ` prefix. */
  apiKey: string;
  /**
   * API base, e.g. `https://api.misar.io/seo`. Every tool calls
   * `<baseUrl>/<route>`, which the gateway maps onto MisarSEO's own
   * `/api/seo/<route>` REST surface.
   */
  baseUrl: string;
  /** Reported to the API as `X-MCP-Source` for per-transport analytics. */
  source: "mcp_stdio" | "mcp_http";
}

export const DEFAULT_BASE_URL = "https://api.misar.io/seo";

/** Build a context for an HTTP request that has already been authenticated. */
export function httpContext(apiKey: string, baseUrl?: string): McpContext {
  return {
    apiKey,
    baseUrl: (baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
    source: "mcp_http",
  };
}
