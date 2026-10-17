/**
 * Rank tracker reads, trends, notes, tags, target URLs and the Brave Search rank check.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiDelete, apiGet, apiPost, pick } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const rankTrackingTools: ToolDefinition[] = [
  defineTool({
    name: "get_rank_tracker",
    category: "rank-tracking",
    description:
      "Read-only access to rank tracker configs and their latest results. With `trackerId`, returns " +
      "the config plus the latest snapshot per keyword. Without it, lists all trackers in the " +
      "project. FREE — reads stored MisarSEO state only, runs no SERP query and charges no credits. " +
      "To trigger a new check, use the dashboard. A null position means THE DOMAIN WAS NOT FOUND " +
      "WITHIN THE DEPTH SEARCHED. The response states that depth as a number — use THAT number, not " +
      "the config's `serpDepth`, which is what was asked for and can be several times deeper than " +
      "the search source reaches. Everything past the depth searched was not measured, so a null is " +
      "neither a rank of zero nor proof the page stopped ranking — say 'not found in the top N' and " +
      "give the N the response states. Device columns are printed only where this deployment " +
      "measures desktop and mobile as separate searches; where it does not, the response says so " +
      "and prints ONE position per keyword. Never report a mobile or desktop absence from a column " +
      "the response did not print, and never infer one from the config's `devices` value. " +
      "`previousPosition` is a roughly 7-day-old comparison point, and when no snapshot that old " +
      "exists it falls back to the EARLIEST snapshot on record — so a 'was' figure can be much " +
      "older than a week. Do not quote it as a week-over-week change without checking the tracker's " +
      "history length.",
    scopes: ["api"],
    annotations: {
      title: "Get rank tracker",
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
        trackerId: {
          description: "Rank tracker config ID. If omitted, lists all rank trackers in the project.",
          type: "string",
        },
      },
    },
    handler: (ctx, args) =>
      args.trackerId
        ? apiGet(ctx, "/rank-tracking/runs", { projectId: args.projectId, configId: args.trackerId })
        : apiGet(ctx, "/rank-tracking/configs", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "add_rank_tracking_keywords",
    category: "rank-tracking",
    description:
      "Adds keywords to an existing rank tracker config. Returns `{ added, addedIds }` — `added` " +
      "counts only genuinely new keywords; anything already tracked for this config is silently " +
      "skipped, so `added` can legitimately be lower than the number of keywords sent. FREE: " +
      "database only, no SEO data provider is called and no credits are spent — but this CAN fail " +
      "with a plan-limit error if adding these keywords would put the organization over its plan " +
      "tier's rank-tracked-keywords cap, since that is a count limit, not a spend limit. This does " +
      "not trigger a rank check or refresh keyword metrics — call get_rank_tracker afterward once " +
      "you want positions.",
    scopes: ["api"],
    annotations: {
      title: "Add rank-tracking keywords",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId", "keywords"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID.",
        },
        keywords: {
          minItems: 1,
          maxItems: 100,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 500,
          },
          description: "1-100 keywords to add. Duplicates of already-tracked keywords are silently skipped.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/rank-tracking/keywords", pick(args, ["projectId", "configId", "keywords"])),
  }),
  defineTool({
    name: "get_rank_config_trend",
    category: "rank-tracking",
    description:
      "Per-run keyword-position-distribution buckets for a tracker, oldest first — how many tracked " +
      "keywords sit in the top 3, 4-10, 11-20, or outside the top 20, per check run. Use it to " +
      "answer 'is this domain's visibility trending up or down' without re-checking anything. FREE: " +
      "database only. No SEO data provider is called and no credits are spent. Buckets are disjoint " +
      "and cover every tracked keyword: `notRanking` is derived as the remainder, not fetched " +
      "separately, and `top3 + top4to10 + top11to20 + notRanking` always equals the tracker's " +
      "keyword count at that run. `device` is accepted but on every free SERP source today it " +
      "narrows nothing — see get_rank_tracker's own note on this deployment's device support.",
    scopes: ["api"],
    annotations: {
      title: "Get rank tracker position-distribution trend",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID. Call get_rank_tracker without a trackerId to list the project's trackers and their IDs.",
        },
        device: {
          description: "Which device's positions to bucket. On every free SERP source today this narrows nothing — there is no device dimension, so every reading folds to one series regardless of what is passed. Defaults to desktop.",
          type: "string",
          enum: ["desktop", "mobile"],
        },
        sinceDays: {
          description: "How many days back to look, 1–730. Defaults to 365.",
          type: "integer",
          exclusiveMinimum: 0,
          maximum: 730,
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/rank-tracking/trend", pick(args, ["projectId", "configId", "device", "sinceDays"])),
  }),
  defineTool({
    name: "get_rank_movers",
    category: "rank-tracking",
    description:
      "Newcomers and fast climbers for a tracker's OWN domain, over a window. `newlyRanking` is " +
      "keywords that started ranking during the window (no earlier position, or an earlier position " +
      "of null). `fastClimbers` is keywords that ranked at both ends of the window and gained at " +
      "least `minGain` positions. FREE: database only. No SEO data provider is called and no " +
      "credits are spent. THIS IS NOT COMPETITOR DISCOVERY. No corpus of undeclared domains exists " +
      "in this codebase to discover a newcomer domain from — a rank check only ever persists " +
      "positions for the target domain and the already-tracked competitor list; every other domain " +
      "in a fetched SERP is read and discarded. Do not describe a `newlyRanking` entry as a 'new " +
      "competitor' or 'newly discovered domain' — it is a keyword the TRACKED domain itself started " +
      "ranking for, nothing about a competitor. `newlyRanking` entries always have `gain: null` — " +
      "there is no earlier position to measure a gain from, and `minGain` never filters them.",
    scopes: ["api"],
    annotations: {
      title: "Get rank tracker newcomers and fast climbers",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID. Call get_rank_tracker without a trackerId to list the project's trackers and their IDs.",
        },
        sinceDays: {
          description: "How many days back to look, 1–730. Defaults to 365.",
          type: "integer",
          exclusiveMinimum: 0,
          maximum: 730,
        },
        minGain: {
          description: "Positions a keyword must have gained to count as a fast climber, 1–100. Defaults to 5. Does not affect newlyRanking, which has no earlier position to measure a gain from.",
          type: "integer",
          exclusiveMinimum: 0,
          maximum: 100,
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/rank-tracking/movers", pick(args, ["projectId", "configId", "sinceDays", "minGain"])),
  }),
  defineTool({
    name: "get_rank_keyword_history",
    category: "rank-tracking",
    description:
      "Per-keyword position series over time, oldest first — the same series the app's SERP-history " +
      "chart draws for one tracked keyword. FREE: database only. No SEO data provider is called and " +
      "no credits are spent. A `position` of `null` means checked but not found within that check's " +
      "`searchedDepth` — a real event, not a missing check or a lost ranking. `searchedDepth: null` " +
      "means the run predates that column, not that any particular depth was searched. At most one " +
      "point per UTC day: a same-day re-check collapses to its latest reading.",
    scopes: ["api"],
    annotations: {
      title: "Get one keyword's rank history",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId", "trackingKeywordId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID. Call get_rank_tracker without a trackerId to list the project's trackers and their IDs.",
        },
        trackingKeywordId: {
          type: "string",
          minLength: 1,
          description: "The tracked keyword's own row ID (from get_rank_tracker's results), not the keyword text.",
        },
        sinceDays: {
          description: "How many days back to look, 1–730. Defaults to 365.",
          type: "integer",
          exclusiveMinimum: 0,
          maximum: 730,
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/rank-tracking/keyword-history", pick(args, ["projectId", "configId", "trackingKeywordId", "sinceDays"])),
  }),
  defineTool({
    name: "get_rank_volatility_index",
    category: "rank-tracking",
    description:
      "SERP volatility index across recent runs — how much this tracker's own positions churned run " +
      "over run, derived entirely from already-stored history (no new SERP calls). FREE: database " +
      "only, no SEO data provider is called and no credits are spent. Modeled on the one step " +
      "AccuRanker publicly discloses for their Grump Rating (sum of per-keyword differences / " +
      "number of results), but CTR-weighted rather than a raw position delta — a #1-#2 swap counts " +
      "far more than a #18-#19 swap. NOT a 0-10 Sensor score or a mood label (Semrush and MozCast " +
      "do not publish their formulas, and both are calibrated against panels of hundreds of " +
      "thousands to millions of keywords spanning the whole web). `volatilityIndex` is meaningful " +
      "only relative to THIS tracker's own history over time, not as an absolute severity — do not " +
      "describe a given value as 'high' or 'low' without comparing it to this same tracker's other " +
      "points.",
    scopes: ["api"],
    annotations: {
      title: "Get SERP volatility index",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID. Call get_rank_tracker without a trackerId to list the project's trackers and their IDs.",
        },
        device: {
          description: "On every free SERP source today this narrows nothing — there is no device dimension, so every reading folds to one series regardless of what is passed. Defaults to desktop.",
          type: "string",
          enum: ["desktop", "mobile"],
        },
        runLimit: {
          description: "How many recent completed runs to compare consecutively, 2-26. Defaults to 12.",
          type: "integer",
          minimum: 2,
          maximum: 26,
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/rank-tracking/volatility", pick(args, ["projectId", "configId", "device", "runLimit"])),
  }),
  defineTool({
    name: "get_rank_ai_overview_trend",
    category: "rank-tracking",
    description:
      "AI Overview presence trend across a tracker's keywords, oldest first — what share of tracked " +
      "keywords showed Google's AI Overview in the SERP, per check run, and how that has moved over " +
      "time. FREE: database only, no SEO data provider is called and no credits are spent. Reuses " +
      "`rank_snapshots.serpFeatures`, already populated by the SERP-feature capture the rank " +
      "checker already does — no new SERP calls. `aiOverviewPresenceRatePct` is " +
      "`keywordsWithAiOverview / keywordsTotal * 100`, rounded to one decimal, and `null` (not 0) " +
      "for a run where `keywordsTotal` is 0 — nothing was checked that run, which is a missing " +
      "measurement, not a truthful \"0% presence\".",
    scopes: ["api"],
    annotations: {
      title: "Get AI Overview presence trend",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID. Call get_rank_tracker without a trackerId to list the project's trackers and their IDs.",
        },
        device: {
          description: "On every free SERP source today this narrows nothing — there is no device dimension, so every reading folds to one series regardless of what is passed. Defaults to desktop.",
          type: "string",
          enum: ["desktop", "mobile"],
        },
        sinceDays: {
          description: "How many days back to look, 1–730. Defaults to 365.",
          type: "integer",
          exclusiveMinimum: 0,
          maximum: 730,
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/rank-tracking/ai-overview-trend", pick(args, ["projectId", "configId", "device", "sinceDays"])),
  }),
  defineTool({
    name: "list_rank_annotations",
    category: "rank-tracking",
    description:
      "Chart notes on a rank tracker's own timeline — 'deployed new title tags', 'algorithm update' " +
      "— oldest first. FREE: database only, no SEO data provider is called and no credits are " +
      "spent. Config-level, not per-keyword or per-device: a deploy or algorithm change is a fact " +
      "about the date, not about any one reading.",
    scopes: ["api"],
    annotations: {
      title: "List rank tracker chart notes",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID. Call get_rank_tracker without a trackerId to list the project's trackers and their IDs.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/rank-tracking/annotations", pick(args, ["projectId", "configId"])),
  }),
  defineTool({
    name: "add_rank_annotation",
    category: "rank-tracking",
    description:
      "Adds a chart note to a rank tracker's own timeline. FREE: database only, no SEO data " +
      "provider is called and no credits are spent. Config-level, not per-keyword or per-device. A " +
      "config can hold at most 100 notes.",
    scopes: ["api"],
    annotations: {
      title: "Add a rank tracker chart note",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId", "date", "label"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID. Call get_rank_tracker without a trackerId to list the project's trackers and their IDs.",
        },
        date: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "UTC day the note applies to, YYYY-MM-DD.",
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "What happened, 1-200 characters.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/rank-tracking/annotations", pick(args, ["projectId", "configId", "date", "label"])),
  }),
  defineTool({
    name: "remove_rank_annotation",
    category: "rank-tracking",
    description:
      "Removes a chart note from a rank tracker's own timeline. FREE: database only, no SEO data " +
      "provider is called and no credits are spent. Succeeds whether or not `id` matched an " +
      "existing note.",
    scopes: ["api"],
    annotations: {
      title: "Remove a rank tracker chart note",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId", "id"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID. Call get_rank_tracker without a trackerId to list the project's trackers and their IDs.",
        },
        id: {
          type: "string",
          minLength: 1,
          description: "Note ID, from list_rank_annotations.",
        },
      },
    },
    handler: (ctx, args) =>
      apiDelete(ctx, "/rank-tracking/annotations", pick(args, ["projectId", "configId", "id"])),
  }),
  defineTool({
    name: "list_rank_cannibalisation",
    category: "rank-tracking",
    description:
      "Tracked keywords whose latest ranking URL is not the target URL you declared for them (see " +
      "set_rank_keyword_target_url). FREE: database only, no SEO data provider is called and no " +
      "credits are spent. NOT the same detector as get_cannibalisation_report (Search " +
      "Console-based), which finds two-or-more of the site's OWN pages splitting Search Console " +
      "impressions for one query. A rank check records only the single best-ranking URL per keyword " +
      "per run, so this can only tell you the winning page was not the one you intended — not that " +
      "a second own page also appeared in the SERP.",
    scopes: ["api"],
    annotations: {
      title: "List rank tracker self-cannibalisation findings",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID. Call get_rank_tracker without a trackerId to list the project's trackers and their IDs.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/rank-tracking/cannibalisation", pick(args, ["projectId", "configId"])),
  }),
  defineTool({
    name: "set_rank_keyword_target_url",
    category: "rank-tracking",
    description:
      "Sets or clears the URL you intend to rank for a tracked keyword. Feeds " +
      "list_rank_cannibalisation — set this for the keywords you care about, then check for a " +
      "mismatch after the next run. FREE: database only, no SEO data provider is called and no " +
      "credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "Set a rank tracker keyword's target URL",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId", "trackingKeywordId", "targetUrl"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID. Call get_rank_tracker without a trackerId to list the project's trackers and their IDs.",
        },
        trackingKeywordId: {
          type: "string",
          minLength: 1,
          description: "The tracked keyword's own row ID (from the rank tracker's keyword rows), not the keyword text.",
        },
        targetUrl: {
          anyOf: [
            {
              type: "string",
              minLength: 1,
              maxLength: 2048,
            },
            {
              type: "null",
            },
          ],
          description: "Absolute http(s) URL you intend to rank for this keyword, or null to clear a previously-set one.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/rank-tracking/keyword-target-url", pick(args, ["projectId", "configId", "trackingKeywordId", "targetUrl"])),
  }),
  defineTool({
    name: "list_rank_keyword_tags",
    category: "rank-tracking",
    description:
      "Lists the tags in use on one rank tracker, plus the project's whole tag vocabulary. Use it " +
      "to find tag IDs before calling update_rank_keyword_tag, and to see how a tracker with " +
      "hundreds of keywords is already organised. FREE: database only. No SEO data provider is " +
      "called and no credits are spent, so it is safe to call as often as needed. The two lists " +
      "mean different things and are deliberately separate. `tagsInUse` is what THIS tracker's " +
      "keywords actually carry, and its `keywordCount` counts TRACKED keywords carrying the tag — " +
      "not the saved-keyword count the same tag carries elsewhere, which would never match the rows " +
      "it filters. It is empty for a tracker that has never used a tag. `projectTags` is the " +
      "project's full vocabulary including tags unused here, so a tag can be reused rather than " +
      "re-coined. The vocabulary is the project's EXISTING saved-keyword tags: one namespace shared " +
      "with the saved-keyword list, not a second set.",
    scopes: ["api"],
    annotations: {
      title: "List rank-tracker keyword tags",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID. Call get_rank_tracker without a trackerId to list the project's trackers and their IDs.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/rank-tracking/keyword-tags", pick(args, ["projectId", "configId"])),
  }),
  defineTool({
    name: "update_rank_keyword_tag",
    category: "rank-tracking",
    description:
      "Attaches or detaches ONE tag across a selection of tracked keywords (up to 500 keyword IDs " +
      "per call). One tag per call — applying three tags takes three calls. FREE: database only. No " +
      "SEO data provider is called and no credits are spent. The tag is the project's EXISTING " +
      "saved-keyword vocabulary, shared with the saved-keyword list. Pass `tagId` for a tag that " +
      "already exists (find it with list_rank_keyword_tags), or `tagName` to match on the " +
      "normalised name. On `action: \"add\"` an unknown `tagName` CREATES that tag for the whole " +
      "project, so check the vocabulary first rather than coining near-duplicates; on `action: " +
      "\"remove\"` an unknown tag is NOT_FOUND, because there is nothing to detach. DO NOT REPORT " +
      "`changed` AS A COUNT OF NEW LINKS ON AN ADD. `action: \"add\"` returns `changed: null` because " +
      "the insert is idempotent and how many links were actually new is not knowable without a " +
      "second read — `null` means \"not measured\". It is not zero, and it is NOT the number of " +
      "keyword IDs submitted. `action: \"remove\"` returns a real `changed` count. When asked how " +
      "many keywords were touched, report `keywordCount`: the tracked keywords the action was " +
      "applied to, after de-duplication. Both actions return `keywordCount: 0` with `changed: 0` " +
      "when none of the submitted IDs belong to this tracker — a no-op, not a tagging worth " +
      "reporting as done.",
    scopes: ["api"],
    annotations: {
      title: "Tag or untag rank-tracker keywords",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId", "action", "trackingKeywordIds"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID. Call get_rank_tracker without a trackerId to list the project's trackers and their IDs.",
        },
        action: {
          type: "string",
          enum: ["add", "remove"],
          description: "'add' attaches the tag, creating it from `tagName` when it does not exist yet; 'remove' detaches it.",
        },
        tagId: {
          description: "Existing tag ID from list_rank_keyword_tags. Pass this OR `tagName`, never both.",
          type: "string",
          minLength: 1,
        },
        tagName: {
          description: "Tag name, matched on its normalised form — 'Branded', 'branded' and ' branded ' are one tag. Created on 'add' when it does not exist; NOT_FOUND on 'remove'. Pass this OR `tagId`, never both.",
          type: "string",
          minLength: 1,
          maxLength: 64,
        },
        trackingKeywordIds: {
          minItems: 1,
          maxItems: 500,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
          },
          description: "Tracking-keyword IDs to tag or untag (1–500 per call). These are the rank tracker's own keyword-row IDs — not saved-keyword IDs, and not keyword text. Duplicates are collapsed, and IDs belonging to another tracker are ignored rather than errored.",
        },
      },
    },
    handler: async (ctx, args) => {
      const tagId = typeof args.tagId === "string" && args.tagId ? args.tagId : null;
      const tagName = typeof args.tagName === "string" && args.tagName ? args.tagName : null;
      if (Boolean(tagId) === Boolean(tagName)) {
        throw new Error("Pass exactly one of tagId or tagName.");
      }
      return apiPost(ctx, "/rank-tracking/keyword-tags", {
        ...pick(args, ["projectId", "configId", "action", "trackingKeywordIds"]),
        tag: tagId ? { tagId } : { tagName },
      });
    },
  }),
  defineTool({
    name: "get_brave_search_rank_check",
    category: "rank-tracking",
    description:
      "Checks where a project's domain (or an explicit targetDomain) ranks in REAL Brave Search " +
      "results for one keyword. Brave has run its own independent crawler and index since 2023 — a " +
      "genuinely separate, separately-licensed data source, distinct from this server's free " +
      "SearXNG/openserp-backed rank checks. Every successful response carries engine: " +
      "'brave_search' so it can never be mistaken for a free-tier number. PAID: bring-your-own-key " +
      "— requires the deployment operator to set BRAVE_SEARCH_API_KEY (a single paid credential, " +
      "like OPENPAGERANK_API_KEY — no OAuth flow). Every call spends that key's Brave Search API " +
      "budget. Answers { ok: false, reason: 'not_configured' } when unset, or 'no_domain' when " +
      "neither targetDomain nor the project's own domain is set. Makes exactly one Brave Search API " +
      "call per check — depth (max 20) is Brave's own per-request ceiling, never paginated to " +
      "search deeper. Brave publishes no submission/indexing API at all, only manual " +
      "re-fetch/delist web forms — this tool is query-only.",
    scopes: ["api"],
    annotations: {
      title: "Check Brave Search rank",
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
          description: "Keyword to check.",
        },
        targetDomain: {
          description: "Domain or URL to check. Defaults to the project's own domain when omitted.",
          type: "string",
          minLength: 1,
        },
        country: {
          description: "2-letter country code Brave uses to target results, e.g. 'US'.",
          type: "string",
          minLength: 2,
          maxLength: 2,
        },
        searchLang: {
          description: "ISO 639-1 language code Brave uses to filter results, e.g. 'en'.",
          type: "string",
          minLength: 2,
          maxLength: 8,
        },
        depth: {
          description: "Results to fetch, 1-20 (Brave's own per-request ceiling). Default 20.",
          type: "integer",
          minimum: 1,
          maximum: 20,
        },
        competitorDomains: {
          description: "Competitor domains to also resolve positions for, free within the same fetched result set.",
          maxItems: 20,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
          },
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/brave-search/rank-check", pick(args, ["projectId", "keyword", "targetDomain", "country", "searchLang", "depth", "competitorDomains"])),
  }),
  defineTool({
    name: "create_rank_tracker",
    category: "rank-tracking",
    description:
      "Creates a rank tracker config (domain + market + devices + schedule) for a project and " +
      "returns its configId. Next, add keywords with add_rank_tracking_keywords. Positions are " +
      "collected by the SCHEDULED check ('daily' or 'weekly'; 'manual' means never on a schedule) " +
      "and read with get_rank_tracker — nothing here triggers a check on demand. One tracker per " +
      "(domain, market) per project: repeating a pair is a validation error, not a second tracker. " +
      "FREE at creation: database only, no credits spent.",
    scopes: ["api"],
    annotations: {
      title: "Create a rank tracker",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "domain", "serpDepth"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        domain: {
          type: "string",
          minLength: 1,
          description: "Domain whose positions are tracked, e.g. example.com.",
        },
        serpDepth: {
          type: "integer",
          minimum: 10,
          maximum: 100,
          multipleOf: 10,
          description: "How deep to search, 10-100 in steps of 10.",
        },
        locationCode: {
          type: "integer",
          exclusiveMinimum: 0,
          description: "DataForSEO location code. Omit it to use the project's default market.",
        },
        languageCode: {
          type: "string",
          maxLength: 10,
          description: "Language code (e.g. 'en'). Omit it to use the project's default market language.",
        },
        locationHint: {
          type: ["string", "null"],
          maxLength: 200,
          description: "Free-text city/region hint, honoured only where the SERP provider supports it.",
        },
        devices: {
          type: "string",
          enum: ["both", "desktop", "mobile"],
          description: "Devices to track.",
        },
        scheduleInterval: {
          type: "string",
          enum: ["daily", "weekly", "manual"],
          description: "How often the scheduled check runs.",
        },
        rankDropAlertThreshold: {
          type: ["integer", "null"],
          minimum: 3,
          maximum: 100,
          description: "Notify when a keyword falls by at least this many positions. null turns it off.",
        },
        newKeywordAlertEnabled: {
          type: "boolean",
          description: "Notify when the domain starts ranking for a keyword it did not rank for before.",
        },
        competitorMoveAlertThreshold: {
          type: ["integer", "null"],
          minimum: 3,
          maximum: 100,
          description: "Notify when a tracked competitor gains at least this many positions. null turns it off.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/rank-tracking/configs", pick(args, ["projectId", "domain", "serpDepth", "locationCode", "languageCode", "locationHint", "devices", "scheduleInterval", "rankDropAlertThreshold", "newKeywordAlertEnabled", "competitorMoveAlertThreshold"])),
  }),
  defineTool({
    name: "list_rank_tracking_keywords",
    category: "rank-tracking",
    description:
      "Lists the keywords tracked by ONE rank tracker: `{ keywords, totalCount, page, pageSize }`, " +
      "each row `{ id, configId, keyword, searchVolume, keywordDifficulty, cpc, metricsFetchedAt, " +
      "createdAt }`. It returns NO positions and runs no check — read positions with " +
      "get_rank_tracker. The row `id` is the tracking-keyword ID that " +
      "remove_rank_tracking_keywords, update_rank_keyword_tag and set_rank_keyword_target_url take. " +
      "FREE: database only.",
    scopes: ["api"],
    annotations: {
      title: "List rank-tracked keywords",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID.",
        },
        page: {
          type: "integer",
          minimum: 1,
          description: "1-based page number. Defaults to 1.",
        },
        pageSize: {
          type: "integer",
          enum: [50, 100, 250],
          description: "Rows per page. Defaults to 50.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/rank-tracking/keywords", pick(args, ["projectId", "configId", "page", "pageSize"])),
  }),
  defineTool({
    name: "remove_rank_tracking_keywords",
    category: "rank-tracking",
    description:
      "Removes keywords from a rank tracker by their tracking-keyword IDs (from " +
      "list_rank_tracking_keywords). The keywords stop being checked; their past position " +
      "snapshots are deliberately kept, so history survives. FREE: database only.",
    scopes: ["api"],
    annotations: {
      title: "Remove rank-tracked keywords",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "configId", "keywordIds"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        configId: {
          type: "string",
          minLength: 1,
          description: "Rank tracker config ID.",
        },
        keywordIds: {
          type: "array",
          minItems: 1,
          maxItems: 1000,
          items: { type: "string", minLength: 1 },
          description: "Tracking-keyword IDs to remove.",
        },
      },
    },
    handler: (ctx, args) =>
      apiDelete(ctx, "/rank-tracking/keywords", pick(args, ["projectId", "configId", "keywordIds"])),
  }),
];
