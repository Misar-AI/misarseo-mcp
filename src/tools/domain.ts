/**
 * Domain-level footprint and authority, single and batch.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiGet, apiPost, pick } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const domainTools: ToolDefinition[] = [
  defineTool({
    name: "get_domain_overview",
    category: "domain",
    description:
      "Returns a high-level view of a domain's organic footprint: estimated organic traffic, " +
      "organic keyword count, and a 0-100 domain authority score. Use this first for domain " +
      "research. `backlinks` and `referringDomains` are ALWAYS null on this tool — no data provider " +
      "feeds them here, so a null is the absence of a source, not a domain with no links. Call " +
      "get_backlinks_overview for those. CHARGES CREDITS ON THE PAID DATA PROVIDER (~100-300 " +
      "typical) for the organic traffic/keyword figures. On the default free provider that endpoint " +
      "has no equivalent, so `organicTraffic` and `organicKeywords` come back null, nothing is " +
      "charged, and only the authority score is populated. Null there means not measured — never " +
      "report it as zero traffic. Read `authoritySource` before quoting `authority`: 'openpagerank' " +
      "is link-graph authority, 'tranco' is a POPULARITY rank used as a stand-in and must be " +
      "labelled as such; a domain outside Tranco's top million honestly returns null. A result " +
      "carrying data is cached 12 hours per domain; a result with neither organic keywords nor an " +
      "authority score is deliberately not cached, so retrying it re-runs the lookup.",
    scopes: ["api"],
    annotations: {
      title: "Get domain overview",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "domain"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        domain: {
          type: "string",
          minLength: 1,
          description: "Domain to analyze (e.g. 'example.com').",
        },
        includeSubdomains: {
          default: false,
          description: "Include subdomains in the domain's metrics. Defaults to false.",
          type: "boolean",
        },
        locationCode: {
          type: "integer",
          exclusiveMinimum: 0,
          description: "DataForSEO location code. Omit it to use the project's default market, which falls back to 2840 (United States) for a project that has not set one. See dataforseo.com/help-center/locations. Some countries (e.g. Iceland, 2352) are served from Google Ads data: keyword volume/CPC/trends work, but keyword difficulty, search intent, and domain analytics are unavailable.",
        },
        languageCode: {
          type: "string",
          minLength: 2,
          description: "Language code (e.g. 'en', 'es', 'fr'). Omit it to use the project's default market language, which falls back to 'en'.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/domain/overview", {
        ...pick(args, ["projectId", "domain", "locationCode", "languageCode"]),
        // The REST route defaults includeSubdomains to TRUE and only the literal
        // string "false" turns it off; this tool's documented default is false.
        includeSubdomains: args.includeSubdomains === true ? "true" : "false",
      }),
  }),
  defineTool({
    name: "get_domain_batch",
    category: "domain",
    description:
      "Domain batch analysis: one authority row per domain, up to 100 at once. FREE — no paid " +
      "provider call, unlike get_domain_overview. `organicTraffic`, `organicKeywords`, `backlinks` " +
      "and `referringDomains` are ALWAYS null on every row — batch mode never attempts the " +
      "per-domain paid rank-overview call the single-domain overview makes, since fanning that out " +
      "across many domains in one call is a materially bigger paid-provider commitment than " +
      "anything else this codebase does in one request. `organicUnavailableReason` states this once " +
      "for the whole response; use get_domain_overview for organic figures on one domain at a time. " +
      "Malformed domain entries are dropped and counted in `skippedInvalid` rather than failing the " +
      "whole call. `authorityUnavailableReason` is set only when the authority provider itself " +
      "failed to answer — null authority on every row without it set means every domain was looked " +
      "up and found unranked, not that nothing could be looked up.",
    scopes: ["api"],
    annotations: {
      title: "Batch domain analysis",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "domains"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        domains: {
          minItems: 1,
          maxItems: 100,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
          },
          description: "1-100 domains or URLs, any mix. Malformed entries are dropped, not rejected — see skippedInvalid in the result.",
        },
        includeSubdomains: {
          default: false,
          description: "Count subdomains as part of each domain. Defaults to false, unlike get_domain_overview's default true.",
          type: "boolean",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/domain/batch", pick(args, ["projectId", "domains", "includeSubdomains"])),
  }),
  defineTool({
    name: "get_domain_authority_history",
    category: "domain",
    description:
      "Domain-authority history: the stored trend of dated authority snapshots for one " +
      "project+domain, oldest first. FREE (no credits) — reads back snapshots already captured, no " +
      "provider call. Empty until at least one snapshot exists: get_domain_overview auto-captures " +
      "one whenever `domain` is the project's own domain, or call capture_domain_authority_snapshot " +
      "directly for any domain (including a tracked competitor).",
    scopes: ["api"],
    annotations: {
      title: "Get domain-authority history",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "domain"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        domain: {
          type: "string",
          minLength: 1,
          description: "Domain to read history for (e.g. 'example.com').",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/domain/authority-history", pick(args, ["projectId", "domain"])),
  }),
  defineTool({
    name: "capture_domain_authority_snapshot",
    category: "domain",
    description:
      "Capture a domain-authority snapshot now: calls the same free resolver get_domain_overview " +
      "already uses and records today's reading, so get_domain_authority_history has a trend to " +
      "read back. FREE (no credits), but this is a MUTATION — idempotent per UTC day, so calling it " +
      "twice in one day does not write twice. Useful for a domain get_domain_overview would not " +
      "auto-capture on its own — e.g. a tracked competitor rather than the project's own domain.",
    scopes: ["api"],
    annotations: {
      title: "Capture a domain-authority snapshot now",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "domain"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        domain: {
          type: "string",
          minLength: 1,
          description: "Domain to capture a snapshot for (e.g. 'example.com').",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/domain/authority-history", pick(args, ["projectId", "domain"])),
  }),
];
