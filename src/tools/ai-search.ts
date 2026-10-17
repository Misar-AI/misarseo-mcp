/**
 * AI-search visibility: Brand Radar scans, trends and monitors, prompt explorer,
 * competitor positioning, direct vendor answers, prompt research and tracking.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiDelete, apiGet, apiPost, pick, seg } from "../lib/api-client.js";
import type { McpContext } from "../lib/context.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

/** Countries the grounded retrieval pass can search from (MisarSEO `WEB_SEARCH_COUNTRY_CODES`). */
const WEB_SEARCH_COUNTRY_CODES = [
  "US",
  "GB",
  "CA",
  "AU",
  "IE",
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "PT",
  "PL",
  "SE",
  "NO",
  "DK",
  "BR",
  "MX",
  "IN",
  "JP",
  "KR",
  "SG",
  "HK",
  "TW",
  "ZA",
];

const BRAND_RADAR_POLL_INTERVAL_MS = 3_000;
const BRAND_RADAR_WAIT_MS = 45_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface BrandRadarStatus {
  status?: string;
  result?: unknown;
  error?: { message?: string };
}

/**
 * `POST /ai/brand-lookup` only ENQUEUES the scan (202 + jobId); the result is
 * collected from `GET /ai/brand-lookup/:jobId/status`. Waiting a bounded time
 * here keeps the common case a single call, and handing back the jobId on a
 * slow scan — instead of failing — means the caller never has to resubmit
 * (and pay for) a scan that is still running.
 */
async function runBrandRadarScanHandler(
  ctx: McpContext,
  args: Record<string, unknown>,
): Promise<unknown> {
  const queued = await apiPost<{ jobId?: string; status?: string }>(ctx, "/ai/brand-lookup", {
    ...pick(args, ["projectId", "competitors", "locationCode", "languageCode"]),
    query: args.brand,
  });
  const jobId = queued?.jobId;
  if (!jobId) return queued;

  const deadline = Date.now() + BRAND_RADAR_WAIT_MS;
  for (;;) {
    const state = await apiGet<BrandRadarStatus>(ctx, `/ai/brand-lookup/${seg(jobId)}/status`, {
      projectId: args.projectId,
    });
    if (state.status === "complete") return { jobId, status: "complete", result: state.result };
    if (state.status === "errored") {
      throw new Error(
        `Brand Radar scan ${jobId} failed: ${state.error?.message ?? "unknown error"}`,
      );
    }
    if (Date.now() >= deadline) {
      return {
        jobId,
        status: state.status ?? "queued",
        note:
          "The scan is still running and nothing was lost. Collect it with get_brand_radar_scan_status " +
          "(same projectId and this jobId). Do NOT call run_brand_radar_scan again — that submits and " +
          "pays for a second scan.",
      };
    }
    await sleep(BRAND_RADAR_POLL_INTERVAL_MS);
  }
}

