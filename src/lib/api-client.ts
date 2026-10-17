import type { McpContext } from "./context.js";
import { apiError } from "./errors.js";
import { noteUsage } from "./usage.js";

/**
 * HTTP client for MisarSEO's key-authenticated REST API.
 *
 * Every path here is relative to `ctx.baseUrl` (default
 * `https://api.misar.io/seo`), which the gateway maps onto the app's own
 * `/api/seo/<path>` routes — the same routes the web app, the `misarseo` SDK
 * and every bearer-key integration use. Nothing in this package talks to a
 * third-party provider directly: credit metering, plan gating, rate limits and
 * project-ownership checks all stay server-side, where they cannot be skipped.
 */

/** Serialise a query object, dropping empty values and joining arrays with commas. */
export function buildQuery(params: Record<string, unknown>): string {
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      entries.push([key, value.map(String).join(",")]);
    } else {
      entries.push([key, String(value)]);
    }
  }
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries).toString();
}

/**
 * Copy only the named keys that are actually set.
 *
 * The REST schemas are strict about types (a `null` where a number is expected
 * is a 400), so an argument the caller omitted must be absent from the body,
 * not present as `undefined`/`null`.
 */
export function pick(args: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const value = args[key];
    if (value !== undefined && value !== null) out[key] = value;
  }
  return out;
}

/** Encode one path segment (an id taken from tool arguments). */
export function seg(value: unknown): string {
  return encodeURIComponent(String(value ?? ""));
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // A non-JSON body (an upstream proxy's HTML error page, a plain-text
    // export) is passed through rather than discarded.
    return text;
  }
}

/** Call `<baseUrl><path>` with the caller's key. */
export async function apiFetch<T = unknown>(
  ctx: McpContext,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${ctx.baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${ctx.apiKey}`,
      "X-MCP-Source": ctx.source,
      ...options.headers,
    },
  });
  // Record remaining allowance before anything can throw, so the dispatcher
  // can append the 80% warning to a successful result.
  noteUsage(res.headers);

  const body = await parseBody(res);
  if (!res.ok) throw apiError(res.status, body);
  return body as T;
}

export function apiGet<T = unknown>(
  ctx: McpContext,
  path: string,
  query: Record<string, unknown> = {},
): Promise<T> {
  return apiFetch<T>(ctx, `${path}${buildQuery(query)}`, { method: "GET" });
}

export function apiPost<T = unknown>(
  ctx: McpContext,
  path: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  return apiFetch<T>(ctx, path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch<T = unknown>(
  ctx: McpContext,
  path: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  return apiFetch<T>(ctx, path, { method: "PATCH", body: JSON.stringify(body) });
}

/**
 * DELETE. Most MisarSEO DELETE routes read a JSON body (`{ projectId, … }`);
 * the report-definition routes read `projectId` from the query instead, so
 * both are supported.
 */
export function apiDelete<T = unknown>(
  ctx: McpContext,
  path: string,
  body?: Record<string, unknown>,
  query: Record<string, unknown> = {},
): Promise<T> {
  return apiFetch<T>(ctx, `${path}${buildQuery(query)}`, {
    method: "DELETE",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

/**
 * Unwrap a `{ data }` envelope if one is present.
 *
 * MisarSEO's `jsonOk` sends the payload itself — no envelope — so this is a
 * no-op on every current route; it exists so a gateway or future route that
 * wraps responses cannot make agents waste a turn drilling into `.data`.
 */
export function unwrap<T>(body: unknown): T {
  if (
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body) &&
    Object.keys(body).length === 1 &&
    "data" in body
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}
