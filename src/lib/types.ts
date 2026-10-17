import type { McpContext } from "./context.js";

/**
 * A JSON Schema object describing a tool's arguments.
 *
 * Deliberately structural rather than importing the MCP SDK's `Tool` type: the
 * registry is consumed by both the SDK-based stdio server and the hand-rolled
 * JSON-RPC HTTP route, and the HTTP route must not carry an SDK dependency into
 * the host application's bundle.
 */
export interface JsonSchema {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

/**
 * Behavioural hints surfaced to clients and directories.
 *
 * Smithery, Claude Desktop, and VS Code all read these to decide whether a tool
 * needs confirmation before running, so every tool declares all four
 * explicitly rather than relying on the SDK defaults.
 *
 * MisarSEO convention, inherited from its in-app catalogue: a lookup that
 * SPENDS CREDITS (or a plan quota, or an AI-gateway operation) is not marked
 * read-only even though it changes none of the user's data — spending money is
 * a state change a host should not silently auto-approve. Anything that reaches
 * a third party (DataForSEO, Google, Bing, Yandex, Baidu, Ahrefs, Brave, an AI
 * model, a live page fetch) is `openWorldHint: true`.
 */
export interface ToolAnnotations {
  title?: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

/**
 * Grants an API key must carry for a tool to run.
 *
 * This mirrors MisarSEO's REAL key grants exactly (MisarSEO
 * `src/middleware/ensure-user/types.ts`, `API_KEY_SCOPES`): a per-user `mseo_`
 * key carries `["api"]` by default, plus the opt-in `"account:delete"`. There
 * is deliberately no read/write split — MisarSEO has none, because many
 * read-shaped operations are POSTs, so a method-derived scope would promise a
 * capability the API does not deliver.
 *
 * Every tool in this catalogue requires `api`. Nothing here exposes account
 * erasure, so `account:delete` is declared only so the type matches the server.
 */
export type ToolScope = "api" | "account:delete";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: ToolAnnotations;
  /** Grouping used by the README, docs, and directory listings. */
  category: ToolCategory;
  /** Any ONE of these scopes authorises the call. */
  scopes?: ToolScope[];
  handler: (ctx: McpContext, args: Record<string, unknown>) => Promise<unknown>;
}

export type ToolCategory =
  | "projects"
  | "account"
  | "keywords"
  | "competitors"
  | "domain"
  | "backlinks"
  | "link-building"
  | "rank-tracking"
  | "site-audit"
  | "search-console"
  | "analytics"
  | "content"
  | "mentions"
  | "ai-search"
  | "local"
  | "bing"
  | "webmaster"
  | "patches"
  | "reports";

/** Convenience builder so every tool file stays declarative. */
export function defineTool(def: ToolDefinition): ToolDefinition {
  return def;
}
