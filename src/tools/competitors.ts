/**
 * SERP competitor discovery, keyword gap, and competitor page-change monitoring.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiDelete, apiGet, apiPost, pick } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const competitorTools: ToolDefinition[] = [
  defineTool({
    name: "find_serp_competitors",
    category: "competitors",
    description:
      "Compares domains competing in search results for a supplied keyword set. Useful for market " +
      "and search-intelligence reports; not radius-based local SEO. The inverse of get_keyword_gap, " +
      "which asks what one competitor ranks for that we do not. CHARGES CREDITS ON THE PAID DATA " +
      "PROVIDER, which is also the only one that honours `resultTypes` and `includeSubdomains` and " +
      "that measures `visibility`, `etv` and `rating`. On the default free provider competitors are " +
      "aggregated from one live SERP per keyword: NOTHING IS CHARGED, only ORGANIC results are " +
      "counted whatever `resultTypes` says, `includeSubdomains` is ignored, and " +
      "visibility/traffic-estimate/rating are left unmeasured. Sorting never treats an unmeasured " +
      "field as zero: rows the provider did not measure sort last and are reported in " +
      "`unmeasuredForSort`. If that count equals the row count, the list is NOT ranked by anything " +
      "— say so instead of presenting the first row as the strongest competitor. Omit " +
      "`locationCode`/`languageCode` to use the project's default market.",
    scopes: ["api"],
    annotations: {
      title: "Find SERP competitors",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "keywords"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        keywords: {
          minItems: 1,
          maxItems: 100,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 120,
          },
          description: "Keywords whose SERPs are compared (1-100).",
        },
        resultTypes: {
          description: "SERP result types to include. Defaults to organic and local_pack.",
          minItems: 1,
          maxItems: 4,
          type: "array",
          items: {
            type: "string",
            enum: ["organic", "paid", "featured_snippet", "local_pack"],
          },
        },
        excludeDomains: {
          description: "Domains to exclude from results (e.g. the user's own site).",
          minItems: 1,
          maxItems: 50,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 255,
          },
        },
        includeSubdomains: {
          description: "Count subdomains as part of the same competitor domain.",
          type: "boolean",
        },
        sortBy: {
          description: "Sort order for returned competitors. Defaults to visibility. Only `keyword_count` and `avg_position` are measured on every provider — `visibility` and `traffic_estimate` are unmeasured on the free provider, and rows without the chosen field sort last rather than as zero. Prefer `keyword_count` when you need an order that always means something.",
          type: "string",
          enum: ["visibility", "traffic_estimate", "avg_position", "keyword_count"],
        },
        limit: {
          description: "Maximum competitors to return (1-100). Defaults to 50.",
          type: "integer",
          minimum: 1,
          maximum: 100,
        },
        offset: {
          description: "Rows to skip for pagination.",
          type: "integer",
          minimum: 0,
          maximum: 1000,
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
      apiPost(ctx, "/competitors", pick(args, ["projectId", "keywords", "resultTypes", "excludeDomains", "includeSubdomains", "sortBy", "limit", "offset", "locationCode", "languageCode"])),
  }),
  defineTool({
    name: "get_keyword_gap",
    category: "competitors",
    description:
      "Compares the project's own domain against up to 3 competitor domains and classifies every " +
      "keyword a competitor ranks for as missing / behind / tied / ahead / unknown. The inverse of " +
      "find_serp_competitors, which asks who competes for a keyword set. CHARGES CREDITS: one " +
      "ranked-keywords lookup per domain, so one call costs up to 4 upstream requests (our domain " +
      "plus the competitors). Each lookup is cached 12h per domain, so re-running the same " +
      "comparison with a different sort or classification filter is free — do that rather than " +
      "issuing a new comparison. Compares the top 1000 keywords per domain by search volume, so a " +
      "large domain is compared on a slice; per-domain `coverage` reports `keywordsFetched`, " +
      "`keywordsTotal`, `truncated` and `volumeFloor`. `missing` and `unknown` are NOT " +
      "interchangeable: `missing` means a competitor ranks and we provably do not; `unknown` means " +
      "our own slice ran out above that keyword's volume, so nothing was measured about whether we " +
      "rank. Never present `unknown` as a gap. The project's own domain is read from the project " +
      "record and cannot be passed in — if the project has no domain the call fails with a " +
      "validation error telling the user to set one. When `unavailable` is true, no configured data " +
      "provider has a ranked-keyword source and no comparison happened; the empty `rows` in that " +
      "case does NOT mean the competitors rank for nothing. At most 200 rows are returned; " +
      "`totalRows` is the real match count.",
    scopes: ["api"],
    annotations: {
      title: "Get keyword gap vs competitors",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "competitorDomains"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        competitorDomains: {
          minItems: 1,
          maxItems: 3,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
          },
          description: "1–3 competitor domains (bare domain or full URL). Each one is a separate billable ranked-keywords lookup, so pick the rivals actually being chased. The project's own domain is added automatically and is ignored if it appears here.",
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
        includeSubdomains: {
          description: "Count subdomains as part of a domain. Defaults to true, and applies to every compared domain including ours.",
          type: "boolean",
        },
        sortField: {
          description: "Sort column: 'volume' (default), 'theirPosition' or 'ourPosition'. All three are measured values — there is deliberately no composite opportunity score. Nulls sort last in both directions.",
          type: "string",
          enum: ["volume", "theirPosition", "ourPosition"],
        },
        sortOrder: {
          description: "Sort direction. Defaults to 'desc'.",
          type: "string",
          enum: ["asc", "desc"],
        },
        classifications: {
          description: "Restrict rows to these classifications. Omit for all five — omitting never hides `unknown`. The filter is applied before the row cap, and `totalRows` reports the pre-cap match count.",
          minItems: 1,
          maxItems: 5,
          type: "array",
          items: {
            type: "string",
            enum: ["missing", "behind", "tied", "ahead", "unknown"],
          },
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/keywords/gap", pick(args, ["projectId", "competitorDomains", "locationCode", "languageCode", "includeSubdomains", "sortField", "sortOrder", "classifications"])),
  }),
  defineTool({
    name: "list_competitor_monitors",
    category: "competitors",
    description:
      "Competitor page change detection: the specific competitor URLs monitored for a project, with " +
      "`lastCheckedAt` (null until the first scheduled check reaches it). FREE — database only, no " +
      "credits spent. Use get_competitor_monitor_changes for the actual detected-change timeline of " +
      "one URL.",
    scopes: ["api"],
    annotations: {
      title: "List monitored competitor URLs",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/competitor-monitor/targets", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "add_competitor_monitor",
    category: "competitors",
    description:
      "Start monitoring one competitor page for changes: title/meta, a real line-level content diff " +
      "(added/removed/unchanged line counts — never a fabricated similarity score), outbound links, " +
      "and structured-data types. Checked once a day; the first snapshot is captured on the NEXT " +
      "scheduled pass, not immediately. FREE — this codebase's own SSRF-safe fetch, no paid " +
      "provider. Idempotent (re-adding an already-tracked URL is a no-op). A project can monitor at " +
      "most 20 URLs.",
    scopes: ["api"],
    annotations: {
      title: "Monitor a competitor URL for page changes",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "url"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        url: {
          type: "string",
          minLength: 1,
          description: "The specific competitor page URL to monitor — not a domain to crawl. Normalised and SSRF-validated server-side; a URL resolving to a private/loopback/metadata address is rejected.",
        },
        label: {
          description: "Optional human-readable label, e.g. 'Acme pricing page'.",
          type: "string",
          maxLength: 100,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/competitor-monitor/targets", pick(args, ["projectId", "url", "label"])),
  }),
  defineTool({
    name: "remove_competitor_monitor",
    category: "competitors",
    description:
      "Stops monitoring one competitor URL. Its historical snapshots and detected changes are " +
      "deleted along with it (cascading delete) — unlike rank tracking's competitor removal, there " +
      "is no separate archive kept.",
    scopes: ["api"],
    annotations: {
      title: "Stop monitoring a competitor URL",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "targetId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        targetId: {
          type: "string",
          minLength: 1,
          description: "Monitored URL's target ID, from list_competitor_monitors or add_competitor_monitor.",
        },
      },
    },
    handler: (ctx, args) =>
      apiDelete(ctx, "/competitor-monitor/targets", pick(args, ["projectId", "targetId"])),
  }),
  defineTool({
    name: "get_competitor_monitor_changes",
    category: "competitors",
    description:
      "Timeline of DETECTED changes for one monitored competitor URL, newest first — a check that " +
      "found nothing does not appear here. Each entry's summary is a real diff: line-level content " +
      "added/removed/unchanged counts with a short sample (never a fabricated similarity score), " +
      "plus title/meta/status-code before-after values and added/removed external links and " +
      "structured-data types.",
    scopes: ["api"],
    annotations: {
      title: "Get a monitored competitor URL's change timeline",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "targetId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        targetId: {
          type: "string",
          minLength: 1,
          description: "Monitored URL's target ID, from list_competitor_monitors or add_competitor_monitor.",
        },
        limit: {
          description: "Max entries to return. Defaults to 50, capped at 200.",
          type: "integer",
          minimum: 1,
          maximum: 200,
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/competitor-monitor/changes", pick(args, ["projectId", "targetId", "limit"])),
  }),
];
