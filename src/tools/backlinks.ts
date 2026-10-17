/**
 * Backlink profile, link intersect, and the Google disavow file.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiDelete, apiGet, apiPost, pick } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const backlinkTools: ToolDefinition[] = [
  defineTool({
    name: "get_backlinks_overview",
    category: "backlinks",
    description:
      "Returns a backlinks profile summary (total backlinks, referring domains, referring pages, " +
      "rank) plus the top referring domains by backlink count. CHARGES CREDITS ON THE PAID DATA " +
      "PROVIDER (~200-500 typical): two lookups per call, the summary and one page of referring " +
      "domains. UNAVAILABLE ON THE DEFAULT FREE DATA PROVIDER: a backlink graph needs a proprietary " +
      "web-scale crawl index, so every method of this surface throws SEO_DATA_UNAVAILABLE there and " +
      "nothing is charged. That error means the question was never asked — never report it as a " +
      "site with no backlinks. Self-hosted deployments also need the Backlinks API enabled on their " +
      "DataForSEO account. The two halves count DIFFERENT populations: the summary totals are " +
      "unfiltered, while the referring-domain list has domains above the spam-score threshold " +
      "filtered out. Do not present the listed domains as the top slice of the summary total, and " +
      "do not subtract one from the other.",
    scopes: ["api"],
    annotations: {
      title: "Get backlinks overview",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "target"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        target: {
          type: "string",
          minLength: 1,
          description: "Domain or URL to analyze (e.g. 'example.com' or 'https://example.com/blog').",
        },
        scope: {
          description: "'domain' analyzes the whole domain; 'page' analyzes a specific URL. Defaults to 'domain'.",
          type: "string",
          enum: ["domain", "page"],
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/backlinks", pick(args, ["projectId", "target", "scope"])),
  }),
  defineTool({
    name: "get_link_intersect",
    category: "backlinks",
    description:
      "Finds the domains that link to 2–4 of the project's competitors but NOT to the project " +
      "itself. Every row is a site that has already demonstrated it will link to something in this " +
      "space, which is what makes it the most actionable backlink report there is. CHARGES CREDITS " +
      "— the most expensive call in the backlinks surface: one referring-domains lookup per " +
      "request, 5 of them paging the project's OWN referring domains plus 1 per competitor, so one " +
      "run costs up to 9 upstream requests of 1000 domains each. Every request is cached per " +
      "organization+target+page, so re-running the same intersect with a different threshold, proof " +
      "filter or sort is FREE — do that rather than issuing a new run, and confirm with the user " +
      "before sweeping several competitor sets. UNAVAILABLE ON THE FREE DATA PROVIDER: a backlink " +
      "graph needs a proprietary web-scale crawl index, so a deployment on the free provider " +
      "answers with `unavailable: true`, a reason, and no rows. `totalRows`, `provenRows` and " +
      "`unprovenRows` are 0 on that response and are NOT measurements — they travel beside the flag " +
      "precisely so an empty table is never read as an answer. Check `unavailable` before `rows`, " +
      "and never report an unavailable run as 'no opportunities exist'. `absence` has two states " +
      "that must NOT be conflated. `proven` means our own referring-domain read ruled the domain " +
      "out, so \"does not link to us\" is a measurement. `unproven` means our read was cut off at or " +
      "above that domain's authority, so it may already link to us and nothing was established — " +
      "never present an `unproven` row as a confirmed opportunity. `provenRows` is the headline " +
      "count and excludes them by construction. `absenceBound` says which regime applies: " +
      "`complete` (our whole profile was read) or `authority-floor` with the `authorityFloor` " +
      "strictly above which absence is evidence. `coverage[]` is the per-target ledger — " +
      "`domainsRead`, the provider's `domainsTotal`, `requestsSpent`/`requestBudget`, `truncated`, " +
      "`authorityFloor`, and a per-target `unavailable`/`unavailableReason`. A competitor cell's " +
      "`found: false` only means 'does not link to them' when that competitor's coverage is not " +
      "`truncated`. The project's own domain is read from the project record and cannot be passed " +
      "in — if the project has no domain the call fails with a validation error telling the user to " +
      "set one. `minCompetitors` is clamped to the number of competitor domains that actually " +
      "resolved (duplicates and the project's own domain are dropped); compare it with " +
      "`minCompetitorsRequested` before calling a run empty. At most 200 rows are returned; " +
      "`totalRows` is the real match count. There is deliberately no composite opportunity score " +
      "and no subdomain toggle.",
    scopes: ["api"],
    annotations: {
      title: "Get link intersect vs competitors",
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
          minItems: 2,
          maxItems: 4,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
          },
          description: "2–4 competitor domains (bare domain or full URL). Each one is a separate billable referring-domains lookup, so pick the rivals actually being chased. 2 is the floor because with a single competitor this degenerates into a one-sided referring-domain diff, not an intersect. The project's own domain is added automatically and is dropped from this list if it appears here.",
        },
        minCompetitors: {
          description: "Keep only domains linking to at least this many of the compared competitors. Defaults to 2, and is clamped to the number of competitors that actually resolved — compare `minCompetitors` against `minCompetitorsRequested` on the result before calling a run empty.",
          type: "integer",
          minimum: 1,
          maximum: 4,
        },
        includeUnproven: {
          description: "Include rows whose absence from our own profile could not be proven. Defaults to true — leave it true: unproven rows are labelled rather than hidden, and excluding them silently drops real candidates.",
          type: "boolean",
        },
        sortField: {
          description: "Sort column: 'competitors' (default), 'authority' or 'linkingPages'. All three are values the provider measured — there is deliberately no composite opportunity score. Re-sorting a run reuses the cached lookups and costs nothing.",
          type: "string",
          enum: ["competitors", "authority", "linkingPages"],
        },
        sortOrder: {
          description: "Sort direction. Defaults to 'desc'.",
          type: "string",
          enum: ["asc", "desc"],
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/backlinks/intersect", pick(args, ["projectId", "competitorDomains", "minCompetitors", "includeUnproven", "sortField", "sortOrder"])),
  }),
  defineTool({
    name: "list_disavow_entries",
    category: "backlinks",
    description:
      "Disavow file management: every disavow entry for a project, oldest first. FREE (no credits). " +
      "Use export_disavow_file to get the actual Google-format .txt content.",
    scopes: ["api"],
    annotations: {
      title: "List disavow entries",
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
      apiGet(ctx, "/disavow/entries", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "add_disavow_entry",
    category: "backlinks",
    description:
      "Disavow file management: mark one URL or domain for disavowal. FREE (no credits), but this " +
      "is a MUTATION. entryType 'url' disavows exactly that page (value must be a full absolute " +
      "URL); entryType 'domain' disavows the whole domain AND its subdomains (value is a bare host, " +
      "no scheme) — per Google's own documented disavow-file format, there is no way to disavow " +
      "just a subpath.",
    scopes: ["api"],
    annotations: {
      title: "Add a disavow entry",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "entryType", "value"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        entryType: {
          type: "string",
          enum: ["url", "domain"],
          description: "'url' disavows one page; 'domain' disavows the whole domain and its subdomains.",
        },
        value: {
          type: "string",
          minLength: 1,
          description: "A full absolute URL for entryType 'url'; a bare domain (no scheme) for entryType 'domain'.",
        },
        note: {
          description: "Optional reason, written as a comment above the entry in the exported file.",
          type: "string",
          maxLength: 500,
        },
        source: {
          description: "Where this entry came from. Defaults to 'manual'.",
          type: "string",
          enum: ["manual", "bing_own_site"],
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/disavow/entries", pick(args, ["projectId", "entryType", "value", "note", "source"])),
  }),
  defineTool({
    name: "remove_disavow_entry",
    category: "backlinks",
    description:
      "Disavow file management: remove one disavow entry by id (from list_disavow_entries). FREE " +
      "(no credits), but this is a MUTATION. Succeeds whether or not entryId existed.",
    scopes: ["api"],
    annotations: {
      title: "Remove a disavow entry",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "entryId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        entryId: {
          type: "string",
          minLength: 1,
          description: "Entry id, from list_disavow_entries.",
        },
      },
    },
    handler: (ctx, args) =>
      apiDelete(ctx, "/disavow/entries", pick(args, ["projectId", "entryId"])),
  }),
  defineTool({
    name: "export_disavow_file",
    category: "backlinks",
    description:
      "Disavow file management: export a project's disavow entries as the exact .txt content " +
      "Google's disavow tool accepts (support.google.com/webmasters/answer/2648487) — one bare URL " +
      "per line to disavow that exact page, or `domain:<host>` to disavow an entire domain and its " +
      "subdomains. FREE (no credits). Save `fileContent` to a .txt file as-is (UTF-8).",
    scopes: ["api"],
    annotations: {
      title: "Export the disavow file",
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
      apiGet(ctx, "/disavow/export", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "get_backlink_anchors",
    category: "backlinks",
    description:
      "Anchor-text distribution for a domain or URL, one page at a time: which anchor texts link " +
      "to it, with backlinks, referring domains, referring pages and dofollow links per anchor. " +
      "This is what reveals an over-optimised profile (one exact-match commercial phrase " +
      "dominating) or a hacked one (pharma/casino anchors nobody wrote) — both invisible link by " +
      "link. CHARGES CREDITS ON THE PAID DATA PROVIDER (~200-500 typical). UNAVAILABLE ON THE " +
      "DEFAULT FREE DATA PROVIDER, like the rest of the backlinks surface: SEO_DATA_UNAVAILABLE " +
      "there means the question was never asked, never an empty distribution. There is " +
      "deliberately no spam-score column — an averaged spam score is not a spam score.",
    scopes: ["api"],
    annotations: {
      title: "Get backlink anchor texts",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "target"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        target: {
          type: "string",
          minLength: 1,
          maxLength: 2048,
          description: "Domain or URL whose inbound anchor texts to list.",
        },
        scope: {
          type: "string",
          enum: ["domain", "page"],
          description: "Whether target is a whole domain or one page. Defaults to domain.",
        },
        page: {
          type: "integer",
          minimum: 1,
          description: "1-based page number. Defaults to 1.",
        },
        pageSize: {
          type: "integer",
          enum: [50, 100, 200],
          description: "Rows per page. Defaults to 100.",
        },
        sortField: {
          type: "string",
          enum: ["anchor", "backlinks", "referringDomains", "referringPages", "dofollow", "firstSeen"],
          description: "Sort column. Defaults to backlinks.",
        },
        sortOrder: {
          type: "string",
          enum: ["asc", "desc"],
          description: "Sort direction. Defaults to desc.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/backlinks/anchors", pick(args, ["projectId", "target", "scope", "page", "pageSize", "sortField", "sortOrder"])),
  }),
];
