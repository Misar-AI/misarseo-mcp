/**
 * Keyword research, saved keyword lists, intent, potential, strategy and topic research.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiGet, apiPost, pick } from "../lib/api-client.js";
import { formatError } from "../lib/errors.js";
import type { McpContext } from "../lib/context.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

/**
 * `POST /keywords/research` researches ONLY the first keyword it is given (the
 * rest merely change the cache key), so one request per seed is what keeps
 * this tool's per-seed contract — and its per-seed charge — honest.
 *
 * Also accepts the retired stdio shape (`keywords: string[]` plus top-level
 * `locationCode`/`languageCode`/`clickstream`), so a client pinned to the
 * `seo_keyword_research` alias keeps working.
 */
async function researchKeywordsHandler(
  ctx: McpContext,
  args: Record<string, unknown>,
): Promise<unknown> {
  let seeds: Record<string, unknown>[] = Array.isArray(args.seeds)
    ? (args.seeds as Record<string, unknown>[])
    : [];
  if (seeds.length === 0 && Array.isArray(args.keywords) && args.keywords.length > 0) {
    seeds = [{ seed: args.keywords[0], ...pick(args, ["locationCode", "languageCode"]) }];
  }
  if (seeds.length === 0) throw new Error("seeds must contain 1-5 entries, each { seed }.");

  const clickstream = args.includeClickstreamData ?? args.clickstream;
  const results: unknown[] = [];
  const errors: unknown[] = [];
  for (const entry of seeds) {
    const seed = String(entry.seed ?? "").trim();
    try {
      const result = await apiPost(ctx, "/keywords/research", {
        projectId: args.projectId,
        keywords: [seed],
        ...pick(entry, ["locationCode", "languageCode"]),
        ...pick(args, ["resultLimit"]),
        ...(typeof clickstream === "boolean" ? { clickstream } : {}),
      });
      results.push({ seed, ok: true, result });
    } catch (err) {
      errors.push(err);
      results.push({ seed, ok: false, error: formatError(err) });
    }
  }
  // Every seed failing is almost always one shared cause (a rejected key, a
  // spent quota, an unknown project) — surface that error itself instead of
  // burying it in a list of identical per-seed failures.
  if (errors.length === seeds.length) throw errors[0];
  return { results };
}

