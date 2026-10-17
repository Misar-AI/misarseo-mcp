/**
 * Plan, credit and quota visibility.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiGet } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const accountTools: ToolDefinition[] = [
  defineTool({
    name: "get_usage",
    category: "account",
    description:
      "Plan tier, credits remaining, and every quota/count dimension tracked against it for the " +
      "caller's organization. FREE: reads counters this codebase already maintains for its own " +
      "gating — nothing here calls a paid provider or spends a credit. `gatingActive` is false on a " +
      "self-hosted deployment with no billing provider configured: `tier`, `creditsRemaining` and " +
      "`quotas` are all null there, not a fabricated tier. `counts` (projects/rank-tracked " +
      "keywords/API keys) is always populated. Inside a quota dimension, `used: null` means NOT " +
      "TRACKED — an unlimited tier's counter is never incremented in the first place — never a real " +
      "zero; `used: 0` IS a real measured zero. `aiGatewayOps` is the shared platform AI-gateway " +
      "key's own monthly ceiling, reported separately because it is a platform-abuse ceiling, not a " +
      "plan entitlement.",
    scopes: ["api"],
    annotations: {
      title: "Get plan/credit/quota usage",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: (ctx) => apiGet(ctx, "/usage"),
  }),
];
