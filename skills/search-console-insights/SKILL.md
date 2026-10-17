---
name: search-console-insights
description: Turn Google Search Console data in MisarSEO into actions — striking-distance queries, keyword cannibalisation, decaying pages, real CTR by position and indexing gaps. Use for "what's my search traffic doing", "quick SEO wins", "why did traffic drop", "pages competing with each other", or anything mentioning Search Console / GSC.
---

# Search Console insights

All of these are free (Search Console is first-party data). Some spend Google's
per-property request quota and are rate limited; the archive-based ones make no
Google call at all.

## 1. Branch on connection state first

Most reports return a `state`. Read it before any number:

| state | Meaning | What to tell the user |
|---|---|---|
| `not_connected` | No property bound | Connect Search Console in the MisarSEO dashboard |
| `requires_reconnect` | Google grant revoked or expired | Reconnect it |
| `no_search_data` / `no_data` / `insufficient_history` | Nothing in the window | Not measured — never "no problems found" |
| `analysed` | Measured | Read the findings |

## 2. Performance and striking distance (live, spends quota)

`get_search_console_performance` with `dimensions` `["query", "page"]`. Look
for queries averaging positions 8–20 with real impressions — the cheapest
ranking wins. Rules for reading it:

- `ctr` is a 0–1 fraction; `position` is a 1-based average.
- The last ~3 days are incomplete. Dates are Pacific Time.
- Google withholds anonymised queries, so any total you sum is a **floor**.
  `get_gsc_anonymous_queries` estimates how much is hidden.
- When `hasMore` is true you have seen part of the match set — page with
  `startRow` before quoting any total.

## 3. Problems

- `get_cannibalisation_report` (live) — queries where two or more of the
  site's own pages split impressions. Each finding names the competing URLs.
- `get_content_decay_report` (archive) — pages whose clicks fell between two
  adjacent windows. A page reporting `recentClicks: 0` fell out of the archive
  entirely — the most severe decay, not a data hole.
- `get_gsc_ctr_by_position` (archive) — the site's **own** CTR per position
  bucket. Use it instead of generic industry CTR curves.

## 4. Indexing

`inspect_urls` for up to 10 specific pages; `get_search_console_coverage` for
the nightly site-wide scan; `get_search_console_sitemaps` for submitted
sitemaps and their errors.

## Report

Four sections: striking-distance queries, cannibalised queries (with the page
to keep), decaying pages (with the likely cause), indexing problems. Each item
gets one concrete action. If a report was not measured, say which and why.
