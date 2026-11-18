import { splitEngagementPrepLines } from "@/lib/surgical-sales/engagements/engagementPrepTextLines";

export type MissionBriefTag = "WORKFLOW" | "ACCESS" | "OBSERVATION" | "RISK";

export type MissionBriefItem = {
  text: string;
  suggested?: boolean;
  tag?: MissionBriefTag;
};

type PatternRule = { re: RegExp; target: string; tag: MissionBriefTag };

const DISCOVERY_WORKFLOW_RULES: PatternRule[] = [
  { re: /\bprocedure|case mix|perform most|volume mix\b/i, target: "Primary procedure mix", tag: "WORKFLOW" },
  { re: /\bworkflow|friction|sequence|standardization|or sequence\b/i, target: "OR workflow friction", tag: "WORKFLOW" },
  { re: /\bstaffing|turnover|supply|bottleneck\b/i, target: "Staffing / turnover / supply bottlenecks", tag: "WORKFLOW" },
  { re: /\bvisibility|which cases|case selection|first look\b/i, target: "Case visibility opportunities", tag: "WORKFLOW" },
  { re: /\bwho must approve|approve workflow|stick in practice\b/i, target: "Workflow approval path", tag: "WORKFLOW" },
  { re: /\bopening|impact statement|reference prior\b/i, target: "Opening angle alignment", tag: "WORKFLOW" },
];

const DISCOVERY_OBSERVATION_RULES: PatternRule[] = [
  { re: /\bobservation access|access process|coordinate.*observation\b/i, target: "Observation access process", tag: "OBSERVATION" },
  { re: /\bscheduling|coordinator|who owns|schedule\b/i, target: "Scheduling coordinator", tag: "OBSERVATION" },
  { re: /\bcredential|committee\b/i, target: "Credentialing requirements", tag: "ACCESS" },
  { re: /\bvendor|restriction|clearance|presence\b/i, target: "Vendor presence restrictions", tag: "ACCESS" },
  { re: /\bwhich cases.*observe|useful to observe\b/i, target: "Target cases for observation", tag: "OBSERVATION" },
  { re: /\bblock time|or access\b/i, target: "OR access / block pathway", tag: "ACCESS" },
];

const OUTCOME_RULES: PatternRule[] = [
  { re: /\bfollow[- ]?up|timing|window|next touch\b/i, target: "Follow-up timing confirmed", tag: "WORKFLOW" },
  { re: /\bcoordinator|scheduling path|scheduler\b/i, target: "Coordinator path identified", tag: "ACCESS" },
  { re: /\bagree|appropriate|green light|worth.*time\b/i, target: "Provider agrees observation is appropriate", tag: "OBSERVATION" },
  { re: /\badvance|pathway|progression|qualification\b/i, target: "Pathway advancement signal captured", tag: "WORKFLOW" },
];

const NEXT_STEP_RULES: PatternRule[] = [
  { re: /\bsend.*observation|observation request\b/i, target: "Send observation request", tag: "OBSERVATION" },
  { re: /\bcoordinator|scheduler|office manager\b/i, target: "Coordinate with scheduler or office manager", tag: "ACCESS" },
  { re: /\bworkflow.*observ|observe.*workflow|validation visit\b/i, target: "Prepare for workflow observation", tag: "WORKFLOW" },
  { re: /\bfollow[- ]?up call|check[- ]?in\b/i, target: "Schedule follow-up check-in", tag: "WORKFLOW" },
];

const OBJECTIVE_RULES: PatternRule[] = [
  { re: /\bworkflow.*fit|fit.*workflow|validate workflow\b/i, target: "Validate workflow fit", tag: "WORKFLOW" },
  { re: /\bobservation.*(access|open|viability)|access.*observation\b/i, target: "Confirm observation access viability", tag: "OBSERVATION" },
  { re: /\bscheduling|coordinator|who owns\b/i, target: "Identify scheduling ownership", tag: "ACCESS" },
  { re: /\bevaluat|product discussion|portfolio|worth.*time\b/i, target: "Determine future evaluation potential", tag: "WORKFLOW" },
  { re: /\bmap.*workflow|workflow.*map\b/i, target: "Map workflow friction points", tag: "WORKFLOW" },
  { re: /\bconfirm.*observation|observation.*confirm\b/i, target: "Confirm observation access viability", tag: "OBSERVATION" },
];

function truncate(text: string, max = 72): string {
  const line = text.trim();
  if (line.length <= max) return line;
  return `${line.slice(0, max - 1).trim()}…`;
}

function matchRule(line: string, rules: PatternRule[]): PatternRule | null {
  for (const rule of rules) {
    if (rule.re.test(line)) return rule;
  }
  return null;
}

function stripQuestion(line: string): string {
  let s = line.trim().replace(/\?+$/, "");
  s = s.replace(/^(what|who|where|how|which|when|why|are there|is there|do you|can you)\s+/i, "");
  s = s.replace(/^(tell me about|help me understand)\s+/i, "");
  return s.trim();
}

function inferTag(text: string): MissionBriefTag | undefined {
  const lower = text.toLowerCase();
  if (/\b(unknown|unclear|risk|restriction|gap)\b/.test(lower)) return "RISK";
  if (/\b(observation|observe|case)\b/.test(lower)) return "OBSERVATION";
  if (/\b(access|credential|vendor|coordinator|scheduling)\b/.test(lower)) return "ACCESS";
  if (/\b(workflow|procedure|friction|staffing)\b/.test(lower)) return "WORKFLOW";
  return undefined;
}

