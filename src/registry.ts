import type { McpContext } from "./lib/context.js";
import { takeUsageFooter } from "./lib/usage.js";
import type { ToolDefinition, ToolScope } from "./lib/types.js";

import { projectTools, portfolioTools } from "./tools/projects.js";
import { keywordTools } from "./tools/keywords.js";
import { domainTools } from "./tools/domain.js";
import { competitorTools } from "./tools/competitors.js";
import { rankTrackingTools } from "./tools/rank-tracking.js";
import { siteAuditTools } from "./tools/site-audit.js";
import { searchConsoleTools } from "./tools/search-console.js";
import { backlinkTools } from "./tools/backlinks.js";
import { linkBuildingTools } from "./tools/link-building.js";
import { contentTools } from "./tools/content.js";
import { mentionTools } from "./tools/mentions.js";
import { aiSearchTools } from "./tools/ai-search.js";
import { localTools } from "./tools/local.js";
import { analyticsTools } from "./tools/analytics.js";
import { bingTools } from "./tools/bing.js";
import { webmasterTools } from "./tools/webmaster.js";
import { patchTools } from "./tools/patches.js";
import { reportTools } from "./tools/reports.js";
import { accountTools } from "./tools/account.js";
import { reportToolCall } from "./lib/telemetry.js";

/**
 * The single source of truth for MisarSEO's MCP surface.
 *
 * Both transports — the stdio binary (`@misarseo/mcp`) and the Streamable HTTP
 * handler behind `api.misar.io/seo/mcp` — build their catalogue from this
 * array. Before consolidation MisarSEO shipped two catalogues with zero shared
 * tool names (the in-app `src/server/mcp/` server and the retired
 * `sdks/mcp/` stdio package); this one keeps the in-app names and backs every
 * tool with the public REST API.
 *
 * Order matters a little: listings that can only show a prefix (ChatGPT
 * Actions cap at 30 operations) take the first tools, so the everyday
 * research surface comes first and administration (connections, patches,
 * reports, portfolios) last.
 */
export const ALL_TOOLS: ToolDefinition[] = [
  ...projectTools,
  ...keywordTools,
  ...domainTools,
  ...competitorTools,
  ...rankTrackingTools,
  ...siteAuditTools,
  ...searchConsoleTools,
  ...backlinkTools,
  ...contentTools,
  ...aiSearchTools,
  ...mentionTools,
  ...localTools,
  ...analyticsTools,
  ...linkBuildingTools,
  ...bingTools,
  ...webmasterTools,
  ...patchTools,
  ...reportTools,
  ...portfolioTools,
  ...accountTools,
];

const BY_NAME = new Map(ALL_TOOLS.map((t) => [t.name, t]));

/**
 * `seo_`-prefixed names served by the retired stdio package (MisarSEO
 * `sdks/mcp/`), each mapped onto the canonical tool that performs the same
 * REST operation.
 *
 * Accepted by `dispatch` but deliberately absent from `listTools()`: any client
 * pinned to an old name keeps working, while directories and new clients only
 * ever see one canonical catalogue. Arguments are the canonical tool's — where
 * the old tool used different argument names (`seo_keyword_research`'s
 * `keywords`, `seo_saved_keywords_list`'s `pageSize`) the canonical handler
 * also reads the old name. Every one of the 175 retired names (MisarSEO
 * `docs/mcp-legacy-tool-map.json`) now resolves: the 29 that once had no
 * canonical equivalent (crawl start/status, brand monitors, prompt tracking,
 * GBP posts/connection, local-rank config CRUD, rank-tracker creation, ...)
 * got real `verb_noun` tools over the same REST routes. Never point an alias
 * at a DIFFERENT operation — an honest "Unknown tool" beats that.
 */
