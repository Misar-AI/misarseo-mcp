/**
 * First-party web analytics, Google Analytics 4, and server-log bot analytics.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiDelete, apiGet, apiPost, pick } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const analyticsTools: ToolDefinition[] = [
  defineTool({
    name: "get_web_analytics_summary",
    category: "analytics",
    description:
      "Sessions/pageviews/bounce-rate time series for a project's own tracking snippet. FREE — " +
      "first-party data collected by MisarSEO's own snippet (/api/analytics/snippet.js), never a " +
      "paid or rate-limited third-party call. `totals.bounceRate` is null (not 0) when there were " +
      "no sessions in the range.",
    scopes: ["api"],
    annotations: {
      title: "Get Web Analytics summary",
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
      apiPost(ctx, "/web-analytics/summary", pick(args, ["projectId", "startDate", "endDate"])),
  }),
  defineTool({
    name: "get_web_analytics_top_pages",
    category: "analytics",
    description:
      "Top pages by view count, plus separate entry-page and exit-page breakdowns, for a project's " +
      "own tracking snippet. FREE, first-party.",
    scopes: ["api"],
    annotations: {
      title: "Get Web Analytics top pages",
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
        limit: {
          description: "Rows per list (topPages/entryPages/exitPages), 1-200, default 50.",
          type: "integer",
          minimum: 1,
          maximum: 200,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/web-analytics/top-pages", pick(args, ["projectId", "startDate", "endDate", "limit"])),
  }),
  defineTool({
    name: "get_web_analytics_sources",
    category: "analytics",
    description:
      "Referrer/channel/UTM breakdown for a project's own tracking snippet, including AI referral " +
      "attribution: aiReferral.bySource breaks the ai-referral channel out by assistant " +
      "(chatgpt/claude/perplexity/gemini/copilot/you/poe). aiReferral.undercountNote is not " +
      "decoration — industry measurement puts a large share of real AI-assistant referrals arriving " +
      "with no referrer header at all, landing in the direct channel instead. This number is a " +
      "measurable floor, never a complete count. FREE, first-party.",
    scopes: ["api"],
    annotations: {
      title: "Get Web Analytics sources + AI referral attribution",
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
        referrerLimit: {
          description: "Rows in topReferrers, 1-200, default 50.",
          type: "integer",
          minimum: 1,
          maximum: 200,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/web-analytics/sources", pick(args, ["projectId", "startDate", "endDate", "referrerLimit"])),
  }),
  defineTool({
    name: "get_web_analytics_devices",
    category: "analytics",
    description:
      "Device/browser/OS breakdown for a project's own tracking snippet. Every field is derived " +
      "server-side from the visitor's User-Agent header at collection time. FREE, first-party.",
    scopes: ["api"],
    annotations: {
      title: "Get Web Analytics devices",
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
      apiPost(ctx, "/web-analytics/devices", pick(args, ["projectId", "startDate", "endDate"])),
  }),
  defineTool({
    name: "list_ga4_properties",
    category: "analytics",
    description:
      "Every GA4 property the caller's connected Google Analytics grant can access — the data " +
      "source for picking which property to bind to a project (see set_ga4_property). Live call to " +
      "the Analytics Admin API (accountSummaries.list), not an archive read. Read-only and FREE (no " +
      "credits). Check `requiresReconnect` before treating an empty `properties` list as 'no " +
      "properties': true means the stored grant can no longer reach Google Analytics.",
    scopes: ["api"],
    annotations: {
      title: "List Google Analytics properties",
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
      apiGet(ctx, "/ga4/properties", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "set_ga4_property",
    category: "analytics",
    description:
      "Link (or repoint) a project's Google Analytics property. `propertyId` is re-validated " +
      "against the caller's LIVE property list on every call — fails if the property fell out of " +
      "the connected account's access since it was last listed via list_ga4_properties.",
    scopes: ["api"],
    annotations: {
      title: "Bind a Google Analytics property to a project",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "propertyId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        propertyId: {
          type: "string",
          minLength: 1,
          description: "Bare numeric GA4 property id (no 'properties/' prefix), taken verbatim from list_ga4_properties.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/ga4/connection", pick(args, ["projectId", "propertyId"])),
  }),
  defineTool({
    name: "disconnect_ga4",
    category: "analytics",
    description:
      "Unlink a project's Google Analytics property. Breaks Analytics data for every member of the " +
      "organization, not just the caller — requires at least the admin role.",
    scopes: ["api"],
    annotations: {
      title: "Disconnect Google Analytics from a project",
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
      apiDelete(ctx, "/ga4/connection", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "get_ga4_performance_summary",
    category: "analytics",
    description:
      "MisarSEO's own retained daily Google Analytics totals for the connected property: sessions, " +
      "activeUsers, newUsers, engagementRate, bounceRate, conversions, screenPageViews. Read-only " +
      "and FREE (no credits) — makes NO call to Google, reads only what the nightly sync (04:25 " +
      "UTC) has archived. A property with no completed sync yet simply has no rows, not stale data.",
    scopes: ["api"],
    annotations: {
      title: "Get Google Analytics daily performance summary",
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
      apiPost(ctx, "/ga4/daily", pick(args, ["projectId", "startDate", "endDate"])),
  }),
  defineTool({
    name: "get_ga4_channel_breakdown",
    category: "analytics",
    description:
      "MisarSEO's own retained daily GA4 channel breakdown (sessionDefaultChannelGroup) for the " +
      "connected property — isolating Organic Search from every other acquisition channel, the " +
      "SEO-relevant signal GA4 adds beyond Search Console's own click/impression data. Read-only " +
      "and FREE (no credits), archive-only — same sync/quota story as get_ga4_performance_summary.",
    scopes: ["api"],
    annotations: {
      title: "Get Google Analytics channel breakdown",
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
      apiPost(ctx, "/ga4/channels", pick(args, ["projectId", "startDate", "endDate"])),
  }),
  defineTool({
    name: "get_ga4_landing_pages",
    category: "analytics",
    description:
      "MisarSEO's own retained daily GA4 landing-page breakdown for the connected property: " +
      "sessions/engagement/conversions per landing page, ordered by sessions descending within each " +
      "day. Read-only and FREE (no credits), archive-only — same sync/quota story as " +
      "get_ga4_performance_summary.",
    scopes: ["api"],
    annotations: {
      title: "Get Google Analytics landing-page performance",
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
        limit: {
          description: "Rows to return, 1-1000 (default 1000). Landing-page cardinality is unbounded for a large site.",
          type: "integer",
          minimum: 1,
          maximum: 1000,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/ga4/landing-pages", pick(args, ["projectId", "startDate", "endDate", "limit"])),
  }),
  defineTool({
    name: "log_analyzer_list_uploads",
    category: "analytics",
    description:
      "A project's server-log uploads and their parse status — the Log File Analyzer / Bot " +
      "Analytics feature. Each row is `{ id, fileName, sizeBytes, status, lineCount, " +
      "parsedLineCount, skippedLineCount, errorMessage, createdAt, completedAt }`. `status` is one " +
      "of queued/parsing/completed/failed. lineCount/parsedLineCount/skippedLineCount are null " +
      "until parsing completes — an absent count is not zero. FREE (no credits). Pair with " +
      "log_analyzer_upload to add a log, log_analyzer_daily_summary / log_analyzer_top_paths for " +
      "the report.",
    scopes: ["api"],
    annotations: {
      title: "List log file uploads",
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
      apiGet(ctx, "/log-analyzer/uploads", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "log_analyzer_upload",
    category: "analytics",
    description:
      "Upload a server access log for background parsing (Log File Analyzer / Bot Analytics). Only " +
      "Apache/Nginx Combined Log Format text is supported. Pass the raw log text in `content`; " +
      "parsing runs in the background, so this returns once the upload is stored, before it is " +
      "fully processed — poll log_analyzer_list_uploads for status. Requires the `admin` role. " +
      "Plan-tier gated: the deployment's tier caps lines processed per upload and uploads per " +
      "month. Practical limit: tool calls carrying megabytes of text are impractical — prefer the " +
      "web UI for large logs. FREE (no credits).",
    scopes: ["api"],
    annotations: {
      title: "Upload a server access log",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "fileName", "content"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        fileName: {
          type: "string",
          minLength: 1,
          maxLength: 255,
          description: "The log file's name, e.g. 'access.log'.",
        },
        content: {
          type: "string",
          minLength: 1,
          description: "Raw Combined Log Format text, one line per request.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/log-analyzer/uploads", pick(args, ["projectId", "fileName", "content"])),
  }),
  defineTool({
    name: "log_analyzer_daily_summary",
    category: "analytics",
    description:
      "Bot hit counts per (day, bot category, bot label, status code, content-type bucket) across " +
      "every log upload in the date range — powers a time-series, status-code, or content-type view " +
      "of bot traffic. Rows are `{ day, botCategory, botLabel, statusCode, contentType, hitCount " +
      "}`; botCategory is ai_crawler/search_engine/other_bot. Dates are ISO (YYYY-MM-DD), UTC. An " +
      "empty result means nothing was measured in the range — no bot hits were recorded from the " +
      "logs uploaded for those days, which is not the same as no bots visiting. FREE (no credits).",
    scopes: ["api"],
    annotations: {
      title: "Bot hits per day",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "sinceDay", "untilDay"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        sinceDay: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Inclusive start day, ISO date, UTC.",
        },
        untilDay: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Inclusive end day, ISO date, UTC.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/log-analyzer/daily-summary", pick(args, ["projectId", "sinceDay", "untilDay"])),
  }),
  defineTool({
    name: "log_analyzer_top_paths",
    category: "analytics",
    description:
      "The paths bots hit most, per (bot category, bot label, path, status code) — the " +
      "busiest-paths table of Bot Analytics. Rows are `{ botCategory, botLabel, path, statusCode, " +
      "hitCount, lastSeenAt }`, ordered by hitCount descending, capped at 200. Optionally filter to " +
      "one bot category (ai_crawler/search_engine/other_bot). An empty result means nothing was " +
      "measured — no bot path hits were recorded from uploaded logs. FREE (no credits).",
    scopes: ["api"],
    annotations: {
      title: "Busiest paths by bot",
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
        botCategory: {
          description: "Filter to one bot category; omit for all.",
          type: "string",
          enum: ["ai_crawler", "search_engine", "other_bot"],
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/log-analyzer/top-paths", pick(args, ["projectId", "botCategory"])),
  }),
];
