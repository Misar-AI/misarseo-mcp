/**
 * The link-building prospect pipeline.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiDelete, apiGet, apiPatch, apiPost, pick } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const linkBuildingTools: ToolDefinition[] = [
  defineTool({
    name: "list_link_prospects",
    category: "link-building",
    description:
      "Link Building Tool: every prospect for a project, newest first, each enriched with a LIVE " +
      "domain-authority read (never cached, never an invented score). FREE (no credits). White-hat " +
      "scope: research + outreach assistance only.",
    scopes: ["api"],
    annotations: {
      title: "List link-building prospects",
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
      apiGet(ctx, "/link-building/prospects", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "add_link_prospect",
    category: "link-building",
    description:
      "Link Building Tool: add one prospect domain/page to a project's list. FREE (no credits), but " +
      "this is a MUTATION. White-hat scope: contact fields are plain manually-typed free text — " +
      "NEVER auto-scraped or guessed. New prospects start at status 'prospected'; use " +
      "update_link_prospect_status to move them through the pipeline.",
    scopes: ["api"],
    annotations: {
      title: "Add a link-building prospect",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "domain"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        domain: {
          type: "string",
          minLength: 1,
          description: "Bare domain, e.g. example.com.",
        },
        url: {
          description: "Optional specific page on domain, a full absolute URL.",
          type: "string",
          format: "uri",
        },
        label: {
          type: "string",
          maxLength: 200,
        },
        targetUrl: {
          description: "The project's OWN page this outreach is trying to get linked.",
          type: "string",
          format: "uri",
        },
        contactName: {
          type: "string",
          maxLength: 300,
        },
        contactEmail: {
          type: "string",
          maxLength: 300,
        },
        contactNotes: {
          type: "string",
          maxLength: 1000,
        },
        note: {
          description: "Optional first activity-log entry, e.g. 'Found via competitor backlink profile.'",
          type: "string",
          maxLength: 2000,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/link-building/prospects", pick(args, ["projectId", "domain", "url", "label", "targetUrl", "contactName", "contactEmail", "contactNotes", "note"])),
  }),
  defineTool({
    name: "update_link_prospect",
    category: "link-building",
    description:
      "Link Building Tool: edit a prospect's editable fields (url/label/targetUrl/contact fields) — " +
      "only fields given here are changed. FREE (no credits), but this is a MUTATION. `domain` and " +
      "`status` are not editable here — use update_link_prospect_status for the pipeline stage.",
    scopes: ["api"],
    annotations: {
      title: "Edit a link-building prospect",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "prospectId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        prospectId: {
          type: "string",
          minLength: 1,
          description: "Prospect id, from list_link_prospects.",
        },
        url: {
          type: "string",
          format: "uri",
        },
        label: {
          type: "string",
          maxLength: 200,
        },
        targetUrl: {
          type: "string",
          format: "uri",
        },
        contactName: {
          type: "string",
          maxLength: 300,
        },
        contactEmail: {
          type: "string",
          maxLength: 300,
        },
        contactNotes: {
          type: "string",
          maxLength: 1000,
        },
      },
    },
    handler: (ctx, args) =>
      apiPatch(ctx, "/link-building/prospects", pick(args, ["projectId", "prospectId", "url", "label", "targetUrl", "contactName", "contactEmail", "contactNotes"])),
  }),
  defineTool({
    name: "update_link_prospect_status",
    category: "link-building",
    description:
      "Link Building Tool: move a prospect through the outreach-status pipeline — prospected -> " +
      "contacted -> replied -> link_placed/declined/no_response ('declined'/'no_response' can loop " +
      "back to 'contacted' for a re-approach). FREE (no credits), but this is a MUTATION. Throws on " +
      "an illegal jump (e.g. prospected straight to link_placed) — the error names the allowed next " +
      "stage(s). Always appends an activity-log entry describing the change.",
    scopes: ["api"],
    annotations: {
      title: "Move a prospect through the outreach pipeline",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "prospectId", "status"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        prospectId: {
          type: "string",
          minLength: 1,
          description: "Prospect id, from list_link_prospects.",
        },
        status: {
          type: "string",
          enum: ["prospected", "contacted", "replied", "link_placed", "declined", "no_response"],
        },
        note: {
          description: "Optional extra context appended to the auto-generated activity-log entry, e.g. 'sent follow-up #2'.",
          type: "string",
          maxLength: 2000,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/link-building/status", pick(args, ["projectId", "prospectId", "status", "note"])),
  }),
  defineTool({
    name: "remove_link_prospect",
    category: "link-building",
    description:
      "Link Building Tool: remove one prospect by id (from list_link_prospects), along with its " +
      "activity log. FREE (no credits), but this is a MUTATION. Succeeds whether or not prospectId " +
      "existed.",
    scopes: ["api"],
    annotations: {
      title: "Remove a link-building prospect",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "prospectId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        prospectId: {
          type: "string",
          minLength: 1,
          description: "Prospect id, from list_link_prospects.",
        },
      },
    },
    handler: (ctx, args) =>
      apiDelete(ctx, "/link-building/prospects", pick(args, ["projectId", "prospectId"])),
  }),
  defineTool({
    name: "list_link_prospect_activity",
    category: "link-building",
    description:
      "Link Building Tool: a prospect's activity log — every manually-typed note plus every " +
      "auto-recorded status change, newest first. FREE (no credits).",
    scopes: ["api"],
    annotations: {
      title: "List a prospect's activity log",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "prospectId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        prospectId: {
          type: "string",
          minLength: 1,
          description: "Prospect id, from list_link_prospects.",
        },
      },
    },
    handler: (ctx, args) =>
      apiGet(ctx, "/link-building/activity", pick(args, ["projectId", "prospectId"])),
  }),
  defineTool({
    name: "add_link_prospect_note",
    category: "link-building",
    description:
      "Link Building Tool: add one manual activity-log entry to a prospect, e.g. \"emailed on 9/5\" " +
      "or \"follow-up sent\". FREE (no credits), but this is a MUTATION.",
    scopes: ["api"],
    annotations: {
      title: "Add a note to a prospect's activity log",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "prospectId", "note"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        prospectId: {
          type: "string",
          minLength: 1,
          description: "Prospect id, from list_link_prospects.",
        },
        note: {
          type: "string",
          minLength: 1,
          maxLength: 2000,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/link-building/activity", pick(args, ["projectId", "prospectId", "note"])),
  }),
  defineTool({
    name: "import_link_prospects_csv",
    category: "link-building",
    description:
      "Link Building Tool: bulk-add up to 500 prospects at once from already-parsed rows (each with " +
      "at least a domain). FREE (no credits), but this is a MUTATION. One bad or duplicate row " +
      "never aborts the rest — the response reports added/duplicates/errors per row.",
    scopes: ["api"],
    annotations: {
      title: "Bulk-import link-building prospects",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "rows"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        rows: {
          minItems: 1,
          maxItems: 500,
          type: "array",
          items: {
            type: "object",
            properties: {
              domain: {
                type: "string",
                minLength: 1,
                maxLength: 253,
              },
              url: {
                type: "string",
                format: "uri",
              },
              label: {
                type: "string",
                maxLength: 200,
              },
              targetUrl: {
                type: "string",
                format: "uri",
              },
              contactName: {
                type: "string",
                maxLength: 300,
              },
              contactEmail: {
                type: "string",
                maxLength: 300,
              },
              contactNotes: {
                type: "string",
                maxLength: 1000,
              },
            },
            required: ["domain"],
          },
          description: "Rows to import, each with at least a domain.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/link-building/csv", pick(args, ["projectId", "rows"])),
  }),
  defineTool({
    name: "export_link_prospects_csv",
    category: "link-building",
    description:
      "Link Building Tool: export a project's prospect list as CSV text. FREE (no credits). Save " +
      "`csvContent` to a .csv file as-is (UTF-8).",
    scopes: ["api"],
    annotations: {
      title: "Export link-building prospects as CSV",
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
      apiGet(ctx, "/link-building/csv", pick(args, ["projectId"])),
  }),
];
