---
name: rank-tracking-report
description: Report on and organise MisarSEO rank tracking — positions, visibility trend, movers, volatility, wrong-page rankings, chart notes and keyword tags. Use for "how are my rankings", "weekly rank report", "what moved", "track these keywords", or "which page ranks for this keyword".
---

# Rank tracking report

Every rank-tracking read is free — it reads stored check results and runs no
SERP query. New checks run on the tracker's schedule or from the MisarSEO
dashboard; nothing here triggers one.

## 1. Find the tracker

`get_rank_tracker` without `trackerId` lists the project's trackers. Call it
again with the tracker's id for the latest position per keyword. No tracker
yet? `create_rank_tracker` makes one (free) and `add_rank_tracking_keywords`
fills it; positions appear after its first scheduled check.
`list_rank_tracking_keywords` lists what a tracker tracks (no positions), and
`remove_rank_tracking_keywords` drops keywords while keeping their history.

**Null positions.** A null means "not found within the depth searched". The
response states that depth — quote "not in the top N" using *that* N, not the
tracker's configured `serpDepth`. Never report a null as "dropped out".

`previousPosition` is roughly a week old, but falls back to the earliest
snapshot when the history is shorter — check before calling it week-over-week.

## 2. Trend, movers and volatility

| Tool | Use |
|---|---|
| `get_rank_config_trend` | keywords per bucket (top 3 / 4–10 / 11–20 / not ranking) per run |
| `get_rank_movers` | keywords the **tracked domain** newly ranks for, and fast climbers |
| `get_rank_volatility_index` | how much positions churned run over run |
| `get_rank_keyword_history` | one keyword's series |
| `get_rank_ai_overview_trend` | share of tracked keywords showing an AI Overview |

`get_rank_movers` is not competitor discovery — a "newly ranking" entry is a
keyword the tracked domain started ranking for. `volatilityIndex` only means
something relative to the same tracker's history; never call a value "high"
without that comparison.

## 3. Wrong-page rankings

`set_rank_keyword_target_url` declares the page that should rank;
`list_rank_cannibalisation` then lists keywords where a different page won.

## 4. Organise (reversible writes — confirm intent, no approval loop needed)

- `add_rank_tracking_keywords` — duplicates are skipped, so `added` can be
  lower than what you sent. It can fail on the plan's tracked-keyword cap; it
  does not run a check.
- `update_rank_keyword_tag` — one tag per call. Check `list_rank_keyword_tags`
  first: an unknown `tagName` on `add` **creates a project-wide tag**. On add,
  `changed: null` means "not measured" — report `keywordCount` instead.
- `add_rank_annotation` / `remove_rank_annotation` — chart notes such as
  "deployed new titles"; at most 100 per tracker.

## Report

Visibility trend, biggest movers (with the keyword and positions), volatility
versus this tracker's own history, wrong-page rankings to fix, and one action
for next week. Keep it under 400 words.