export const keywordTools: ToolDefinition[] = [
  defineTool({
    name: "research_keywords",
    category: "keywords",
    description:
      "Research keyword data (search volume, difficulty, CPC, related ideas) for 1-5 seed keywords " +
      "in one call — one research run per seed. Returns `results`, one entry per seed with `ok` — a " +
      "single bad seed won't fail the batch. CHARGES CREDITS ON THE PAID DATA PROVIDER: per seed, " +
      "~30-100 credits each depending on the source, or a flat ~96 for countries served from Google " +
      "Ads data (where difficulty and intent are unavailable). On the default free provider the " +
      "sources are autocomplete plus the operator's own Keyword Planner account and NOTHING IS " +
      "CHARGED — but volume/CPC/competition are null unless the operator configured a Keyword " +
      "Planner, and null there means not measured, never zero demand. Keyword difficulty is derived " +
      "for the SEED keyword only — every other returned row has a null difficulty because it was " +
      "never scored, not because it is easy. Each seed returns `rowCount` (every row found) but " +
      "only `topRows`, the first 20, are included in the response; say 20 when reporting what you " +
      "actually saw, and use list_saved_keywords or the dashboard for the rest.",
    scopes: ["api"],
    annotations: {
      title: "Research keywords (bulk)",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "seeds"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        seeds: {
          minItems: 1,
          maxItems: 5,
          type: "array",
          items: {
            type: "object",
            properties: {
              seed: {
                type: "string",
                minLength: 1,
                description: "Seed keyword to research.",
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
            required: ["seed"],
          },
          description: "1-5 seed keywords. Each seed is researched independently and returns related keywords with volume/difficulty/CPC. Bulk-friendly — prefer this over multiple single-seed calls.",
        },
        resultLimit: {
          description: "Cap on the data provider's own rows per seed. Defaults to 150. It is NOT a cap on `rowCount`: free Google Suggest ideas are appended after the cap is applied, so a seed can legitimately report more rows than this number.",
          anyOf: [
            {
              type: "number",
              const: 150,
            },
            {
              type: "number",
              const: 300,
            },
            {
              type: "number",
              const: 500,
            },
          ],
        },
        includeClickstreamData: {
          description: "Refine search volumes with clickstream data, which disaggregates Google Ads' grouped close-variant volumes (plurals/misspellings). On the paid DataForSEO provider this DOUBLES the credit cost of each seed. Default false (standard Google-Ads-derived volumes). Ignored — no cost, no effect — for countries served from Google Ads data, and on the free data provider, whose autocomplete + Keyword Planner sources have no clickstream refinement at all.",
          type: "boolean",
        },
      },
    },
    handler: researchKeywordsHandler,
  }),
  defineTool({
    name: "save_keywords",
    category: "keywords",
    description:
      "Save keywords to a project's saved-keywords list. FREE — database only, charges no credits. " +
      "Idempotent: re-saving an existing keyword is a no-op. If tags are provided, missing tags may " +
      "be created. Tags are appended to whatever tags a keyword already carries. Ask the user for " +
      "confirmation before applying or replacing tags broadly. Keywords are normalised and " +
      "de-duplicated before they are written, so `savedCount` is the number of DISTINCT keywords " +
      "now saved by this call — it can be lower than the number of entries submitted, and that is " +
      "the figure to report. Saving does not fetch metrics: a keyword saved here has null " +
      "volume/difficulty/CPC until research_keywords has run for it.",
    scopes: ["api"],
    annotations: {
      title: "Save keywords",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
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
          },
          description: "Keywords to save (1-100).",
        },
        tags: {
          description: "Optional tags to attach to every saved keyword. Ask the user for explicit confirmation before using this, especially when saving many keywords or creating new tag names.",
          maxItems: 20,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 64,
          },
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
      apiPost(ctx, "/keywords/saved", pick(args, ["projectId", "keywords", "tags", "locationCode", "languageCode"])),
  }),
  defineTool({
    name: "list_saved_keywords",
    category: "keywords",
    description:
      "Lists keywords saved to a project, with whatever metrics have been cached for them (search " +
      "volume, difficulty, CPC) and their tags. FREE — reads MisarSEO's own database, runs no " +
      "provider lookup and charges no credits. Filter by keyword text with `search`; page through " +
      "with `page` and `limit` (50, 100 or 250 rows per page — any other value is rounded down to " +
      "one of those), ordered by `sort`/`order`. A metric is null when nothing has ever fetched it " +
      "for that keyword — saving a keyword does not measure it. Null is not zero volume and not " +
      "zero difficulty; run research_keywords to fill them. `totalCount` is how many keywords match " +
      "the filter, and `rows` is only the current page of them, so report both.",
    scopes: ["api"],
    annotations: {
      title: "List saved keywords",
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
        search: {
          description: "Optional keyword text filter.",
          type: "string",
          minLength: 1,
          maxLength: 200,
        },
        limit: {
          description: "Maximum rows to return. Defaults to 100.",
          anyOf: [
            {
              type: "number",
              const: 50,
            },
            {
              type: "number",
              const: 100,
            },
            {
              type: "number",
              const: 250,
            },
          ],
        },
        page: {
          type: "integer",
          minimum: 1,
          description: "1-based page number (default 1).",
        },
        sort: {
          type: "string",
          enum: [
            "createdAt",
            "keyword",
            "searchVolume",
            "cpc",
            "competition",
            "keywordDifficulty",
            "fetchedAt",
          ],
          description: "Sort column (default createdAt).",
        },
        order: {
          type: "string",
          enum: ["asc", "desc"],
          description: "Sort direction (default desc).",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/keywords/saved", {
        ...pick(args, ["projectId", "search", "page", "sort", "order"]),
        // The route's page-size parameter is `pageSize`; `limit` is the in-app
        // name (`pageSize` is still read for clients pinned to the old stdio tool).
        pageSize: args.limit ?? args.pageSize,
      }),
  }),
  defineTool({
    name: "classify_keyword_intent",
    category: "keywords",
    description:
      "Classify 1-200 keywords' search intent from their wording: informational, navigational, " +
      "commercial, transactional, or unknown. Uses the SAME wording heuristic keyword research " +
      "already applies as its free-tier fallback, made directly callable for a keyword list with no " +
      "research/volume data yet. FREE and purely local: no upstream call, no billing, no market " +
      "dependency. Navigational detection is limited to destination/account phrasing (\"login\", " +
      "\"official website\", ...) that means the same thing regardless of brand — a brand-name " +
      "navigational query with no such phrasing classifies as `unknown` rather than a guessed " +
      "label.",
    scopes: ["api"],
    annotations: {
      title: "Classify keyword search intent",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
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
          maxItems: 200,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
          },
          description: "1-200 keywords to classify.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/keywords/classify-intent", pick(args, ["projectId", "keywords"])),
  }),
  defineTool({
    name: "get_keyword_potential",
    category: "keywords",
    description:
      "Parent Topic and Traffic Potential for one keyword, built from real SERP overlap across a " +
      "BOUNDED set (up to 5) of related keywords — not a full keyword-to-URL reverse index, which " +
      "this codebase's free stack does not have. Parent Topic is the related keyword whose SERP " +
      "shares the most top-10 organic URLs with the seed's. Traffic Potential is the seed's own " +
      "volume plus the volume of every candidate whose own #1-ranking URL is the exact same page as " +
      "the seed's — a bounded floor, never the true total traffic across every keyword that page " +
      "ranks for. FREE — no paid provider or plan gate. Up to 7 upstream calls per cache miss, each " +
      "independently cached (30 days for the combined result), so look keywords up one at a time. " +
      "`parentTopic`/`trafficPotential` are null, not zero, when the bounded sample carries no " +
      "qualifying evidence. A keyword whose SERP has no organic result throws SEO_DATA_UNAVAILABLE " +
      "rather than returning zeros.",
    scopes: ["api"],
    annotations: {
      title: "Get Parent Topic and Traffic Potential for one keyword",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "keyword"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        keyword: {
          type: "string",
          minLength: 1,
          description: "The keyword to analyze.",
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
      apiGet(ctx, "/keywords/potential", pick(args, ["projectId", "keyword", "locationCode", "languageCode"])),
  }),
  defineTool({
    name: "get_keyword_serp_overview",
    category: "keywords",
    description:
      "Per-keyword SERP overview: a fresh live SERP snapshot for the keyword, PLUS — when this " +
      "exact keyword happens to already be tracked in this project's rank tracking — its historical " +
      "position trend and SERP volatility, read straight from the SAME rank-tracking services " +
      "(`get_rank_keyword_history`/`get_rank_volatility_index`) already use. `tracked.isTracked: " +
      "false` means this keyword is not currently tracked in any of the project's active " +
      "rank-tracking configs — an honest absence, never a fabricated trend. One upstream call (the " +
      "live SERP fetch, cached 12h); the rank-tracking portion is DB-only reads. `sinceDays` only " +
      "affects `tracked.history` and is ignored when the keyword is not tracked.",
    scopes: ["api"],
    annotations: {
      title: "Get per-keyword SERP overview with tracked history/volatility",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "keyword"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        keyword: {
          type: "string",
          minLength: 1,
          description: "The keyword to look up.",
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
        sinceDays: {
          description: "How many days of tracked history to return, 1-730 (default 365). Only meaningful when the keyword is tracked.",
          type: "integer",
          exclusiveMinimum: 0,
          maximum: 730,
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/keywords/serp-overview", pick(args, ["projectId", "keyword", "locationCode", "languageCode", "sinceDays"])),
  }),
  defineTool({
    name: "get_keyword_strategy",
    category: "keywords",
    description:
      "Keyword Strategy Builder: a volume -> cluster -> page -> brief pipeline over 1-500 pasted " +
      "keywords, composed entirely from existing pieces — the same bulk keyword lookup, the same " +
      "shared-phrase clustering engine the saved-keyword Topic Clusters feature and " +
      "get_topic_research both already use, a text-match against the project's own crawled pages, " +
      "and a BOUNDED number of AI-gateway content-brief calls (one per cluster among the top few by " +
      "measured volume, gated by the shared AI-gateway budget). `page.status: \"existing\"` on a " +
      "cluster means the site already has a page ABOUT that topic (title/URL text-match), never a " +
      "verified ranking claim — this codebase has no keyword-to-URL index. A cluster beyond the " +
      "brief limit gets `brief: null, briefSkipped: true` — an honest 'not attempted', not an empty " +
      "brief. Consumes the SAME keyword_lookups_per_day plan quota bulk lookups do (once per " +
      "request) plus up to a handful of AI-gateway operations.",
    scopes: ["api"],
    annotations: {
      title: "Run the Keyword Strategy Builder pipeline",
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
          maxItems: 500,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
          },
          description: "1-500 keywords to analyze (e.g. from a bulk research run or an export).",
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
      apiPost(ctx, "/keywords/strategy", pick(args, ["projectId", "keywords", "locationCode", "languageCode"])),
  }),
  defineTool({
    name: "get_topic_research",
    category: "keywords",
    description:
      "Content ideas for a seed keyword, composed from three sources this codebase already fetches " +
      "for other features: the SERP for the seed (titles of pages already ranking for it), " +
      "PAA-style questions (real autocomplete completions reframed as questions), and autocomplete " +
      "keyword suggestions. Grouped into topic clusters by shared phrasing, using the same " +
      "phrase-clustering engine the saved-keyword Topic Clusters feature uses. FREE — none of the " +
      "three sources is billable in this codebase today. Three real upstream calls per request, so " +
      "it is rate limited. NOT a Keywords-Explorer-style overlap report: this codebase has no " +
      "keyword-to-URL index, so `clusters` group the REAL text of three OBSERVED sources rather " +
      "than a fabricated 'what else these pages rank for'. " +
      "`coverage.serpUnavailable`/`suggestionsUnavailable` mean that source could not be asked at " +
      "all — distinct from that source genuinely returning nothing — and one source being " +
      "unavailable never sinks the other two. Every idea not assigned to a cluster is still " +
      "returned in `ungrouped`, never discarded.",
    scopes: ["api"],
    annotations: {
      title: "Get topic research ideas",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "keyword"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        keyword: {
          type: "string",
          minLength: 1,
          description: "The seed keyword to research.",
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
      apiPost(ctx, "/keywords/topic-research", pick(args, ["projectId", "keyword", "locationCode", "languageCode"])),
  }),
  defineTool({
    name: "get_keyword_list_share_of_voice",
    category: "keywords",
    description:
      "Share of Voice across a saved keyword list: the project's own domain plus up to 3 competitor " +
      "domains, scored over a saved-keyword tag (\"a saved keyword list\" in this codebase IS a " +
      "saved-keyword tag — omit tagId/tagName to mean every saved keyword in the project). Reuses " +
      "the EXACT Share of Voice computation rank tracking's own Share of Voice already uses " +
      "(CTR-weighted visibility, a comparative index — never a click forecast). BILLABLE-ADJACENT: " +
      "one live SERP fetch per keyword in the resolved list, up to a bounded per-run cap (see " +
      "`truncated`) — a saved list carries no stored positions the way a rank-tracking config does. " +
      "The project's own domain is read from the project row, never accepted as a parameter. " +
      "`keywordsFailed` keywords (a SERP fetch that errored) are excluded from the computation, " +
      "never counted as \"ranks nowhere\".",
    scopes: ["api"],
    annotations: {
      title: "Get Share of Voice across a saved keyword list",
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
        tagId: {
          description: "The saved-keyword tag ID to treat as 'the list'. Omit with tagName to mean every saved keyword in the project.",
          type: "string",
          minLength: 1,
        },
        tagName: {
          description: "Alternative to tagId — the tag's name.",
          type: "string",
          minLength: 1,
        },
        competitorDomains: {
          description: "0-3 competitor domains (bare domain or full URL).",
          maxItems: 3,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
          },
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
      apiPost(ctx, "/keywords/list-share-of-voice", pick(args, ["projectId", "tagId", "tagName", "competitorDomains", "locationCode", "languageCode"])),
  }),
];