export const LEGACY_ALIASES: Record<string, string> = {
  seo_list_projects: "list_projects",
  seo_dashboard: "get_dashboard",
  seo_usage: "get_usage",
  seo_portfolios_list: "list_portfolios",
  seo_portfolios_create: "create_portfolio",
  seo_portfolios_get: "get_portfolio",
  seo_portfolios_rename: "rename_portfolio",
  seo_portfolios_delete: "delete_portfolio",
  seo_portfolios_add_projects: "add_portfolio_projects",
  seo_portfolios_remove_projects: "remove_portfolio_projects",
  seo_keyword_research: "research_keywords",
  seo_saved_keywords_list: "list_saved_keywords",
  seo_saved_keywords_save: "save_keywords",
  seo_keyword_classify_intent: "classify_keyword_intent",
  seo_keyword_potential: "get_keyword_potential",
  seo_keyword_serp_overview: "get_keyword_serp_overview",
  seo_keyword_strategy: "get_keyword_strategy",
  seo_topic_research: "get_topic_research",
  seo_keyword_list_share_of_voice: "get_keyword_list_share_of_voice",
  seo_domain_overview: "get_domain_overview",
  seo_domain_batch: "get_domain_batch",
  seo_domain_authority_history: "get_domain_authority_history",
  seo_domain_authority_snapshot_capture: "capture_domain_authority_snapshot",
  seo_competitors: "find_serp_competitors",
  seo_keyword_gap: "get_keyword_gap",
  seo_competitor_monitor_list: "list_competitor_monitors",
  seo_competitor_monitor_add: "add_competitor_monitor",
  seo_competitor_monitor_remove: "remove_competitor_monitor",
  seo_competitor_monitor_changes: "get_competitor_monitor_changes",
  seo_rank_keywords_add: "add_rank_tracking_keywords",
  seo_rank_config_trend: "get_rank_config_trend",
  seo_rank_movers: "get_rank_movers",
  seo_rank_keyword_history: "get_rank_keyword_history",
  seo_rank_volatility_index: "get_rank_volatility_index",
  seo_rank_ai_overview_trend: "get_rank_ai_overview_trend",
  seo_rank_annotations_list: "list_rank_annotations",
  seo_rank_annotations_add: "add_rank_annotation",
  seo_rank_annotations_remove: "remove_rank_annotation",
  seo_rank_cannibalisation: "list_rank_cannibalisation",
  seo_rank_target_url_set: "set_rank_keyword_target_url",
  seo_rank_keyword_tags_list: "list_rank_keyword_tags",
  seo_rank_keyword_tags_update: "update_rank_keyword_tag",
  seo_brave_rank_check: "get_brave_search_rank_check",
  seo_audit_comparison: "get_audit_comparison",
  seo_audit_core_web_vitals: "get_audit_core_web_vitals",
  seo_audit_https_report: "get_audit_https_report",
  seo_audit_internal_links: "get_audit_internal_links",
  seo_audit_structured_data: "get_audit_structured_data",
  seo_gsc_data: "get_search_console_performance",
  seo_gsc_hourly_performance: "get_search_console_hourly_performance",
  seo_gsc_sitemaps: "get_search_console_sitemaps",
  seo_gsc_ctr_by_position: "get_gsc_ctr_by_position",
  seo_gsc_anonymous_queries: "get_gsc_anonymous_queries",
  seo_cannibalisation: "get_cannibalisation_report",
  seo_content_decay: "get_content_decay_report",
  seo_backlinks: "get_backlinks_overview",
  seo_link_intersect: "get_link_intersect",
  seo_disavow_list: "list_disavow_entries",
  seo_disavow_add: "add_disavow_entry",
  seo_disavow_remove: "remove_disavow_entry",
  seo_disavow_export: "export_disavow_file",
  seo_link_building_list: "list_link_prospects",
  seo_link_building_add: "add_link_prospect",
  seo_link_building_update: "update_link_prospect",
  seo_link_building_update_status: "update_link_prospect_status",
  seo_link_building_remove: "remove_link_prospect",
  seo_link_building_activity_list: "list_link_prospect_activity",
  seo_link_building_activity_add: "add_link_prospect_note",
  seo_link_building_import: "import_link_prospects_csv",
  seo_link_building_export: "export_link_prospects_csv",
  seo_content_optimizer: "get_content_optimizer_report",
  seo_content_page_metrics: "get_content_page_metrics",
  seo_unlinked_mentions: "get_unlinked_mentions_report",
  seo_media_monitoring: "get_media_monitoring_report",
  seo_ai_radar: "run_brand_radar_scan",
  seo_prompt_explorer: "explore_ai_prompt",
  seo_prompt_research: "research_ai_prompts",
  seo_local_nap_audit_run: "run_local_nap_audit",
  seo_local_pack_rank_get: "get_local_pack_rank",
  seo_local_pack_rank_configs_list: "get_local_pack_rank",
  seo_local_rank_grid_get: "get_local_rank_grid",
  seo_local_rank_grid_configs_list: "get_local_rank_grid",
  seo_gbp_profile_get: "get_gbp_profile",
  seo_gbp_performance_get: "get_gbp_performance",
  seo_gbp_reviews_list: "get_gbp_reviews",
  seo_gbp_review_reply: "reply_to_gbp_review",
  seo_gbp_optimization_get: "get_gbp_optimization",
  seo_web_analytics_summary: "get_web_analytics_summary",
  seo_web_analytics_top_pages: "get_web_analytics_top_pages",
  seo_web_analytics_sources: "get_web_analytics_sources",
  seo_web_analytics_devices: "get_web_analytics_devices",
  seo_ga4_list_properties: "list_ga4_properties",
  seo_ga4_set_property: "set_ga4_property",
  seo_ga4_disconnect: "disconnect_ga4",
  seo_ga4_performance_summary: "get_ga4_performance_summary",
  seo_ga4_channel_breakdown: "get_ga4_channel_breakdown",
  seo_ga4_landing_pages: "get_ga4_landing_pages",
  seo_log_analyzer_list_uploads: "log_analyzer_list_uploads",
  seo_log_analyzer_upload: "log_analyzer_upload",
  seo_log_analyzer_daily_summary: "log_analyzer_daily_summary",
  seo_log_analyzer_top_paths: "log_analyzer_top_paths",
  seo_bing_site_overview: "get_bing_site_overview",
  seo_bing_backlinks: "get_bing_backlinks",
  seo_bing_url_links: "get_bing_url_links",
  seo_bing_url_info: "get_bing_url_info",
  seo_bing_keyword_research: "get_bing_keyword_research",
  seo_bing_detail_stats: "get_bing_detail_stats",
  seo_bing_get_feed_details: "get_bing_feed_details",
  seo_bing_submit_content: "submit_bing_content",
  seo_bing_submit_feed: "submit_bing_feed",
  seo_bing_save_crawl_settings: "save_bing_crawl_settings",
  seo_bing_blocked_url: "update_bing_blocked_url",
  seo_bing_query_parameter: "update_bing_query_parameter",
  seo_bing_list_sites: "list_bing_sites",
  seo_bing_set_site: "set_bing_site",
  seo_bing_disconnect: "disconnect_bing",
  seo_yandex_site_overview: "get_yandex_site_overview",
  seo_yandex_reindex_url: "reindex_yandex_url",
  seo_yandex_list_hosts: "list_yandex_hosts",
  seo_yandex_set_host: "set_yandex_host",
  seo_yandex_disconnect: "disconnect_yandex",
  seo_baidu_connection: "get_baidu_connection",
  seo_baidu_set_connection: "set_baidu_connection",
  seo_baidu_disconnect: "disconnect_baidu",
  seo_baidu_submit_urls: "submit_baidu_urls",
  seo_ahrefs_list_projects: "list_ahrefs_projects",
  seo_ahrefs_set_project: "set_ahrefs_project",
  seo_ahrefs_disconnect: "disconnect_ahrefs",
  seo_patches_list: "list_patches",
  seo_patches_draft: "draft_patch",
  seo_patches_batch_draft: "batch_draft_patches",
  seo_patches_publish: "publish_patch",
  seo_patches_revert: "revert_patch",
  seo_patches_auto_publish_rules_list: "list_patch_auto_publish_rules",
  seo_patches_auto_publish_enable: "enable_patch_auto_publish",
  seo_patches_auto_publish_disable: "disable_patch_auto_publish",
  seo_reports_list: "list_report_definitions",
  seo_reports_create: "create_report_definition",
  seo_reports_get: "get_report_definition",
  seo_reports_rename: "rename_report_definition",
  seo_reports_delete: "delete_report_definition",
  seo_reports_set_widgets: "set_report_widgets",
  seo_reports_render: "render_report_definition",
  seo_reports_schedule_get: "get_report_schedule",
  seo_reports_schedule_set: "upsert_report_schedule",
  seo_reports_schedule_delete: "delete_report_schedule",
  seo_crawl_site: "start_site_audit",
  seo_get_crawl_results: "get_site_audit_status",
  seo_backlink_anchors: "get_backlink_anchors",
  seo_rank_tracker_create: "create_rank_tracker",
  seo_rank_check: "list_rank_tracking_keywords",
  seo_rank_keywords_remove: "remove_rank_tracking_keywords",
  seo_ai_competitor_positioning: "compare_ai_competitor_positioning",
  seo_ai_direct_vendor_answers: "get_direct_vendor_answers",
  seo_brand_scan_trend: "get_brand_scan_trend",
  seo_brand_monitors_list: "list_brand_monitors",
  seo_brand_monitors_set: "upsert_brand_monitor",
  seo_brand_monitors_delete: "delete_brand_monitor",
  seo_prompt_tracking_list: "list_tracked_prompts",
  seo_prompt_tracking_set: "upsert_tracked_prompt",
  seo_prompt_tracking_delete: "delete_tracked_prompt",
  seo_prompt_tracking_trend: "get_tracked_prompt_trend",
  seo_gbp_available_locations: "list_gbp_locations",
  seo_gbp_connection_get: "get_gbp_connection",
  seo_gbp_connection_set: "set_gbp_connection",
  seo_gbp_connection_unlink: "disconnect_gbp",
  seo_gbp_posts_list: "list_gbp_posts",
  seo_gbp_post_create: "create_gbp_post",
  seo_gbp_review_reply_delete: "delete_gbp_review_reply",
  seo_local_pack_rank_create: "create_local_pack_rank_config",
  seo_local_pack_rank_delete: "delete_local_pack_rank_config",
  seo_local_pack_rank_run: "run_local_pack_rank_check",
  seo_local_rank_grid_create: "create_local_rank_grid_config",
  seo_local_rank_grid_delete: "delete_local_rank_grid_config",
  seo_local_rank_grid_run: "run_local_rank_grid",
};

