/**
 * Reusable prompt templates exposed over MCP `prompts/list` / `prompts/get`.
 *
 * Prompts are discovery surface: clients render them as slash-commands, and
 * directories index them. They must therefore be listable WITHOUT credentials,
 * and they are TEMPLATES ONLY — the calling client's model executes them.
 * Nothing here runs a completion server-side (that would spend credits for text
 * the client cannot steer, and is impossible on stdio).
 *
 * Every tool named in a body must be a canonical catalogue name; the registry
 * test enforces that. MisarSEO tools differ sharply in cost, so each template
 * spells out which steps are free and which spend credits or a quota.
 */

export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments: PromptArgument[];
  build: (args: Record<string, string>) => string;
}

const PROJECT_STEP =
  "Call list_projects first and use the `id` of the project the user means as projectId " +
  "(ask if more than one could fit).";

export const PROMPTS: PromptDefinition[] = [
  {
    name: "keyword_research_plan",
    description:
      "Research a seed topic, qualify the keywords by intent and potential, and save a shortlist.",
    arguments: [
      { name: "seed", description: "Seed keyword or topic to research", required: true },
      { name: "project", description: "Project name or domain (optional)", required: false },
    ],
    build: (a) =>
      `Build a keyword plan for "${a.seed || "<seed topic>"}"` +
      `${a.project ? ` in the MisarSEO project ${a.project}` : ""}.\n\n` +
      `1. ${PROJECT_STEP}\n` +
      "2. Call research_keywords with the seed (it charges credits per seed on the paid data " +
      "provider — tell me before researching more than one seed).\n" +
      "3. Call classify_keyword_intent on the most promising rows (free).\n" +
      "4. For the top three candidates call get_keyword_potential, one keyword at a time.\n" +
      "5. Present a shortlist grouped by intent with volume, difficulty and traffic potential. " +
      "Treat a null metric as 'not measured', never as zero.\n" +
      "6. Only after I approve the shortlist, call save_keywords.",
  },
  {
    name: "competitor_gap_analysis",
    description:
      "Find the keywords and linking domains competitors have that the project does not.",
    arguments: [
      {
        name: "competitors",
        description: "Comma-separated competitor domains (2-3 recommended)",
        required: true,
      },
    ],
    build: (a) =>
      `Run a competitive gap analysis against: ${a.competitors || "<competitor domains>"}.\n\n` +
      `1. ${PROJECT_STEP} Check the project's \`domain\` is set — the gap and intersect reports ` +
      "refuse to run without it.\n" +
      "2. Call get_keyword_gap with the competitor domains. Report `missing` and `behind` rows; " +
      "never present `unknown` rows as gaps.\n" +
      "3. Tell me the credit cost before calling get_link_intersect, the most expensive backlink " +
      "report, then run it only with my go-ahead. Lead with `provenRows`; label any `unproven` " +
      "row as unconfirmed, and if `unavailable` is true say no comparison happened.\n" +
      "4. Finish with the ten highest-value opportunities across both reports and one concrete " +
      "next action for each.",
  },
  {
    name: "site_audit_review",
    description: "Turn the latest site audit into a prioritised technical fix list.",
    arguments: [{ name: "project", description: "Project name or domain", required: false }],
    build: (a) =>
      `Review the latest site audit${a.project ? ` for ${a.project}` : ""}.\n\n` +
      `1. ${PROJECT_STEP}\n` +
      "2. Call get_dashboard to confirm the project has a completed audit.\n" +
      "3. Call get_audit_https_report, get_audit_internal_links and get_audit_structured_data " +
      "(all free). Branch on each report's `state` before reading numbers — `no_audit` or " +
      "`signal_not_captured` means nothing was measured.\n" +
      "4. Using the dashboard card's `audit.id`, call get_audit_core_web_vitals and " +
      "get_audit_comparison.\n" +
      "5. Return a fix list ranked by impact: each item names the affected URLs or count, why it " +
      "matters, and the exact change to make. List what the reports could not measure separately.",
  },
  {
    name: "search_console_opportunities",
    description:
      "Mine Search Console for striking-distance queries, cannibalisation and decaying pages.",
    arguments: [
      { name: "range", description: "Date range, e.g. last28Days (optional)", required: false },
    ],
    build: (a) =>
      `Find quick wins in Search Console${a.range ? ` for ${a.range}` : ""}.\n\n` +
      `1. ${PROJECT_STEP}\n` +
      "2. Call get_search_console_performance by query and page. Highlight queries averaging " +
      "positions 8-20 with real impressions. If `hasMore` is true, say the totals are partial.\n" +
      "3. Call get_cannibalisation_report and get_content_decay_report. Branch on `state`: " +
      "`not_connected`, `requires_reconnect`, `no_search_data` and `insufficient_history` mean " +
      "nothing was measured — say so instead of reporting a clean result.\n" +
      "4. For the five most important pages, call inspect_urls to check index status.\n" +
      "5. Summarise as: striking-distance queries, pages competing with each other, decaying " +
      "pages, indexing problems — each with a specific recommended action.",
  },
  {
    name: "ai_visibility_check",
    description: "Check how a brand shows up in AI answers and where it is mentioned without a link.",
    arguments: [
      { name: "brand", description: "Brand name to check", required: true },
      { name: "domain", description: "The brand's own domain", required: false },
      {
        name: "competitors",
        description: "Comma-separated competitor brands (optional, up to 5)",
        required: false,
      },
    ],
    build: (a) =>
      `Assess AI-search visibility for "${a.brand || "<brand>"}"` +
      `${a.competitors ? ` against ${a.competitors}` : ""}.\n\n` +
      `1. ${PROJECT_STEP}\n` +
      "2. Call research_ai_prompts with a seed topic for the brand's category (free) to find " +
      "prompts worth checking.\n" +
      "3. Ask me before the paid steps: explore_ai_prompt (one AI-gateway operation per call, " +
      "paid plan only) and run_brand_radar_scan (spends one of the monthly Brand Radar scans). " +
      "If the scan returns a jobId instead of a result, collect it with " +
      "get_brand_radar_scan_status rather than re-running the scan.\n" +
      `4. Call get_unlinked_mentions_report with the brand${a.domain ? ` and ${a.domain}` : ""} ` +
      "as the tracked domain.\n" +
      "5. Report share of voice, which sources AI answers cite, and the unlinked mentions worth " +
      "outreach. Persona answers are 'a model answering as X', never vendor-verified.",
  },
  {
    name: "weekly_rank_report",
    description: "Produce a stakeholder-ready weekly rank-tracking summary.",
    arguments: [{ name: "project", description: "Project name or domain", required: false }],
    build: (a) =>
      `Produce a weekly rank-tracking report${a.project ? ` for ${a.project}` : ""}.\n\n` +
      `1. ${PROJECT_STEP}\n` +
      "2. Call get_rank_tracker without a trackerId to list trackers, then again with the main " +
      "tracker's id for its latest positions.\n" +
      "3. Call get_rank_config_trend, get_rank_movers and get_rank_volatility_index for that " +
      "tracker (all free, stored data only).\n" +
      "4. Call list_rank_cannibalisation to flag keywords ranking with the wrong page.\n" +
      "5. Format as: visibility trend, biggest movers, volatility versus this tracker's own " +
      "history, and pages to fix. A null position means 'not found within the depth searched' — " +
      "say 'not in the top N', never 'dropped out'. Keep it under 400 words.",
  },
];

const BY_NAME = new Map(PROMPTS.map((p) => [p.name, p]));

export function listPrompts() {
  return PROMPTS.map(({ name, description, arguments: args }) => ({
    name,
    description,
    arguments: args,
  }));
}

export function getPrompt(name: string, args: Record<string, string> = {}) {
  const prompt = BY_NAME.get(name);
  if (!prompt) return null;
  return {
    description: prompt.description,
    messages: [
      { role: "user" as const, content: { type: "text" as const, text: prompt.build(args) } },
    ],
  };
}
