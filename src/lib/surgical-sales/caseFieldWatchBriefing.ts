/**
 * Reusable "watch for today" briefing for any surgical case type.
 * Groups previously noted friction, pain points, inventory issues, and training gaps.
 */

import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import {
  formatRepFacingDisplayText,
  formatRepIntelligenceFieldValue,
} from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import {
  buildProviderPriorEvidencePool,
  priorEvidencePoolToFindings,
} from "@/lib/surgical-sales/providerPriorEvidencePool";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import type { UniversalSurgicalFactRow } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

export type CaseFieldWatchCategory =
  | "surgeon_pain"
  | "staff_friction"
  | "workflow_timing"
  | "inventory_products"
  | "product_performance"
  | "training";

export type CaseFieldWatchItem = {
  id: string;
  text: string;
  sourceLabel?: string;
};

export type CaseFieldWatchSection = {
  category: CaseFieldWatchCategory;
  label: string;
  items: CaseFieldWatchItem[];
};

export type CaseFieldWatchBriefing = {
  sections: CaseFieldWatchSection[];
  emptyLines: string[];
  hasItems: boolean;
};

export const CASE_FIELD_WATCH_CATEGORY_ORDER: CaseFieldWatchCategory[] = [
  "surgeon_pain",
  "staff_friction",
  "workflow_timing",
  "inventory_products",
  "product_performance",
  "training",
];

export const CASE_FIELD_WATCH_CATEGORY_LABELS: Record<CaseFieldWatchCategory, string> = {
  surgeon_pain: "Surgeon",
  staff_friction: "Staff",
  workflow_timing: "Workflow",
  inventory_products: "Inventory & products",
  product_performance: "Product performance",
  training: "Training",
};

const WATCH_UF_CONCEPTS = new Set([
  "visualization_or_access_issue",
  "sizing_or_fit_issue",
  "inventory_availability_issue",
  "workflow_or_timing_issue",
  "placement_or_positioning_issue",
  "training_or_familiarity_issue",
  "product_performance_issue",
  "unavailable_item",
  "requested_item",
  "provider_sentiment",
]);

const UF_CONCEPT_TO_CATEGORY: Record<string, CaseFieldWatchCategory> = {
  visualization_or_access_issue: "surgeon_pain",
  provider_sentiment: "surgeon_pain",
  sizing_or_fit_issue: "inventory_products",
  inventory_availability_issue: "inventory_products",
  unavailable_item: "inventory_products",
  requested_item: "inventory_products",
  workflow_or_timing_issue: "workflow_timing",
  placement_or_positioning_issue: "product_performance",
  product_performance_issue: "product_performance",
  training_or_familiarity_issue: "training",
  staff_workflow: "staff_friction",
};

const PROVIDER_WATCH_FIELDS: Array<{ key: string; category: CaseFieldWatchCategory }> = [
  { key: "provider_clinical_frustrations", category: "surgeon_pain" },
  { key: "provider_dissatisfaction_areas", category: "surgeon_pain" },
  { key: "provider_staff_frustrations", category: "staff_friction" },
  { key: "provider_workflow_pain_points", category: "workflow_timing" },
  { key: "provider_product_gaps", category: "inventory_products" },
];

const PRIOR_CASE_WATCH_FIELDS: Array<{ key: string; category: CaseFieldWatchCategory }> = [
  { key: "live_observation_clinical_pain_points", category: "surgeon_pain" },
  { key: "live_observation_surgeon_reactions", category: "surgeon_pain" },
  { key: "live_observation_staff_process", category: "staff_friction" },
  { key: "live_observation_workflow", category: "workflow_timing" },
  { key: "live_observation_product_fit", category: "product_performance" },
];

const POSITIVE_FINDING_IDS = new Set([
  "staff_efficiency_coordinated",
  "staff_efficiency_organized",
  "staff_efficiency_comfortable",
]);

const FINDING_ID_TO_CATEGORY: Record<string, CaseFieldWatchCategory> = {
  visualization_challenge: "surgeon_pain",
  workflow_delay: "workflow_timing",
  provider_frustration: "surgeon_pain",
};

const GENERIC_NOISE_RE = /^(general(?:\s+surgery)?|unknown|n\/a|tbd|pending|none)$/i;
const MACHINE_TOKEN_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/i;

const POSITIVE_SIGNAL_RE =
  /\b(coordinated|organized|comfortable|smooth|routine|efficient|went well|went smoothly|no issue|uneventful|positive staff|worked smoothly)\b/i;

const NEGATIVE_SIGNAL_RE =
  /\b(frustrat|friction|pain|delays?|bottleneck|challenge|dissatisf|concern|unavailable|availability|missing|shortage|stock|inventory|visualiz|slows?|struggle|unfamiliar|confus|complain|issues?|problems?|difficult|gap|backorder|out of stock|questioned)\b/i;

const INVENTORY_SIGNAL_RE =
  /\b(inventory|availability|unavailable|stock|shortage|backorder|sizing|fit|requested item|product gap|mesh|kit)\b/i;

