import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DEFAULT_BASE_URL, type McpContext } from "./context.js";
import { authGuidance } from "./auth-guidance.js";

/**
 * stdio-transport credential resolution.
 *
 * HTTP transport never touches this file — see `httpContext()`. Keeping the
 * filesystem read confined to this module is what lets the package be imported
 * into a server route without pulling `node:fs` behaviour into the request path.
 *
 * MisarSEO serves no browser `/authorize` consent page for a local `login`
 * tool, so there is no writer here: the user creates a key in the app and puts
 * it in the environment, their MCP client's `env` block, or the config file.
 */

const CONFIG_DIR = join(homedir(), ".misarseo");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

interface MisarConfig {
  api_key?: string;
  base_url?: string;
}

function loadConfig(): MisarConfig {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as MisarConfig;
  } catch {
    return {};
  }
}

export function getBaseUrl(): string {
  const envUrl = (process.env.MISARSEO_BASE_URL ?? "").trim();
  if (envUrl) return envUrl.replace(/\/$/, "");
  const cfg = loadConfig();
  if (cfg.base_url) return cfg.base_url.replace(/\/$/, "");
  return DEFAULT_BASE_URL;
}

export function tryGetApiKey(): string | null {
  const envKey = process.env.MISARSEO_API_KEY?.trim();
  if (envKey) return envKey;
  return loadConfig().api_key?.trim() || null;
}

/**
 * Resolve the stdio context lazily, at call time — never at import time.
 *
 * Directory scanners start the process with no credentials and immediately
 * call `tools/list`. An import-time exit on a missing key is exactly why the
 * mail listing once went stale: the scanner saw a dead process instead of the
 * catalogue. Discovery must always succeed; only `tools/call` may demand a key.
 */
export function stdioContext(): McpContext {
  const apiKey = tryGetApiKey();
  if (!apiKey) {
    // The full guidance block, not a one-liner: this text is relayed verbatim
    // to the end user by their MCP client and is the only authentication UX
    // they get. See src/lib/auth-guidance.ts (generated).
    throw new Error(authGuidance("missing"));
  }
  return { apiKey, baseUrl: getBaseUrl(), source: "mcp_stdio" };
}
