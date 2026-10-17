import { describe, it, expect, vi, afterEach } from "vitest";
import {
  ALL_TOOLS,
  LEGACY_ALIASES,
  dispatch,
  listTools,
  resolveTool,
  MissingScopeError,
  UnknownToolError,
} from "../../src/registry.js";
import { listPrompts, getPrompt, PROMPTS } from "../../src/prompts.js";
import { listResources, readResource, RESOURCES } from "../../src/resources.js";
import { httpContext } from "../../src/lib/context.js";
import { AUTH_URLS } from "../../src/lib/auth-guidance.js";

const ctx = httpContext("mseo_test", "https://example.invalid/seo");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tool catalogue", () => {
  it("exposes every tool with a unique snake_case name", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("carries a description and explicit annotations on every tool", () => {
    for (const tool of ALL_TOOLS) {
      // Directories rank on description quality; a bare name gets a listing buried.
      expect(tool.description.length, tool.name).toBeGreaterThan(40);
      expect(tool.annotations.title, tool.name).toBeTruthy();
      expect(tool.annotations, tool.name).toMatchObject({
        readOnlyHint: expect.any(Boolean),
        destructiveHint: expect.any(Boolean),
        idempotentHint: expect.any(Boolean),
        openWorldHint: expect.any(Boolean),
      });
    }
  });

  it("never marks a read-only tool destructive", () => {
    for (const tool of ALL_TOOLS) {
      if (tool.annotations.readOnlyHint) expect(tool.annotations.destructiveHint, tool.name).toBe(false);
    }
  });

  it("declares an object inputSchema whose required fields all exist", () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.inputSchema.type).toBe("object");
      for (const required of tool.inputSchema.required ?? []) {
        expect(Object.keys(tool.inputSchema.properties ?? {}), tool.name).toContain(required);
      }
    }
  });

  it("requires the api scope on every tool — the grant every MisarSEO key route checks", () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.scopes, `${tool.name} has no scopes`).toEqual(["api"]);
    }
  });

  it("does not expose account erasure", () => {
    for (const tool of ALL_TOOLS) expect(tool.scopes ?? []).not.toContain("account:delete");
  });

  it("does not register stdio auth tools — MisarSEO has no browser login", () => {
    for (const name of ["login", "logout", "status"]) expect(resolveTool(name)).toBeUndefined();
  });

  it("describes only tools that exist when one description names another", () => {
    // A description pointing at a dropped or renamed tool sends the agent
    // chasing nothing — the in-app catalogue referenced tools with no REST route.
    const known = new Set(ALL_TOOLS.map((t) => t.name));
    const words = /\b(?:get|list|run|add|remove|set|update|create|delete|submit|export|import|research|save|find|inspect|explore|draft|publish|revert|render|upsert|capture|classify|reindex|disconnect|enable|disable|batch|reply|log_analyzer)_[a-z0-9_]+\b/g;
    for (const tool of ALL_TOOLS) {
      for (const match of tool.description.matchAll(words)) {
        expect(known.has(match[0]), `${tool.name} mentions unknown tool ${match[0]}`).toBe(true);
      }
    }
  });
});

describe("legacy seo_ aliases", () => {
  it("resolves every alias to a real tool", () => {
    for (const [legacy, canonical] of Object.entries(LEGACY_ALIASES)) {
      expect(resolveTool(legacy), `alias ${legacy}`).toBeDefined();
      expect(resolveTool(legacy)!.name).toBe(canonical);
    }
  });

  it("keeps aliases out of the advertised catalogue", () => {
    // Advertising both spellings would show duplicate tools in every directory.
    const advertised = new Set(listTools().map((t) => t.name));
    for (const legacy of Object.keys(LEGACY_ALIASES)) {
      expect(advertised.has(legacy)).toBe(false);
    }
  });

  it("covers all 175 retired names in MisarSEO's docs/mcp-legacy-tool-map.json", () => {
    expect(Object.keys(LEGACY_ALIASES)).toHaveLength(175);
  });

  it("only aliases the retired seo_-prefixed names", () => {
    for (const legacy of Object.keys(LEGACY_ALIASES)) expect(legacy).toMatch(/^seo_[a-z0-9_]+$/);
  });

  it("routes a legacy name to the canonical handler", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ projects: [] }), { status: 200 }));
    await dispatch("seo_list_projects", {}, ctx, () => true);
    expect(String(fetchMock.mock.calls[0]![0])).toBe("https://example.invalid/seo/projects");
  });

  it("accepts the retired seo_keyword_research argument shape", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ rows: [] }), { status: 200 }));
    await dispatch(
      "seo_keyword_research",
      { projectId: "p1", keywords: ["shoes", "ignored"], locationCode: 2840 },
      ctx,
      () => true,
    );
    const body = JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body));
    expect(body).toEqual({ projectId: "p1", keywords: ["shoes"], locationCode: 2840 });
  });
});

