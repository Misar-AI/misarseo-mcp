/**
 * Title/meta/canonical/redirect patches served through the MisarSEO snippet.
 *
 * Every handler calls MisarSEO's key-authenticated REST API (`<baseUrl>/<route>`,
 * served by the app's `/api/seo/<route>`); no tool reaches a provider directly.
 * Names, descriptions and annotations are ported from MisarSEO's in-app MCP
 * catalogue (src/server/mcp/) so both surfaces describe the same behaviour.
 */
import { apiDelete, apiGet, apiPost, pick, seg } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const patchTools: ToolDefinition[] = [
  defineTool({
    name: "list_patches",
    category: "patches",
    description:
      "Patches: every title/metaDescription/canonical/redirect fix drafted for a project, newest " +
      "first, one active row per (page, field). FREE (no credits), read-only.",
    scopes: ["api"],
    annotations: {
      title: "List patches",
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
      apiGet(ctx, "/patches", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "draft_patch",
    category: "patches",
    description:
      "Patches: drafts a title/metaDescription/canonical/redirect fix for one page's finding. FREE " +
      "for canonical/redirect (deterministic — canonical is always the page's own URL, redirect " +
      "always needs an explicit value); title/metaDescription cost one AI-gateway operation UNLESS " +
      "`value` is given, which sets an explicit replacement instead of drafting one. This is a " +
      "MUTATION — it creates or overwrites this page+field's draft, but does not publish it (use " +
      "publish_patch for that). Requires an org admin.",
    scopes: ["api"],
    annotations: {
      title: "Draft a patch",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "pageUrl", "issueType"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        pageUrl: {
          type: "string",
          minLength: 1,
          description: "The exact crawled page URL this finding is on.",
        },
        issueType: {
          type: "string",
          enum: [
            "missing_title",
            "title_too_long",
            "title_too_short",
            "missing_meta_description",
            "meta_description_too_long",
            "missing_canonical",
            "broken_page",
          ],
          description: "Which finding this patch addresses — determines the field (title/metaDescription/canonical/redirect).",
        },
        value: {
          description: "An explicit replacement value instead of AI-drafting one. Required for redirect (broken_page) — there is no computable default. Never used for canonical, which is always the page's own URL.",
          type: "string",
          minLength: 1,
          maxLength: 500,
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/patches", pick(args, ["projectId", "pageUrl", "issueType", "value"])),
  }),
  defineTool({
    name: "batch_draft_patches",
    category: "patches",
    description:
      "Patches: AI-drafts title AND metaDescription for up to 10 pages in one call. This is a " +
      "MUTATION and costs one AI-gateway operation per field per page (up to 20) — never a bulk " +
      "discount. One page/field failing is reported in that entry's own error without sinking the " +
      "rest of the batch. Requires an org admin.",
    scopes: ["api"],
    annotations: {
      title: "Batch-draft title/description patches",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "pageUrls"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        pageUrls: {
          minItems: 1,
          maxItems: 10,
          type: "array",
          items: {
            type: "string",
            minLength: 1,
          },
          description: "1-10 crawled page URLs to draft title+metaDescription patches for.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/patches/batch-draft", pick(args, ["projectId", "pageUrls"])),
  }),
  defineTool({
    name: "publish_patch",
    category: "patches",
    description:
      "Patches: makes a drafted fix live — visible in the project's public manifest, which the " +
      "embedded snippet (or, for redirects, an operator-deployed Worker) reads from the visitor's " +
      "browser. The audited site's own origin content is never touched. FREE (no credits), but this " +
      "is a MUTATION. Requires an org admin.",
    scopes: ["api"],
    annotations: {
      title: "Publish a patch",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "patchId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        patchId: {
          type: "string",
          minLength: 1,
          description: "The patch id, from list_patches or draft_patch.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, `/patches/${seg(args.patchId)}/publish`, pick(args, ["projectId"])),
  }),
  defineTool({
    name: "revert_patch",
    category: "patches",
    description:
      "Patches: stops serving a published fix — instant, since publishing only ever controlled " +
      "visibility in the public manifest, never the audited site's own origin content. FREE (no " +
      "credits), but this is a MUTATION. Requires an org admin.",
    scopes: ["api"],
    annotations: {
      title: "Revert a patch",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "patchId"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        patchId: {
          type: "string",
          minLength: 1,
          description: "The patch id, from list_patches.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, `/patches/${seg(args.patchId)}/revert`, pick(args, ["projectId"])),
  }),
  defineTool({
    name: "list_patch_auto_publish_rules",
    category: "patches",
    description:
      "Patches: every issue type this project auto-publishes a freshly AI-drafted patch for, " +
      "immediately on draft (capped at 20 auto-publishes per project per day). FREE (no credits), " +
      "read-only.",
    scopes: ["api"],
    annotations: {
      title: "List patch auto-publish rules",
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
      apiGet(ctx, "/patches/auto-publish-rules", pick(args, ["projectId"])),
  }),
  defineTool({
    name: "enable_patch_auto_publish",
    category: "patches",
    description:
      "Patches: from now on, a freshly AI-drafted patch for this issue type publishes immediately " +
      "instead of waiting for a manual publish_patch call — capped at 20 auto-publishes per project " +
      "per day. A hand-typed replacement value (draft_patch's `value` argument) is NEVER " +
      "auto-published regardless of this rule. FREE (no credits), but this is a MUTATION. Requires " +
      "an org admin.",
    scopes: ["api"],
    annotations: {
      title: "Enable auto-publish for an issue type",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "issueType"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        issueType: {
          type: "string",
          enum: [
            "missing_title",
            "title_too_long",
            "title_too_short",
            "missing_meta_description",
            "meta_description_too_long",
            "missing_canonical",
            "broken_page",
          ],
          description: "Which finding type to auto-publish AI-drafted patches for.",
        },
      },
    },
    handler: (ctx, args) =>
      apiPost(ctx, "/patches/auto-publish-rules", pick(args, ["projectId", "issueType"])),
  }),
  defineTool({
    name: "disable_patch_auto_publish",
    category: "patches",
    description:
      "Patches: stops auto-publishing freshly AI-drafted patches for this issue type — future " +
      "drafts wait for a manual publish_patch call again. Already-published patches are unaffected. " +
      "FREE (no credits), but this is a MUTATION. Requires an org admin.",
    scopes: ["api"],
    annotations: {
      title: "Disable auto-publish for an issue type",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["projectId", "issueType"],
      properties: {
        projectId: {
          type: "string",
          minLength: 1,
          description: "Required. The MisarSEO project ID to scope this call to. Get one from list_projects.",
        },
        issueType: {
          type: "string",
          enum: [
            "missing_title",
            "title_too_long",
            "title_too_short",
            "missing_meta_description",
            "meta_description_too_long",
            "missing_canonical",
            "broken_page",
          ],
          description: "Which issue type's auto-publish rule to remove.",
        },
      },
    },
    handler: (ctx, args) =>
      apiDelete(ctx, "/patches/auto-publish-rules", pick(args, ["projectId", "issueType"])),
  }),
];
