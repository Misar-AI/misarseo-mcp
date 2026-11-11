---
name: ai-search-visibility
description: Check how a brand shows up in AI-search surfaces with MisarSEO using only non-AI data — prompt research, unlinked mentions, media mentions and AI-referrer traffic. Use for "AI search visibility", "GEO", "AI Overviews" or brand-mention questions. Features that needed an AI model answer AI_UNSUPPORTED.
---

# AI search visibility

Use the free, non-AI steps below. The AI-answer steps are retired.

## 1. Find prompts worth checking — free

`research_ai_prompts` turns a seed topic into candidate prompts (real
autocomplete completions reframed as questions). It is **not** prompt search
volume — no such number exists here, so never present one.

## 2. Prompt exploration and Brand Radar scans — retired

> **Retired 2026-11-10: AI models are banned.**

`explore_ai_prompt`, `run_brand_radar_scan` and `get_direct_vendor_answers`
needed a model to answer prompts. MisarSEO never calls an AI model; model-like
work goes only to the SansLang sidecar `/v1`, which cannot answer free-form
prompts. These tools answer `AI_UNSUPPORTED` (HTTP 422). Report that once as
"not supported", never call them again to retry, and never present a model
answer, share of voice or citation that the tool did not return.

## 3. Unlinked and media mentions — free

`get_unlinked_mentions_report` searches the free SERP backend for the brand and
checks whether each result links to the brand's domain. Branch on `state`:
`serp_unavailable` means nothing was searched — never "zero mentions". Results
are bounded to the first page or two of results, not the whole web.

`get_media_monitoring_report` filters those to social, forum and news platforms.

## Report

The candidate prompts, the unlinked and media mentions worth outreach (each with
the page and suggested ask), and AI-referrer traffic from `get_web_analytics_sources`
when the project has the tracking snippet. Say plainly that AI-answer share of
voice is not measured because AI models are banned.
