---
name: ai-search-visibility
description: Measure how a brand appears in AI answers and AI-search citations with MisarSEO — Brand Radar share of voice, prompt exploration, prompt research and unlinked mentions. Use for "are we showing up in ChatGPT", "AI search visibility", "GEO", "LLM mentions", "AI Overviews", or brand-mention questions.
---

# AI search visibility

The AI-search tools range from free to plan-gated and metered. Run the free
steps first and ask before every paid one.

## 1. Find prompts worth checking — free

`research_ai_prompts` turns a seed topic into candidate prompts (real
autocomplete completions reframed as questions). It is **not** prompt search
volume — no such number exists here, so never present one.

## 2. Ask one prompt across model personas — paid

`explore_ai_prompt` requires a paid plan and spends one AI-gateway operation per
call (one more when `analyzeSentiment` and `highlightBrand` are both set).

The persona labels (`chat_gpt`, `claude`, `gemini`, `perplexity`) are **not
vendor-verified**. Report every answer as "a model answering as X", never as
what that vendor's product actually says.

## 3. Brand Radar scan — paid, consumes a monthly scan

`run_brand_radar_scan` requires a paid plan and **spends one of the
organization's monthly Brand Radar scans the moment it is accepted** — before
any answer exists. Always confirm first; `get_usage` shows how many scans are
left.

The scan runs on a queue. If the tool returns a `jobId` with a non-complete
`status`, the scan is still running: collect it with
`get_brand_radar_scan_status` (free to poll). **Never call
`run_brand_radar_scan` again to "retry"** — that submits and pays for a second
scan.

Mentions and AI search volumes are nullable: a null is "not reported by the
platform", never zero.

## 4. Unlinked and media mentions — free

`get_unlinked_mentions_report` searches the free SERP backend for the brand and
checks whether each result links to the brand's domain. Branch on `state`:
`serp_unavailable` means nothing was searched — never "zero mentions". Results
are bounded to the first page or two of results, not the whole web.

`get_media_monitoring_report` filters those to social, forum and news platforms
and can merge in citation platforms from a prompt-explorer run you already have.

## Report

Share of voice versus competitors, which sources AI answers cite, and the
unlinked mentions worth outreach (each with the page and suggested ask). State
which steps were skipped for cost and what running them would add.