export function resolveTool(name: string): ToolDefinition | undefined {
  return BY_NAME.get(name) ?? BY_NAME.get(LEGACY_ALIASES[name] ?? "");
}

/** The advertised catalogue, in MCP `tools/list` wire shape. */
export function listTools() {
  return ALL_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    annotations: t.annotations,
  }));
}

export class UnknownToolError extends Error {
  constructor(name: string) {
    super(`Unknown tool: ${name}`);
    this.name = "UnknownToolError";
  }
}

export class MissingScopeError extends Error {
  constructor(readonly required: ToolScope[]) {
    super(`API key requires one of these scopes for this tool: ${required.join(", ")}`);
    this.name = "MissingScopeError";
  }
}

/**
 * Decides whether the caller may run a tool requiring any of `required`.
 *
 * A predicate rather than a scope array on purpose: MisarSEO treats a legacy
 * key minted before scopes existed (`scopes: null`) as full-access, and
 * session callers as unscoped. Re-deriving that here would silently diverge
 * from the REST API's own `contextHasApiKeyScope`, so the host passes its real
 * checker instead.
 */
export type ScopeChecker = (required: ToolScope[]) => boolean;

/**
 * Run a tool by name.
 *
 * `checkScopes` is the host's authorisation predicate; pass `null` to skip the
 * check — the stdio transport cannot see key scopes, and the API enforces them
 * server-side on every call anyway (`resolveApiUser` rejects a key without
 * `api` before any route runs).
 */
