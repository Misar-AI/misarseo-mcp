/**
 * REST-contract coverage for EVERY tool.
 *
 * Each tool is a thin client over MisarSEO's key-authenticated REST API
 * (`<baseUrl>/<route>` → the app's `/api/seo/<route>`). The table below was
 * transcribed from the routes themselves (MisarSEO `src/routes/api/seo/**` on
 * origin/feature/public-api-sdks-mcp, re-checked 2026-10-16): the HTTP method each route exports for the operation, and
 * the field names its zod request schema declares (`fields`) and requires
 * (`required`). Path parameters (`$jobId`, `$portfolioId`, `$patchId`,
 * `$reportDefinitionId`, `$monitorId`, `$trackedPromptId`) are excluded from `fields` — the route injects them
 * from the URL.
 *
 * A tool that sent a field the route does not declare would have it silently
 * stripped; one that omitted a required field would 400 on every call. Both
 * fail loudly here instead.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { ALL_TOOLS, dispatch } from "../../src/registry.js";
import { httpContext } from "../../src/lib/context.js";

const BASE = "https://api.example.test/seo";
const ctx = httpContext("mseo_test", BASE);
const allowAll = () => true;

interface RouteContract {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  fields: string[];
  required: string[];
}

const ROUTES: Record<string, RouteContract> = {
  list_projects: { method: "GET", path: "/projects", fields: [], required: [] },
  get_dashboard: { method: "GET", path: "/dashboard", fields: [], required: [] },
  list_portfolios: { method: "GET", path: "/portfolios", fields: [], required: [] },
  create_portfolio: { method: "POST", path: "/portfolios", fields: ["name"], required: ["name"] },
  get_portfolio: { method: "GET", path: "/portfolios/$portfolioId", fields: [], required: [] },
  rename_portfolio: { method: "PATCH", path: "/portfolios/$portfolioId", fields: ["name"], required: ["name"] },
  delete_portfolio: { method: "DELETE", path: "/portfolios/$portfolioId", fields: [], required: [] },
  add_portfolio_projects: { method: "POST", path: "/portfolios/$portfolioId/projects", fields: ["projectIds"], required: ["projectIds"] },
  remove_portfolio_projects: { method: "DELETE", path: "/portfolios/$portfolioId/projects", fields: ["projectIds"], required: ["projectIds"] },
  research_keywords: { method: "POST", path: "/keywords/research", fields: ["projectId","keywords","locationCode","languageCode","resultLimit","mode","clickstream"], required: ["projectId","keywords"] },
  save_keywords: { method: "POST", path: "/keywords/saved", fields: ["projectId","keywords","locationCode","languageCode","tags"], required: ["projectId","keywords"] },
  list_saved_keywords: { method: "GET", path: "/keywords/saved", fields: ["projectId","page","pageSize","search","sort","order"], required: ["projectId"] },
  classify_keyword_intent: { method: "POST", path: "/keywords/classify-intent", fields: ["projectId","keywords"], required: ["projectId","keywords"] },
  get_keyword_potential: { method: "GET", path: "/keywords/potential", fields: ["projectId","keyword","locationCode","languageCode"], required: ["projectId","keyword"] },
  get_keyword_serp_overview: { method: "GET", path: "/keywords/serp-overview", fields: ["projectId","keyword","locationCode","languageCode","sinceDays"], required: ["projectId","keyword"] },
  get_keyword_strategy: { method: "POST", path: "/keywords/strategy", fields: ["projectId","keywords","locationCode","languageCode"], required: ["projectId","keywords"] },
  get_topic_research: { method: "POST", path: "/keywords/topic-research", fields: ["projectId","keyword","locationCode","languageCode"], required: ["projectId","keyword"] },
  get_keyword_list_share_of_voice: { method: "POST", path: "/keywords/list-share-of-voice", fields: ["projectId","tagId","tagName","competitorDomains","locationCode","languageCode"], required: ["projectId"] },
  get_domain_overview: { method: "GET", path: "/domain/overview", fields: ["projectId","domain","includeSubdomains","locationCode","languageCode"], required: ["projectId","domain"] },
  get_domain_batch: { method: "POST", path: "/domain/batch", fields: ["projectId","domains","includeSubdomains"], required: ["projectId","domains"] },
  get_domain_authority_history: { method: "GET", path: "/domain/authority-history", fields: ["projectId","domain"], required: ["projectId","domain"] },
  capture_domain_authority_snapshot: { method: "POST", path: "/domain/authority-history", fields: ["projectId","domain"], required: ["projectId","domain"] },
  find_serp_competitors: { method: "POST", path: "/competitors", fields: ["projectId","keywords","locationCode","languageCode","resultTypes","excludeDomains","includeSubdomains","sortBy","limit","offset"], required: ["projectId","keywords"] },
  get_keyword_gap: { method: "POST", path: "/keywords/gap", fields: ["projectId","competitorDomains","locationCode","languageCode","includeSubdomains","sortField","sortOrder","classifications"], required: ["projectId","competitorDomains"] },
  list_competitor_monitors: { method: "GET", path: "/competitor-monitor/targets", fields: ["projectId"], required: ["projectId"] },
  add_competitor_monitor: { method: "POST", path: "/competitor-monitor/targets", fields: ["projectId","url","label"], required: ["projectId","url"] },
  remove_competitor_monitor: { method: "DELETE", path: "/competitor-monitor/targets", fields: ["projectId","targetId"], required: ["projectId","targetId"] },
  get_competitor_monitor_changes: { method: "GET", path: "/competitor-monitor/changes", fields: ["projectId","targetId","limit"], required: ["projectId","targetId"] },
  get_rank_tracker: { method: "GET", path: "/rank-tracking/runs", fields: ["projectId","configId"], required: ["projectId","configId"] },
  add_rank_tracking_keywords: { method: "POST", path: "/rank-tracking/keywords", fields: ["projectId","configId","keywords"], required: ["projectId","configId","keywords"] },
  get_rank_config_trend: { method: "GET", path: "/rank-tracking/trend", fields: ["projectId","configId","device","sinceDays"], required: ["projectId","configId"] },
  get_rank_movers: { method: "GET", path: "/rank-tracking/movers", fields: ["projectId","configId","sinceDays","minGain"], required: ["projectId","configId"] },
  get_rank_keyword_history: { method: "GET", path: "/rank-tracking/keyword-history", fields: ["projectId","configId","trackingKeywordId","sinceDays"], required: ["projectId","configId","trackingKeywordId"] },
  get_rank_volatility_index: { method: "GET", path: "/rank-tracking/volatility", fields: ["projectId","configId","device","runLimit"], required: ["projectId","configId"] },
  get_rank_ai_overview_trend: { method: "GET", path: "/rank-tracking/ai-overview-trend", fields: ["projectId","configId","device","sinceDays"], required: ["projectId","configId"] },
  list_rank_annotations: { method: "GET", path: "/rank-tracking/annotations", fields: ["projectId","configId"], required: ["projectId","configId"] },
  add_rank_annotation: { method: "POST", path: "/rank-tracking/annotations", fields: ["projectId","configId","date","label"], required: ["projectId","configId","date","label"] },
  remove_rank_annotation: { method: "DELETE", path: "/rank-tracking/annotations", fields: ["projectId","configId","id"], required: ["projectId","configId","id"] },
  list_rank_cannibalisation: { method: "GET", path: "/rank-tracking/cannibalisation", fields: ["projectId","configId"], required: ["projectId","configId"] },
  set_rank_keyword_target_url: { method: "POST", path: "/rank-tracking/keyword-target-url", fields: ["projectId","configId","trackingKeywordId","targetUrl"], required: ["projectId","configId","trackingKeywordId","targetUrl"] },
  list_rank_keyword_tags: { method: "GET", path: "/rank-tracking/keyword-tags", fields: ["projectId","configId"], required: ["projectId","configId"] },
  update_rank_keyword_tag: { method: "POST", path: "/rank-tracking/keyword-tags", fields: ["projectId","configId","action","tag","trackingKeywordIds"], required: ["projectId","configId","action","tag","trackingKeywordIds"] },
  get_brave_search_rank_check: { method: "POST", path: "/brave-search/rank-check", fields: ["projectId","keyword","targetDomain","country","searchLang","depth","competitorDomains"], required: ["projectId","keyword","depth"] },
  get_audit_comparison: { method: "GET", path: "/crawl/$jobId/comparison", fields: ["projectId","baselineAuditId"], required: ["projectId"] },
  get_audit_core_web_vitals: { method: "GET", path: "/crawl/$jobId/core-web-vitals", fields: ["projectId"], required: ["projectId"] },
  get_audit_https_report: { method: "POST", path: "/crawl/https-report", fields: ["projectId","auditId"], required: ["projectId"] },
  get_audit_internal_links: { method: "POST", path: "/crawl/internal-links", fields: ["projectId","auditId"], required: ["projectId"] },
  get_audit_structured_data: { method: "POST", path: "/crawl/structured-data-report", fields: ["projectId","auditId"], required: ["projectId"] },
  get_search_console_performance: { method: "POST", path: "/gsc/performance", fields: ["projectId","dimensions","dateRange","startDate","endDate","filters","rowLimit","startRow","type","dataState"], required: ["projectId"] },
  inspect_urls: { method: "POST", path: "/gsc/inspect-urls", fields: ["projectId","urls","languageCode"], required: ["projectId","urls"] },
  get_search_console_coverage: { method: "POST", path: "/gsc/coverage", fields: ["projectId","coverageState","limit","offset"], required: ["projectId","limit","offset"] },
  get_search_console_hourly_performance: { method: "POST", path: "/gsc/hourly", fields: ["projectId","startDate","endDate"], required: ["projectId","startDate","endDate"] },
  get_search_console_sitemaps: { method: "POST", path: "/gsc/sitemaps", fields: ["projectId","feedpath"], required: ["projectId"] },
  get_gsc_ctr_by_position: { method: "POST", path: "/gsc/ctr-by-position", fields: ["projectId","dimension","dateRange","startDate","endDate"], required: ["projectId"] },
  get_gsc_anonymous_queries: { method: "POST", path: "/gsc/anonymous-queries", fields: ["projectId","dateRange","startDate","endDate"], required: ["projectId"] },
  get_cannibalisation_report: { method: "POST", path: "/gsc/cannibalisation", fields: ["projectId","window","sort"], required: ["projectId"] },
  get_content_decay_report: { method: "POST", path: "/gsc/content-decay", fields: ["projectId","window","minEarlierClicks","declineThresholdPct"], required: ["projectId"] },
  get_backlinks_overview: { method: "GET", path: "/backlinks", fields: ["projectId","target","scope"], required: ["projectId","target"] },
  get_link_intersect: { method: "POST", path: "/backlinks/intersect", fields: ["projectId","competitorDomains","minCompetitors","includeUnproven","sortField","sortOrder"], required: ["projectId","competitorDomains"] },
  list_disavow_entries: { method: "GET", path: "/disavow/entries", fields: ["projectId"], required: ["projectId"] },
  add_disavow_entry: { method: "POST", path: "/disavow/entries", fields: ["projectId","entryType","value","note","source"], required: ["projectId","entryType","value"] },
  remove_disavow_entry: { method: "DELETE", path: "/disavow/entries", fields: ["projectId","entryId"], required: ["projectId","entryId"] },
  export_disavow_file: { method: "GET", path: "/disavow/export", fields: ["projectId"], required: ["projectId"] },
  list_link_prospects: { method: "GET", path: "/link-building/prospects", fields: ["projectId"], required: ["projectId"] },
  add_link_prospect: { method: "POST", path: "/link-building/prospects", fields: ["projectId","domain","note","url","label","targetUrl","contactName","contactEmail","contactNotes"], required: ["projectId","domain"] },
  update_link_prospect: { method: "PATCH", path: "/link-building/prospects", fields: ["projectId","prospectId","url","label","targetUrl","contactName","contactEmail","contactNotes"], required: ["projectId","prospectId"] },
  update_link_prospect_status: { method: "POST", path: "/link-building/status", fields: ["projectId","prospectId","status","note"], required: ["projectId","prospectId","status"] },
  remove_link_prospect: { method: "DELETE", path: "/link-building/prospects", fields: ["projectId","prospectId"], required: ["projectId","prospectId"] },
  list_link_prospect_activity: { method: "GET", path: "/link-building/activity", fields: ["projectId","prospectId"], required: ["projectId","prospectId"] },
  add_link_prospect_note: { method: "POST", path: "/link-building/activity", fields: ["projectId","prospectId","note"], required: ["projectId","prospectId","note"] },
  import_link_prospects_csv: { method: "POST", path: "/link-building/csv", fields: ["projectId","rows"], required: ["projectId","rows"] },
  export_link_prospects_csv: { method: "GET", path: "/link-building/csv", fields: ["projectId"], required: ["projectId"] },
  get_content_optimizer_report: { method: "POST", path: "/content/optimizer", fields: ["projectId","url","keyword","locationCode","languageCode"], required: ["projectId","url","keyword"] },
  get_content_page_metrics: { method: "POST", path: "/content/page-metrics", fields: ["projectId","url"], required: ["projectId","url"] },
  get_unlinked_mentions_report: { method: "POST", path: "/mentions/unlinked", fields: ["projectId","brand","trackedDomain","locationCode","languageCode"], required: ["projectId","brand","trackedDomain"] },
  get_media_monitoring_report: { method: "POST", path: "/mentions/media-monitoring", fields: ["projectId","brand","trackedDomain","locationCode","languageCode","citations"], required: ["projectId","brand","trackedDomain"] },
  run_brand_radar_scan: { method: "POST", path: "/ai/brand-lookup", fields: ["projectId","query","locationCode","languageCode","competitors"], required: ["projectId","query"] },
  get_brand_radar_scan_status: { method: "GET", path: "/ai/brand-lookup/$jobId/status", fields: ["projectId"], required: ["projectId"] },
  explore_ai_prompt: { method: "POST", path: "/ai/prompt-explorer", fields: ["projectId","prompt","models","highlightBrand","webSearch","webSearchCountryCode","analyzeSentiment"], required: ["projectId","prompt","models"] },
  research_ai_prompts: { method: "POST", path: "/ai/prompt-research", fields: ["projectId","seedTopic","languageCode"], required: ["projectId","seedTopic"] },
  search_local_businesses: { method: "POST", path: "/local/business-listings", fields: ["projectId","query","near","categories","limit"], required: ["projectId","near"] },
  get_google_business_questions: { method: "POST", path: "/local/questions-answers", fields: ["projectId","keyword","near","depth","languageCode"], required: ["projectId","keyword","near"] },
  run_local_nap_audit: { method: "POST", path: "/local/nap-audit", fields: ["projectId","name","address","phone","near"], required: ["projectId","name","address","phone","near"] },
  get_local_pack_rank: { method: "GET", path: "/local/local-pack-rank/checks", fields: ["projectId","configId"], required: ["projectId","configId"] },
  get_local_rank_grid: { method: "GET", path: "/local/rank-grid/runs", fields: ["projectId","configId"], required: ["projectId","configId"] },
  get_gbp_profile: { method: "GET", path: "/gbp/profile", fields: ["projectId"], required: ["projectId"] },
  get_gbp_performance: { method: "GET", path: "/gbp/performance", fields: ["projectId","metrics","startDate","endDate"], required: ["projectId","metrics","startDate","endDate"] },
  get_gbp_reviews: { method: "GET", path: "/gbp/reviews", fields: ["projectId","pageToken"], required: ["projectId"] },
  reply_to_gbp_review: { method: "POST", path: "/gbp/review-reply", fields: ["projectId","reviewId","comment"], required: ["projectId","reviewId","comment"] },
  get_gbp_optimization: { method: "POST", path: "/gbp/optimization", fields: ["projectId"], required: ["projectId"] },
  get_web_analytics_summary: { method: "POST", path: "/web-analytics/summary", fields: ["projectId","startDate","endDate"], required: ["projectId","startDate","endDate"] },
  get_web_analytics_top_pages: { method: "POST", path: "/web-analytics/top-pages", fields: ["projectId","startDate","endDate","limit"], required: ["projectId","startDate","endDate","limit"] },
  get_web_analytics_sources: { method: "POST", path: "/web-analytics/sources", fields: ["projectId","startDate","endDate","referrerLimit"], required: ["projectId","startDate","endDate","referrerLimit"] },
  get_web_analytics_devices: { method: "POST", path: "/web-analytics/devices", fields: ["projectId","startDate","endDate"], required: ["projectId","startDate","endDate"] },
  list_ga4_properties: { method: "GET", path: "/ga4/properties", fields: ["projectId"], required: ["projectId"] },
  set_ga4_property: { method: "POST", path: "/ga4/connection", fields: ["projectId","propertyId"], required: ["projectId","propertyId"] },
  disconnect_ga4: { method: "DELETE", path: "/ga4/connection", fields: ["projectId"], required: ["projectId"] },
  get_ga4_performance_summary: { method: "POST", path: "/ga4/daily", fields: ["projectId","startDate","endDate"], required: ["projectId","startDate","endDate"] },
  get_ga4_channel_breakdown: { method: "POST", path: "/ga4/channels", fields: ["projectId","startDate","endDate"], required: ["projectId","startDate","endDate"] },
  get_ga4_landing_pages: { method: "POST", path: "/ga4/landing-pages", fields: ["projectId","startDate","endDate","limit"], required: ["projectId","startDate","endDate"] },
  log_analyzer_list_uploads: { method: "GET", path: "/log-analyzer/uploads", fields: ["projectId"], required: ["projectId"] },
  log_analyzer_upload: { method: "POST", path: "/log-analyzer/uploads", fields: ["projectId","fileName","content"], required: ["projectId","fileName","content"] },
  log_analyzer_daily_summary: { method: "GET", path: "/log-analyzer/daily-summary", fields: ["projectId","sinceDay","untilDay"], required: ["projectId","sinceDay","untilDay"] },
  log_analyzer_top_paths: { method: "GET", path: "/log-analyzer/top-paths", fields: ["projectId","botCategory"], required: ["projectId"] },
  get_bing_site_overview: { method: "POST", path: "/bing/site-overview", fields: ["projectId"], required: ["projectId"] },
  get_bing_backlinks: { method: "POST", path: "/bing/backlinks", fields: ["projectId","page"], required: ["projectId","page"] },
  get_bing_url_links: { method: "POST", path: "/bing/url-links", fields: ["projectId","url","page"], required: ["projectId","url","page"] },
  get_bing_url_info: { method: "POST", path: "/bing/url-info", fields: ["projectId","url","includeChildren"], required: ["projectId","url"] },
  get_bing_keyword_research: { method: "POST", path: "/bing/keyword-research", fields: ["projectId","query","country","language","startDate","endDate"], required: ["projectId","query"] },
  get_bing_detail_stats: { method: "POST", path: "/bing/detail-stats", fields: ["projectId","query","pageUrl"], required: ["projectId"] },
  get_bing_feed_details: { method: "POST", path: "/bing/feed-details", fields: ["projectId","feedUrl"], required: ["projectId","feedUrl"] },
  submit_bing_content: { method: "POST", path: "/bing/submit-content", fields: ["projectId","url","httpMessage","structuredData","dynamicServing"], required: ["projectId","url","httpMessage"] },
  submit_bing_feed: { method: "POST", path: "/bing/submit-feed", fields: ["projectId","feedUrl"], required: ["projectId","feedUrl"] },
  save_bing_crawl_settings: { method: "POST", path: "/bing/crawl-settings", fields: ["projectId","ajaxEnabled","crawlRate"], required: ["projectId","ajaxEnabled","crawlRate"] },
  update_bing_blocked_url: { method: "POST", path: "/bing/blocked-urls", fields: ["projectId","action","url","entityType","requestType","date"], required: ["projectId","action","url","entityType","requestType"] },
  update_bing_query_parameter: { method: "POST", path: "/bing/query-parameters", fields: ["projectId","action","parameter"], required: ["projectId","action","parameter"] },
  list_bing_sites: { method: "GET", path: "/bing/sites", fields: ["projectId"], required: ["projectId"] },
  set_bing_site: { method: "POST", path: "/bing/connection", fields: ["projectId","siteUrl"], required: ["projectId","siteUrl"] },
  disconnect_bing: { method: "DELETE", path: "/bing/connection", fields: ["projectId"], required: ["projectId"] },
  submit_indexnow: { method: "POST", path: "/indexnow/submit", fields: ["projectId","urls"], required: ["projectId","urls"] },
  get_yandex_site_overview: { method: "POST", path: "/yandex/site-overview", fields: ["projectId","queryLimit"], required: ["projectId","queryLimit"] },
  reindex_yandex_url: { method: "POST", path: "/yandex/reindex-url", fields: ["projectId","url"], required: ["projectId","url"] },
  list_yandex_hosts: { method: "GET", path: "/yandex/hosts", fields: ["projectId"], required: ["projectId"] },
  set_yandex_host: { method: "POST", path: "/yandex/connection", fields: ["projectId","hostId"], required: ["projectId","hostId"] },
  disconnect_yandex: { method: "DELETE", path: "/yandex/connection", fields: ["projectId"], required: ["projectId"] },
  get_baidu_connection: { method: "GET", path: "/baidu/connection", fields: ["projectId"], required: ["projectId"] },
  set_baidu_connection: { method: "POST", path: "/baidu/connection", fields: ["projectId","siteUrl","token"], required: ["projectId","siteUrl","token"] },
  disconnect_baidu: { method: "DELETE", path: "/baidu/connection", fields: ["projectId"], required: ["projectId"] },
  submit_baidu_urls: { method: "POST", path: "/baidu/submit", fields: ["projectId","urls"], required: ["projectId","urls"] },
  list_ahrefs_projects: { method: "GET", path: "/ahrefs/projects", fields: ["projectId"], required: ["projectId"] },
  set_ahrefs_project: { method: "POST", path: "/ahrefs/connection", fields: ["projectId","projectType","ahrefsProjectId"], required: ["projectId","projectType","ahrefsProjectId"] },
  disconnect_ahrefs: { method: "DELETE", path: "/ahrefs/connection", fields: ["projectId"], required: ["projectId"] },
  list_patches: { method: "GET", path: "/patches", fields: ["projectId"], required: ["projectId"] },
  draft_patch: { method: "POST", path: "/patches", fields: ["projectId","pageUrl","issueType","value"], required: ["projectId","pageUrl","issueType"] },
  batch_draft_patches: { method: "POST", path: "/patches/batch-draft", fields: ["projectId","pageUrls"], required: ["projectId","pageUrls"] },
  publish_patch: { method: "POST", path: "/patches/$patchId/publish", fields: ["projectId"], required: ["projectId"] },
  revert_patch: { method: "POST", path: "/patches/$patchId/revert", fields: ["projectId"], required: ["projectId"] },
  list_patch_auto_publish_rules: { method: "GET", path: "/patches/auto-publish-rules", fields: ["projectId"], required: ["projectId"] },
  enable_patch_auto_publish: { method: "POST", path: "/patches/auto-publish-rules", fields: ["projectId","issueType"], required: ["projectId","issueType"] },
  disable_patch_auto_publish: { method: "DELETE", path: "/patches/auto-publish-rules", fields: ["projectId","issueType"], required: ["projectId","issueType"] },
  list_report_definitions: { method: "GET", path: "/reports/definitions", fields: ["projectId"], required: ["projectId"] },
  create_report_definition: { method: "POST", path: "/reports/definitions", fields: ["projectId","name","widgetTypes"], required: ["projectId","name","widgetTypes"] },
  get_report_definition: { method: "GET", path: "/reports/definitions/$reportDefinitionId", fields: ["projectId"], required: ["projectId"] },
  rename_report_definition: { method: "PATCH", path: "/reports/definitions/$reportDefinitionId", fields: ["projectId","name"], required: ["projectId","name"] },
  delete_report_definition: { method: "DELETE", path: "/reports/definitions/$reportDefinitionId", fields: ["projectId"], required: ["projectId"] },
  set_report_widgets: { method: "POST", path: "/reports/definitions/$reportDefinitionId/widgets", fields: ["projectId","widgetTypes"], required: ["projectId","widgetTypes"] },
  render_report_definition: { method: "GET", path: "/reports/definitions/$reportDefinitionId/render", fields: ["projectId","periodDays"], required: ["projectId"] },
  get_report_schedule: { method: "GET", path: "/reports/definitions/$reportDefinitionId/schedule", fields: ["projectId"], required: ["projectId"] },
  upsert_report_schedule: { method: "POST", path: "/reports/definitions/$reportDefinitionId/schedule", fields: ["projectId","scheduleInterval","recipientUserIds"], required: ["projectId","scheduleInterval","recipientUserIds"] },
  delete_report_schedule: { method: "DELETE", path: "/reports/definitions/$reportDefinitionId/schedule", fields: ["projectId"], required: ["projectId"] },
  get_usage: { method: "GET", path: "/usage", fields: [], required: [] },
  // The 29 retired seo_* tools that had no canonical equivalent until 2026-10-16.
  compare_ai_competitor_positioning: { method: "POST", path: "/ai/competitor-positioning", fields: ["projectId","prompt","brand","competitors","models","webSearch","webSearchCountryCode"], required: ["projectId","prompt","brand","competitors","models"] },
  get_direct_vendor_answers: { method: "POST", path: "/ai/direct-vendor-answers", fields: ["projectId","prompt","models","highlightBrand","webSearch"], required: ["projectId","prompt","models"] },
  get_brand_scan_trend: { method: "GET", path: "/ai/brand-scan-trend", fields: ["projectId","target","since"], required: ["projectId","target"] },
  list_brand_monitors: { method: "GET", path: "/ai/brand-monitors", fields: ["projectId"], required: ["projectId"] },
  upsert_brand_monitor: { method: "POST", path: "/ai/brand-monitors", fields: ["projectId","brandTarget","scheduleInterval","competitors"], required: ["projectId","brandTarget","scheduleInterval","competitors"] },
  delete_brand_monitor: { method: "DELETE", path: "/ai/brand-monitors/$monitorId", fields: ["projectId"], required: ["projectId"] },
  list_tracked_prompts: { method: "GET", path: "/ai/prompt-tracking", fields: ["projectId"], required: ["projectId"] },
  upsert_tracked_prompt: { method: "POST", path: "/ai/prompt-tracking", fields: ["projectId","prompt","brandTarget","models","scheduleInterval"], required: ["projectId","prompt","brandTarget","models","scheduleInterval"] },
  delete_tracked_prompt: { method: "DELETE", path: "/ai/prompt-tracking/$trackedPromptId", fields: ["projectId"], required: ["projectId"] },
  get_tracked_prompt_trend: { method: "GET", path: "/ai/prompt-tracking/$trackedPromptId/trend", fields: ["projectId"], required: ["projectId"] },
  get_backlink_anchors: { method: "GET", path: "/backlinks/anchors", fields: ["projectId","target","scope","page","pageSize","sortField","sortOrder"], required: ["projectId","target"] },
  start_site_audit: { method: "POST", path: "/crawl/start", fields: ["projectId","startUrl","maxPages","strategy","renderJs"], required: ["projectId","startUrl"] },
  get_site_audit_status: { method: "GET", path: "/crawl/$jobId/status", fields: ["projectId"], required: ["projectId"] },
  list_gbp_locations: { method: "GET", path: "/gbp/accounts", fields: ["projectId"], required: ["projectId"] },
  get_gbp_connection: { method: "GET", path: "/gbp/connection", fields: ["projectId"], required: ["projectId"] },
  set_gbp_connection: { method: "POST", path: "/gbp/connection", fields: ["projectId","googleAccountId","googleLocationId"], required: ["projectId","googleAccountId","googleLocationId"] },
  disconnect_gbp: { method: "DELETE", path: "/gbp/connection", fields: ["projectId"], required: ["projectId"] },
  list_gbp_posts: { method: "GET", path: "/gbp/posts", fields: ["projectId"], required: ["projectId"] },
  create_gbp_post: { method: "POST", path: "/gbp/posts", fields: ["projectId","summary","languageCode"], required: ["projectId","summary"] },
  delete_gbp_review_reply: { method: "DELETE", path: "/gbp/review-reply", fields: ["projectId","reviewId"], required: ["projectId","reviewId"] },
  create_local_pack_rank_config: { method: "POST", path: "/local/local-pack-rank/configs", fields: ["projectId","businessName","keyword","locationLabel","languageCode"], required: ["projectId","businessName","keyword","locationLabel"] },
  delete_local_pack_rank_config: { method: "DELETE", path: "/local/local-pack-rank/configs", fields: ["projectId","configId"], required: ["projectId","configId"] },
  run_local_pack_rank_check: { method: "POST", path: "/local/local-pack-rank/checks", fields: ["projectId","configId"], required: ["projectId","configId"] },
  create_local_rank_grid_config: { method: "POST", path: "/local/rank-grid/configs", fields: ["projectId","domain","keyword","centerLat","centerLng","centerLabel","spacingKm","languageCode"], required: ["projectId","domain","keyword","centerLat","centerLng","centerLabel","spacingKm"] },
  delete_local_rank_grid_config: { method: "DELETE", path: "/local/rank-grid/configs", fields: ["projectId","configId"], required: ["projectId","configId"] },
  run_local_rank_grid: { method: "POST", path: "/local/rank-grid/runs", fields: ["projectId","configId"], required: ["projectId","configId"] },
  create_rank_tracker: { method: "POST", path: "/rank-tracking/configs", fields: ["projectId","domain","locationCode","languageCode","locationHint","devices","serpDepth","scheduleInterval","rankDropAlertThreshold","newKeywordAlertEnabled","competitorMoveAlertThreshold"], required: ["projectId","domain","serpDepth"] },
  list_rank_tracking_keywords: { method: "GET", path: "/rank-tracking/keywords", fields: ["projectId","configId","page","pageSize"], required: ["projectId","configId"] },
  remove_rank_tracking_keywords: { method: "DELETE", path: "/rank-tracking/keywords", fields: ["projectId","configId","keywordIds"], required: ["projectId","configId","keywordIds"] },
};

/** Which tool argument fills each `$param` placeholder in a route path. */
const PATH_ARGS: Record<string, string[]> = {
  // `/crawl/$jobId/...` is addressed by the audit id; `/ai/brand-lookup/$jobId` by the scan's job id.
  $jobId: ["auditId", "jobId"],
  $portfolioId: ["portfolioId"],
  $patchId: ["patchId"],
  $reportDefinitionId: ["reportDefinitionId"],
  $monitorId: ["monitorId"],
  $trackedPromptId: ["trackedPromptId"],
};

