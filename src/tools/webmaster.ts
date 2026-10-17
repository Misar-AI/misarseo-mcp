/**
 * IndexNow, Yandex Webmaster, Baidu Webmaster and Ahrefs Connect.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiDelete, apiGet, apiPost, pick } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const webmasterTools: ToolDefinition[] = [
  defineTool({
    name: "submit_indexnow",
    category: "webmaster",
    description:
      "Submit up to 10,000 of a project's own URLs to IndexNow (relayed to Bing, Yandex, Seznam and " +
      "Naver) so they are re-crawled without waiting for the next scheduled crawl. FREE — no " +
      "credits, no OAuth. Requires the project to have an IndexNow key set (PATCH " +
      "/api/seo/projects/:projectId with { indexNowKey }) — the key it hosts at " +
      "https://<domain>/<key>.txt. Every completed site-audit crawl also submits its own crawled " +
      "URLs automatically, so this tool is for resubmitting specific URLs on demand (e.g. right " +
      "after a manual publish), not the primary path. Every URL must be on the project's own domain " +
      "— a mixed-host batch is rejected before any request reaches IndexNow.",
    scopes: ["api"],
    annotations: {
      title: "Submit URLs to IndexNow",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "urls"],
      properties: {
        projectId: {
          type: "string",
          description: "Project id from list_projects.",
        },
        urls: {
          minItems: 1,
          maxItems: 10000,
          type: "array",
          items: {
            type: "string",
            format: "uri",
          },
          description: "Absolute URLs to submit, all on the project's own domain.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/indexnow/submit", pick(args, ["projectId", "urls"])),
  }),
  defineTool({
    name: "get_yandex_site_overview",
    category: "webmaster",
    description:
      "Yandex's own view of a project's domain: the indexing summary — including the Site Quality " +
      "Index (SQI), a third independent authority signal alongside OpenPageRank and Tranco — and " +
      "popular search queries, read straight from the Yandex Webmaster API. FREE (no credits). " +
      "Bring-your-own-token: requires the deployment operator to set YANDEX_WEBMASTER_OAUTH_TOKEN " +
      "(one token covers every host verified on that Yandex account — no per-project connect step, " +
      "and MisarSEO never drives the OAuth flow itself). Answers { ok: false, reason: " +
      "'not_configured' } when unset, or 'no_matching_host' when the project's domain has no " +
      "verified match on the account. Yandex publishes no backlink-lookup endpoint at all, so " +
      "unlike get_bing_site_overview this has no backlinks section. `diagnostics` lists " +
      "individually named issues (e.g. NO_SITEMAPS, DNS_ERROR) that `summary.siteProblems` only " +
      "counts by severity.",
    scopes: ["api"],
    annotations: {
      title: "Get Yandex Webmaster site overview",
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
        queryLimit: {
          description: "Max popular queries to return (1-500).",
          type: "integer",
          minimum: 1,
          maximum: 500,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/yandex/site-overview", pick(args, ["projectId", "queryLimit"])),
  }),
  defineTool({
    name: "reindex_yandex_url",
    category: "webmaster",
    description:
      "Asks Yandex Webmaster to re-crawl one specific URL on a project's matched host. FREE (no " +
      "credits), but this is a MUTATION — unlike get_yandex_site_overview, it queues real work on " +
      "the operator's live Yandex Webmaster account and spends that account's daily recrawl quota. " +
      "Bring-your-own-token: requires YANDEX_WEBMASTER_OAUTH_TOKEN. Answers { ok: false, reason: " +
      "'not_configured' } when unset, or 'no_matching_host' when the project's domain has no " +
      "verified match on the account. Yandex's own documented failure cases — the URL already " +
      "queued, or the account's recrawl quota already spent — surface as a normal tool error, not a " +
      "200 with ok:false.",
    scopes: ["api"],
    annotations: {
      title: "Ask Yandex to re-crawl a URL",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
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
          description: "Absolute URL to re-crawl.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/yandex/reindex-url", pick(args, ["projectId", "url"])),
  }),
  defineTool({
    name: "list_yandex_hosts",
    category: "webmaster",
    description:
      "Every host the caller's connected Yandex Webmaster OAuth grant can access — the data source " +
      "for picking which host to bind to a project (see set_yandex_host). Read-only and FREE (no " +
      "credits). Check `requiresReconnect` before treating an empty `hosts` list as 'no hosts': " +
      "true means the stored grant can no longer reach Yandex Webmaster.",
    scopes: ["api"],
    annotations: {
      title: "List Yandex Webmaster hosts",
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
      apiGet(ctx, "/yandex/hosts", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "set_yandex_host",
    category: "webmaster",
    description:
      "Link (or repoint) a project's Yandex Webmaster host. `hostId` is re-validated against the " +
      "caller's LIVE host list on every call.",
    scopes: ["api"],
    annotations: {
      title: "Bind a Yandex Webmaster host to a project",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "hostId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        hostId: {
          type: "string",
          minLength: 1,
          description: "Yandex's own composite protocol:domain:port host id, taken verbatim from list_yandex_hosts.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/yandex/connection", pick(args, ["projectId", "hostId"])),
  }),
  defineTool({
    name: "disconnect_yandex",
    category: "webmaster",
    description:
      "Unlink a project's Yandex Webmaster host. Breaks Yandex Webmaster data for every member of " +
      "the organization, not just the caller — requires at least the admin role.",
    scopes: ["api"],
    annotations: {
      title: "Disconnect Yandex Webmaster from a project",
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
      apiDelete(ctx, "/yandex/connection", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "get_baidu_connection",
    category: "webmaster",
    description:
      "The project's current Baidu Webmaster (百度搜索资源平台) connection, plus today's push-quota usage. " +
      "`today.lastRemain` is Baidu's own authoritative remaining-quota count as of the last push " +
      "(null until the first push of the day) — `today.assumedDailyQuota` is a courtesy default " +
      "only, never a real ceiling, since Baidu computes quota per-site dynamically and publishes no " +
      "fixed number.",
    scopes: ["api"],
    annotations: {
      title: "Get Baidu Webmaster connection status",
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
      apiGet(ctx, "/baidu/connection", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "set_baidu_connection",
    category: "webmaster",
    description:
      "Set (or replace) a project's Baidu Webmaster site + push token. Baidu exposes no API to list " +
      "or verify sites on an account, unlike Bing's GetUserSites — this stores the pair as given, " +
      "with no live re-validation against Baidu. Requires the operator/user to have already " +
      "verified the site on ziyuan.baidu.com and minted a push token there (Resource Submission -> " +
      "Standard Inclusion -> API Submission).",
    scopes: ["api"],
    annotations: {
      title: "Connect a Baidu Webmaster site to a project",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "siteUrl", "token"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        siteUrl: {
          type: "string",
          minLength: 1,
          description: "Baidu's own `site` value, taken verbatim from ziyuan.baidu.com.",
        },
        token: {
          type: "string",
          minLength: 6,
          maxLength: 128,
          description: "The site-specific push token minted on ziyuan.baidu.com AFTER completing Baidu's own site-ownership verification there — a real, external, one-time setup step this tool cannot automate.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/baidu/connection", pick(args, ["projectId", "siteUrl", "token"])),
  }),
  defineTool({
    name: "disconnect_baidu",
    category: "webmaster",
    description:
      "Remove a project's Baidu Webmaster connection. Breaks Baidu push submission for every member " +
      "of the organization, not just the caller — requires at least the admin role.",
    scopes: ["api"],
    annotations: {
      title: "Disconnect Baidu Webmaster from a project",
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
      apiDelete(ctx, "/baidu/connection", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "submit_baidu_urls",
    category: "webmaster",
    description:
      "Push a project's own URLs to Baidu (data.zz.baidu.com/urls) for expedited crawling. FREE (no " +
      "credits), but this is a MUTATION that spends the project's real, Baidu-computed daily quota. " +
      "Answers { ok: false, reason: 'not_connected' } when the project has no Baidu connection, " +
      "'quota_exceeded' (with the last-known remain) when today's quota is already spent, or " +
      "'site_not_verified' when Baidu reports the site/token pair as unverified — all as a normal " +
      "result, never a thrown error, since these are expected operational states.",
    scopes: ["api"],
    annotations: {
      title: "Push URLs to Baidu",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
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
          maxItems: 2000,
          type: "array",
          items: {
            type: "string",
            format: "uri",
          },
          description: "Absolute URLs to push to Baidu, up to 2000 per call.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/baidu/submit", pick(args, ["projectId", "urls"])),
  }),
  defineTool({
    name: "list_ahrefs_projects",
    category: "webmaster",
    description:
      "Every Rank Tracker AND Site Audit project the caller's connected Ahrefs Connect grant can " +
      "access — the data source for picking which project(s) to bind to a MisarSEO project (see " +
      "set_ahrefs_project). Live call to the Ahrefs API v3 under the caller's OWN OAuth token. " +
      "Read-only and FREE (no credits). Check `requiresReconnect` before treating both lists as 'no " +
      "projects': true means the stored grant can no longer reach Ahrefs.",
    scopes: ["api"],
    annotations: {
      title: "List Ahrefs Rank Tracker + Site Audit projects",
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
      apiGet(ctx, "/ahrefs/projects", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "set_ahrefs_project",
    category: "webmaster",
    description:
      "Bind (or repoint) ONE of a project's two independent Ahrefs project types — `projectType` " +
      "selects `rank_tracker` or `site_audit`. `ahrefsProjectId` is re-validated against the " +
      "caller's LIVE project list on every call — fails if the project fell out of the connected " +
      "account's access since it was last listed via list_ahrefs_projects.",
    scopes: ["api"],
    annotations: {
      title: "Bind an Ahrefs project to a MisarSEO project",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "projectType", "ahrefsProjectId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        projectType: {
          type: "string",
          enum: ["rank_tracker", "site_audit"],
          description: "Which of the two independent Ahrefs project types to bind.",
        },
        ahrefsProjectId: {
          type: "string",
          minLength: 1,
          description: "Ahrefs' own project id, taken verbatim from list_ahrefs_projects.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/ahrefs/connection", pick(args, ["projectId", "projectType", "ahrefsProjectId"])),
  }),
  defineTool({
    name: "disconnect_ahrefs",
    category: "webmaster",
    description:
      "Full disconnect: drops BOTH the Rank Tracker and Site Audit bindings and the stored grant. " +
      "Breaks Ahrefs data for every member of the organization, not just the caller — requires at " +
      "least the admin role.",
    scopes: ["api"],
    annotations: {
      title: "Disconnect Ahrefs Connect from a project",
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
      apiDelete(ctx, "/ahrefs/connection", pick(args, ["projectId"])),
  }),
];