describe("dispatch", () => {
  it("rejects an unknown tool", async () => {
    await expect(dispatch("nope", {}, ctx)).rejects.toBeInstanceOf(UnknownToolError);
  });

  it("enforces scopes when the caller's scopes are known", async () => {
    // A key minted for account erasure alone carries no `api` grant.
    await expect(
      dispatch("list_projects", {}, ctx, (req) => req.includes("account:delete")),
    ).rejects.toBeInstanceOf(MissingScopeError);
  });

  it("skips the scope check when scopes are unknown (stdio)", async () => {
    // stdio cannot see key scopes; the API enforces them server-side instead.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ projects: [] }), { status: 200 }),
    );
    await expect(dispatch("list_projects", {}, ctx, null)).resolves.toEqual({ projects: [] });
  });

  it("sends the key as a bearer token and tags the transport", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    await dispatch("get_usage", {}, ctx, () => true);
    const headers = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer mseo_test");
    expect(headers["X-MCP-Source"]).toBe("mcp_http");
  });

  it("surfaces the API's own error message and code", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Project not found", code: "NOT_FOUND" }), { status: 404 }),
    );
    await expect(dispatch("get_dashboard", {}, ctx, () => true)).rejects.toThrow(
      "Project not found (NOT_FOUND)",
    );
  });

  it("turns a rejected key into actionable guidance, not a bare 'Unauthorized'", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHENTICATED" }), { status: 401 }),
    );
    const err = await dispatch("list_projects", {}, ctx, () => true).catch((e: Error) => e);
    expect((err as Error).message).toContain("rejected");
    expect((err as Error).message).toContain(AUTH_URLS.apiKeys);
  });

  it("falls back to the status code when the body carries no message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 502 }));
    await expect(dispatch("list_projects", {}, ctx, () => true)).rejects.toThrow("HTTP 502");
  });
});

describe("prompts and resources", () => {
  it("lists every prompt with its arguments", () => {
    expect(listPrompts()).toHaveLength(PROMPTS.length);
    expect(PROMPTS.length).toBeGreaterThanOrEqual(4);
  });

  it("only references tool names that exist in the catalogue", () => {
    // A prompt naming a tool that was renamed sends the agent chasing nothing.
    const known = new Set(ALL_TOOLS.map((t) => t.name));
    for (const prompt of PROMPTS) {
      // Backticked words are response fields/states (`not_connected`), not tools.
      const body = prompt.build({}).replace(/`[^`]*`/g, "");
      for (const match of body.matchAll(/\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/g)) {
        expect(known.has(match[1]!), `prompt "${prompt.name}" references unknown tool ${match[1]}`).toBe(
          true,
        );
      }
    }
  });

  it("builds a prompt body for every prompt with no arguments supplied", () => {
    for (const prompt of PROMPTS) {
      expect(getPrompt(prompt.name)!.messages[0]!.content.text.length).toBeGreaterThan(50);
    }
  });

  it("returns null for an unknown prompt", () => {
    expect(getPrompt("nope")).toBeNull();
  });

  it("exposes resources with misarseo:// URIs", () => {
    expect(RESOURCES.length).toBeGreaterThanOrEqual(2);
    for (const resource of listResources()) {
      expect(resource.uri).toMatch(/^misarseo:\/\//);
      expect(resource.mimeType).toBe("application/json");
    }
  });

  it("reads every resource with a single free GET", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    for (const resource of RESOURCES) {
      const out = await readResource(resource.uri, ctx);
      expect(out!.contents[0]!.text).toContain("ok");
    }
    expect(fetchMock).toHaveBeenCalledTimes(RESOURCES.length);
    for (const [, init] of fetchMock.mock.calls) expect((init as RequestInit).method).toBe("GET");
    expect(await readResource("misarseo://nope", ctx)).toBeNull();
  });
});

describe("stdio error clarity", () => {
  it("reports an unknown tool as unknown, not as an auth failure", async () => {
    // The stdio entry point resolves the tool BEFORE reading credentials.
    await expect(dispatch("__typo__", {}, ctx)).rejects.toBeInstanceOf(UnknownToolError);
    expect(resolveTool("__typo__")).toBeUndefined();
    expect(resolveTool("list_projects")).toBeDefined();
  });
});