function expectedPathFor(path: string, args: Record<string, unknown>): string {
  return path.replace(/\$[A-Za-z]+/g, (param) => {
    const arg = (PATH_ARGS[param] ?? []).find((name) => args[name] !== undefined);
    expect(arg, `no argument fills ${param}`).toBeDefined();
    return encodeURIComponent(String(args[arg!]));
  });
}

type Schema = Record<string, unknown>;

/** A plausible value for one JSON Schema node, so every property gets exercised. */
function sample(name: string, schema: Schema): unknown {
  if (Array.isArray(schema.anyOf)) return sample(name, schema.anyOf[0] as Schema);
  if ("const" in schema) return schema.const;
  if (Array.isArray(schema.enum)) return schema.enum[0];
  switch (schema.type) {
    case "boolean":
      return true;
    case "integer":
    case "number":
      return typeof schema.minimum === "number" ? schema.minimum : 1;
    case "array": {
      if (name === "crawlRate") return Array.from({ length: 24 }, () => 1);
      return [sample(name, (schema.items ?? { type: "string" }) as Schema)];
    }
    case "object": {
      const props = (schema.properties ?? {}) as Record<string, Schema>;
      return Object.fromEntries(Object.entries(props).map(([k, v]) => [k, sample(k, v)]));
    }
    default: {
      if (/date$|Date$|Day$/.test(name)) return "2026-01-01";
      if (/url$|Url$/i.test(name)) return "https://example.com/page";
      if (/domain$|Domain$/i.test(name)) return "example.com";
      return `${name}-1`;
    }
  }
}