export async function dispatch(
  name: string,
  args: Record<string, unknown>,
  ctx: McpContext,
  checkScopes: ScopeChecker | null = null,
): Promise<unknown> {
  const tool = resolveTool(name);
  if (!tool) throw new UnknownToolError(name);

  if (checkScopes && tool.scopes?.length && !checkScopes(tool.scopes)) {
    throw new MissingScopeError(tool.scopes);
  }

  // Usage telemetry. Wrapped around the handler so a FAILING tool is recorded
  // too — a tool that errors for everyone is the most useful thing this can
  // surface, and only measuring successes would hide it entirely.
  const startedAt = Date.now();
  let result: unknown;
  try {
    result = await tool.handler(ctx, args);
  } catch (err) {
    reportToolCall({
      server: "misarseo",
      product: "seo",
      tool: tool.name,
      ok: false,
      durationMs: Date.now() - startedAt,
      apiKey: ctx.apiKey,
      source: ctx.source,
      errorCode: (err as { code?: string })?.code,
    });
    throw err;
  }
  reportToolCall({
    server: "misarseo",
    product: "seo",
    tool: tool.name,
    ok: true,
    durationMs: Date.now() - startedAt,
    apiKey: ctx.apiKey,
    source: ctx.source,
  });

  // Pre-emptive usage warning, appended centrally so every tool benefits
  // without each one having to remember. Only fires once the caller crosses 80%
  // of a metered allowance AND the API sent the standard `x-misar-usage-*`
  // headers; otherwise `takeUsageFooter()` returns null and the result is
  // passed through untouched.
  //
  // `get_usage` is exempt: it already reports every quota, so a footer would
  // just repeat what the user is looking at.
  if (tool.name !== "get_usage") {
    const footer = takeUsageFooter();
    if (footer) {
      if (typeof result === "string") return `${result}${footer}`;
      // Structured results keep their shape; the warning rides alongside so
      // clients that render JSON still surface it.
      if (result && typeof result === "object" && !Array.isArray(result)) {
        return { ...(result as Record<string, unknown>), usage_notice: footer.trim() };
      }
    }
  }

  return result;
}

export { type ToolDefinition, type ToolScope } from "./lib/types.js";
