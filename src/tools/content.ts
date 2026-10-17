/**
 * On-page content grading and lightweight page metrics.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiPost, pick } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const contentTools: ToolDefinition[] = [
  defineTool({
    name: "get_content_optimizer_report",
    category: "content",
    description:
      "On-page recommendations and an AI content grade for one page, benchmarked against the pages " +
      "currently ranking for its target keyword, built together — one AI-gateway call produces both " +
      "the grade and the recommendations). CHARGES ONE AI-gateway operation against the " +
      "organization's shared monthly ceiling — not a plan-quota dimension of its own. The page " +
      "crawl (target + up to 5 competitors) and the SERP fetch are both free. `url` does not have " +
      "to belong to the project's own domain or to a page a site audit has crawled — any http(s) " +
      "URL is graded fresh. ALWAYS narrow on `state` first: `target_unreachable` means the target " +
      "page itself could not be fetched — an ordinary outcome, never treat it as 'this page scored " +
      "zero'. `analysed` carries the full report; check `coverage.serpUnavailable` and " +
      "`competitorsCrawled` before trusting the competitor comparison. `grade` is an AI-generated " +
      "qualitative read of the measured signals, NOT a calibrated industry score. Does NOT detect " +
      "AI-written content — that is not built; no reliable free technique exists for it.",
    scopes: ["api"],
    annotations: {
      title: "Get on-page content optimizer + AI grade",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "url", "keyword"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        url: {
          type: "string",
          format: "uri",
          description: "The page to grade (any http(s) URL).",
        },
        keyword: {
          type: "string",
          minLength: 1,
          description: "The keyword this page is meant to rank for.",
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
      apiPost(ctx, "/content/optimizer", pick(args, ["projectId", "url", "keyword", "locationCode", "languageCode"])),
  }),
  defineTool({
    name: "get_content_page_metrics",
    category: "content",
    description:
      "Lightweight on-page metrics for one arbitrary URL — the content optimizer's keyword-free, " +
      "AI-free sibling. Built for ambient per-page checks (e.g. the browser extension's on-page " +
      "panel checking whatever page the user is currently viewing) with none of " +
      "`get_content_optimizer_report`'s cost: no keyword required, no AI-gateway charge, no " +
      "competitor crawl or SERP fetch. `url` does not have to belong to the project's own domain — " +
      "any http(s) URL is analyzed fresh. ALWAYS narrow on `state` first: `unreachable` means the " +
      "page itself could not be fetched — an ordinary outcome for an arbitrary URL check, never " +
      "treat it as an error.",
    scopes: ["api"],
    annotations: {
      title: "Get lightweight on-page metrics for one URL",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
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
          format: "uri",
          description: "The page to analyze (any http(s) URL).",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/content/page-metrics", pick(args, ["projectId", "url"])),
  }),
];
