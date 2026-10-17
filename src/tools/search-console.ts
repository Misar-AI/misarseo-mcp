/**
 * Google Search Console: live Search Analytics and inspection, plus MisarSEO's own archives.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiPost, pick } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const searchConsoleTools: ToolDefinition[] = [
  defineTool({
    name: "get_search_console_performance",
    category: "search-console",
    description:
      "Query the connected Search Console property's Search Analytics: clicks, impressions, CTR, " +
      "and average position by query/page/country/device/date. First-party data — use it for what " +
      "already ranks, near-ranking queries, and pages with real demand. ctr is a 0-1 fraction; " +
      "position is a 1-based average; dates are Pacific Time; the last ~3 days may be incomplete. " +
      "Read-only and FREE (no credits) — Search Console is first-party data and meters nothing. It " +
      "does spend Google's per-property request quota. Google omits rows it will not disclose " +
      "(anonymised queries) and returns at most `rowLimit` of the rest, so what it withholds is not " +
      "measured rather than absent: zero rows is not zero demand, and a total summed from these " +
      "rows is a floor, never the property's real total. When `hasMore` is true you have seen only " +
      "part of the match set — page with `startRow` before reporting any sum or count as complete.",
    scopes: ["api"],
    annotations: {
      title: "Get Google Search Console performance",
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
        dimensions: {
          description: "Group rows by these dimensions. Default ['query']. Use ['page'] for top pages, ['query','page'] to map queries to pages / spot cannibalization, ['date'] for a time series.",
          minItems: 1,
          maxItems: 4,
          type: "array",
          items: {
            type: "string",
            enum: ["query", "page", "country", "device", "date", "searchAppearance", "hour"],
          },
        },
        dateRange: {
          description: "Convenience window (default last_28_days). End is set ~3 days back for GSC data lag. Ignored if startDate+endDate are given. Max lookback is 16 months.",
          type: "string",
          enum: [
            "last_7_days",
            "last_28_days",
            "last_3_months",
            "last_6_months",
            "last_12_months",
            "last_16_months",
          ],
        },
        startDate: {
          description: "Explicit start (YYYY-MM-DD, Pacific Time). Use with endDate.",
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        },
        endDate: {
          description: "Explicit end (YYYY-MM-DD, Pacific Time). Use with startDate.",
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        },
        filters: {
          description: "AND-combined filters. To get the queries for one page: [{dimension:'page',operator:'equals',expression:'https://example.com/post'}] with dimensions ['query'].",
          maxItems: 5,
          type: "array",
          items: {
            type: "object",
            properties: {
              dimension: {
                type: "string",
                enum: ["query", "page", "country", "device", "date", "searchAppearance", "hour"],
              },
              operator: {
                default: "equals",
                type: "string",
                enum: ["equals", "notEquals", "contains", "notContains"],
              },
              expression: {
                type: "string",
                minLength: 1,
              },
            },
            required: ["dimension", "expression"],
          },
        },
        rowLimit: {
          description: "Rows per call (default 1000, max 1000). GSC sorts by clicks desc and can't filter by position — filter 'striking distance' positions client-side, and paginate with startRow when hasMore is true.",
          type: "integer",
          minimum: 1,
          maximum: 1000,
        },
        startRow: {
          description: "Pagination offset.",
          type: "integer",
          minimum: 0,
        },
        type: {
          description: "Search type (default web).",
          type: "string",
          enum: ["web", "image", "video", "news", "googleNews", "discover"],
        },
        dataState: {
          description: "'all' (default) includes fresh/incomplete recent data.",
          type: "string",
          enum: ["all", "final"],
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/gsc/performance", pick(args, ["projectId", "dimensions", "dateRange", "startDate", "endDate", "filters", "rowLimit", "startRow", "type", "dataState"])),
  }),
  defineTool({
    name: "inspect_urls",
    category: "search-console",
    description:
      "Run Google Search Console's URL Inspection on up to 10 URLs of the connected property: " +
      "index/coverage state, last crawl time, Google-selected vs declared canonical, and " +
      "mobile/rich-results verdicts. Use it to answer 'is this page indexed? why not?'. Read-only " +
      "and FREE (no credits) — Search Console is first-party data and meters nothing. Every " +
      "submitted URL comes back as a row, but a row carrying `error` was NOT inspected: Google " +
      "refused or failed on it, so its index state was not measured rather than found to be bad. " +
      "Count the rows without an `error` when saying how many URLs you checked. A verdict of " +
      "UNKNOWN is Google's own 'no determination', not a page that is missing from the index.",
    scopes: ["api"],
    annotations: {
      title: "Inspect URLs in Google Search Console",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "urls"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        urls: {
          minItems: 1,
          maxItems: 10,
          type: "array",
          items: {
            type: "string",
            format: "uri",
          },
          description: "1–10 absolute URLs to inspect. Each must belong to the connected property.",
        },
        languageCode: {
          description: "BCP-47 language for the inspection result (e.g. 'en-US').",
          type: "string",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/gsc/inspect-urls", pick(args, ["projectId", "urls", "languageCode"])),
  }),
  defineTool({
    name: "get_search_console_coverage",
    category: "search-console",
    description:
      "MisarSEO's own index-coverage report for the connected property: which URLs are indexed, " +
      "excluded, or errored, and why. FREE (no credits) and makes NO call to Google — unlike " +
      "get_search_console_performance, this reads `gscUrlCoverage`, populated by a nightly scan " +
      "built on the URL Inspection API's ~2000/day quota, so coverage fills in over days rather " +
      "than in one pass. `summary` is the headline count per coverageState. `rows` is one page " +
      "(default 200, max 1000) of the URLs themselves, newest-inspected first — filter to one state " +
      "with `coverageState`. An empty summary/rows with ok: true means the nightly scan has not " +
      "populated this property yet, not that every page is fine.",
    scopes: ["api"],
    annotations: {
      title: "Get Google Search Console index coverage",
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
        coverageState: {
          description: "Filter to one state, e.g. \"Submitted and indexed\". Free text, matching Google's own strings verbatim.",
          type: "string",
          minLength: 1,
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 1000,
        },
        offset: {
          type: "integer",
          minimum: 0,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/gsc/coverage", pick(args, ["projectId", "coverageState", "limit", "offset"])),
  }),
  defineTool({
    name: "get_search_console_hourly_performance",
    category: "search-console",
    description:
      "MisarSEO's own retained HOURLY Search Console totals for the connected property — the hourly " +
      "counterpart to get_search_console_performance's daily archive. FREE (no credits) and makes " +
      "NO call to Google: reads MisarSEO's own Postgres. Unlike the daily archive, a wider date " +
      "range does not mean more history — Google itself only offers roughly the trailing 8-10 days " +
      "of hourly data, and the nightly sync only ever fetches that same window, so a startDate " +
      "earlier than it simply returns nothing for the days outside it. Each row's `hour` is 0-23 in " +
      "Search Console's own America/Los_Angeles reporting hour.",
    scopes: ["api"],
    annotations: {
      title: "Get Google Search Console hourly performance",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "startDate", "endDate"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        startDate: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "YYYY-MM-DD, required.",
        },
        endDate: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "YYYY-MM-DD, required, not before startDate.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/gsc/hourly", pick(args, ["projectId", "startDate", "endDate"])),
  }),
  defineTool({
    name: "get_search_console_sitemaps",
    category: "search-console",
    description:
      "Search Console sitemaps.list/sitemaps.get: every sitemap submitted for the connected " +
      "property and its processing status (pending, last downloaded, warning/error counts, " +
      "per-content-type submitted counts), or one named sitemap. Read-only — needs only the " +
      "`webmasters.readonly` scope this deployment's Search Console connection already requests. " +
      "Submit/delete need the broader `webmasters` scope and are deliberately not offered. Free (no " +
      "credits) but spends one call of Google's per-property quota. Omit `feedpath` to list every " +
      "sitemap; pass one (a sitemap's own URL) to fetch just that one instead — either way the " +
      "response is `sitemaps`, a one-entry array for `feedpath`. " +
      "`lastSubmitted`/`lastDownloaded`/`warnings`/`errors` are absent, not zero, when Google has " +
      "nothing to report for that field.",
    scopes: ["api"],
    annotations: {
      title: "Get Google Search Console sitemaps",
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
        feedpath: {
          description: "A specific sitemap's own URL (e.g. another entry's own `path`). Omitted lists every sitemap Search Console has on record for the property.",
          type: "string",
          minLength: 1,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/gsc/sitemaps", pick(args, ["projectId", "feedpath"])),
  }),
  defineTool({
    name: "get_gsc_ctr_by_position",
    category: "search-console",
    description:
      "CTR by ranking position: the site's own historical Search Console clicks/impressions " +
      "bucketed by position (1-3, 4-10, 11-20, 21+ — mirroring this codebase's existing " +
      "rank-tracking position-distribution buckets), with the REAL clicks-weighted CTR this project " +
      "achieved at each bucket. NEVER a fabricated industry-average CTR curve (the generic " +
      "'position 1 gets X% CTR' tables third-party vendors publish) — every figure is computed from " +
      "this project's own archived Search Console history. Free and makes NO live Google call: " +
      "reads only the archive `get_content_decay_report` also reads. ALWAYS narrow on `state` " +
      "first: `not_connected` (connect a property), `no_data` (a property is bound but the archive " +
      "has no rows at all for this dimension/window — an absence of data, NOT zero traffic), " +
      "`analysed`.",
    scopes: ["api"],
    annotations: {
      title: "Get CTR by position",
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
        dimension: {
          description: "Bucket by query or page position (default 'query').",
          type: "string",
          enum: ["query", "page"],
        },
        dateRange: {
          description: "Convenience window over MisarSEO's own archive (default 'last_28_days'). No Google clamp applies — this never calls Google.",
          type: "string",
          enum: [
            "last_7_days",
            "last_28_days",
            "last_3_months",
            "last_6_months",
            "last_12_months",
            "last_16_months",
          ],
        },
        startDate: {
          description: "Explicit start date (YYYY-MM-DD). Use with endDate.",
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        },
        endDate: {
          description: "Explicit end date (YYYY-MM-DD). Use with startDate.",
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/gsc/ctr-by-position", pick(args, ["projectId", "dimension", "dateRange", "startDate", "endDate"])),
  }),
  defineTool({
    name: "get_gsc_anonymous_queries",
    category: "search-console",
    description:
      "Anonymized-query estimate: Search Console omits some rare queries entirely from a " +
      "query-dimensioned response to protect searcher privacy (Google's own documented behaviour, " +
      "not this codebase's assumption). This compares the SUM of named per-query clicks/impressions " +
      "against the property's TRUE undimensioned total for the same window — the gap is a real, " +
      "derived anonymized-query volume. Charges no credits but spends TWO Search Console requests " +
      "of Google's per-property quota per call. ALWAYS narrow on `state` first: `not_connected`, " +
      "`requires_reconnect` (the bound property's Google grant can no longer be used), " +
      "`no_search_data` (Search Console returned nothing for the window — an absence of data, NOT " +
      "zero anonymization), `analysed`. On `analysed`, ALWAYS check `possiblyRowCapped`: when true, " +
      "part of the gap is queries the 1,000-row named-query fetch did not reach, not privacy " +
      "anonymization — the estimate then overstates true anonymization.",
    scopes: ["api"],
    annotations: {
      title: "Get anonymized-query estimate",
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
        dateRange: {
          description: "Convenience window (default 'last_28_days'). This DOES call Google, so Search Console's usual ~16-month clamp and ~3-day data lag both apply.",
          type: "string",
          enum: [
            "last_7_days",
            "last_28_days",
            "last_3_months",
            "last_6_months",
            "last_12_months",
            "last_16_months",
          ],
        },
        startDate: {
          description: "Explicit start date (YYYY-MM-DD). Use with endDate.",
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        },
        endDate: {
          description: "Explicit end date (YYYY-MM-DD). Use with startDate.",
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/gsc/anonymous-queries", pick(args, ["projectId", "dateRange", "startDate", "endDate"])),
  }),
  defineTool({
    name: "get_cannibalisation_report",
    category: "search-console",
    description:
      "Finds the queries where the project's connected Search Console property competes with " +
      "itself: two or more of its own pages drawing impressions for the same query, splitting that " +
      "query's clicks, click signals and ranking history across URLs. Read-only and FREE (no " +
      "credits) — Search Console is first-party data and meters nothing. It does spend Google's " +
      "per-property request quota, so it is rate limited per user. Requires Search Console to be " +
      "connected for the project. Returns exactly ONE of four states, which are four different " +
      "facts — branch on `state` before reading anything else: `not_connected` (nothing is bound; " +
      "tell the user to connect a property), `requires_reconnect` (bound but the Google grant is " +
      "revoked/expired; tell the user to reconnect), `no_search_data` (Search Console returned " +
      "nothing for the window — an absence of data, NOT a clean bill of health), `analysed` (we " +
      "looked; `findings` may legitimately be empty and `coverage` is the proof, including " +
      "`truncated` when the property had more rows than one report can fetch). In each of the first " +
      "three states nothing was measured at all, so never report any of them as 'no cannibalisation " +
      "found'. Every per-page figure is Search Console's own for that (query, page) pair — ctr is a " +
      "0-1 fraction, position is a 1-based average, dates are Pacific Time and the last ~3 days are " +
      "excluded for data lag. `thresholds` ships with each analysed report so you can say whether a " +
      "threshold, rather than the absence of a problem, is why a query is missing.",
    scopes: ["api"],
    annotations: {
      title: "Get keyword cannibalisation report",
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
        window: {
          description: "Analysis window (default last_28_days). Capped at three months on purpose — Search Console's longer ranges are NOT offered, because over a long window 'two pages received impressions' also describes a page migration, and calling that cannibalisation sends someone to consolidate pages that are already consolidated. The window end is backed off ~3 days for Search Console's data lag.",
          type: "string",
          enum: ["last_7_days", "last_28_days", "last_3_months"],
        },
        sort: {
          description: "Finding order (default impressions). 'impressions' = most affected search demand first. 'position_spread' = smallest gap between the competing pages' average positions first, i.e. the pages Google rated most interchangeable. Both order by one measured quantity; there is deliberately no composite severity score.",
          type: "string",
          enum: ["impressions", "position_spread"],
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/gsc/cannibalisation", pick(args, ["projectId", "window", "sort"])),
  }),
  defineTool({
    name: "get_content_decay_report",
    category: "search-console",
    description:
      "Finds pages whose clicks declined by a meaningful amount between two adjacent windows, read " +
      "entirely from MisarSEO's own archived Search Console history (the top-200-per-day per-page " +
      "archive the nightly sync fills in). Read-only and FREE (no credits), and makes NO live " +
      "Search Console call — unlike get_cannibalisation_report, this spends no Google quota, so it " +
      "is rate limited only against ordinary abuse. Requires Search Console to be connected for the " +
      "project. Returns exactly ONE of three states, which are three different facts — branch on " +
      "`state` before reading anything else: `not_connected` (nothing is bound; tell the user to " +
      "connect a property), `insufficient_history` (bound, but one of the two comparison windows " +
      "has no archived rows at all — an absence of data, NOT a clean bill of health), `analysed` " +
      "(we looked; `findings` may legitimately be empty and `coverage` is the proof). In both of " +
      "the first two states nothing was measured, so never report either as 'no content decay " +
      "found'. `window` selects the RECENT period length; the EARLIER period compared against it is " +
      "the same length immediately before it, not a calendar-month split. `minEarlierClicks` " +
      "(default 10) and `declineThresholdPct` (default 20) are this codebase's own chosen defaults, " +
      "not a published vendor formula. A page that fell out of the archive's top-200-per-day " +
      "entirely reports `recentClicks: 0` — correctly the most severe decay, not a data hole.",
    scopes: ["api"],
    annotations: {
      title: "Get content decay report",
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
        window: {
          description: "The RECENT period length (default last_28_days). The EARLIER period compared against it is the same length immediately before it — a period-over-period comparison, not a calendar-month split.",
          type: "string",
          enum: ["last_28_days", "last_90_days"],
        },
        minEarlierClicks: {
          description: "A page must have had at least this many clicks in the earlier window to be considered at all (default 10) — a noise floor, not part of the decay definition.",
          type: "integer",
          minimum: 0,
          maximum: 100000,
        },
        declineThresholdPct: {
          description: "How big a decline (percent) is required to be reported (default 20). 0 disables reporting entirely.",
          type: "integer",
          minimum: 0,
          maximum: 100,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/gsc/content-decay", pick(args, ["projectId", "window", "minEarlierClicks", "declineThresholdPct"])),
  }),
];
