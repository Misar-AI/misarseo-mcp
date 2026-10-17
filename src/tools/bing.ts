/**
 * Bing Webmaster Tools.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiDelete, apiGet, apiPost, pick } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const bingTools: ToolDefinition[] = [
  defineTool({
    name: "get_bing_site_overview",
    category: "bing",
    description:
      "Bing's own view of a project's domain: daily search performance (clicks/impressions), " +
      "per-query stats, own-site inbound links, remaining URL Submission quota, crawl diagnostics " +
      "(crawl stats, crawl issues, crawl settings), submitted feeds and query-parameter settings — " +
      "read straight from the Bing Webmaster API. FREE (no credits). Bring-your-own-key: requires " +
      "the deployment operator to set BING_WEBMASTER_API_KEY (one key covers every site verified on " +
      "that Bing account — no per-project connect step). Answers { ok: false, reason: " +
      "'not_configured' } when unset, or 'no_matching_site' when the project's domain has no " +
      "verified match on the account. Backlinks here are OWN-SITE ONLY — Bing exposes no " +
      "competitor/any-domain backlink lookup, so this does not substitute for general backlink " +
      "research. Per-URL lookups and keyword research have their own tools: get_bing_url_links, " +
      "get_bing_url_info, get_bing_keyword_research.",
    scopes: ["api"],
    annotations: {
      title: "Get Bing Webmaster site overview",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
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
      apiPost(ctx, "/bing/site-overview", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "get_bing_backlinks",
    category: "bing",
    description:
      "GetLinkCounts: own-site inbound-link page list for a project's matched Bing site — the " +
      "focused, single-call form of the backlinks field already embedded in get_bing_site_overview. " +
      "FREE (no credits). OWN-SITE ONLY: Bing exposes no competitor/any-domain backlink lookup, and " +
      "some verified sites are known to return an empty result here even when populated. " +
      "Bring-your-own-key: requires BING_WEBMASTER_API_KEY. Answers { ok: false, reason: " +
      "'not_configured' } when unset, or 'no_matching_site' when the project's domain has no " +
      "verified match on the account.",
    scopes: ["api"],
    annotations: {
      title: "Get a project's own-site backlinks from Bing",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
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
        page: {
          description: "0-based page of Bing's own pagination (default 0).",
          type: "integer",
          minimum: 0,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/bing/backlinks", pick(args, ["projectId", "page"])),
  }),
  defineTool({
    name: "get_bing_url_links",
    category: "bing",
    description:
      "GetUrlLinks: the inbound links (anchor text + source URL) pointing at one specific page on a " +
      "project's matched Bing site, read straight from the Bing Webmaster API. FREE (no credits). " +
      "Own-site only — Bing exposes no competitor/any-domain backlink lookup, and some verified " +
      "sites are known to return an empty result here even when populated. Bring-your-own-key: " +
      "requires BING_WEBMASTER_API_KEY. Answers { ok: false, reason: 'not_configured' } when unset, " +
      "or 'no_matching_site' when the project's domain has no verified match on the account.",
    scopes: ["api"],
    annotations: {
      title: "Get Bing inbound links to one URL",
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
          description: "The specific page to find inbound links for.",
        },
        page: {
          description: "0-based page of Bing's own pagination (default 0).",
          type: "integer",
          minimum: 0,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/bing/url-links", pick(args, ["projectId", "url", "page"])),
  }),
  defineTool({
    name: "get_bing_url_info",
    category: "bing",
    description:
      "GetUrlInfo + optionally GetChildrenUrlInfo: index/crawl metadata (anchor count, " +
      "discovery/last-crawled dates, HTTP status, whether Bing considers it a page) for one URL on " +
      "a project's matched Bing site, and, when includeChildren is set, the same metadata for every " +
      "URL Bing discovered under it. FREE (no credits). Bring-your-own-key: requires " +
      "BING_WEBMASTER_API_KEY. Answers { ok: false, reason: 'not_configured' } when unset, or " +
      "'no_matching_site' when the project's domain has no verified match on the account.",
    scopes: ["api"],
    annotations: {
      title: "Get Bing index/crawl info for one URL",
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
          description: "The URL to look up.",
        },
        includeChildren: {
          description: "Also fetch the index/crawl metadata for URLs discovered under this one (one page of Bing's own pagination). Default false.",
          type: "boolean",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/bing/url-info", pick(args, ["projectId", "url", "includeChildren"])),
  }),
  defineTool({
    name: "get_bing_keyword_research",
    category: "bing",
    description:
      "GetKeyword + GetKeywordStats + GetRelatedKeywords: real Bing impression data for a query, " +
      "its recent weekly history, and related queries — read straight from the Bing Webmaster API. " +
      "FREE (no credits). Unlike derived/estimated keyword metrics, these numbers come from Bing's " +
      "own search-impression logs. Bring-your-own-key: requires BING_WEBMASTER_API_KEY. Answers { " +
      "ok: false, reason: 'not_configured' } when unset, or 'no_matching_site' when the project's " +
      "domain has no verified match on the account.",
    scopes: ["api"],
    annotations: {
      title: "Bing keyword research (real impression data)",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "query"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        query: {
          type: "string",
          minLength: 1,
          description: "The search query to research.",
        },
        country: {
          description: "Two-letter country code, e.g. 'us'.",
          type: "string",
        },
        language: {
          description: "Language-region code, e.g. 'en-US'.",
          type: "string",
        },
        startDate: {
          description: "YYYY-MM-DD. Applies to keyword/relatedKeywords only.",
          type: "string",
        },
        endDate: {
          description: "YYYY-MM-DD. Applies to keyword/relatedKeywords only.",
          type: "string",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/bing/keyword-research", pick(args, ["projectId", "query", "country", "language", "startDate", "endDate"])),
  }),
  defineTool({
    name: "get_bing_detail_stats",
    category: "bing",
    description:
      "GetQueryTrafficStats + GetPageStats + GetPageQueryStats + GetQueryPageStats + " +
      "GetQueryPageDetailStats: per-query and per-page search-performance detail for a project's " +
      "matched Bing site. FREE (no credits). pageStats (site-wide, weekly) is always attempted. " +
      "queryTrafficStats/queryPageStats are null unless `query` is given; pageQueryStats is null " +
      "unless `pageUrl` is given; queryPageDetailStats is null unless both are given — a null " +
      "section absent from `errors` was not requested, not a failure. pageStats carries one " +
      "unresolved caveat: Microsoft's own doc page is internally inconsistent about whether that " +
      "method's `query` field on each row holds a query string or a page URL — surfaced as-is. " +
      "Bring-your-own-key: requires BING_WEBMASTER_API_KEY. Answers { ok: false, reason: " +
      "'not_configured' } when unset, or 'no_matching_site' when the project's domain has no " +
      "verified match on the account.",
    scopes: ["api"],
    annotations: {
      title: "Get Bing per-query/per-page detail stats",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
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
        query: {
          description: "The search query to fetch traffic/page stats for. Required for queryTrafficStats/queryPageStats (and, with pageUrl, queryPageDetailStats).",
          type: "string",
          minLength: 1,
        },
        pageUrl: {
          description: "The page to fetch query stats for. Required for pageQueryStats (and, with query, queryPageDetailStats).",
          type: "string",
          format: "uri",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/bing/detail-stats", pick(args, ["projectId", "query", "pageUrl"])),
  }),
  defineTool({
    name: "get_bing_feed_details",
    category: "bing",
    description:
      "GetFeedDetails: the same Feed shape as one entry from Bing's GetFeeds list, for one specific " +
      "feed URL on a project's matched site. FREE (no credits), read-only. Bring-your-own-key: " +
      "requires BING_WEBMASTER_API_KEY. Answers { ok: false, reason: 'not_configured' } when unset, " +
      "or 'no_matching_site' when the project's domain has no verified match on the account.",
    scopes: ["api"],
    annotations: {
      title: "Get one Bing feed's status",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "feedUrl"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        feedUrl: {
          type: "string",
          format: "uri",
          description: "Absolute URL of the previously-submitted sitemap/feed.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/bing/feed-details", pick(args, ["projectId", "feedUrl"])),
  }),
  defineTool({
    name: "submit_bing_content",
    category: "bing",
    description:
      "SubmitContent: pushes a page's full content (a base64-encoded HTTP message) directly to Bing " +
      "for a project's matched site, bypassing a crawl. FREE (no credits), but this is a MUTATION — " +
      "unlike get_bing_site_overview, it queues real work on the operator's live Bing Webmaster " +
      "account. Bring-your-own-key: requires BING_WEBMASTER_API_KEY. Answers { ok: false, reason: " +
      "'not_configured' } when unset, or 'no_matching_site' when the project's domain has no " +
      "verified match on the account.",
    scopes: ["api"],
    annotations: {
      title: "Push a page's content to Bing",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "url", "httpMessage"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        url: {
          type: "string",
          format: "uri",
          description: "Absolute URL of the page being submitted.",
        },
        httpMessage: {
          type: "string",
          minLength: 1,
          description: "The page's full HTTP response, already base64-encoded by the caller — this tool does not encode it.",
        },
        structuredData: {
          description: "Optional structured-data payload Bing accepts alongside the content.",
          type: "string",
        },
        dynamicServing: {
          description: "Optional dynamic-serving indicator Bing accepts alongside the content.",
          type: "string",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/bing/submit-content", pick(args, ["projectId", "url", "httpMessage", "structuredData", "dynamicServing"])),
  }),
  defineTool({
    name: "submit_bing_feed",
    category: "bing",
    description:
      "SubmitFeed: submits a sitemap/feed URL to Bing for a project's matched site. FREE (no " +
      "credits), but this is a MUTATION — unlike get_bing_site_overview, it queues real work on the " +
      "operator's live Bing Webmaster account. Bring-your-own-key: requires BING_WEBMASTER_API_KEY. " +
      "Answers { ok: false, reason: 'not_configured' } when unset, or 'no_matching_site' when the " +
      "project's domain has no verified match on the account.",
    scopes: ["api"],
    annotations: {
      title: "Submit a sitemap/feed to Bing",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "feedUrl"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        feedUrl: {
          type: "string",
          format: "uri",
          description: "Absolute URL of the sitemap/feed to submit.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/bing/submit-feed", pick(args, ["projectId", "feedUrl"])),
  }),
  defineTool({
    name: "save_bing_crawl_settings",
    category: "bing",
    description:
      "SaveCrawlSettings: overwrites a project's matched Bing site's crawl-rate/AJAX-crawling " +
      "config. FREE (no credits), but this is a MUTATION — unlike get_bing_site_overview's " +
      "GetCrawlSettings read, it writes to the operator's live Bing Webmaster account. crawlRate " +
      "must have exactly 24 hourly values, per Bing's own documented CrawlSettings JSON sample. " +
      "Bring-your-own-key: requires BING_WEBMASTER_API_KEY. Answers { ok: false, reason: " +
      "'not_configured' } when unset, or 'no_matching_site' when the project's domain has no " +
      "verified match on the account.",
    scopes: ["api"],
    annotations: {
      title: "Save Bing crawl-rate/AJAX settings",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "ajaxEnabled", "crawlRate"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        ajaxEnabled: {
          type: "boolean",
          description: "Whether Bing should crawl AJAX content on this site.",
        },
        crawlRate: {
          minItems: 24,
          maxItems: 24,
          type: "array",
          items: {
            type: "number",
          },
          description: "Exactly 24 hourly crawl-rate values, one per hour of the day.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/bing/crawl-settings", pick(args, ["projectId", "ajaxEnabled", "crawlRate"])),
  }),
  defineTool({
    name: "update_bing_blocked_url",
    category: "bing",
    description:
      "AddBlockedUrl + RemoveBlockedUrl: tell Bing to stop, or resume, showing one URL in search " +
      "results for a project's matched site. FREE (no credits), but this is a MUTATION. There is no " +
      "verified GetBlockedUrls to list current blocks with — add/remove-only. Bring-your-own-key: " +
      "requires BING_WEBMASTER_API_KEY. Answers { ok: false, reason: 'not_configured' } when unset, " +
      "or 'no_matching_site' when the project's domain has no verified match on the account.",
    scopes: ["api"],
    annotations: {
      title: "Block/unblock a URL from Bing search results",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "action", "url", "entityType", "requestType"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        action: {
          type: "string",
          enum: ["add", "remove"],
          description: "add: block this URL from search results. remove: undo a previous block.",
        },
        url: {
          type: "string",
          format: "uri",
          description: "The URL (or directory) to block/unblock.",
        },
        entityType: {
          anyOf: [
            {
              type: "number",
              const: 0,
            },
            {
              type: "number",
              const: 1,
            },
          ],
          description: "0 = a single page, 1 = a directory.",
        },
        requestType: {
          anyOf: [
            {
              type: "number",
              const: 0,
            },
            {
              type: "number",
              const: 1,
            },
          ],
          description: "0 = CacheOnly (keep out of the cache, still crawlable), 1 = full block.",
        },
        date: {
          description: "ISO-8601 date for the block. Defaults to now.",
          type: "string",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/bing/blocked-urls", pick(args, ["projectId", "action", "url", "entityType", "requestType", "date"])),
  }),
  defineTool({
    name: "update_bing_query_parameter",
    category: "bing",
    description:
      "AddQueryParameter + RemoveQueryParameter + EnableDisableQueryParameter: add, remove, or " +
      "toggle one query-string parameter Bing is told to ignore when canonicalizing URLs for a " +
      "project's matched site. FREE (no credits), but this is a MUTATION. get_bing_site_overview's " +
      "queryParameters field (GetQueryParameters) is the read half of this family. " +
      "Bring-your-own-key: requires BING_WEBMASTER_API_KEY. Answers { ok: false, reason: " +
      "'not_configured' } when unset, or 'no_matching_site' when the project's domain has no " +
      "verified match on the account.",
    scopes: ["api"],
    annotations: {
      title: "Add/remove/toggle a Bing ignored query parameter",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "action", "parameter"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        action: {
          type: "string",
          enum: ["add", "remove", "enable", "disable"],
          description: "add: start ignoring this parameter. remove: stop ignoring it entirely. enable/disable: toggle an already-added rule without removing it.",
        },
        parameter: {
          type: "string",
          minLength: 1,
          description: "The query-string parameter name, e.g. 'utm_source'.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/bing/query-parameters", pick(args, ["projectId", "action", "parameter"])),
  }),
  defineTool({
    name: "list_bing_sites",
    category: "bing",
    description:
      "Every site the caller's connected Bing Webmaster OAuth grant can access — the data source " +
      "for picking which site to bind to a project (see set_bing_site). Live call to the Bing " +
      "Webmaster API (GetUserSites) under the caller's OWN OAuth token, not the operator key. " +
      "Read-only and FREE (no credits). Check `requiresReconnect` before treating an empty `sites` " +
      "list as 'no sites': true means the stored grant can no longer reach Bing Webmaster.",
    scopes: ["api"],
    annotations: {
      title: "List Bing Webmaster sites",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
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
      apiGet(ctx, "/bing/sites", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "set_bing_site",
    category: "bing",
    description:
      "Link (or repoint) a project's Bing Webmaster site. `siteUrl` is re-validated against the " +
      "caller's LIVE site list on every call — fails if the site fell out of the connected " +
      "account's access since it was last listed via list_bing_sites.",
    scopes: ["api"],
    annotations: {
      title: "Bind a Bing Webmaster site to a project",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "siteUrl"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        siteUrl: {
          type: "string",
          minLength: 1,
          description: "Bing's own site URL string, taken verbatim from list_bing_sites.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/bing/connection", pick(args, ["projectId", "siteUrl"])),
  }),
  defineTool({
    name: "disconnect_bing",
    category: "bing",
    description:
      "Unlink a project's Bing Webmaster site. Breaks Bing Webmaster data for every member of the " +
      "organization, not just the caller — requires at least the admin role.",
    scopes: ["api"],
    annotations: {
      title: "Disconnect Bing Webmaster from a project",
      readOnlyHint: false,
      destructiveHint: true,
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
      apiDelete(ctx, "/bing/connection", pick(args, ["projectId"])),
  }),
];
