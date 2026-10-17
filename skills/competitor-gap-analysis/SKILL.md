---
name: competitor-gap-analysis
description: Compare a MisarSEO project against competitors — keyword gap, SERP competitors, link intersect and competitor page-change monitoring. Use for "who are my competitors", "what keywords am I missing", "where do competitors get links", or "watch this competitor's page".
---

# Competitor gap analysis

## 1. Check the project's own domain first

Call `list_projects`. `get_keyword_gap` and `get_link_intersect` read the
project's domain from the project record and **refuse to run without it** — it
cannot be passed as an argument. If `domain` is null, stop and ask the user to
set it in the MisarSEO dashboard.

## 2. Find who actually competes (credits on the paid provider)

`find_serp_competitors` takes the user's keyword set and returns the domains
that share those SERPs. On the free provider only organic results count and
`visibility` / traffic estimates are unmeasured — if `unmeasuredForSort` equals
the row count, the list is not ranked by anything; say so rather than calling
the first row the strongest competitor.

## 3. Keyword gap (credits: one lookup per domain, cached 12h)

`get_keyword_gap` with up to 3 `competitorDomains`. Re-running with a different
sort or classification filter is free inside the cache window — do that instead
of a new comparison.

- `missing` — a competitor ranks and the project provably does not. Report these.
- `behind` — both rank, the competitor higher.
- `unknown` — the project's own slice ran out above that keyword's volume.
  Nothing was measured. **Never present `unknown` as a gap.**
- `unavailable: true` — no provider has a ranked-keyword source; no comparison
  happened at all.

## 4. Link intersect — the most expensive report

`get_link_intersect` (2–4 competitors) costs up to 9 upstream requests per run.
**Tell the user the cost and get a go-ahead before running it**, and before
sweeping several competitor sets. Re-running with a different threshold or sort
is free.

- Lead with `provenRows`. An `unproven` row may already link to the project —
  label it unconfirmed, never as an opportunity.
- `unavailable: true` (free provider) means no backlink graph exists here. The
  zero counts beside it are not measurements.

## 5. Watch a competitor page (free, reversible)

`add_competitor_monitor` starts a daily check of one URL; the first snapshot
arrives on the next scheduled pass, not immediately. Read changes with
`get_competitor_monitor_changes`. `remove_competitor_monitor` **deletes the
URL's whole change history** — confirm before calling it.

## Report

Rank opportunities by value: missing keywords with real volume first, then
proven link prospects. For each, name the specific page or outreach target and
one next action.
