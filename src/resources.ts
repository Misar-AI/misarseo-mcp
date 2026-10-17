import { apiGet, unwrap } from "./lib/api-client.js";
import type { McpContext } from "./lib/context.js";

/**
 * MCP resources — read-only context an agent can pull in without spending a
 * tool call, and which clients can attach to a conversation directly.
 *
 * Kept deliberately small and FREE: some clients fetch resources eagerly, so
 * every resource here is a database-only GET that spends no credits, quota or
 * provider call. Anything expensive or paginated belongs in a tool instead.
 */

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read: (ctx: McpContext) => Promise<unknown>;
}

export const RESOURCES: ResourceDefinition[] = [
  {
    uri: "misarseo://projects",
    name: "Projects",
    description:
      "The organization's active MisarSEO projects with their ids and domains. Read this first — almost every tool needs a projectId, and the keyword-gap and link-intersect reports need the project's domain to be set.",
    mimeType: "application/json",
    read: async (ctx) => unwrap(await apiGet(ctx, "/projects")),
  },
  {
    uri: "misarseo://dashboard",
    name: "Cross-project dashboard",
    description:
      "One card per project: latest audit health, rank-tracker status and trailing-7-day web-analytics sessions. Database only — never spends credits or Search Console quota.",
    mimeType: "application/json",
    read: async (ctx) => unwrap(await apiGet(ctx, "/dashboard")),
  },
  {
    uri: "misarseo://account/usage",
    name: "Plan, credits and quotas",
    description:
      "Plan tier, credits remaining, and each quota (keyword lookups, audits, Brand Radar scans, log uploads) with what is used. Check this before running credit-charging tools in bulk.",
    mimeType: "application/json",
    read: async (ctx) => unwrap(await apiGet(ctx, "/usage")),
  },
];

const BY_URI = new Map(RESOURCES.map((r) => [r.uri, r]));

export function listResources() {
  return RESOURCES.map(({ uri, name, description, mimeType }) => ({
    uri,
    name,
    description,
    mimeType,
  }));
}

export async function readResource(uri: string, ctx: McpContext) {
  const resource = BY_URI.get(uri);
  if (!resource) return null;
  const data = await resource.read(ctx);
  return {
    contents: [{ uri, mimeType: resource.mimeType, text: JSON.stringify(data, null, 2) }],
  };
}
