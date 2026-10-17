/**
 * Custom report definitions, rendering and scheduled delivery.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiDelete, apiGet, apiPatch, apiPost, pick, seg } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const reportTools: ToolDefinition[] = [
  defineTool({
    name: "list_report_definitions",
    category: "reports",
    description:
      "Lists a project's report definitions, each carrying `widgetCount`. FREE: database only, no " +
      "SEO data provider is called and no credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "List report definitions",
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
      apiGet(ctx, "/reports/definitions", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "create_report_definition",
    category: "reports",
    description:
      "Creates a report definition with a chosen set of widgets, in print order. Returns `{ id }`. " +
      "FREE: database only, no SEO data provider is called and no credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "Create a report definition",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "name", "widgetTypes"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        name: {
          type: "string",
          minLength: 1,
          maxLength: 100,
          description: "Report name, 1-100 characters.",
        },
        widgetTypes: {
          maxItems: 11,
          type: "array",
          items: {
            type: "string",
            enum: [
              "site_health",
              "internal_linking",
              "rank_tracking",
              "keywords",
              "search_console",
              "web_analytics",
              "gsc_coverage",
              "rank_movers",
              "rank_volatility",
              "share_of_voice",
              "log_analyzer",
            ],
          },
          description: "Widget types, in print order. Catalogue: site_health (Crawl findings and issue counts from the latest audit.); internal_linking (Orphan pages, dead ends and link depth from the latest crawl.); rank_tracking (Rank-tracker scorecards per tracked domain.); keywords (Saved keywords with volume, difficulty and CPC.); search_console (Search Console totals and top queries/pages.); web_analytics (Sessions, pageviews and bounce rate from the tracking snippet.); gsc_coverage (How many of your pages Search Console has inspected, and their most common state.); rank_movers (Keywords that newly started ranking or climbed fast.); rank_volatility (How much your own positions churned between the last two checks.); share_of_voice (Your tracked domain's share of visibility against its competitors.); log_analyzer (Total server hits and the AI-crawler share of them.)",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/reports/definitions", pick(args, ["projectId", "name", "widgetTypes"])),
  }),
  defineTool({
    name: "get_report_definition",
    category: "reports",
    description:
      "Gets a report definition's name and ordered widget types. FREE: database only, no SEO data " +
      "provider is called and no credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "Get a report definition",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "reportDefinitionId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        reportDefinitionId: {
          type: "string",
          minLength: 1,
          description: "Report definition ID. Use list_report_definitions to find it.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, `/reports/definitions/${seg(args.reportDefinitionId)}`, pick(args, ["projectId"])),
  }),
  defineTool({
    name: "rename_report_definition",
    category: "reports",
    description:
      "Renames a report definition. FREE: database only, no SEO data provider is called and no " +
      "credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "Rename a report definition",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "reportDefinitionId", "name"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        reportDefinitionId: {
          type: "string",
          minLength: 1,
          description: "Report definition ID. Use list_report_definitions to find it.",
        },
        name: {
          type: "string",
          minLength: 1,
          maxLength: 100,
          description: "Report name, 1-100 characters.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPatch(ctx, `/reports/definitions/${seg(args.reportDefinitionId)}`, pick(args, ["projectId", "name"])),
  }),
  defineTool({
    name: "delete_report_definition",
    category: "reports",
    description:
      "Deletes a report definition. FREE: database only, no SEO data provider is called and no " +
      "credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "Delete a report definition",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "reportDefinitionId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        reportDefinitionId: {
          type: "string",
          minLength: 1,
          description: "Report definition ID. Use list_report_definitions to find it.",
        },
      },
    },
    handler: (ctx, args) =>
      apiDelete(ctx, `/reports/definitions/${seg(args.reportDefinitionId)}`, undefined, pick(args, ["projectId"])),
  }),
  defineTool({
    name: "set_report_widgets",
    category: "reports",
    description:
      "Replaces a report definition's whole widget list, in print order. Returns `{ widgetCount }`. " +
      "FREE: database only, no SEO data provider is called and no credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "Set a report definition's widgets",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "reportDefinitionId", "widgetTypes"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        reportDefinitionId: {
          type: "string",
          minLength: 1,
          description: "Report definition ID. Use list_report_definitions to find it.",
        },
        widgetTypes: {
          maxItems: 11,
          type: "array",
          items: {
            type: "string",
            enum: [
              "site_health",
              "internal_linking",
              "rank_tracking",
              "keywords",
              "search_console",
              "web_analytics",
              "gsc_coverage",
              "rank_movers",
              "rank_volatility",
              "share_of_voice",
              "log_analyzer",
            ],
          },
          description: "Widget types, in print order. Catalogue: site_health (Crawl findings and issue counts from the latest audit.); internal_linking (Orphan pages, dead ends and link depth from the latest crawl.); rank_tracking (Rank-tracker scorecards per tracked domain.); keywords (Saved keywords with volume, difficulty and CPC.); search_console (Search Console totals and top queries/pages.); web_analytics (Sessions, pageviews and bounce rate from the tracking snippet.); gsc_coverage (How many of your pages Search Console has inspected, and their most common state.); rank_movers (Keywords that newly started ranking or climbed fast.); rank_volatility (How much your own positions churned between the last two checks.); share_of_voice (Your tracked domain's share of visibility against its competitors.); log_analyzer (Total server hits and the AI-crawler share of them.)",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, `/reports/definitions/${seg(args.reportDefinitionId)}/widgets`, pick(args, ["projectId", "widgetTypes"])),
  }),
  defineTool({
    name: "render_report_definition",
    category: "reports",
    description:
      "Renders a report definition — fetches ONLY its selected widgets, not a fixed set. FREE: " +
      "every widget is a local Postgres read, no upstream call, so this never spends a " +
      "paid-provider credit or a live Search Console quota unit. `rank_volatility` and " +
      "`share_of_voice` read the project's FIRST active rank tracker only; `rank_movers` sums " +
      "across every active tracker.",
    scopes: ["api"],
    annotations: {
      title: "Render a report definition",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "reportDefinitionId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        reportDefinitionId: {
          type: "string",
          minLength: 1,
          description: "Report definition ID. Use list_report_definitions to find it.",
        },
        periodDays: {
          description: "7, 28 or 90 days. Defaults to 28.",
          anyOf: [
            {
              type: "number",
              const: 7,
            },
            {
              type: "number",
              const: 28,
            },
            {
              type: "number",
              const: 90,
            },
          ],
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, `/reports/definitions/${seg(args.reportDefinitionId)}/render`, pick(args, ["projectId", "periodDays"])),
  }),
  defineTool({
    name: "get_report_schedule",
    category: "reports",
    description:
      "Gets a report definition's schedule, if it has one. FREE: database only, no SEO data " +
      "provider is called and no credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "Get a report definition's schedule",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "reportDefinitionId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        reportDefinitionId: {
          type: "string",
          minLength: 1,
          description: "Report definition ID. Use list_report_definitions to find it.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, `/reports/definitions/${seg(args.reportDefinitionId)}/schedule`, pick(args, ["projectId"])),
  }),
  defineTool({
    name: "upsert_report_schedule",
    category: "reports",
    description:
      "Creates or replaces a report definition's schedule — the whole interval + recipient list, " +
      "not individual fields. Requires the admin role in the calling organization, the same gate " +
      "patch drafting/publishing uses, since this starts unattended recurring email delivery. FREE: " +
      "database only, no SEO data provider is called and no credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "Create or replace a report definition's schedule",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "reportDefinitionId", "scheduleInterval", "recipientUserIds"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        reportDefinitionId: {
          type: "string",
          minLength: 1,
          description: "Report definition ID. Use list_report_definitions to find it.",
        },
        scheduleInterval: {
          type: "string",
          enum: ["daily", "weekly", "monthly"],
          description: "How often the report is re-sent.",
        },
        recipientUserIds: {
          maxItems: 20,
          type: "array",
          items: {
            type: "string",
          },
          description: "Platform user IDs to email. Must be members of the calling organization — a non-member id is silently dropped. There is no arbitrary external-email recipient in this version; use list_team_members-style tooling to find teammate ids.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, `/reports/definitions/${seg(args.reportDefinitionId)}/schedule`, pick(args, ["projectId", "scheduleInterval", "recipientUserIds"])),
  }),
  defineTool({
    name: "delete_report_schedule",
    category: "reports",
    description:
      "Deletes a report definition's schedule. Requires the admin role in the calling organization, " +
      "same as creating one. FREE: database only, no SEO data provider is called and no credits are " +
      "spent.",
    scopes: ["api"],
    annotations: {
      title: "Delete a report definition's schedule",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "reportDefinitionId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        reportDefinitionId: {
          type: "string",
          minLength: 1,
          description: "Report definition ID. Use list_report_definitions to find it.",
        },
      },
    },
    handler: (ctx, args) =>
      apiDelete(ctx, `/reports/definitions/${seg(args.reportDefinitionId)}/schedule`, undefined, pick(args, ["projectId"])),
  }),
];
