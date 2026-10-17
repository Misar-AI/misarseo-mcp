#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { dispatch, listTools, resolveTool, UnknownToolError } from "./registry.js";
import { listPrompts, getPrompt } from "./prompts.js";
import { listResources, readResource } from "./resources.js";
import { stdioContext } from "./lib/auth.js";
import { formatError } from "./lib/errors.js";
import { SERVER_NAME, SERVER_VERSION } from "./version.js";

export { SERVER_NAME, SERVER_VERSION };

/**
 * stdio server for `npx -y @misarseo/mcp`.
 *
 * There are no stdio-only auth tools (`login`/`logout`/`status`): MisarSEO
 * serves no `/authorize` consent page for a loopback login to land on, so the
 * catalogue is exactly the shared registry and the user supplies a key via
 * MISARSEO_API_KEY, their client's `env` block, or ~/.misarseo/config.json.
 */
function buildServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {}, prompts: {}, resources: {} } },
  );

  // Discovery handlers never touch credentials — see the note in lib/auth.ts.
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listTools() }));
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: listPrompts() }));
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: listResources(),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const result = getPrompt(request.params.name, request.params.arguments ?? {});
    if (!result) throw new Error(`Prompt not found: ${request.params.name}`);
    return result;
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const result = await readResource(request.params.uri, stdioContext());
    if (!result) throw new Error(`Resource not found: ${request.params.uri}`);
    return result;
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
      // Resolve the tool BEFORE the credentials. Evaluating stdioContext() as a
      // call argument meant an unauthenticated user who mistyped a tool name got
      // "Not authenticated" — sending them to fix their key instead of their typo.
      if (!resolveTool(name)) throw new UnknownToolError(name);

      const data = await dispatch(name, args as Record<string, unknown>, stdioContext());
      return {
        content: [
          {
            type: "text" as const,
            text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }],
        isError: true,
      };
    }
  });

  return server;
}

/** Entry point used by Smithery's sandbox scanner, which imports rather than execs. */
export function createSandboxServer(): Server {
  return buildServer();
}

async function main() {
  const server = buildServer();
  await server.connect(new StdioServerTransport());
}

/**
 * Auto-start only on a direct run.
 *
 * Smithery's scanner imports this module to enumerate tools; firing main() on
 * import would attach a stdio transport to a process it does not own. Matching
 * argv[1] keeps `npx @misarseo/mcp` working while staying inert on import.
 */
const argv1 = process.argv[1] ?? "";
if (
  argv1.endsWith("index.ts") ||
  argv1.endsWith("index.js") ||
  argv1.endsWith("misarseo-mcp")
) {
  main().catch((err) => {
    console.error("MCP server error:", formatError(err));
    process.exit(1);
  });
}

export { ALL_TOOLS, LEGACY_ALIASES, dispatch, listTools, resolveTool } from "./registry.js";
export { PROMPTS, listPrompts, getPrompt } from "./prompts.js";
export { RESOURCES, listResources, readResource } from "./resources.js";
export { httpContext, type McpContext } from "./lib/context.js";
export { createHttpHandler, corsPreflight } from "./http.js";
