# MisarSEO MCP Server

> Research keywords, track rankings, audit sites, monitor backlinks and AI-search visibility — from any AI assistant.

[![npm](https://img.shields.io/npm/v/@misarseo/mcp)](https://www.npmjs.com/package/@misarseo/mcp)
[![smithery](https://img.shields.io/badge/smithery-misar%2Fmisarseo--mcp-blue)](https://smithery.ai/server/misar/misarseo-mcp)
[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

**180 tools · 6 prompts · 3 resources · 6 agent skills**

Works with Claude (Desktop, Code, and web), Cursor, VS Code, Windsurf, Cline,
Zed, Gemini CLI, ChatGPT, and any other MCP-compatible client — over stdio or
Streamable HTTP.

---

## Install

### Smithery (recommended)

```bash
npx -y @smithery/cli install misar/misarseo-mcp --client claude
```

### Claude Code

```bash
claude mcp add misarseo -- npx -y @misarseo/mcp@latest
```

### Manual (any client)

```json
{
  "mcpServers": {
    "misarseo": {
      "command": "npx",
      "args": ["-y", "@misarseo/mcp@latest"],
      "env": { "MISARSEO_API_KEY": "mseo_your_key_here" }
    }
  }
}
```

Ready-made configs for every client live in [`connectors/`](./connectors).

### Remote (no install)

```json
{
  "mcpServers": {
    "misarseo": {
      "type": "streamable-http",
      "url": "https://api.misar.io/seo/mcp",
      "headers": { "Authorization": "Bearer mseo_your_key_here" }
    }
  }
}
```

---

## Authentication

Create an API key at https://seo.misar.io/ai (AI & MCP → create an API key) — it starts with
`mseo_` — and give it to the server in one of three ways: the
`MISARSEO_API_KEY` environment variable, your MCP client's `env` block, or
`{ "api_key": "mseo_…" }` in `~/.misarseo/config.json`.

Self-hosted instances: set `MISARSEO_BASE_URL`.

---

## Tools

| Tool | Description |
| --- | --- |
| `list_projects` | Lists the active projects in the user's organization. |
| `get_dashboard` | One card per active project in the caller's organization: latest audit health, rank-tracker status, and trailing-7-day web-analytics sessions. |
| `research_keywords` | Research keyword data (search volume, difficulty, CPC, related ideas) for 1-5 seed keywords in one call — one research run per seed. |
| `save_keywords` | Save keywords to a project's saved-keywords list. |
| `list_saved_keywords` | Lists keywords saved to a project, with whatever metrics have been cached for them (search volume, difficulty, CPC) and their tags. |
| `classify_keyword_intent` | Classify 1-200 keywords' search intent from their wording: informational, navigational, commercial, transactional, or unknown. |
| `get_keyword_potential` | Parent Topic and Traffic Potential for one keyword, built from real SERP overlap across a BOUNDED set (up to 5) of related keywords — not a full keyword-to-URL reverse index, which this codebase's free stack does not have. |
| `get_keyword_serp_overview` | Per-keyword SERP overview: a fresh live SERP snapshot for the keyword, PLUS — when this exact keyword happens to already be tracked in this project's rank tracking — its historical position trend and SERP volatility, read straight from the SAME rank-tracking services (`get_rank_keyword_history`/`get_rank_volatility_index`) already use. |
| `get_keyword_strategy` | Keyword Strategy Builder: a volume -> cluster -> page -> brief pipeline over 1-500 pasted keywords, composed entirely from existing pieces — the same bulk keyword lookup, the same shared-phrase clustering engine the saved-keyword Topic Clusters feature and get_topic_research both already use, a text-match against the project's own crawled pages, and a BOUNDED number of AI-gateway content-brief calls (one per cluster among the top few by measured volume, gated by the shared AI-gateway budget). |
| `get_topic_research` | Content ideas for a seed keyword, composed from three sources this codebase already fetches for other features: the SERP for the seed (titles of pages already ranking for it), PAA-style questions (real autocomplete completions reframed as questions), and autocomplete keyword suggestions. |
| `get_keyword_list_share_of_voice` | Share of Voice across a saved keyword list: the project's own domain plus up to 3 competitor domains, scored over a saved-keyword tag ("a saved keyword list" in this codebase IS a saved-keyword tag — omit tagId/tagName to mean every saved keyword in the project). |
| `get_domain_overview` | Returns a high-level view of a domain's organic footprint: estimated organic traffic, organic keyword count, and a 0-100 domain authority score. |
| `get_domain_batch` | Domain batch analysis: one authority row per domain, up to 100 at once. |
| `get_domain_authority_history` | Domain-authority history: the stored trend of dated authority snapshots for one project+domain, oldest first. |
| `capture_domain_authority_snapshot` | Capture a domain-authority snapshot now: calls the same free resolver get_domain_overview already uses and records today's reading, so get_domain_authority_history has a trend to read back. |
| `find_serp_competitors` | Compares domains competing in search results for a supplied keyword set. |
| `get_keyword_gap` | Compares the project's own domain against up to 3 competitor domains and classifies every keyword a competitor ranks for as missing / behind / tied / ahead / unknown. |
| `list_competitor_monitors` | Competitor page change detection: the specific competitor URLs monitored for a project, with `lastCheckedAt` (null until the first scheduled check reaches it). |
| `add_competitor_monitor` | Start monitoring one competitor page for changes: title/meta, a real line-level content diff (added/removed/unchanged line counts — never a fabricated similarity score), outbound links, and structured-data types. |
| `remove_competitor_monitor` | Stops monitoring one competitor URL. |
| `get_competitor_monitor_changes` | Timeline of DETECTED changes for one monitored competitor URL, newest first — a check that found nothing does not appear here. |
| `get_rank_tracker` | Read-only access to rank tracker configs and their latest results. |
| `add_rank_tracking_keywords` | Adds keywords to an existing rank tracker config. |
| `get_rank_config_trend` | Per-run keyword-position-distribution buckets for a tracker, oldest first — how many tracked keywords sit in the top 3, 4-10, 11-20, or outside the top 20, per check run. |
| `get_rank_movers` | Newcomers and fast climbers for a tracker's OWN domain, over a window. |
| `get_rank_keyword_history` | Per-keyword position series over time, oldest first — the same series the app's SERP-history chart draws for one tracked keyword. |
| `get_rank_volatility_index` | SERP volatility index across recent runs — how much this tracker's own positions churned run over run, derived entirely from already-stored history (no new SERP calls). |
| `get_rank_ai_overview_trend` | AI Overview presence trend across a tracker's keywords, oldest first — what share of tracked keywords showed Google's AI Overview in the SERP, per check run, and how that has moved over time. |
| `list_rank_annotations` | Chart notes on a rank tracker's own timeline — 'deployed new title tags', 'algorithm update' — oldest first. |
| `add_rank_annotation` | Adds a chart note to a rank tracker's own timeline. |
| `remove_rank_annotation` | Removes a chart note from a rank tracker's own timeline. |
| `list_rank_cannibalisation` | Tracked keywords whose latest ranking URL is not the target URL you declared for them (see set_rank_keyword_target_url). |
| `set_rank_keyword_target_url` | Sets or clears the URL you intend to rank for a tracked keyword. |
| `list_rank_keyword_tags` | Lists the tags in use on one rank tracker, plus the project's whole tag vocabulary. |
| `update_rank_keyword_tag` | Attaches or detaches ONE tag across a selection of tracked keywords (up to 500 keyword IDs per call). |
| `get_brave_search_rank_check` | Checks where a project's domain (or an explicit targetDomain) ranks in REAL Brave Search results for one keyword. |
| `create_rank_tracker` | Creates a rank tracker config (domain + market + devices + schedule) for a project and returns its configId. |
| `list_rank_tracking_keywords` | Lists the keywords tracked by ONE rank tracker: `{ keywords, totalCount, page, pageSize }`, each row `{ id, configId, keyword, searchVolume, keywordDifficulty, cpc, metricsFetchedAt, createdAt }`. |
| `remove_rank_tracking_keywords` | Removes keywords from a rank tracker by their tracking-keyword IDs (from list_rank_tracking_keywords). |
| `start_site_audit` | Starts a MisarSEO site crawl/audit from startUrl. |
| `get_site_audit_status` | Progress of a site audit started by start_site_audit: `{ status, pagesCrawled, pagesTotal, lighthouseTotal, lighthouseCompleted, lighthouseFailed, currentPhase, startedAt, completedAt }`. |
| `get_audit_comparison` | Compare a site audit against an earlier one: which issues are new, which were fixed, how many persist, and the health-score delta. |
| `get_audit_core_web_vitals` | Core Web Vitals report: LCP/INP/CLS per page/strategy this audit already ran Lighthouse against, classified against Google's own published thresholds. |
| `get_audit_https_report` | HTTPS Report: percentage of pages secure, mixed-content and insecure-link counts, homepage HTTPS-path status, and HTTP URLs in an HTTPS site's sitemap — for a project's latest completed crawl (or a named earlier one). |
| `get_audit_internal_links` | Internal Link Report: outbound/inbound internal link counts per page, orphan pages, dead ends, and click-depth distribution for a project's latest completed crawl (or a named earlier one). |
| `get_audit_structured_data` | Structured Data Report: pages grouped by schema.org @type, which pages have none, and which pages carry an unparseable JSON-LD block — for a project's latest completed crawl (or a named earlier one). |
| `get_search_console_performance` | Query the connected Search Console property's Search Analytics: clicks, impressions, CTR, and average position by query/page/country/device/date. |
| `inspect_urls` | Run Google Search Console's URL Inspection on up to 10 URLs of the connected property: index/coverage state, last crawl time, Google-selected vs declared canonical, and mobile/rich-results verdicts. |
| `get_search_console_coverage` | MisarSEO's own index-coverage report for the connected property: which URLs are indexed, excluded, or errored, and why. |
| `get_search_console_hourly_performance` | MisarSEO's own retained HOURLY Search Console totals for the connected property — the hourly counterpart to get_search_console_performance's daily archive. |
| `get_search_console_sitemaps` | Search Console sitemaps.list/sitemaps.get: every sitemap submitted for the connected property and its processing status (pending, last downloaded, warning/error counts, per-content-type submitted counts), or one named sitemap. |
| `get_gsc_ctr_by_position` | CTR by ranking position: the site's own historical Search Console clicks/impressions bucketed by position (1-3, 4-10, 11-20, 21+ — mirroring this codebase's existing rank-tracking position-distribution buckets), with the REAL clicks-weighted CTR this project achieved at each bucket. |
| `get_gsc_anonymous_queries` | Anonymized-query estimate: Search Console omits some rare queries entirely from a query-dimensioned response to protect searcher privacy (Google's own documented behaviour, not this codebase's assumption). |
| `get_cannibalisation_report` | Finds the queries where the project's connected Search Console property competes with itself: two or more of its own pages drawing impressions for the same query, splitting that query's clicks, click signals and ranking history across URLs. |
| `get_content_decay_report` | Finds pages whose clicks declined by a meaningful amount between two adjacent windows, read entirely from MisarSEO's own archived Search Console history (the top-200-per-day per-page archive the nightly sync fills in). |
| `get_backlinks_overview` | Returns a backlinks profile summary (total backlinks, referring domains, referring pages, rank) plus the top referring domains by backlink count. |
| `get_link_intersect` | Finds the domains that link to 2–4 of the project's competitors but NOT to the project itself. |
| `list_disavow_entries` | Disavow file management: every disavow entry for a project, oldest first. |
| `add_disavow_entry` | Disavow file management: mark one URL or domain for disavowal. |
| `remove_disavow_entry` | Disavow file management: remove one disavow entry by id (from list_disavow_entries). |
| `export_disavow_file` | Disavow file management: export a project's disavow entries as the exact .txt content Google's disavow tool accepts (support.google.com/webmasters/answer/2648487) — one bare URL per line to disavow that exact page, or `domain:<host>` to disavow an entire domain and its subdomains. |
| `get_backlink_anchors` | Anchor-text distribution for a domain or URL, one page at a time: which anchor texts link to it, with backlinks, referring domains, referring pages and dofollow links per anchor. |
| `get_content_optimizer_report` | On-page recommendations and an AI content grade for one page, benchmarked against the pages currently ranking for its target keyword, built together — one AI-gateway call produces both the grade and the recommendations). |
| `get_content_page_metrics` | Lightweight on-page metrics for one arbitrary URL — the content optimizer's keyword-free, AI-free sibling. |
| `run_brand_radar_scan` | Scans real AI-answer engines and search citations for brand mentions, Share of Voice against named competitors, and cited sources. |
| `get_brand_radar_scan_status` | Status of a Brand Radar scan started by run_brand_radar_scan, by its `jobId`. |
| `explore_ai_prompt` | Runs one prompt through up to 4 model personas and returns each answer verbatim, with real citations when webSearch is on. |
| `research_ai_prompts` | Turns a seed topic into candidate prompts worth tracking (real Google/Bing autocomplete completions reframed as questions) plus observed mention-rate signals from this project's own already-tracked prompts. |
| `compare_ai_competitor_positioning` | Runs ONE prompt through the explore_ai_prompt pipeline and checks a brand plus its named competitors against the SAME real per-model answers for mentions and citations. |
| `get_direct_vendor_answers` | Runs a prompt against up to 5 REAL, directly-verified vendor models — you_com (You.com Answer API), deepseek, grok (xAI), meta_ai (Meta's Model API) and minimax — each called through that vendor's own public API. |
| `get_brand_scan_trend` | The recorded AI-visibility history for one brand or domain: mentions, cited sources and competitors seen at each past Brand Radar scan, oldest first. |
| `list_brand_monitors` | Lists a project's brand monitors — targets re-scanned by Brand Radar on a schedule rather than only when run_brand_radar_scan is called. |
| `upsert_brand_monitor` | Creates or replaces a brand monitor — the whole schedule and competitor list, not single fields. |
| `delete_brand_monitor` | Deletes a brand monitor, stopping its scheduled scans. |
| `list_tracked_prompts` | Lists a project's tracked prompts — prompts re-run through explore_ai_prompt's real answer pipeline on a schedule and diffed against the previous check for mention/citation drops. |
| `upsert_tracked_prompt` | Creates or replaces a tracked prompt — the whole model list and schedule, not single fields. |
| `delete_tracked_prompt` | Deletes a tracked prompt, stopping its scheduled checks. |
| `get_tracked_prompt_trend` | Observed history for one tracked prompt — one point per real scheduled check (`mentionedByCount`/`citedByCount` out of `successfulModelCount`), oldest first. |
| `get_unlinked_mentions_report` | Unlinked brand mentions: searches the free SERP backend for `brand` as a QUERY, then checks whether each result page already links to `trackedDomain`. |
| `get_media_monitoring_report` | Media Monitoring: get_unlinked_mentions_report's candidates filtered to known social/forum/news platform domains, optionally merged with the citation-platform breakdown from a Prompt Explorer scan you already ran for the same brand. |
| `search_local_businesses` | Searches local business listings near a coordinate. |
| `get_google_business_questions` | Fetches question-and-answer rows for one business keyword. |
| `run_local_nap_audit` | Compare a claimed business Name/Address/Phone against listings the free OpenStreetMap business search finds near the claimed location. |
| `get_local_pack_rank` | Read-only access to local pack rank check configs and their latest check. |
| `get_local_rank_grid` | Read-only access to geo-grid rank-tracking configs and their latest run. |
| `get_gbp_profile` | Read-only Google Business Profile listing profile for the project's linked location: title, categories, phone, website, description, hours-period count, and which of Google's attribute taxonomy entries are set. |
| `get_gbp_performance` | Read-only Business Profile Performance API metrics for the project's linked location over an inclusive date range. |
| `get_gbp_reviews` | Read-only reviews for the project's linked Google Business Profile location, one Google-paginated page at a time.. |
| `reply_to_gbp_review` | Reply to (or overwrite the reply on) one review, by reviewId from get_gbp_reviews. |
| `get_gbp_optimization` | Completeness/quality score and AI-grounded optimization recommendations for the project's linked Google Business Profile location. |
| `list_gbp_locations` | Every Google Business Profile account and location this deployment's operator credential can manage — the picker data for set_gbp_connection. |
| `get_gbp_connection` | The project's currently linked Google Business Profile location, or `{ connection: null }` when none is linked yet. |
| `set_gbp_connection` | Links (or repoints) a project to a Google Business Profile location. |
| `disconnect_gbp` | Removes the project's link to its Google Business Profile location. |
| `list_gbp_posts` | Posts published on the project's linked Google Business Profile location. |
| `create_gbp_post` | Publishes a new "What's New" post on the linked Google Business Profile location. |
| `delete_gbp_review_reply` | Removes the owner's published reply from one Google review (reviewId from get_gbp_reviews). |
| `create_local_pack_rank_config` | Creates a local pack rank check config: where businessName sits in Google's local pack for one keyword at one location. |
| `delete_local_pack_rank_config` | Deletes a local pack rank check config, INCLUDING its whole check history. |
| `run_local_pack_rank_check` | Runs a local pack rank check now — one live scrape of Google's public local search results (not the paid Places API). |
| `create_local_rank_grid_config` | Creates a geo-grid rank-tracking config: a 3x3 grid of points around a centre coordinate, checking ORGANIC rank for one keyword and domain from each point. |
| `delete_local_rank_grid_config` | Deletes a geo-grid rank-tracking config, INCLUDING its whole run and point history. |
| `run_local_rank_grid` | Runs a geo-grid rank check now — up to 9 live SERP calls plus up to 9 reverse-geocode calls. |
| `get_web_analytics_summary` | Sessions/pageviews/bounce-rate time series for a project's own tracking snippet. |
| `get_web_analytics_top_pages` | Top pages by view count, plus separate entry-page and exit-page breakdowns, for a project's own tracking snippet. |
| `get_web_analytics_sources` | Referrer/channel/UTM breakdown for a project's own tracking snippet, including AI referral attribution: aiReferral.bySource breaks the ai-referral channel out by assistant (chatgpt/claude/perplexity/gemini/copilot/you/poe). |
| `get_web_analytics_devices` | Device/browser/OS breakdown for a project's own tracking snippet. |
| `list_ga4_properties` | Every GA4 property the caller's connected Google Analytics grant can access — the data source for picking which property to bind to a project (see set_ga4_property). |
| `set_ga4_property` | Link (or repoint) a project's Google Analytics property. |
| `disconnect_ga4` | Unlink a project's Google Analytics property. |
| `get_ga4_performance_summary` | MisarSEO's own retained daily Google Analytics totals for the connected property: sessions, activeUsers, newUsers, engagementRate, bounceRate, conversions, screenPageViews. |
| `get_ga4_channel_breakdown` | MisarSEO's own retained daily GA4 channel breakdown (sessionDefaultChannelGroup) for the connected property — isolating Organic Search from every other acquisition channel, the SEO-relevant signal GA4 adds beyond Search Console's own click/impression data. |
| `get_ga4_landing_pages` | MisarSEO's own retained daily GA4 landing-page breakdown for the connected property: sessions/engagement/conversions per landing page, ordered by sessions descending within each day. |
| `log_analyzer_list_uploads` | A project's server-log uploads and their parse status — the Log File Analyzer / Bot Analytics feature. |
| `log_analyzer_upload` | Upload a server access log for background parsing (Log File Analyzer / Bot Analytics). |
| `log_analyzer_daily_summary` | Bot hit counts per (day, bot category, bot label, status code, content-type bucket) across every log upload in the date range — powers a time-series, status-code, or content-type view of bot traffic. |
| `log_analyzer_top_paths` | The paths bots hit most, per (bot category, bot label, path, status code) — the busiest-paths table of Bot Analytics. |
| `list_link_prospects` | Link Building Tool: every prospect for a project, newest first, each enriched with a LIVE domain-authority read (never cached, never an invented score). |
| `add_link_prospect` | Link Building Tool: add one prospect domain/page to a project's list. |
| `update_link_prospect` | Link Building Tool: edit a prospect's editable fields (url/label/targetUrl/contact fields) — only fields given here are changed. |
| `update_link_prospect_status` | Link Building Tool: move a prospect through the outreach-status pipeline — prospected -> contacted -> replied -> link_placed/declined/no_response ('declined'/'no_response' can loop back to 'contacted' for a re-approach). |
| `remove_link_prospect` | Link Building Tool: remove one prospect by id (from list_link_prospects), along with its activity log. |
| `list_link_prospect_activity` | Link Building Tool: a prospect's activity log — every manually-typed note plus every auto-recorded status change, newest first. |
| `add_link_prospect_note` | Link Building Tool: add one manual activity-log entry to a prospect, e.g. |
| `import_link_prospects_csv` | Link Building Tool: bulk-add up to 500 prospects at once from already-parsed rows (each with at least a domain). |
| `export_link_prospects_csv` | Link Building Tool: export a project's prospect list as CSV text. |
| `get_bing_site_overview` | Bing's own view of a project's domain: daily search performance (clicks/impressions), per-query stats, own-site inbound links, remaining URL Submission quota, crawl diagnostics (crawl stats, crawl issues, crawl settings), submitted feeds and query-parameter settings — read straight from the Bing Webmaster API. |
| `get_bing_backlinks` | GetLinkCounts: own-site inbound-link page list for a project's matched Bing site — the focused, single-call form of the backlinks field already embedded in get_bing_site_overview. |
| `get_bing_url_links` | GetUrlLinks: the inbound links (anchor text + source URL) pointing at one specific page on a project's matched Bing site, read straight from the Bing Webmaster API. |
| `get_bing_url_info` | GetUrlInfo + optionally GetChildrenUrlInfo: index/crawl metadata (anchor count, discovery/last-crawled dates, HTTP status, whether Bing considers it a page) for one URL on a project's matched Bing site, and, when includeChildren is set, the same metadata for every URL Bing discovered under it. |
| `get_bing_keyword_research` | GetKeyword + GetKeywordStats + GetRelatedKeywords: real Bing impression data for a query, its recent weekly history, and related queries — read straight from the Bing Webmaster API. |
| `get_bing_detail_stats` | GetQueryTrafficStats + GetPageStats + GetPageQueryStats + GetQueryPageStats + GetQueryPageDetailStats: per-query and per-page search-performance detail for a project's matched Bing site. |
| `get_bing_feed_details` | GetFeedDetails: the same Feed shape as one entry from Bing's GetFeeds list, for one specific feed URL on a project's matched site. |
| `submit_bing_content` | SubmitContent: pushes a page's full content (a base64-encoded HTTP message) directly to Bing for a project's matched site, bypassing a crawl. |
| `submit_bing_feed` | SubmitFeed: submits a sitemap/feed URL to Bing for a project's matched site. |
| `save_bing_crawl_settings` | SaveCrawlSettings: overwrites a project's matched Bing site's crawl-rate/AJAX-crawling config. |
| `update_bing_blocked_url` | AddBlockedUrl + RemoveBlockedUrl: tell Bing to stop, or resume, showing one URL in search results for a project's matched site. |
| `update_bing_query_parameter` | AddQueryParameter + RemoveQueryParameter + EnableDisableQueryParameter: add, remove, or toggle one query-string parameter Bing is told to ignore when canonicalizing URLs for a project's matched site. |
| `list_bing_sites` | Every site the caller's connected Bing Webmaster OAuth grant can access — the data source for picking which site to bind to a project (see set_bing_site). |
| `set_bing_site` | Link (or repoint) a project's Bing Webmaster site. |
| `disconnect_bing` | Unlink a project's Bing Webmaster site. |
| `submit_indexnow` | Submit up to 10,000 of a project's own URLs to IndexNow (relayed to Bing, Yandex, Seznam and Naver) so they are re-crawled without waiting for the next scheduled crawl. |
| `get_yandex_site_overview` | Yandex's own view of a project's domain: the indexing summary — including the Site Quality Index (SQI), a third independent authority signal alongside OpenPageRank and Tranco — and popular search queries, read straight from the Yandex Webmaster API. |
| `reindex_yandex_url` | Asks Yandex Webmaster to re-crawl one specific URL on a project's matched host. |
| `list_yandex_hosts` | Every host the caller's connected Yandex Webmaster OAuth grant can access — the data source for picking which host to bind to a project (see set_yandex_host). |
| `set_yandex_host` | Link (or repoint) a project's Yandex Webmaster host. |
| `disconnect_yandex` | Unlink a project's Yandex Webmaster host. |
| `get_baidu_connection` | The project's current Baidu Webmaster (百度搜索资源平台) connection, plus today's push-quota usage. |
| `set_baidu_connection` | Set (or replace) a project's Baidu Webmaster site + push token. |
| `disconnect_baidu` | Remove a project's Baidu Webmaster connection. |
| `submit_baidu_urls` | Push a project's own URLs to Baidu (data.zz.baidu.com/urls) for expedited crawling. |
| `list_ahrefs_projects` | Every Rank Tracker AND Site Audit project the caller's connected Ahrefs Connect grant can access — the data source for picking which project(s) to bind to a MisarSEO project (see set_ahrefs_project). |
| `set_ahrefs_project` | Bind (or repoint) ONE of a project's two independent Ahrefs project types — `projectType` selects `rank_tracker` or `site_audit`. |
| `disconnect_ahrefs` | Full disconnect: drops BOTH the Rank Tracker and Site Audit bindings and the stored grant. |
| `list_patches` | Patches: every title/metaDescription/canonical/redirect fix drafted for a project, newest first, one active row per (page, field). |
| `draft_patch` | Patches: drafts a title/metaDescription/canonical/redirect fix for one page's finding. |
| `batch_draft_patches` | Patches: AI-drafts title AND metaDescription for up to 10 pages in one call. |
| `publish_patch` | Patches: makes a drafted fix live — visible in the project's public manifest, which the embedded snippet (or, for redirects, an operator-deployed Worker) reads from the visitor's browser. |
| `revert_patch` | Patches: stops serving a published fix — instant, since publishing only ever controlled visibility in the public manifest, never the audited site's own origin content. |
| `list_patch_auto_publish_rules` | Patches: every issue type this project auto-publishes a freshly AI-drafted patch for, immediately on draft (capped at 20 auto-publishes per project per day). |
| `enable_patch_auto_publish` | Patches: from now on, a freshly AI-drafted patch for this issue type publishes immediately instead of waiting for a manual publish_patch call — capped at 20 auto-publishes per project per day. |
| `disable_patch_auto_publish` | Patches: stops auto-publishing freshly AI-drafted patches for this issue type — future drafts wait for a manual publish_patch call again. |
| `list_report_definitions` | Lists a project's report definitions, each carrying `widgetCount`. |
| `create_report_definition` | Creates a report definition with a chosen set of widgets, in print order. |
| `get_report_definition` | Gets a report definition's name and ordered widget types. |
| `rename_report_definition` | Renames a report definition. |
| `delete_report_definition` | Deletes a report definition. |
| `set_report_widgets` | Replaces a report definition's whole widget list, in print order. |
| `render_report_definition` | Renders a report definition — fetches ONLY its selected widgets, not a fixed set. |
| `get_report_schedule` | Gets a report definition's schedule, if it has one. |
| `upsert_report_schedule` | Creates or replaces a report definition's schedule — the whole interval + recipient list, not individual fields. |
| `delete_report_schedule` | Deletes a report definition's schedule. |
| `list_portfolios` | Lists the caller organization's portfolios, each carrying `projectCount`. |
| `create_portfolio` | Creates a portfolio. |
| `get_portfolio` | One card per member project (same shape get_dashboard returns — no GSC, no backlinks, see its own description for why) plus aggregate totals. |
| `rename_portfolio` | Renames a portfolio. |
| `delete_portfolio` | Deletes a portfolio. |
| `add_portfolio_projects` | Adds projects to a portfolio. |
| `remove_portfolio_projects` | Removes projects from a portfolio. |
| `get_usage` | Plan tier, credits remaining, and every quota/count dimension tracked against it for the caller's organization. |

## Prompts

Reusable workflows your client exposes as slash-commands.

| Prompt | Description |
| --- | --- |
| `keyword_research_plan` | Research a seed topic, qualify the keywords by intent and potential, and save a shortlist. |
| `competitor_gap_analysis` | Find the keywords and linking domains competitors have that the project does not. |
| `site_audit_review` | Turn the latest site audit into a prioritised technical fix list. |
| `search_console_opportunities` | Mine Search Console for striking-distance queries, cannibalisation and decaying pages. |
| `ai_visibility_check` | Check how a brand shows up in AI answers and where it is mentioned without a link. |
| `weekly_rank_report` | Produce a stakeholder-ready weekly rank-tracking summary. |

## Resources

Read-only context an agent can attach without spending a tool call.

| URI | Description |
| --- | --- |
| `misarseo://projects` | The organization's active MisarSEO projects with their ids and domains. |
| `misarseo://dashboard` | One card per project: latest audit health, rank-tracker status and trailing-7-day web-analytics sessions. |
| `misarseo://account/usage` | Plan tier, credits remaining, and each quota (keyword lookups, audits, Brand Radar scans, log uploads) with what is used. |

## Agent skills

Bundled in [`skills/`](./skills) — guidance an agent loads when a task matches.

| Skill | Use when |
| --- | --- |
| `ai-search-visibility` | Measure how a brand appears in AI answers and AI-search citations with MisarSEO — Brand Radar share of voice, prompt exploration, prompt research and unlinked mentions. Use for "are we showing up in ChatGPT", "AI search visibility", "GEO", "LLM mentions", "AI Overviews", or brand-mention questions. |
| `competitor-gap-analysis` | Compare a MisarSEO project against competitors — keyword gap, SERP competitors, link intersect and competitor page-change monitoring. Use for "who are my competitors", "what keywords am I missing", "where do competitors get links", or "watch this competitor's page". |
| `keyword-research` | Research, qualify and save keywords in MisarSEO — volume, difficulty, intent, traffic potential and topic clusters. Use for "find keywords for…", "what should we target", "keyword ideas", "is this keyword worth it", or building a content plan from a seed topic. |
| `rank-tracking-report` | Report on and organise MisarSEO rank tracking — positions, visibility trend, movers, volatility, wrong-page rankings, chart notes and keyword tags. Use for "how are my rankings", "weekly rank report", "what moved", "track these keywords", or "which page ranks for this keyword". |
| `search-console-insights` | Turn Google Search Console data in MisarSEO into actions — striking-distance queries, keyword cannibalisation, decaying pages, real CTR by position and indexing gaps. Use for "what's my search traffic doing", "quick SEO wins", "why did traffic drop", "pages competing with each other", or anything mentioning Search Console / GSC. |
| `technical-site-audit` | Read a MisarSEO site audit and turn it into a ranked technical fix list — HTTPS, internal links, structured data, Core Web Vitals, indexing — and optionally ship title/meta fixes as patches. Use for "audit my site", "technical SEO issues", "why isn't this page indexed", "orphan pages", or "fix my titles". |

---

## Safety

Destructive and irreversible actions are annotated (`destructiveHint`) so
clients can prompt before running them. The skills instruct agents to confirm
before anything that sends mail, publishes content, or is otherwise visible to
other people.

Discovery (`initialize`, `tools/list`, `prompts/list`, `resources/list`)
never requires credentials, so registries can index the server without one.
Every action does.

---

## Links

- Website — https://www.misarseo.com
- App — https://seo.misar.io
- Documentation — https://docs.misar.io/seo/mcp
- Smithery — https://smithery.ai/server/misar/misarseo-mcp
- npm — https://www.npmjs.com/package/@misarseo/mcp
- Source — https://github.com/Misar-AI/misarseo-mcp

MIT © [Misar.AI](https://misar.io)