export const aiSearchTools: ToolDefinition[] = [
  defineTool({
    name: "run_brand_radar_scan",
    category: "ai-search",
    description:
      "Scans real AI-answer engines and search citations for brand mentions, Share of Voice against " +
      "named competitors, and cited sources. REQUIRES A PAID PLAN — a free-tier organization gets a " +
      "plan-locked error, not an empty result — and CONSUMES ONE of the organization's monthly " +
      "Brand Radar scan allowance PLUS one shared AI-gateway operation, both charged BEFORE the " +
      "scan runs. The allowance is spent when the scan is ACCEPTED, before any answer exists — " +
      "every call submits a new scan, so ask before re-running one. The scan runs on a background " +
      "queue: this tool waits up to ~45 seconds for it and returns the result when it completes; if " +
      "it is still running it returns the `jobId` instead — collect the result with " +
      "get_brand_radar_scan_status (free to poll) rather than calling this tool again, which would " +
      "spend another scan. Mentions and AI search volumes are nullable: a null is 'not reported by " +
      "the platform', never 0.",
    scopes: ["api"],
    annotations: {
      title: "Run AI Brand Radar scan",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "brand"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        brand: {
          type: "string",
          minLength: 1,
          maxLength: 250,
          description: "Brand, domain, or product name to scan.",
        },
        competitors: {
          description: "Up to 5 competitor brands/domains to compare Share of Voice against.",
          maxItems: 5,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 250,
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
    handler: runBrandRadarScanHandler,
  }),
  defineTool({
    name: "get_brand_radar_scan_status",
    category: "ai-search",
    description:
      "Status of a Brand Radar scan started by run_brand_radar_scan, by its `jobId`. `status` is " +
      "queued/running/complete/errored; a complete scan carries the shaped `result` (share of " +
      "voice, top cited pages, top prompts), an errored one carries `error.message`. FREE to poll: " +
      "a completed scan re-reads the cached result and charges nothing. The one exception is a scan " +
      "whose cached result has already expired (older than ~24h) — answering that re-runs the " +
      "lookup and is charged and rate limited like a new scan, so collect results promptly. Use " +
      "this instead of re-running run_brand_radar_scan, which always spends another monthly scan.",
    scopes: ["api"],
    annotations: {
      title: "Get AI Brand Radar scan status",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID the scan was run for.",
        },
        jobId: {
          type: "string",
          minLength: 1,
          description: "The `jobId` returned by run_brand_radar_scan.",
        },
      },
      required: ["projectId", "jobId"],
    },
    handler: (ctx, args) =>
      apiGet(ctx, `/ai/brand-lookup/${seg(args.jobId)}/status`, pick(args, ["projectId"])),
  }),
  defineTool({
    name: "explore_ai_prompt",
    category: "ai-search",
    description:
      "Runs one prompt through up to 4 model personas and returns each answer verbatim, with real " +
      "citations when webSearch is on. The four persona labels (chat_gpt/claude/gemini/perplexity) " +
      "are NOT vendor-verified — none is guaranteed to be that vendor's own model; 'claude' and " +
      "'perplexity' in particular have no real vendor route at all. Treat every answer as 'a model " +
      "answering as X', never as ground truth from X. REQUIRES A PAID PLAN and CHARGES one shared " +
      "AI-gateway operation per call (not per model) — plus one more if analyzeSentiment and " +
      "highlightBrand are BOTH set.",
    scopes: ["api"],
    annotations: {
      title: "Explore an AI prompt",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "prompt", "models"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        prompt: {
          type: "string",
          minLength: 1,
          maxLength: 500,
          description: "The prompt to send to each requested model.",
        },
        models: {
          minItems: 1,
          maxItems: 4,
          type: "array",
          items: {
            type: "string",
            enum: ["chat_gpt", "claude", "gemini", "perplexity"],
          },
          description: "1-4 model personas to answer the prompt (chat_gpt, claude, gemini, perplexity). See this tool's own description for what these labels do and do not guarantee.",
        },
        highlightBrand: {
          description: "A brand/entity name to highlight mentions of in each answer. Required for analyzeSentiment.",
          type: "string",
          minLength: 1,
          maxLength: 250,
        },
        webSearch: {
          description: "Ground the answer in a real retrieval pass with cited sources, shared across every requested persona. Defaults to true.",
          type: "boolean",
        },
        webSearchCountryCode: {
          type: "string",
          enum: WEB_SEARCH_COUNTRY_CODES,
        },
        analyzeSentiment: {
          description: "Classify sentiment toward highlightBrand in each answer. Requires highlightBrand. Spends one EXTRA AI-gateway operation on top of the base call — never charged unless both this and highlightBrand are set.",
          type: "boolean",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/ai/prompt-explorer", pick(args, ["projectId", "prompt", "models", "highlightBrand", "webSearch", "webSearchCountryCode", "analyzeSentiment"])),
  }),
  defineTool({
    name: "research_ai_prompts",
    category: "ai-search",
    description:
      "Turns a seed topic into candidate prompts worth tracking (real Google/Bing autocomplete " +
      "completions reframed as questions) plus observed mention-rate signals from this project's " +
      "own already-tracked prompts. This is NOT prompt search volume — no honest corpus of 'how " +
      "many people ask this' exists anywhere this codebase can reach, so no volume or difficulty " +
      "number is invented. FREE: no AI-gateway budget, no paid-plan gate, no credits spent.",
    scopes: ["api"],
    annotations: {
      title: "Research AI prompts",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "seedTopic"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        seedTopic: {
          type: "string",
          minLength: 1,
          description: "Topic to derive trackable prompt candidates from.",
        },
        languageCode: {
          type: "string",
          minLength: 2,
          description: "Language code (e.g. 'en', 'es', 'fr'). Omit it to use the project's default market language, which falls back to 'en'.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/ai/prompt-research", pick(args, ["projectId", "seedTopic", "languageCode"])),
  }),
  defineTool({
    name: "compare_ai_competitor_positioning",
    category: "ai-search",
    description:
      "Runs ONE prompt through the explore_ai_prompt pipeline and checks a brand plus its named " +
      "competitors against the SAME real per-model answers for mentions and citations. Bounded " +
      "scope, stated plainly: this is what one prompt's observed answers show for the named " +
      "entities — never a comprehensive cross-prompt visibility score. `mentionedByCount` / " +
      "`citedByCount` are raw counts out of `successfulModelCount`, never a percentage or ranking. " +
      "`entities[0]` is always the target brand; the rest are the competitors in submitted order. A " +
      "model that failed upstream reports `status: \"error\"` with `mentioned`/`cited: null` for " +
      "every entity — null, not false, because that model was never checked. REQUIRES A PAID PLAN " +
      "and CHARGES the same as explore_ai_prompt for the requested models; comparing more " +
      "competitors against that one set of answers costs nothing extra.",
    scopes: ["api"],
    annotations: {
      title: "Compare AI competitor positioning",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "prompt", "brand", "competitors", "models"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        prompt: {
          type: "string",
          minLength: 1,
          maxLength: 500,
          description: "The one prompt every requested model answers.",
        },
        brand: {
          type: "string",
          minLength: 1,
          maxLength: 250,
          description: "The target brand, domain or product checked in each answer.",
        },
        competitors: {
          type: "array",
          minItems: 1,
          maxItems: 5,
          items: { type: "string", minLength: 1, maxLength: 250 },
          description: "1-5 competitor brands/domains checked against the same answers.",
        },
        models: {
          type: "array",
          minItems: 1,
          maxItems: 4,
          items: { type: "string", enum: ["chat_gpt", "claude", "gemini", "perplexity"] },
          description: "1-4 model personas, as for explore_ai_prompt (persona labels, not vendor-verified models).",
        },
        webSearch: {
          type: "boolean",
          description: "Ground the answers in a real retrieval pass with cited sources. Defaults to true.",
        },
        webSearchCountryCode: {
          type: "string",
          enum: WEB_SEARCH_COUNTRY_CODES,
          description: "Two-letter country the retrieval pass searches from.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/ai/competitor-positioning", pick(args, ["projectId", "prompt", "brand", "competitors", "models", "webSearch", "webSearchCountryCode"])),
  }),
  defineTool({
    name: "get_direct_vendor_answers",
    category: "ai-search",
    description:
      "Runs a prompt against up to 5 REAL, directly-verified vendor models — you_com (You.com " +
      "Answer API), deepseek, grok (xAI), meta_ai (Meta's Model API) and minimax — each called " +
      "through that vendor's own public API. Unlike explore_ai_prompt's persona labels, every " +
      "result here reports the real vendor model id in `modelName`. A model whose API key is not " +
      "configured on this deployment answers `status: \"unavailable\"` with no call made — a " +
      "deployment fact, not an error; `status: \"error\"` means the vendor is configured but the " +
      "call failed. `webSearch` is best-effort per vendor: You.com is always grounded, grok honours " +
      "it, and deepseek, meta_ai and minimax always answer `webSearch: false`. meta_ai is a " +
      "US-developers-only public preview, so an ineligible account reports an error naming that. " +
      "Billed on the operator's own vendor keys: no plan gate and no MisarSEO credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "Get direct vendor AI answers",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "prompt", "models"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        prompt: {
          type: "string",
          minLength: 1,
          description: "The prompt to send to each requested vendor model.",
        },
        models: {
          type: "array",
          minItems: 1,
          maxItems: 5,
          items: { type: "string", enum: ["you_com", "deepseek", "grok", "meta_ai", "minimax"] },
          description: "1-5 vendor models to ask.",
        },
        highlightBrand: {
          type: "string",
          description: "A brand/entity name to highlight mentions of in each answer.",
        },
        webSearch: {
          type: "boolean",
          description: "Ask for grounded answers where the vendor supports it (see the tool description). Defaults to false.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/ai/direct-vendor-answers", pick(args, ["projectId", "prompt", "models", "highlightBrand", "webSearch"])),
  }),
  defineTool({
    name: "get_brand_scan_trend",
    category: "ai-search",
    description:
      "The recorded AI-visibility history for one brand or domain: mentions, cited sources and " +
      "competitors seen at each past Brand Radar scan, oldest first. Answers whether visibility in " +
      "AI answers is moving, which a single run_brand_radar_scan cannot. Returns only scans that " +
      "actually ran — empty for a target never scanned, filling in as scans run, with nothing " +
      "interpolated or back-filled. FREE — reads recorded scans, charges no credits.",
    scopes: ["api"],
    annotations: {
      title: "Get Brand Radar scan trend",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
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
          maxLength: 250,
          description: "Brand or domain, matched case-insensitively against past scans.",
        },
        since: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Inclusive lower bound, YYYY-MM-DD.",
        },
      },
    },
    handler: (ctx, args) => apiGet(ctx, "/ai/brand-scan-trend", pick(args, ["projectId", "target", "since"])),
  }),
  defineTool({
    name: "list_brand_monitors",
    category: "ai-search",
    description:
      "Lists a project's brand monitors — targets re-scanned by Brand Radar on a schedule rather " +
      "than only when run_brand_radar_scan is called. FREE: database only, no credits spent.",
    scopes: ["api"],
    annotations: {
      title: "List brand monitors",
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
    handler: (ctx, args) => apiGet(ctx, "/ai/brand-monitors", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "upsert_brand_monitor",
    category: "ai-search",
    description:
      "Creates or replaces a brand monitor — the whole schedule and competitor list, not single " +
      "fields. Requires the admin role in the calling organization, because it starts UNATTENDED " +
      "RECURRING spend from the SAME monthly Brand Radar scan quota that run_brand_radar_scan uses, " +
      "which can leave less quota for ad hoc scans that month. Confirm the schedule with the user " +
      "before calling.",
    scopes: ["api"],
    annotations: {
      title: "Create or replace a brand monitor",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "brandTarget", "scheduleInterval", "competitors"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        brandTarget: {
          type: "string",
          minLength: 1,
          maxLength: 250,
          description: "Brand, domain or product name to monitor.",
        },
        scheduleInterval: {
          type: "string",
          enum: ["daily", "weekly", "monthly"],
          description: "How often the monitor re-scans.",
        },
        competitors: {
          type: "array",
          maxItems: 5,
          items: { type: "string", minLength: 1 },
          description: "Up to 5 competitor brands/domains to compare against. Send [] for none.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/ai/brand-monitors", pick(args, ["projectId", "brandTarget", "scheduleInterval", "competitors"])),
  }),
  defineTool({
    name: "delete_brand_monitor",
    category: "ai-search",
    description:
      "Deletes a brand monitor, stopping its scheduled scans. Requires the admin role in the " +
      "calling organization. Get the monitorId from list_brand_monitors.",
    scopes: ["api"],
    annotations: {
      title: "Delete a brand monitor",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "monitorId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        monitorId: {
          type: "string",
          minLength: 1,
          description: "Brand monitor ID, from list_brand_monitors.",
        },
      },
    },
    // The route reads projectId from the query string, not a body.
    handler: (ctx, args) =>
      apiDelete(ctx, `/ai/brand-monitors/${seg(args.monitorId)}`, undefined, pick(args, ["projectId"])),
  }),
  defineTool({
    name: "list_tracked_prompts",
    category: "ai-search",
    description:
      "Lists a project's tracked prompts — prompts re-run through explore_ai_prompt's real answer " +
      "pipeline on a schedule and diffed against the previous check for mention/citation drops. " +
      "FREE: database only, no credits spent.",
    scopes: ["api"],
    annotations: {
      title: "List tracked prompts",
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
    handler: (ctx, args) => apiGet(ctx, "/ai/prompt-tracking", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "upsert_tracked_prompt",
    category: "ai-search",
    description:
      "Creates or replaces a tracked prompt — the whole model list and schedule, not single " +
      "fields. On every scheduled check the SAME prompt is re-run (grounded, for real citations) " +
      "and diffed against the previous check. Requires the admin role in the calling " +
      "organization, because it starts UNATTENDED RECURRING spend from the shared AI-gateway " +
      "monthly budget. Confirm the schedule and models with the user before calling.",
    scopes: ["api"],
    annotations: {
      title: "Create or replace a tracked prompt",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "prompt", "brandTarget", "models", "scheduleInterval"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        prompt: {
          type: "string",
          minLength: 1,
          maxLength: 500,
          description: "The prompt to re-run on every check.",
        },
        brandTarget: {
          type: "string",
          minLength: 1,
          maxLength: 250,
          description: "The brand whose mentions and citations are tracked.",
        },
        models: {
          type: "array",
          minItems: 1,
          maxItems: 4,
          items: { type: "string", enum: ["chat_gpt", "claude", "gemini", "perplexity"] },
          description: "1-4 model personas, as for explore_ai_prompt.",
        },
        scheduleInterval: {
          type: "string",
          enum: ["daily", "weekly", "monthly"],
          description: "How often the prompt is re-checked.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/ai/prompt-tracking", pick(args, ["projectId", "prompt", "brandTarget", "models", "scheduleInterval"])),
  }),
  defineTool({
    name: "delete_tracked_prompt",
    category: "ai-search",
    description:
      "Deletes a tracked prompt, stopping its scheduled checks. Requires the admin role in the " +
      "calling organization. Get the trackedPromptId from list_tracked_prompts.",
    scopes: ["api"],
    annotations: {
      title: "Delete a tracked prompt",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "trackedPromptId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        trackedPromptId: {
          type: "string",
          minLength: 1,
          description: "Tracked prompt ID, from list_tracked_prompts.",
        },
      },
    },
    // The route reads projectId from the query string, not a body.
    handler: (ctx, args) =>
      apiDelete(ctx, `/ai/prompt-tracking/${seg(args.trackedPromptId)}`, undefined, pick(args, ["projectId"])),
  }),
  defineTool({
    name: "get_tracked_prompt_trend",
    category: "ai-search",
    description:
      "Observed history for one tracked prompt — one point per real scheduled check " +
      "(`mentionedByCount`/`citedByCount` out of `successfulModelCount`), oldest first. Empty " +
      "until checks accumulate; never interpolated or back-filled. FREE — reads recorded checks.",
    scopes: ["api"],
    annotations: {
      title: "Get tracked prompt trend",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "trackedPromptId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        trackedPromptId: {
          type: "string",
          minLength: 1,
          description: "Tracked prompt ID, from list_tracked_prompts.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, `/ai/prompt-tracking/${seg(args.trackedPromptId)}/trend`, pick(args, ["projectId"])),
  }),
];