function fullArgs(tool: (typeof ALL_TOOLS)[number]): Record<string, unknown> {
  const props = (tool.inputSchema.properties ?? {}) as Record<string, Schema>;
  const args = Object.fromEntries(Object.entries(props).map(([k, v]) => [k, sample(k, v)]));
  // update_rank_keyword_tag takes exactly one of tagId / tagName.
  if (tool.name === "update_rank_keyword_tag") delete args.tagName;
  return args;
}

function mockFetch(body: unknown = { ok: true }) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => new Response(JSON.stringify(body), { status: 200 }));
}

function calls(fetchMock: ReturnType<typeof mockFetch>) {
  return fetchMock.mock.calls.map(([input, init]) => {
    const url = new URL(String(input));
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    return { url, method: init?.method ?? "GET", body };
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("route table", () => {
  it("covers every tool in the catalogue, and nothing else", () => {
    expect(Object.keys(ROUTES).sort()).toEqual(ALL_TOOLS.map((t) => t.name).sort());
  });
});

describe.each(ALL_TOOLS.map((t) => [t.name, t] as const))("%s", (name, tool) => {
  const route = ROUTES[name]!;

  it(`calls ${route.method} ${route.path} with only the route's own field names`, async () => {
    const fetchMock = mockFetch();
    const args = fullArgs(tool);
    await dispatch(name, args, ctx, allowAll);
    const [first] = calls(fetchMock);
    expect(first, "no request was made").toBeDefined();

    const expectedPath = expectedPathFor(route.path, args);
    expect(first!.method).toBe(route.method);
    expect(first!.url.pathname).toBe(`/seo${expectedPath}`);

    const sent = new Set([...first!.url.searchParams.keys(), ...Object.keys(first!.body)]);
    for (const key of sent) {
      expect(route.fields, `${name} sent "${key}", which ${route.path} does not declare`).toContain(key);
    }
    for (const key of route.required) {
      expect(sent.has(key), `${name} did not send required "${key}"`).toBe(true);
    }
    // A GET carries its arguments in the query string, never a body.
    if (route.method === "GET") expect(Object.keys(first!.body)).toHaveLength(0);
  });
});

describe("no tool reaches outside the configured API base", () => {
  it.each(ALL_TOOLS.map((t) => [t.name, t] as const))("%s", async (_name, tool) => {
    const fetchMock = mockFetch();
    await dispatch(tool.name, fullArgs(tool), ctx, allowAll);
    expect(fetchMock).toHaveBeenCalled();
    for (const { url } of calls(fetchMock)) {
      expect(url.href.startsWith(`${BASE}/`), url.href).toBe(true);
    }
  });
});

describe("argument mapping where the tool and the route differ", () => {
  it("research_keywords sends one research request per seed (the route only researches the first keyword)", async () => {
    const fetchMock = mockFetch({ rows: [] });
    const out = (await dispatch(
      "research_keywords",
      {
        projectId: "p1",
        seeds: [{ seed: "running shoes", locationCode: 2826 }, { seed: "trail shoes" }],
        resultLimit: 300,
        includeClickstreamData: true,
      },
      ctx,
      allowAll,
    )) as { results: { seed: string; ok: boolean }[] };
    const sent = calls(fetchMock);
    expect(sent).toHaveLength(2);
    expect(sent[0]!.body).toEqual({
      projectId: "p1",
      keywords: ["running shoes"],
      locationCode: 2826,
      resultLimit: 300,
      clickstream: true,
    });
    expect(sent[1]!.body).toEqual({
      projectId: "p1",
      keywords: ["trail shoes"],
      resultLimit: 300,
      clickstream: true,
    });
    expect(out.results.map((r) => [r.seed, r.ok])).toEqual([
      ["running shoes", true],
      ["trail shoes", true],
    ]);
  });

  it("research_keywords surfaces the shared error when every seed fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify({ error: "Plan limit reached", code: "PLAN_LIMIT_REACHED" }), {
          status: 429,
        }),
    );
    await expect(
      dispatch("research_keywords", { projectId: "p1", seeds: [{ seed: "a" }] }, ctx, allowAll),
    ).rejects.toThrow("Plan limit reached (PLAN_LIMIT_REACHED)");
  });

  it("list_saved_keywords maps limit onto the route's pageSize", async () => {
    const fetchMock = mockFetch();
    await dispatch("list_saved_keywords", { projectId: "p1", limit: 250, search: "shoe" }, ctx, allowAll);
    const { url } = calls(fetchMock)[0]!;
    expect(url.searchParams.get("pageSize")).toBe("250");
    expect(url.searchParams.get("search")).toBe("shoe");
    expect(url.searchParams.has("limit")).toBe(false);
  });

  it("get_domain_overview sends includeSubdomains=false unless asked (the route defaults it to true)", async () => {
    const fetchMock = mockFetch();
    await dispatch("get_domain_overview", { projectId: "p1", domain: "example.com" }, ctx, allowAll);
    await dispatch(
      "get_domain_overview",
      { projectId: "p1", domain: "example.com", includeSubdomains: true },
      ctx,
      allowAll,
    );
    const [off, on] = calls(fetchMock);
    expect(off!.url.searchParams.get("includeSubdomains")).toBe("false");
    expect(on!.url.searchParams.get("includeSubdomains")).toBe("true");
  });

  it("get_rank_tracker lists configs without a trackerId and reads the latest run with one", async () => {
    const fetchMock = mockFetch();
    await dispatch("get_rank_tracker", { projectId: "p1" }, ctx, allowAll);
    await dispatch("get_rank_tracker", { projectId: "p1", trackerId: "c1" }, ctx, allowAll);
    const [list, run] = calls(fetchMock);
    expect(list!.url.pathname).toBe("/seo/rank-tracking/configs");
    expect(run!.url.pathname).toBe("/seo/rank-tracking/runs");
    expect(run!.url.searchParams.get("configId")).toBe("c1");
  });

  it.each([
    ["get_local_pack_rank", "/seo/local/local-pack-rank/configs", "/seo/local/local-pack-rank/checks"],
    ["get_local_rank_grid", "/seo/local/rank-grid/configs", "/seo/local/rank-grid/runs"],
  ])("%s lists configs without a configId and reads the latest result with one", async (name, list, latest) => {
    const fetchMock = mockFetch();
    await dispatch(name, { projectId: "p1" }, ctx, allowAll);
    await dispatch(name, { projectId: "p1", configId: "c1" }, ctx, allowAll);
    const [a, b] = calls(fetchMock);
    expect(a!.url.pathname).toBe(list);
    expect(b!.url.pathname).toBe(latest);
    expect(b!.url.searchParams.get("configId")).toBe("c1");
  });

  it("update_rank_keyword_tag wraps tagId/tagName into the route's tag object", async () => {
    const fetchMock = mockFetch();
    const base = { projectId: "p1", configId: "c1", action: "add", trackingKeywordIds: ["k1"] };
    await dispatch("update_rank_keyword_tag", { ...base, tagName: "Branded" }, ctx, allowAll);
    await dispatch("update_rank_keyword_tag", { ...base, tagId: "t1" }, ctx, allowAll);
    const [byName, byId] = calls(fetchMock);
    expect(byName!.body).toEqual({ ...base, tag: { tagName: "Branded" } });
    expect(byId!.body).toEqual({ ...base, tag: { tagId: "t1" } });
    await expect(
      dispatch("update_rank_keyword_tag", { ...base, tagId: "t1", tagName: "x" }, ctx, allowAll),
    ).rejects.toThrow("exactly one of tagId or tagName");
  });

  it("run_local_nap_audit nests the coordinates under near", async () => {
    const fetchMock = mockFetch();
    await dispatch(
      "run_local_nap_audit",
      { projectId: "p1", name: "Cafe", address: "1 Main St", phone: "555", latitude: 51.5, longitude: -0.1, radiusKm: 2 },
      ctx,
      allowAll,
    );
    expect(calls(fetchMock)[0]!.body).toEqual({
      projectId: "p1",
      name: "Cafe",
      address: "1 Main St",
      phone: "555",
      near: { latitude: 51.5, longitude: -0.1, radiusKm: 2 },
    });
  });

  it("run_brand_radar_scan submits the brand as the route's query, then polls the job status", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobId: "job 1", status: "queued" }), { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "complete", result: { sov: 0.4 } }), { status: 200 }));
    const out = await dispatch(
      "run_brand_radar_scan",
      { projectId: "p1", brand: "Acme", competitors: ["Globex"] },
      ctx,
      allowAll,
    );
    const [submit, poll] = calls(fetchMock);
    expect(submit!.method).toBe("POST");
    expect(submit!.url.pathname).toBe("/seo/ai/brand-lookup");
    expect(submit!.body).toEqual({ projectId: "p1", query: "Acme", competitors: ["Globex"] });
    expect(poll!.method).toBe("GET");
    expect(poll!.url.pathname).toBe("/seo/ai/brand-lookup/job%201/status");
    expect(poll!.url.searchParams.get("projectId")).toBe("p1");
    expect(out).toEqual({ jobId: "job 1", status: "complete", result: { sov: 0.4 } });
  });

  it("run_brand_radar_scan reports a failed job as an error", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobId: "j1" }), { status: 202 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "errored", error: { message: "provider down" } }), { status: 200 }),
      );
    await expect(
      dispatch("run_brand_radar_scan", { projectId: "p1", brand: "Acme" }, ctx, allowAll),
    ).rejects.toThrow("provider down");
  });

  it("get_gbp_performance sends metrics comma-separated, as the route splits them", async () => {
    const fetchMock = mockFetch();
    await dispatch(
      "get_gbp_performance",
      { projectId: "p1", metrics: ["CALL_CLICKS", "WEBSITE_CLICKS"], startDate: "2026-01-01", endDate: "2026-01-31" },
      ctx,
      allowAll,
    );
    expect(calls(fetchMock)[0]!.url.searchParams.get("metrics")).toBe("CALL_CLICKS,WEBSITE_CLICKS");
  });

  it("delete_report_definition sends projectId in the query, as that route reads it", async () => {
    const fetchMock = mockFetch();
    await dispatch("delete_report_definition", { projectId: "p1", reportDefinitionId: "rd/1" }, ctx, allowAll);
    const [call] = calls(fetchMock);
    expect(call!.method).toBe("DELETE");
    expect(call!.url.pathname).toBe("/seo/reports/definitions/rd%2F1");
    expect(call!.url.searchParams.get("projectId")).toBe("p1");
    expect(call!.body).toEqual({});
  });

  it("remove_disavow_entry sends a JSON body, as that route reads it", async () => {
    const fetchMock = mockFetch();
    await dispatch("remove_disavow_entry", { projectId: "p1", entryId: "e1" }, ctx, allowAll);
    const [call] = calls(fetchMock);
    expect(call!.method).toBe("DELETE");
    expect(call!.body).toEqual({ projectId: "p1", entryId: "e1" });
  });

  it("omits optional arguments the caller did not pass", async () => {
    const fetchMock = mockFetch();
    await dispatch("get_search_console_coverage", { projectId: "p1" }, ctx, allowAll);
    expect(calls(fetchMock)[0]!.body).toEqual({ projectId: "p1" });
  });
  it.each([
    ["delete_brand_monitor", { projectId: "p1", monitorId: "m/1" }, "/seo/ai/brand-monitors/m%2F1"],
    ["delete_tracked_prompt", { projectId: "p1", trackedPromptId: "t/1" }, "/seo/ai/prompt-tracking/t%2F1"],
  ])("%s sends projectId in the query, as that route reads it", async (name, args, path) => {
    const fetchMock = mockFetch();
    await dispatch(name, args, ctx, allowAll);
    const [call] = calls(fetchMock);
    expect(call!.method).toBe("DELETE");
    expect(call!.url.pathname).toBe(path);
    expect(call!.url.searchParams.get("projectId")).toBe("p1");
    expect(call!.body).toEqual({});
  });

  it.each([
    ["disconnect_gbp", { projectId: "p1" }],
    ["delete_gbp_review_reply", { projectId: "p1", reviewId: "r1" }],
    ["delete_local_pack_rank_config", { projectId: "p1", configId: "c1" }],
    ["delete_local_rank_grid_config", { projectId: "p1", configId: "c1" }],
    ["remove_rank_tracking_keywords", { projectId: "p1", configId: "c1", keywordIds: ["k1"] }],
  ])("%s sends a JSON body, as that route reads it", async (name, args) => {
    const fetchMock = mockFetch();
    await dispatch(name, args, ctx, allowAll);
    const [call] = calls(fetchMock);
    expect(call!.method).toBe("DELETE");
    expect(call!.body).toEqual(args);
    expect([...call!.url.searchParams.keys()]).toEqual([]);
  });
});