function applyRules(line: string, rules: PatternRule[]): MissionBriefItem | null {
  const rule = matchRule(line, rules);
  if (rule) return { text: rule.target, tag: rule.tag };
  return null;
}

/** Review-only: turn prep discovery prompts into tactical targets (tags live on group headers). */
export function summarizeDiscoveryPrompt(line: string, bucket: "workflow" | "observation"): MissionBriefItem {
  const rules = bucket === "observation" ? DISCOVERY_OBSERVATION_RULES : DISCOVERY_WORKFLOW_RULES;
  const matched = applyRules(line, rules) ?? applyRules(line, [...DISCOVERY_OBSERVATION_RULES, ...DISCOVERY_WORKFLOW_RULES]);
  if (matched) return { text: matched.text };

  const stripped = stripQuestion(line);
  const short = truncate(stripped.charAt(0).toUpperCase() + stripped.slice(1), 58);
  return { text: short };
}

export function summarizeOutcomeLine(line: string): MissionBriefItem {
  const matched = applyRules(line, OUTCOME_RULES);
  if (matched) return { text: matched.text };
  const stripped = stripQuestion(line);
  return { text: truncate(stripped, 68) };
}

export function summarizeNextStepLine(line: string): MissionBriefItem {
  const matched = applyRules(line, NEXT_STEP_RULES);
  if (matched) return { text: matched.text };
  const stripped = stripQuestion(line);
  return { text: truncate(stripped, 68) };
}

export function summarizeObjectiveLine(line: string): MissionBriefItem {
  const matched = applyRules(line, OBJECTIVE_RULES);
  if (matched) return { text: matched.text };
  const stripped = stripQuestion(line);
  return { text: truncate(stripped, 72) };
}

const ACCESS_RISK_RULES: PatternRule[] = [
  { re: /\brelation|history|prior work|reference prior\b/i, target: "Relationship history", tag: "RISK" },
  { re: /\bvendor clearance|clearance path|pathway unknown\b/i, target: "Access pathway map", tag: "RISK" },
  { re: /\bunknown|unclear|tbd\b/i, target: "Access pathway unclear", tag: "RISK" },
  { re: /\bcredential|committee\b/i, target: "Credentialing path", tag: "RISK" },
  { re: /\brestriction|block|constraint\b/i, target: "Access restrictions", tag: "RISK" },
  { re: /\bscheduling owner|coordinator\b/i, target: "Scheduling ownership", tag: "RISK" },
];

const ACCESS_TOOLS_RULES: PatternRule[] = [
  { re: /\bportfolio|alignment|value hyp/i, target: "Portfolio alignment materials", tag: "WORKFLOW" },
  { re: /\bprocedure visibility|case visibility\b/i, target: "Procedure visibility", tag: "WORKFLOW" },
  { re: /\bdeck|leave[- ]?behind|brochure|sample|packet\b/i, target: "Leave-behind materials", tag: "WORKFLOW" },
  { re: /\btool|resource|material|bring\b/i, target: "Field materials", tag: "WORKFLOW" },
];

export function summarizeAccessRiskLine(line: string): MissionBriefItem {
  const matched = applyRules(line, ACCESS_RISK_RULES);
  if (matched) return { text: matched.text };
  const stripped = stripQuestion(line);
  return { text: truncate(stripped, 52) };
}

export function summarizeAccessToolsLine(line: string): MissionBriefItem {
  const matched = applyRules(line, ACCESS_TOOLS_RULES);
  if (matched) return { text: matched.text };
  const stripped = stripQuestion(line);
  return { text: truncate(stripped, 52) };
}

export function compressObjectiveToTacticalBullets(text: string, maxItems = 4): MissionBriefItem[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const rawLines =
    splitEngagementPrepLines(trimmed).length > 1
      ? splitEngagementPrepLines(trimmed)
      : trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);

  const seen = new Set<string>();
  const out: MissionBriefItem[] = [];
  for (const raw of rawLines) {
    const item = summarizeObjectiveLine(raw);
    const key = item.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function dedupeMissionItems(items: MissionBriefItem[], max: number): MissionBriefItem[] {
  const seen = new Set<string>();
  const out: MissionBriefItem[] = [];
  for (const item of items) {
    const key = item.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

const PATHWAY_IMPACT_RULES: Array<{ re: RegExp; label: string }> = [
  { re: /\bobservation|observe|case look\b/i, label: "Observation qualification" },
  { re: /\bworkflow|friction|visibility|procedure\b/i, label: "Workflow visibility" },
  { re: /\baccess|credential|vendor|coordinator|pathway\b/i, label: "Access pathway mapping" },
  { re: /\bevaluat|product fit|portfolio|commercial\b/i, label: "Future evaluation readiness" },
];

export function buildPathwayImpactItems(corpus: string): MissionBriefItem[] {
  const lower = corpus.toLowerCase();
  const items: MissionBriefItem[] = [];
  for (const rule of PATHWAY_IMPACT_RULES) {
    if (rule.re.test(lower)) {
      items.push({ text: rule.label });
    }
  }
  return dedupeMissionItems(items, 4);
}
