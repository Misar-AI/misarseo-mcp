---
name: technical-site-audit
description: Read a MisarSEO site audit and turn it into a ranked technical fix list — HTTPS, internal links, structured data, Core Web Vitals, indexing — and optionally ship title/meta fixes as patches. Use for "audit my site", "technical SEO issues", "why isn't this page indexed", "orphan pages", or "fix my titles".
---

# Technical site audit

## 1. Confirm there is an audit to read

Call `get_dashboard` (free) and find the project's card. Its `audit.id` is the
latest audit's id, which two of the reports below need. A null `audit` means
the project has never been crawled. Offer to start one with `start_site_audit`,
but ask first: it spends one of the organization's monthly audits. Then poll
`get_site_audit_status` until `status` is `completed` or `failed` (there is no
`complete`) before reading anything below.

## 2. Read every report (all free, stored crawl data only)

| Tool | Answers |
|---|---|
| `get_audit_https_report` | secure-page share, mixed content, HTTP URLs in the sitemap |
| `get_audit_internal_links` | orphan pages, dead ends, click depth |
| `get_audit_structured_data` | schema.org types per page, unparseable JSON-LD |
| `get_audit_core_web_vitals` | lab LCP / INP / CLS per page (needs the audit id) |
| `get_audit_comparison` | new vs fixed issues against the previous audit (needs the audit id) |

**Branch on `state` before reading any number.** `no_audit`,
`signal_not_captured` and `no_lighthouse_data` mean nothing was measured — not a
clean site. Each report also lists `notDerivable`: things it can never compute
(e.g. TLS certificate checks). Report those as "not checked", never as passing.

Core Web Vitals here are single simulated Lighthouse runs, not real-user CrUX
data — say "lab measurement" whenever you quote them.

## 3. Check indexing for the pages that matter

`inspect_urls` (up to 10 URLs, Search Console must be connected) gives Google's
own index verdict. A row carrying `error` was not inspected; count only the
rows without one. For a site-wide view, `get_search_console_coverage` reads
MisarSEO's nightly coverage scan — an empty result means the scan has not
reached this property yet, not that every page is fine.

## 4. Fix list

Group by impact. Each item names the affected URLs (or the count plus three
examples), why it matters for ranking or crawling, and the exact change.

## 5. Optional: ship title/meta fixes as patches

Patches are served by the MisarSEO snippet on the user's site and require an
org admin.

1. `draft_patch` (one page) or `batch_draft_patches` (up to 10 pages) — AI
   drafts cost one AI operation per field per page. Passing `value` sets an
   explicit replacement and costs nothing.
2. Show every draft to the user.
3. `publish_patch` **makes the change live for visitors immediately** — only
   with explicit approval, per patch.
4. `revert_patch` undoes a published patch instantly.

Never call `enable_patch_auto_publish` without the user asking for it by name:
it publishes future AI drafts with no review step.

After publishing, `submit_indexnow` asks Bing, Yandex, Seznam and Naver to
re-crawl the changed URLs; it fails until the project has an IndexNow key set.
