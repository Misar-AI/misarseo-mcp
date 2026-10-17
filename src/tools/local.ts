/**
 * Local SEO: business listings, NAP audit, local pack / geo-grid rank, Google Business Profile.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiDelete, apiGet, apiPost, pick } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const localTools: ToolDefinition[] = [
  defineTool({
    name: "search_local_businesses",
    category: "local",
    description:
      "Searches local business listings near a coordinate. Use this to find local business " +
      "candidates or nearby competitors; it does not run Maps rank checks or Q&A. CHARGES CREDITS " +
      "ONLY WHEN APIFY IS CONFIGURED AND ITS SHARED MONTHLY BUDGET HAS ROOM: results then come from " +
      "a real, independently-run scrape of Google Places (`dataSource: \"apify_google_places\"`) — " +
      "real ratings, since OpenStreetMap never has one. Otherwise (Apify unconfigured, over budget, " +
      "or the actor call failed) NOTHING IS CHARGED and this falls back automatically to " +
      "OpenStreetMap (Overpass, then Nominatim) — real point-of-interest data, no key (`dataSource: " +
      "\"openstreetmap\"`) — whose coverage is uneven and carries none of a commercial directory's " +
      "ranking, review or category metadata. Do not present an OpenStreetMap result set as the " +
      "complete set of businesses in the area; the response's own `dataSource` field on each row " +
      "says which source actually answered it, never assume. `categories` values are common " +
      "category names (e.g. 'restaurant', 'dentist'); OpenStreetMap matches them on a best-effort " +
      "basis, so a category that returns nothing on that path may simply be unmapped there rather " +
      "than absent from the area — an empty result is not measured coverage of the area, and a " +
      "listing's missing rating or review count is likewise not measured, never zero.",
    scopes: ["api"],
    annotations: {
      title: "Search local businesses",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "near"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        query: {
          description: "Business name or title text to match.",
          type: "string",
          minLength: 1,
          maxLength: 200,
        },
        near: {
          type: "object",
          properties: {
            latitude: {
              type: "number",
              minimum: -90,
              maximum: 90,
              description: "Latitude of the search center.",
            },
            longitude: {
              type: "number",
              minimum: -180,
              maximum: 180,
              description: "Longitude of the search center.",
            },
            radiusKm: {
              type: "number",
              minimum: 1,
              maximum: 100000,
              description: "Search radius around the center, in kilometers. get_google_business_questions clamps it to roughly 0.2-200 km and ignores it entirely on the free provider — see that tool's description before reporting a radius as applied.",
            },
          },
          required: ["latitude", "longitude", "radiusKm"],
          description: "Coordinate and radius to search around.",
        },
        categories: {
          description: "Business categories to filter by (e.g. 'pizza_restaurant').",
          minItems: 1,
          maxItems: 10,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 120,
          },
        },
        limit: {
          description: "Maximum businesses to return (1-50). Defaults to 20.",
          type: "integer",
          minimum: 1,
          maximum: 50,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/local/business-listings", pick(args, ["projectId", "query", "near", "categories", "limit"])),
  }),
  defineTool({
    name: "get_google_business_questions",
    category: "local",
    description:
      "Fetches question-and-answer rows for one business keyword. Run this only when Q&A evidence " +
      "is needed. THE TWO PROVIDERS RETURN DIFFERENT THINGS AND YOU MUST SAY WHICH YOU HAVE. On the " +
      "paid data provider these are real Google Business Profile questions and answers for a " +
      "profile near `near`, and it CHARGES CREDITS. On the default free provider they are " +
      "Google/Bing autocomplete completions reframed as questions — real search phrasings, but NOT " +
      "anybody's Business Profile Q&A, with no answers and no asker — and NOTHING IS CHARGED. Never " +
      "attribute a free-provider row to a business or quote it as a customer's question. `near` IS " +
      "IGNORED ON THE FREE PROVIDER: the suggest APIs take no geography, so the same keyword " +
      "returns the same rows from any coordinate. It is required because the paid provider needs " +
      "it, not because the result is always localised. On the paid provider `radiusKm` is converted " +
      "to metres and clamped into 200 m - 199,999 m, so a radius above about 200 km is silently " +
      "reduced to that ceiling. An empty result means no Q&A was found for this phrasing; whether " +
      "the business has questions elsewhere was not measured.",
    scopes: ["api"],
    annotations: {
      title: "Get Google business questions",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "keyword", "near"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        keyword: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "Business name or search phrase identifying the Google Business Profile.",
        },
        near: {
          type: "object",
          properties: {
            latitude: {
              type: "number",
              minimum: -90,
              maximum: 90,
              description: "Latitude of the search center.",
            },
            longitude: {
              type: "number",
              minimum: -180,
              maximum: 180,
              description: "Longitude of the search center.",
            },
            radiusKm: {
              type: "number",
              minimum: 1,
              maximum: 100000,
              description: "Search radius around the center, in kilometers. get_google_business_questions clamps it to roughly 0.2-200 km and ignores it entirely on the free provider — see that tool's description before reporting a radius as applied.",
            },
          },
          required: ["latitude", "longitude", "radiusKm"],
          description: "Coordinate and radius to search around.",
        },
        depth: {
          description: "Maximum Q&A rows to fetch (1-100). Defaults to 20.",
          type: "integer",
          minimum: 1,
          maximum: 100,
        },
        languageCode: {
          type: "string",
          minLength: 2,
          description: "Language code (e.g. 'en', 'es', 'fr'). Omit it to use the project's default market language, which falls back to 'en'.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/local/questions-answers", pick(args, ["projectId", "keyword", "near", "depth", "languageCode"])),
  }),
  defineTool({
    name: "run_local_nap_audit",
    category: "local",
    description:
      "Compare a claimed business Name/Address/Phone against listings the free OpenStreetMap " +
      "business search finds near the claimed location. PARTIAL scope: checks ONE open source, not " +
      "a multi-directory citation crawl (a multi-directory crawl needs licensed directory-API " +
      "access this deployment does not have). A found field with no value is reported " +
      "notComparable, never scored as a mismatch. `overallScore` on each match is a mean of " +
      "comparable-field similarities (0-1), null when nothing was comparable.",
    scopes: ["api"],
    annotations: {
      title: "Run local NAP audit",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "name", "address", "phone", "latitude", "longitude", "radiusKm"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        name: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "Claimed business name.",
        },
        address: {
          type: "string",
          minLength: 1,
          maxLength: 500,
          description: "Claimed address, any format.",
        },
        phone: {
          type: "string",
          minLength: 1,
          maxLength: 50,
          description: "Claimed phone number, any format.",
        },
        latitude: {
          type: "number",
          minimum: -90,
          maximum: 90,
        },
        longitude: {
          type: "number",
          minimum: -180,
          maximum: 180,
        },
        radiusKm: {
          type: "number",
          minimum: 1,
          maximum: 100000,
          description: "Search radius around the claimed location, in km.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/local/nap-audit", {
        ...pick(args, ["projectId", "name", "address", "phone"]),
        near: { latitude: args.latitude, longitude: args.longitude, radiusKm: args.radiusKm },
      }),
  }),
  defineTool({
    name: "get_local_pack_rank",
    category: "local",
    description:
      "Read-only access to local pack rank check configs and their latest check. With `configId`, " +
      "returns that config's latest check: `status` is \"found\" (a real 1-based `position` within " +
      "Google's local pack), \"not_found\" (the page parsed cleanly but the business was not among " +
      "the entries seen), or \"unavailable\" (the scraper is disabled, blocked, or nothing could be " +
      "parsed) — never a fabricated position or confidence score. Without `configId`, lists all " +
      "local pack rank configs in the project. This checks Google's LOCAL PACK for a named " +
      "BUSINESS, distinct from get_local_rank_grid, which checks ORGANIC rank for a DOMAIN across a " +
      "geo-grid. Create a config with create_local_pack_rank_config and run a new check with " +
      "run_local_pack_rank_check.",
    scopes: ["api"],
    annotations: {
      title: "Get local pack rank",
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
        configId: {
          description: "Local pack rank config ID. If omitted, lists all configs in the project.",
          type: "string",
        },
      },
    },
    handler: (ctx, args) =>
      args.configId
        ? apiGet(ctx, "/local/local-pack-rank/checks", pick(args, ["projectId", "configId"]))
        : apiGet(ctx, "/local/local-pack-rank/configs", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "get_local_rank_grid",
    category: "local",
    description:
      "Read-only access to geo-grid rank-tracking configs and their latest run. With `configId`, " +
      "returns that config's latest run plus per-point results (position, url, and the place name " +
      "each point was reverse-geocoded to for its location override — null means no override was " +
      "applied). Without it, lists all grid configs in the project. Reports ORGANIC rank at each " +
      "point, NEVER local-pack position — the free SERP backend does not parse a local pack. Create " +
      "a config with create_local_rank_grid_config and trigger a run with run_local_rank_grid.",
    scopes: ["api"],
    annotations: {
      title: "Get local rank grid",
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
        configId: {
          description: "Grid config ID. If omitted, lists all grid configs in the project.",
          type: "string",
        },
      },
    },
    handler: (ctx, args) =>
      args.configId
        ? apiGet(ctx, "/local/rank-grid/runs", pick(args, ["projectId", "configId"]))
        : apiGet(ctx, "/local/rank-grid/configs", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "get_gbp_profile",
    category: "local",
    description:
      "Read-only Google Business Profile listing profile for the project's linked location: title, " +
      "categories, phone, website, description, hours-period count, and which of Google's attribute " +
      "taxonomy entries are set. Fetched LIVE from Google on every call. Returns NOT_FOUND if no " +
      "location is linked yet — link one with set_gbp_connection (list_gbp_locations has the ids).",
    scopes: ["api"],
    annotations: {
      title: "Get GBP profile",
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
      apiGet(ctx, "/gbp/profile", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "get_gbp_performance",
    category: "local",
    description:
      "Read-only Business Profile Performance API metrics for the project's linked location over an " +
      "inclusive date range. `metrics` must be real DailyMetric values: " +
      "BUSINESS_IMPRESSIONS_DESKTOP_MAPS, BUSINESS_IMPRESSIONS_DESKTOP_SEARCH, " +
      "BUSINESS_IMPRESSIONS_MOBILE_MAPS, BUSINESS_IMPRESSIONS_MOBILE_SEARCH, " +
      "BUSINESS_CONVERSATIONS, BUSINESS_DIRECTION_REQUESTS, CALL_CLICKS, WEBSITE_CLICKS, " +
      "BUSINESS_BOOKINGS, BUSINESS_FOOD_ORDERS, BUSINESS_FOOD_MENU_CLICKS.",
    scopes: ["api"],
    annotations: {
      title: "Get GBP performance",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "metrics", "startDate", "endDate"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        metrics: {
          minItems: 1,
          type: "array",
          items: {
            type: "string",
            enum: [
              "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
              "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
              "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
              "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
              "BUSINESS_CONVERSATIONS",
              "BUSINESS_DIRECTION_REQUESTS",
              "CALL_CLICKS",
              "WEBSITE_CLICKS",
              "BUSINESS_BOOKINGS",
              "BUSINESS_FOOD_ORDERS",
              "BUSINESS_FOOD_MENU_CLICKS",
            ],
          },
          description: "Which daily metrics to fetch.",
        },
        startDate: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Inclusive start date, YYYY-MM-DD.",
        },
        endDate: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Inclusive end date, YYYY-MM-DD.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/gbp/performance", pick(args, ["projectId", "metrics", "startDate", "endDate"])),
  }),
  defineTool({
    name: "get_gbp_reviews",
    category: "local",
    description:
      "Read-only reviews for the project's linked Google Business Profile location, one " +
      "Google-paginated page at a time.",
    scopes: ["api"],
    annotations: {
      title: "Get GBP reviews",
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
        pageToken: {
          type: "string",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/gbp/reviews", pick(args, ["projectId", "pageToken"])),
  }),
  defineTool({
    name: "reply_to_gbp_review",
    category: "local",
    description:
      "Reply to (or overwrite the reply on) one review, by reviewId from get_gbp_reviews. Google's " +
      "endpoint has no separate create/update — this always overwrites. Publishes immediately; " +
      "there is no draft/preview step.",
    scopes: ["api"],
    annotations: {
      title: "Reply to GBP review",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "reviewId", "comment"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        reviewId: {
          type: "string",
          minLength: 1,
          maxLength: 200,
        },
        comment: {
          type: "string",
          minLength: 1,
          maxLength: 4096,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/gbp/review-reply", pick(args, ["projectId", "reviewId", "comment"])),
  }),
  defineTool({
    name: "get_gbp_optimization",
    category: "local",
    description:
      "Completeness/quality score and AI-grounded optimization recommendations for the project's " +
      "linked Google Business Profile location. The `score` (0-100) is a DETERMINISTIC heuristic " +
      "checklist over real measured facts — not AI-generated. Only `recommendations` comes from the " +
      "model. CHARGES ONE AI-GATEWAY OPERATION against the organization's shared monthly ceiling.",
    scopes: ["api"],
    annotations: {
      title: "Get GBP optimization",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
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
      apiPost(ctx, "/gbp/optimization", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "list_gbp_locations",
    category: "local",
    description:
      "Every Google Business Profile account and location this deployment's operator credential " +
      "can manage — the picker data for set_gbp_connection. Not project-scoped data (the answer " +
      "does not depend on the project passed; projectId only satisfies the ownership check). " +
      "Returns `{ accounts: [{ name, accountName, locations: [...] }] }`. Live Google API calls.",
    scopes: ["api"],
    annotations: {
      title: "List GBP accounts and locations",
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
    handler: (ctx, args) => apiGet(ctx, "/gbp/accounts", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "get_gbp_connection",
    category: "local",
    description:
      "The project's currently linked Google Business Profile location, or `{ connection: null }` " +
      "when none is linked yet. FREE: database only.",
    scopes: ["api"],
    annotations: {
      title: "Get GBP connection",
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
    handler: (ctx, args) => apiGet(ctx, "/gbp/connection", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "set_gbp_connection",
    category: "local",
    description:
      "Links (or repoints) a project to a Google Business Profile location. Take " +
      "googleAccountId and googleLocationId verbatim from list_gbp_locations — both are Google's " +
      "own resource names (e.g. \"accounts/123\", \"locations/456\"), not free text. Repointing " +
      "replaces the existing link.",
    scopes: ["api"],
    annotations: {
      title: "Link a GBP location to a project",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "googleAccountId", "googleLocationId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        googleAccountId: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "Google account resource name, e.g. accounts/123.",
        },
        googleLocationId: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "Google location resource name, e.g. locations/456.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/gbp/connection", pick(args, ["projectId", "googleAccountId", "googleLocationId"])),
  }),
  defineTool({
    name: "disconnect_gbp",
    category: "local",
    description:
      "Removes the project's link to its Google Business Profile location. Only MisarSEO's own " +
      "record of the link is removed — the location on Google is untouched — but every GBP tool " +
      "stops working for the project until it is linked again.",
    scopes: ["api"],
    annotations: {
      title: "Unlink a project's GBP location",
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
    handler: (ctx, args) => apiDelete(ctx, "/gbp/connection", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "list_gbp_posts",
    category: "local",
    description:
      "Posts published on the project's linked Google Business Profile location. A 404 means no " +
      "location is linked — use set_gbp_connection first.",
    scopes: ["api"],
    annotations: {
      title: "List GBP posts",
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
    handler: (ctx, args) => apiGet(ctx, "/gbp/posts", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "create_gbp_post",
    category: "local",
    description:
      "Publishes a new \"What's New\" post on the linked Google Business Profile location. It goes " +
      "LIVE and PUBLIC immediately — there is no draft state and no undo here. Show the user the " +
      "exact text and get their explicit approval before calling. Only standard posts are " +
      "supported (no event, offer or alert fields).",
    scopes: ["api"],
    annotations: {
      title: "Publish a GBP post",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "summary"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        summary: {
          type: "string",
          minLength: 1,
          maxLength: 1500,
          description: "The post text.",
        },
        languageCode: {
          type: "string",
          minLength: 2,
          maxLength: 10,
          description: "Language of the post. Defaults to en.",
        },
      },
    },
    handler: (ctx, args) => apiPost(ctx, "/gbp/posts", pick(args, ["projectId", "summary", "languageCode"])),
  }),
  defineTool({
    name: "delete_gbp_review_reply",
    category: "local",
    description:
      "Removes the owner's published reply from one Google review (reviewId from get_gbp_reviews). " +
      "The removal is public and immediate. Confirm with the user before calling.",
    scopes: ["api"],
    annotations: {
      title: "Delete a GBP review reply",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "reviewId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        reviewId: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "Review ID, from get_gbp_reviews.",
        },
      },
    },
    handler: (ctx, args) => apiDelete(ctx, "/gbp/review-reply", pick(args, ["projectId", "reviewId"])),
  }),
  defineTool({
    name: "create_local_pack_rank_config",
    category: "local",
    description:
      "Creates a local pack rank check config: where businessName sits in Google's local pack for " +
      "one keyword at one location. The location is composed into the query as \"<keyword> in " +
      "<locationLabel>\" — not geocoded. Run checks with run_local_pack_rank_check and read them " +
      "with get_local_pack_rank. FREE: database only.",
    scopes: ["api"],
    annotations: {
      title: "Create a local pack rank config",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "businessName", "keyword", "locationLabel"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        businessName: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "The business name as it appears on Google.",
        },
        keyword: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "The search keyword, e.g. 'coffee shop'.",
        },
        locationLabel: {
          type: "string",
          minLength: 1,
          maxLength: 300,
          description: "Place appended to the query, e.g. 'Shoreditch, London'.",
        },
        languageCode: {
          type: "string",
          minLength: 2,
          maxLength: 10,
          description: "Search language code.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/local/local-pack-rank/configs", pick(args, ["projectId", "businessName", "keyword", "locationLabel", "languageCode"])),
  }),
  defineTool({
    name: "delete_local_pack_rank_config",
    category: "local",
    description:
      "Deletes a local pack rank check config, INCLUDING its whole check history. Confirm with the " +
      "user before calling.",
    scopes: ["api"],
    annotations: {
      title: "Delete a local pack rank config",
      readOnlyHint: false,
      destructiveHint: true,
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
          description: "Config ID, from the matching get_* tool called without configId.",
        },
      },
    },
    handler: (ctx, args) =>
      apiDelete(ctx, "/local/local-pack-rank/configs", pick(args, ["projectId", "configId"])),
  }),
  defineTool({
    name: "run_local_pack_rank_check",
    category: "local",
    description:
      "Runs a local pack rank check now — one live scrape of Google's public local search results " +
      "(not the paid Places API). Returns \"found\" with a real 1-based position, \"not_found\" " +
      "(parsed cleanly, business absent), or \"unavailable\" (scraper disabled, blocked, or " +
      "unparsable) — never a fabricated position. Fails with SEO_DATA_UNAVAILABLE where the " +
      "deployment has not enabled the scraper. Tightly rate limited, so do not loop it.",
    scopes: ["api"],
    annotations: {
      title: "Run a local pack rank check",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
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
          description: "Config ID, from the matching get_* tool called without configId.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/local/local-pack-rank/checks", pick(args, ["projectId", "configId"])),
  }),
  defineTool({
    name: "create_local_rank_grid_config",
    category: "local",
    description:
      "Creates a geo-grid rank-tracking config: a 3x3 grid of points around a centre coordinate, " +
      "checking ORGANIC rank for one keyword and domain from each point. centerLabel must name the " +
      "place the grid is centred on — a heatmap with no stated centre is a claim about nowhere. " +
      "Run it with run_local_rank_grid and read it with get_local_rank_grid. FREE: database only.",
    scopes: ["api"],
    annotations: {
      title: "Create a local rank grid config",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "domain", "keyword", "centerLat", "centerLng", "centerLabel", "spacingKm"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        domain: {
          type: "string",
          minLength: 1,
          maxLength: 253,
          description: "Domain whose organic rank is checked.",
        },
        keyword: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "The search keyword.",
        },
        centerLat: {
          type: "number",
          minimum: -90,
          maximum: 90,
          description: "Latitude of the grid centre.",
        },
        centerLng: {
          type: "number",
          minimum: -180,
          maximum: 180,
          description: "Longitude of the grid centre.",
        },
        centerLabel: {
          type: "string",
          minLength: 1,
          maxLength: 300,
          description: "What the centre point is called, e.g. 'Manchester city centre'.",
        },
        spacingKm: {
          type: "number",
          minimum: 0.5,
          maximum: 25,
          description: "Distance between grid points, 0.5-25 km.",
        },
        languageCode: {
          type: "string",
          minLength: 2,
          maxLength: 10,
          description: "Search language code.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/local/rank-grid/configs", pick(args, ["projectId", "domain", "keyword", "centerLat", "centerLng", "centerLabel", "spacingKm", "languageCode"])),
  }),
  defineTool({
    name: "delete_local_rank_grid_config",
    category: "local",
    description:
      "Deletes a geo-grid rank-tracking config, INCLUDING its whole run and point history. Confirm " +
      "with the user before calling.",
    scopes: ["api"],
    annotations: {
      title: "Delete a local rank grid config",
      readOnlyHint: false,
      destructiveHint: true,
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
          description: "Config ID, from the matching get_* tool called without configId.",
        },
      },
    },
    handler: (ctx, args) => apiDelete(ctx, "/local/rank-grid/configs", pick(args, ["projectId", "configId"])),
  }),
  defineTool({
    name: "run_local_rank_grid",
    category: "local",
    description:
      "Runs a geo-grid rank check now — up to 9 live SERP calls plus up to 9 reverse-geocode " +
      "calls. Reports ORGANIC rank at each grid point, never local-pack position. Fails with " +
      "SEO_DATA_UNAVAILABLE where the SERP provider cannot override location per point. Tightly " +
      "rate limited, so do not loop it.",
    scopes: ["api"],
    annotations: {
      title: "Run a local rank grid",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
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
          description: "Config ID, from the matching get_* tool called without configId.",
        },
      },
    },
    handler: (ctx, args) => apiPost(ctx, "/local/rank-grid/runs", pick(args, ["projectId", "configId"])),
  }),
];
