/**
 * Unlinked brand mentions and media monitoring.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiPost, pick } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const mentionTools: ToolDefinition[] = [
  defineTool({
    name: "get_unlinked_mentions_report",
    category: "mentions",
    description:
      "Unlinked brand mentions: searches the free SERP backend for `brand` as a QUERY, then checks " +
      "whether each result page already links to `trackedDomain`. Free: one SERP fetch plus up to " +
      "10 live third-party page fetches, no AI-gateway spend. ALWAYS narrow on `state` first: " +
      "`serp_unavailable` means no free SERP provider could be reached — never treat it as \"zero " +
      "mentions found\". `analysed` carries `candidates[]`, each `status: \"linked\" | \"unlinked\" | " +
      "\"unreachable\"`. Bounded by SERP result count (the first page or two of free-SERP results), " +
      "never an exhaustive web crawl or a full content index — the Common Crawl-based version of " +
      "this gap is a decided wont-fix; `scopeNote` states this on every response. " +
      "`candidates[].platform` reuses the AI-citation platform classification " +
      "(YouTube/TikTok/Reddit/Wikipedia/LinkedIn/Quora, or null) at no extra cost.",
    scopes: ["api"],
    annotations: {
      title: "Get unlinked brand mentions",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "brand", "trackedDomain"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        brand: {
          type: "string",
          minLength: 1,
          description: "Brand name or bare domain to search for as a SERP QUERY (not a URL to fetch).",
        },
        trackedDomain: {
          type: "string",
          minLength: 1,
          description: "Bare domain each result page is checked for a link to, e.g. 'acme.com'.",
        },
        locationCode: {
          description: "Numeric location code. Defaults to the project's stored market, else 2840 (United States).",
          type: "integer",
          exclusiveMinimum: 0,
        },
        languageCode: {
          description: "Language code. Defaults to the project's stored market, else 'en'.",
          type: "string",
          minLength: 2,
          maxLength: 8,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/mentions/unlinked", pick(args, ["projectId", "brand", "trackedDomain", "locationCode", "languageCode"])),
  }),
  defineTool({
    name: "get_media_monitoring_report",
    category: "mentions",
    description:
      "Media Monitoring: get_unlinked_mentions_report's candidates filtered to known " +
      "social/forum/news platform domains, optionally merged with the citation-platform breakdown " +
      "from a Prompt Explorer scan you already ran for the same brand. Same cost profile as " +
      "`get_unlinked_mentions_report`, which this calls internally — no AI-gateway spend, even when " +
      "`citations` is supplied (that data is only classified here, never fetched). NOT a real-time " +
      "media-monitoring product: no social-platform API polling, no forum-API crawling, no " +
      "news-aggregator feed — `scopeNote` states this on every `analysed` response. ALWAYS narrow " +
      "on `state` first, same as `get_unlinked_mentions_report`. `aiCitationPlatforms: null` means " +
      "no `citations` were supplied — distinct from an empty array, which would mean a scan cited " +
      "nothing on a known platform.",
    scopes: ["api"],
    annotations: {
      title: "Get media monitoring report",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "brand", "trackedDomain"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        brand: {
          type: "string",
          minLength: 1,
          description: "Brand name or bare domain to search for as a SERP QUERY (not a URL to fetch).",
        },
        trackedDomain: {
          type: "string",
          minLength: 1,
          description: "Bare domain each result page is checked for a link to, e.g. 'acme.com'.",
        },
        locationCode: {
          description: "Numeric location code. Defaults to the project's stored market, else 2840 (United States).",
          type: "integer",
          exclusiveMinimum: 0,
        },
        languageCode: {
          description: "Language code. Defaults to the project's stored market, else 'en'.",
          type: "string",
          minLength: 2,
          maxLength: 8,
        },
        citations: {
          description: "Citations from an ALREADY-RUN Prompt Explorer scan for this brand (map its `citations` to {url, domain}). Never fetched here — omitting it leaves `aiCitationPlatforms: null`.",
          maxItems: 100,
          type: "array",
          items: {
            type: "object",
            properties: {
              url: {
                type: "string",
              },
              domain: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
              },
            },
            required: ["url", "domain"],
          },
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/mentions/media-monitoring", pick(args, ["projectId", "brand", "trackedDomain", "locationCode", "languageCode", "citations"])),
  }),
];