const DEFAULT_EMPTY_LINES = [
  "Nothing flagged yet — listen for surgeon or staff friction during the case",
  "Log frustrations and inventory issues in field notes while they are fresh",
] as const;

export function isWatchBriefingNoise(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 3) return true;
  if (GENERIC_NOISE_RE.test(trimmed)) return true;
  if (MACHINE_TOKEN_RE.test(trimmed)) return true;
  if (/still needed:\s*validate in field intelligence/i.test(trimmed)) return true;
  if (/^provider concern:\s*clinical frustration$/i.test(trimmed)) return true;
  if (/[·•]/.test(trimmed) && /increasing|volume|trend/i.test(trimmed)) return true;
  return false;
}

export function isPositiveWatchSignal(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/staff_efficiency_(coordinated|organized|comfortable)/i.test(trimmed)) return true;
  if (POSITIVE_SIGNAL_RE.test(trimmed) && !NEGATIVE_SIGNAL_RE.test(trimmed)) return true;
  return false;
}

export function isWatchBriefingCandidate(text: string): boolean {
  if (isWatchBriefingNoise(text) || isPositiveWatchSignal(text)) return false;
  return NEGATIVE_SIGNAL_RE.test(text) || INVENTORY_SIGNAL_RE.test(text);
}

function linesFromMultiline(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeWatchText(raw: string): string {
  return raw
    .replace(
      /^(Clinical concern|Workflow friction|Staff friction|Dissatisfaction|Surgeon reaction|Staff process|Workflow note|Clinical pain point|Uses|Also uses|Product gap):\s*/i,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function formatProviderWatchText(dbKey: string, raw: unknown): string | null {
  const rawText = String(raw ?? "").trim();
  if (!rawText) return null;

  const candidates = [
    formatRepIntelligenceFieldValue(dbKey, rawText),
    formatRepFacingDisplayText(rawText, dbKey),
    isWatchBriefingNoise(rawText) ? null : rawText,
  ];

  const formatted = candidates.find((candidate) => candidate && !isWatchBriefingNoise(candidate)) ?? null;
  if (!formatted) return null;
  const normalized = normalizeWatchText(formatted);
  if (!normalized || !isWatchBriefingCandidate(normalized)) return null;
  return normalized;
}

function categoryFromFinding(finding: AggregatedFindingEvidence): CaseFieldWatchCategory | null {
  if (finding.isPositiveStaffSignal) return null;

  const findingId = String(finding.normalizedFindingId ?? "").trim();
  if (findingId && POSITIVE_FINDING_IDS.has(findingId)) return null;
  if (findingId && FINDING_ID_TO_CATEGORY[findingId]) {
    return FINDING_ID_TO_CATEGORY[findingId];
  }

  const label = finding.label?.trim() ?? "";
  if (!label || !isWatchBriefingCandidate(label)) return null;

  if (/staff|circulator|scrub|spd|nursing/i.test(label) && !isPositiveWatchSignal(label)) {
    return "staff_friction";
  }
  if (/inventory|unavailable|stock|shortage|sizing|\bfit\b|requested/i.test(label)) {
    return "inventory_products";
  }
  if (/training|familiar|learning curve|in-service/i.test(label)) return "training";
  if (/workflow|timing|turnover|delay|visualiz/i.test(label) && !isPositiveWatchSignal(label)) {
    return "workflow_timing";
  }
  if (/product performance|placement|positioning|product fit/i.test(label)) return "product_performance";
  if (/frustrat|pain|dissatisf|concern|surgeon/i.test(label)) return "surgeon_pain";

  return null;
}

function categoryFromUniversalConcept(concept: string, text: string): CaseFieldWatchCategory | null {
  if (concept === "staff_workflow" && isPositiveWatchSignal(text)) return null;
  if (concept === "no_issue_or_routine" || concept === "case_outcome" || concept === "current_product") {
    return null;
  }
  return UF_CONCEPT_TO_CATEGORY[concept] ?? null;
}

function categoryFromCaseProductNeeds(text: string): CaseFieldWatchCategory | null {
  if (!text.trim()) return null;
  if (INVENTORY_SIGNAL_RE.test(text)) return "inventory_products";
  if (/visualiz|friction|pain|challenge|staff|workflow|delay|frustrat/i.test(text)) {
    if (/staff/i.test(text)) return "staff_friction";
    if (/workflow|delay|turnover/i.test(text)) return "workflow_timing";
    return "surgeon_pain";
  }
  return null;
}

type WatchAccumulator = Map<CaseFieldWatchCategory, CaseFieldWatchItem[]>;

function pushWatchItem(
  acc: WatchAccumulator,
  seen: Set<string>,
  input: {
    category: CaseFieldWatchCategory;
    text: string;
    sourceLabel?: string;
    id: string;
    maxPerCategory: number;
    maxTotal: number;
  },
): void {
  const normalized = normalizeWatchText(input.text);
  if (!normalized || !isWatchBriefingCandidate(normalized)) return;

  const dedupeKey = normalized.toLowerCase();
  if (seen.has(dedupeKey)) return;

  const bucket = acc.get(input.category) ?? [];
  if (bucket.length >= input.maxPerCategory) return;

  const total = [...acc.values()].reduce((sum, items) => sum + items.length, 0);
  if (total >= input.maxTotal) return;

  seen.add(dedupeKey);
  bucket.push({
    id: input.id,
    text: normalized,
    sourceLabel: input.sourceLabel,
  });
  acc.set(input.category, bucket);
}

function flattenUniversalFacts(runs: UniversalFactExtractionRun[] | undefined): UniversalSurgicalFactRow[] {
  return (runs ?? []).flatMap((run) => (run.facts ?? []) as UniversalSurgicalFactRow[]);
}

function sectionsFromAccumulator(acc: WatchAccumulator): CaseFieldWatchSection[] {
  return CASE_FIELD_WATCH_CATEGORY_ORDER.flatMap((category) => {
    const items = acc.get(category) ?? [];
    if (items.length === 0) return [];
    return [{ category, label: CASE_FIELD_WATCH_CATEGORY_LABELS[category], items }];
  });
}

export function buildCaseFieldWatchBriefing(input: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
  activities?: Array<{ activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null }>;
  operationalContext?: CaseOperationalContextView | null;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  extraItems?: Array<{ category: CaseFieldWatchCategory; text: string; sourceLabel?: string; id?: string }>;
  maxPerCategory?: number;
  maxTotalItems?: number;
  emptyLines?: string[];
}): CaseFieldWatchBriefing {
  const acc: WatchAccumulator = new Map();
  const seen = new Set<string>();
  const maxPerCategory = input.maxPerCategory ?? 2;
  const maxTotal = input.maxTotalItems ?? 8;
  const push = (
    category: CaseFieldWatchCategory,
    text: string,
    sourceLabel: string | undefined,
    id: string,
  ) =>
    pushWatchItem(acc, seen, {
      category,
      text,
      sourceLabel,
      id,
      maxPerCategory,
      maxTotal,
    });

  if (input.providerContact) {
    for (const { key, category } of PROVIDER_WATCH_FIELDS) {
      for (const [index, segment] of linesFromMultiline(input.providerContact[key]).entries()) {
        const formatted = formatProviderWatchText(key, segment);
        if (!formatted) continue;
        push(category, formatted, "Provider profile", `${key}:${index}`);
      }
    }
  }

  const productNeeds = String(input.caseRow.case_product_needs ?? "").trim();
  if (productNeeds) {
    const category = categoryFromCaseProductNeeds(productNeeds);
    if (category) {
      push(category, productNeeds, "This case", "case:product_needs");
    }
  }

  for (const priorCase of input.priorCases ?? []) {
    const priorCaseId = String(priorCase.id ?? "prior").trim();
    for (const { key, category } of PRIOR_CASE_WATCH_FIELDS) {
      for (const [index, segment] of linesFromMultiline(priorCase[key]).entries()) {
        const formatted = formatRepFacingDisplayText(segment, key);
        if (!formatted) continue;
        push(category, formatted, "Prior case", `${priorCaseId}:${key}:${index}`);
      }
    }
  }

  const priorIssues = input.operationalContext?.priorCaseIssues?.trim();
  if (priorIssues && isWatchBriefingCandidate(priorIssues)) {
    push("surgeon_pain", priorIssues, "Prior case", "operational:prior_case_issues");
  }

  const priorEvidencePool = buildProviderPriorEvidencePool({
    currentCaseId: String(input.caseRow.id ?? "current"),
    caseRow: input.caseRow,
    activities: input.activities,
    priorCases: input.priorCases,
    providerContact: input.providerContact,
  });
  for (const finding of priorEvidencePoolToFindings(priorEvidencePool)) {
    const category = categoryFromFinding(finding);
    const label = finding.label?.trim();
    if (!category || !label) continue;
    push(category, label, "Prior observation", `finding:${finding.normalizedFindingId}`);
  }

  const currentCaseId = String(input.caseRow.id ?? "").trim();
  for (const fact of flattenUniversalFacts(input.universalFactsReadModel?.caseRuns)) {
    const concept = String(fact.concept ?? "").trim();
    if (!WATCH_UF_CONCEPTS.has(concept)) continue;
    if (currentCaseId && String(fact.case_id ?? "").trim() === currentCaseId) continue;

    const text = String(fact.normalized_label ?? fact.evidence_text ?? "").trim();
    const category = categoryFromUniversalConcept(concept, text);
    if (!category || !text) continue;
    push(category, text, "Intelligence", `uf:${concept}:${String(fact.id ?? text).slice(0, 24)}`);
  }

  for (const item of input.extraItems ?? []) {
    push(item.category, item.text, item.sourceLabel, item.id ?? `extra:${item.text.slice(0, 24)}`);
  }

  const sections = sectionsFromAccumulator(acc);
  return {
    sections,
    emptyLines: sections.length > 0 ? [] : [...(input.emptyLines ?? DEFAULT_EMPTY_LINES)],
    hasItems: sections.length > 0,
  };
}

/** Flat list for legacy consumers. */
export function flattenCaseFieldWatchBriefing(briefing: CaseFieldWatchBriefing): string[] {
  return briefing.sections.flatMap((section) => section.items.map((item) => item.text));
}
