/**
 * Projects, the cross-project dashboard, and portfolios (groups of projects).
 * 
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiDelete, apiGet, apiPatch, apiPost, pick, seg } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const projectTools: ToolDefinition[] = [
  defineTool({
    name: "list_projects",
    category: "projects",
    description:
      "Lists the active projects in the user's organization. FREE — database only, charges no " +
      "credits. Use this whenever you need a `projectId` for another MisarSEO tool. Returns `{id, " +
      "name, domain, url}` per project; pass the `id` value as `projectId`. `domain` is null for a " +
      "project that has never had one set, which is not a missing lookup — get_keyword_gap and " +
      "get_link_intersect read the project's own domain from this record and refuse to run without " +
      "it. Archived projects are not listed.",
    scopes: ["api"],
    annotations: {
      title: "List projects",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: (ctx) => apiGet(ctx, "/projects"),
  }),
  defineTool({
    name: "get_dashboard",
    category: "projects",
    description:
      "One card per active project in the caller's organization: latest audit health, rank-tracker " +
      "status, and trailing-7-day web-analytics sessions. FREE: database only. No SEO data provider " +
      "is called and no credits are spent — GSC and backlinks are deliberately excluded from this " +
      "view rather than fetched live, so calling this never spends a Search Console quota unit or a " +
      "paid-provider credit. `audit`/`rankTracking`/`webAnalytics` are null on a card whose project " +
      "has none of that data yet (never audited, no tracker configured, no analytics traffic) — a " +
      "real 'not set up' fact, not a zero standing in for missing data.",
    scopes: ["api"],
    annotations: {
      title: "Get the cross-project dashboard",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: (ctx) => apiGet(ctx, "/dashboard"),
  }),
];

export const portfolioTools: ToolDefinition[] = [
  defineTool({
    name: "list_portfolios",
    category: "projects",
    description:
      "Lists the caller organization's portfolios, each carrying `projectCount`. FREE: database " +
      "only, no SEO data provider is called and no credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "List portfolios",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: (ctx) => apiGet(ctx, "/portfolios"),
  }),
  defineTool({
    name: "create_portfolio",
    category: "projects",
    description:
      "Creates a portfolio. Returns `{ id }`. Starts with no member projects — use " +
      "add_portfolio_projects next. FREE: database only, no SEO data provider is called and no " +
      "credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "Create a portfolio",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          minLength: 1,
          maxLength: 100,
          description: "Portfolio name, 1-100 characters.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/portfolios", pick(args, ["name"])),
  }),
  defineTool({
    name: "get_portfolio",
    category: "projects",
    description:
      "One card per member project (same shape get_dashboard returns — no GSC, no backlinks, see " +
      "its own description for why) plus aggregate totals. `totals.averageHealthScore` is averaged " +
      "over member projects that HAVE been audited, not over every member. FREE: database only, no " +
      "SEO data provider is called and no credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "Get a portfolio",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["portfolioId"],
      properties: {
        portfolioId: {
          type: "string",
          minLength: 1,
          description: "Portfolio ID. Use list_portfolios to find it.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, `/portfolios/${seg(args.portfolioId)}`),
  }),
  defineTool({
    name: "rename_portfolio",
    category: "projects",
    description:
      "Renames a portfolio. FREE: database only, no SEO data provider is called and no credits are " +
      "spent.",
    scopes: ["api"],
    annotations: {
      title: "Rename a portfolio",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["portfolioId", "name"],
      properties: {
        portfolioId: {
          type: "string",
          minLength: 1,
          description: "Portfolio ID. Use list_portfolios to find it.",
        },
        name: {
          type: "string",
          minLength: 1,
          maxLength: 100,
          description: "Portfolio name, 1-100 characters.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPatch(ctx, `/portfolios/${seg(args.portfolioId)}`, pick(args, ["name"])),
  }),
  defineTool({
    name: "delete_portfolio",
    category: "projects",
    description:
      "Deletes a portfolio. Member projects themselves are untouched — only the grouping is " +
      "removed. FREE: database only, no SEO data provider is called and no credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "Delete a portfolio",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["portfolioId"],
      properties: {
        portfolioId: {
          type: "string",
          minLength: 1,
          description: "Portfolio ID. Use list_portfolios to find it.",
        },
      },
    },
    handler: (ctx, args) =>
      apiDelete(ctx, `/portfolios/${seg(args.portfolioId)}`),
  }),
  defineTool({
    name: "add_portfolio_projects",
    category: "projects",
    description:
      "Adds projects to a portfolio. Returns `{ added }` — only ids that resolve to a project of " +
      "the CALLER'S organization are added; any other id is silently dropped rather than erroring " +
      "the whole call. FREE: database only, no SEO data provider is called and no credits are " +
      "spent.",
    scopes: ["api"],
    annotations: {
      title: "Add projects to a portfolio",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["portfolioId", "projectIds"],
      properties: {
        portfolioId: {
          type: "string",
          minLength: 1,
          description: "Portfolio ID. Use list_portfolios to find it.",
        },
        projectIds: {
          minItems: 1,
          maxItems: 100,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
          },
          description: "MisarSEO project IDs. Use list_projects to find them.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, `/portfolios/${seg(args.portfolioId)}/projects`, pick(args, ["projectIds"])),
  }),
  defineTool({
    name: "remove_portfolio_projects",
    category: "projects",
    description:
      "Removes projects from a portfolio. Succeeds whether or not an id was actually a member. " +
      "FREE: database only, no SEO data provider is called and no credits are spent.",
    scopes: ["api"],
    annotations: {
      title: "Remove projects from a portfolio",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["portfolioId", "projectIds"],
      properties: {
        portfolioId: {
          type: "string",
          minLength: 1,
          description: "Portfolio ID. Use list_portfolios to find it.",
        },
        projectIds: {
          minItems: 1,
          maxItems: 100,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
          },
          description: "MisarSEO project IDs. Use list_projects to find them.",
        },
      },
    },
    handler: (ctx, args) =>
      apiDelete(ctx, `/portfolios/${seg(args.portfolioId)}/projects`, pick(args, ["projectIds"])),
  }),
];
