/**
 * Site audits: start a crawl, follow its progress, and read reports over
 * completed crawls.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiGet, apiPost, pick, seg } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const siteAuditTools: ToolDefinition[] = [
  defineTool({
    name: "start_site_audit",
    category: "site-audit",
    description:
      "Starts a MisarSEO site crawl/audit from startUrl. Returns `{ jobId, auditId }` (the same " +
      "id twice) with HTTP 202; the crawl then runs in the background — poll it with " +
      "get_site_audit_status. FREE of SEO credits, but it CONSUMES ONE of the organization's " +
      "monthly audits from its plan quota (a spent quota is a plan-limit error), so confirm with " +
      "the user before starting one and never start one speculatively.",
    scopes: ["api"],
    annotations: {
      title: "Start a site audit",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "startUrl"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        startUrl: {
          type: "string",
          minLength: 1,
          description: "http(s) URL the crawl starts from, usually the site's home page.",
        },
        maxPages: {
          type: "integer",
          minimum: 1,
          maximum: 5000,
          description: "Most pages to crawl (at most 5000). Omit for the service default of 50.",
        },
        strategy: {
          type: "string",
          enum: ["auto", "all", "manual", "none"],
          description: "Which pages get a Lighthouse run. Defaults to auto.",
        },
        renderJs: {
          type: "boolean",
          description: "Run each page's JavaScript before analysing it — needed for client-rendered sites. Defaults to false.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/crawl/start", pick(args, ["projectId", "startUrl", "maxPages", "strategy", "renderJs"])),
  }),
  defineTool({
    name: "get_site_audit_status",
    category: "site-audit",
    description:
      "Progress of a site audit started by start_site_audit: `{ status, pagesCrawled, pagesTotal, " +
      "lighthouseTotal, lighthouseCompleted, lighthouseFailed, currentPhase, startedAt, " +
      "completedAt }`. `status` is 'running', 'completed' or 'failed' — poll until it is " +
      "'completed' or 'failed'; there is no 'complete' status, so waiting for that string never " +
      "ends. It does NOT return crawled pages or individual issues. Once completed, read it with " +
      "get_audit_comparison, get_audit_core_web_vitals, get_audit_https_report, " +
      "get_audit_internal_links and get_audit_structured_data. FREE.",
    scopes: ["api"],
    annotations: {
      title: "Get site audit status",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "auditId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        auditId: {
          type: "string",
          minLength: 1,
          description: "The auditId (or jobId — the same value) returned by start_site_audit.",
        },
      },
    },
    handler: (ctx, args) => apiGet(ctx, `/crawl/${seg(args.auditId)}/status`, pick(args, ["projectId"])),
  }),
  defineTool({
    name: "get_audit_comparison",
    category: "site-audit",
    description:
      "Compare a site audit against an earlier one: which issues are new, which were fixed, how " +
      "many persist, and the health-score delta. Only pages BOTH crawls visited are compared, so a " +
      "shorter crawl never reports the pages it missed as fixed — those are reported separately as " +
      "notComparableCount. `newIssues` only ever covers an existing page newly showing a finding, " +
      "never a brand-new page's own findings (those fold into notComparableCount/addedUrlCount " +
      "instead, since a page neither crawl could compare has no meaningful 'new' vs. 'always there' " +
      "answer). Returns an error when there is no earlier completed audit to compare against. Free " +
      "— charges no credits.",
    scopes: ["api"],
    annotations: {
      title: "Compare two site audits",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "auditId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        auditId: {
          type: "string",
          minLength: 1,
          description: "Audit ID to compare, from crawl_site or get_crawl_results.",
        },
        baselineAuditId: {
          description: "Audit ID to compare against. OMIT IT unless you have a reason: omitting picks the COMPLETED run immediately before auditId, while a baseline named here is used as given with no completed-status check — pointing it at a failed or still-running crawl diffs against a partial page set. Comparing an audit to itself is a validation error.",
          type: "string",
          minLength: 1,
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, `/crawl/${seg(args.auditId)}/comparison`, pick(args, ["projectId", "baselineAuditId"])),
  }),
  defineTool({
    name: "get_audit_core_web_vitals",
    category: "site-audit",
    description:
      "Core Web Vitals report: LCP/INP/CLS per page/strategy this audit already ran Lighthouse " +
      "against, classified against Google's own published thresholds. No new fetch — reads " +
      "audit_lighthouse_results, the same table the results UI already renders as raw numbers. LAB " +
      "DATA ONLY, never Search Console's real Chrome UX Report (CrUX) field data — every number is " +
      "a single simulated Lighthouse run, not an aggregated real-user measurement. This codebase's " +
      "audit pipeline runs local headless Chrome as its PRIMARY path, so CrUX field data is not " +
      "reliably available for any given page. ALWAYS narrow on `state` first: `no_lighthouse_data` " +
      "(this audit has no Lighthouse rows at all — an absence of data, NOT every page passing) or " +
      "`analysed`. Errors when no audit with that id belongs to the project. `pages[].allGood` is " +
      "true only when all three metrics were measured AND all three are \"good\". Free — charges no " +
      "credits.",
    scopes: ["api"],
    annotations: {
      title: "Get Core Web Vitals report",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "auditId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        auditId: {
          type: "string",
          minLength: 1,
          description: "Audit ID, from crawl_site or get_crawl_results.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, `/crawl/${seg(args.auditId)}/core-web-vitals`, pick(args, ["projectId"])),
  }),
  defineTool({
    name: "get_audit_https_report",
    category: "site-audit",
    description:
      "HTTPS Report: percentage of pages secure, mixed-content and insecure-link counts, homepage " +
      "HTTPS-path status, and HTTP URLs in an HTTPS site's sitemap — for a project's latest " +
      "completed crawl (or a named earlier one). Derives entirely from already-computed crawl data " +
      "— no new work at read time. SOCKET-LEVEL TLS CHECKS STAY EXPLICITLY UNBUILT: " +
      "expiring/expired certificate, old security protocol, incorrect certificate name, and " +
      "subdomains without SNI/HSTS all need a real TLS handshake this fetch-based crawler does not " +
      "make. `notDerivable` lists these with the reason. `homepageStatus.redirectsToHttps` is null " +
      "(not measured), never assumed healthy, unless a standalone fetch actually observed a failure " +
      "— this report cannot distinguish \"checked and fine\" from \"never checked\" from stored issue " +
      "rows alone. ALWAYS narrow on `state` first: `no_audit` (no completed crawl yet), `analysed`. " +
      "Free — charges no credits, makes no external call.",
    scopes: ["api"],
    annotations: {
      title: "Get HTTPS Report",
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
        auditId: {
          description: "Audit ID, from crawl_site or get_crawl_results. Omitted means the latest completed audit for this project.",
          type: "string",
          minLength: 1,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/crawl/https-report", pick(args, ["projectId", "auditId"])),
  }),
  defineTool({
    name: "get_audit_internal_links",
    category: "site-audit",
    description:
      "Internal Link Report: outbound/inbound internal link counts per page, orphan pages, dead " +
      "ends, and click-depth distribution for a project's latest completed crawl (or a named " +
      "earlier one). No new computation — reads the same audit_pages/audit_issues columns already " +
      "powering the in-app internal-links page. INTERNAL LINKS ONLY. External links are explicitly " +
      "out of scope: an external link graph needs data this codebase does not collect. " +
      "`totals.externalLinkOccurrences` is the one external-facing number here — a raw per-page " +
      "outbound tally, never a graph. ALWAYS narrow on `state` first: `no_audit` (no completed " +
      "crawl yet), `signal_not_captured` (a crawl exists but its link counts predate the " +
      "inbound-link/click-depth migration or were otherwise never computed — an absence of data, " +
      "NOT a site with no internal links), `analysed`. `notDerivable` is returned with every state " +
      "and lists what this report can never compute from what is stored, and why. Free — charges no " +
      "credits, makes no external call.",
    scopes: ["api"],
    annotations: {
      title: "Get Internal Link Report",
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
        auditId: {
          description: "Audit ID, from crawl_site or get_crawl_results. Omitted means the latest completed audit for this project.",
          type: "string",
          minLength: 1,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/crawl/internal-links", pick(args, ["projectId", "auditId"])),
  }),
  defineTool({
    name: "get_audit_structured_data",
    category: "site-audit",
    description:
      "Structured Data Report: pages grouped by schema.org @type, which pages have none, and which " +
      "pages carry an unparseable JSON-LD block — for a project's latest completed crawl (or a " +
      "named earlier one). Derives entirely from structured data already extracted at crawl time — " +
      "no new crawl-time work. PRESENCE AND PARSE VALIDITY, NOT A RICH-RESULTS ELIGIBILITY CHECK. " +
      "Only `typeGroups[].invalidCount` on the BreadcrumbList group is a real, verified per-type " +
      "validity verdict; every other type reports only whether pages declare it and whether ANY " +
      "block on the page failed to parse (page-level — never attributable to one type when a page " +
      "declares several). ALWAYS narrow on `state` first: `no_audit` (no completed crawl yet), " +
      "`analysed` (`typeGroups: []` means every page was measured and none declared any structured " +
      "data — a real finding, not a withheld section). `notDerivable` lists what this report can " +
      "never compute, and why. Free — charges no credits, makes no external call.",
    scopes: ["api"],
    annotations: {
      title: "Get Structured Data Report",
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
        auditId: {
          description: "Audit ID, from crawl_site or get_crawl_results. Omitted means the latest completed audit for this project.",
          type: "string",
          minLength: 1,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/crawl/structured-data-report", pick(args, ["projectId", "auditId"])),
  }),
];
