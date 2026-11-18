import type {
  DebriefFindingCommercialStatus,
  DebriefFindingProfileStatus,
  DebriefPatternValidationResult,
  DebriefPatternValidationStatus,
} from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";
import {
  isHighCommercialOpportunitySignal,
  isLowValuePositiveWorkflowSignal,
  isProductUsageSignal,
} from "@/lib/surgical-sales/engagements/debriefIntelligencePrioritization";
import {
  NARRATIVE_EVALUATION_DECLINED,
  NARRATIVE_EVALUATION_REQUESTED,
  NARRATIVE_FUTURE_CONDITIONAL_INTEREST,
  NARRATIVE_NO_MAJOR_ISSUES,
} from "@/lib/surgical-sales/engagements/postObservationDebriefCompletion";

/** Profile-side debrief finding resolution. */
export type { DebriefFindingProfileStatus, DebriefFindingCommercialStatus };

/** Provider profile fields that belong in commercial validation, not profile updates. */
export const DEBRIEF_COMMERCIAL_INTELLIGENCE_FIELD_KEYS = new Set([
  "provider_clinical_frustrations",
  "provider_workflow_pain_points",
  "provider_staff_frustrations",
  "provider_dissatisfaction_areas",
  "provider_product_gaps",
  "provider_evaluation_path",
  "provider_commitment_interest",
]);

const CANONICAL_CONCEPT_RULES: Array<{ key: string; patterns: RegExp[] }> = [
  {
    key: "visualization_exposure_workflow",
    patterns: [
      /\bvisuali\w*/,
      /\bfixation\b/,
      /\bexposure\b/,
      /\bview(?:ing)?\s+(?:time|before)\b/,
      /\bbefore\s+fixation\b/,
      /\bextra\s+visualization\b/,
      /\bvisualization\s+(?:issue|challenge|time)\b/,
    ],
  },
  {
    key: "staff_workflow_comfort",
    patterns: [
      /\bstaff\s+appeared\s+comfortable\b/,
      /\bstaff\s+appeared\s+organized\b/,
      /\bcomfortable\s+with\s+(?:the\s+)?current\s+process\b/,
    ],
  },
  {
    key: "workflow_friction",
    patterns: [
      /\bworkflow\s+(?:friction|delay|issue|pain)\b/,
      /\bslowed\s+case\b/,
      /\bcase\s+delay\b/,
      /\bworkflow\s+challenge\b/,
    ],
  },
  {
    key: "current_product_usage",
    patterns: [
      /\b(?:mesh|product)\s+used\b/,
      /\bcompetitive\s+product\b/,
      /\bcurrent\s+product\b/,
      /\bstandard\s+product\b/,
      /\buses?\s+(?:the\s+)?(?:current\s+)?(?:mesh|product)\b/,
    ],
  },
  {
    key: "clinical_frustration",
    patterns: [/\bclinical\s+(?:challenge|frustration)\b/, /\bprovider\s+frustration\b/],
  },
  {
    key: "observation_access",
    patterns: [
      /\bobservation\s+(?:access|allowed|feasibility)\b/,
      /\bcredential(?:ing)?\b/,
      /\bor\s+access\b/,
    ],
  },
  {
    key: "evaluation_interest",
    patterns: [/\bevaluat\w*/, /\bproduct\s+trial\b/, /\btrial\s+case\b/, /\bpilot\s+case\b/],
  },
  {
    key: "volume_trend",
    patterns: [
      /\bcase\s+volume\b/,
      /\bprocedure\s+volume\b/,
      /\bvolume\s+trend\b/,
      /\bdoing\s+more\b/,
      /\bincreasing\s+(?:case|procedure)\b/,
    ],
  },
  {
    key: "procedure_focus",
    patterns: [
      /\bprocedure\s+focus\b/,
      /\babdominal\s+wall\b/,
      /\bhernia\s+repair\b/,
      /\bawr\b/,
      /\breconstruction\b/,
    ],
  },
];

const CANONICAL_TOPIC_TERMS: Record<string, string[]> = {
  visualization_exposure_workflow: [
    "visualization",
    "fixation",
    "exposure",
    "view",
    "challenging",
    "significant",
  ],
  staff_workflow_comfort: ["staff", "comfortable", "organized", "smoothly", "workflow"],
  workflow_friction: ["workflow", "friction", "delay", "slow", "issue"],
  current_product_usage: ["mesh", "product", "bard", "comfortable", "workflow"],
  clinical_frustration: ["frustration", "challenge", "pain"],
  observation_access: ["observation", "access", "credential"],
  evaluation_interest: ["evaluat", "trial", "pilot"],
  volume_trend: ["volume", "cases", "doing more", "increasing"],
  procedure_focus: ["procedure", "reconstruction", "hernia", "awr", "focus"],
};

const VALIDATION_STATUS_RANK: Record<DebriefPatternValidationStatus, number> = {
  confirmed: 4,
  qualified: 3,
  rejected: 2,
  unmentioned: 1,
};

const COMMERCIAL_STATUS_RANK: Record<DebriefFindingCommercialStatus, number> = {
  validated_pain_point: 6,
  active_opportunity: 5,
  qualified_issue: 4,
  mentioned_only: 3,
  rejected_issue: 2,
  no_active_opportunity: 1,
};

const PROFILE_FIELD_DISPLAY: Record<
  string,
  { label: string; formatDetail?: (value: string) => string }
> = {
  provider_observation_feasibility: {
    label: "Observation Access",
    formatDetail: (value) => `Status: ${titleCaseWords(value)}`,
  },
  provider_observation_access_path: { label: "Observation Access Path" },
  provider_observation_credentialing_needed: { label: "Credentialing Required" },
  provider_credentialing_status: { label: "Credentialing Status" },
  provider_competitive_products: { label: "Current Product / Standard Product" },
  provider_technique_preferences: { label: "Technique Preferences" },
  provider_procedure_focus: { label: "Procedure Focus" },
  provider_technique_detail: { label: "Procedure Detail" },
  provider_preference_card_signals: { label: "Preference Card Signals" },
  provider_case_volume_estimate: { label: "Case Volume" },
  provider_observation_coordinator_contact: { label: "Observation Coordinator" },
  provider_evaluation_stakeholders: { label: "Evaluation Stakeholders" },
  provider_decision_maker_status: { label: "Decision Maker" },
  provider_champion_potential: { label: "Champion Potential" },
  preferred_hospital: { label: "Preferred Facility" },
};

function titleCaseWords(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function slugifyFindingKey(label: string): string {
  return String(label ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Generalized concept key — clinically equivalent phrases resolve to one bucket. */
export function canonicalizeDebriefFindingKey(label: string): string {
  const normalized = String(label ?? "").trim().toLowerCase();
  if (!normalized) return "unknown";

  for (const rule of CANONICAL_CONCEPT_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.key;
    }
  }

  return slugifyFindingKey(normalized);
}

export function normalizeDebriefPatternKey(label: string): string {
  return canonicalizeDebriefFindingKey(label);
}

export function patternTopicTerms(label: string): string[] {
  const canonical = canonicalizeDebriefFindingKey(label);
  const terms = new Set<string>();

  for (const token of String(label ?? "").toLowerCase().split(/[^a-z0-9]+/)) {
    if (token.length >= 4) terms.add(token);
  }

  for (const extra of CANONICAL_TOPIC_TERMS[canonical] ?? []) {
    terms.add(extra);
  }

  return [...terms];
}

export function isCommercialPainPattern(label: string): boolean {
  if (isLowValuePositiveWorkflowSignal(label) || isProductUsageSignal(label)) return false;
  return (
    isHighCommercialOpportunitySignal(label) ||
    /visualization|fixation|frustration|friction|workflow delay|clinical challenge/i.test(label)
  );
}

export function resolveCommercialFindingStatus(input: {
  status: DebriefPatternValidationStatus;
  patternLabel: string;
  narrative: string;
  topicMentioned: boolean;
}): DebriefFindingCommercialStatus | null {
  if (!isCommercialPainPattern(input.patternLabel)) return null;

  const narrative = input.narrative.trim().toLowerCase();
  const evaluationRequested = NARRATIVE_EVALUATION_REQUESTED.test(narrative);
  const evaluationDeclined =
    NARRATIVE_EVALUATION_DECLINED.test(narrative) && !evaluationRequested;

  if (input.status === "confirmed") {
    return "validated_pain_point";
  }

  if (input.status === "qualified") {
    return "qualified_issue";
  }

  if (input.status === "rejected") {
    return "rejected_issue";
  }

  if (input.status === "unmentioned") {
    if (!input.topicMentioned) return null;
    return "mentioned_only";
  }

  if (evaluationRequested && canonicalizeDebriefFindingKey(input.patternLabel) === "evaluation_interest") {
    return "active_opportunity";
  }

  if (evaluationDeclined) {
    return "no_active_opportunity";
  }

  return null;
}

export function resolveProfileFieldStatus(input: {
  dbKey: string;
  proposedValue: string;
  narrative: string;
}): DebriefFindingProfileStatus | null {
  const dbKey = input.dbKey.trim();
  const value = String(input.proposedValue ?? "").trim();
  const narrative = input.narrative.trim();
  if (!value || !narrative) return null;

  if (DEBRIEF_COMMERCIAL_INTELLIGENCE_FIELD_KEYS.has(dbKey)) {
    return null;
  }

  const blob = `${narrative} ${value}`.toLowerCase();
  const valueTokens = value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
  const explicitlySupported = valueTokens.some((token) => blob.includes(token));

  if (
    dbKey === "provider_competitive_products" ||
    dbKey === "provider_procedure_focus" ||
    dbKey === "provider_case_volume_estimate" ||
    dbKey === "provider_technique_detail"
  ) {
    return explicitlySupported ? "confirmed_profile_fact" : "mentioned_only";
  }

  if (dbKey.startsWith("provider_observation_") || dbKey.startsWith("provider_credentialing_")) {
    return explicitlySupported ? "confirmed_profile_fact" : "mentioned_only";
  }

  return explicitlySupported ? "confirmed_profile_fact" : null;
}

export function formatDebriefProfileUpdateDisplay(
  dbKey: string,
  value: string,
): { label: string; detail?: string } {
  const trimmedValue = String(value ?? "").trim();
  const config = PROFILE_FIELD_DISPLAY[dbKey.trim()];
  if (config) {
    return {
      label: config.label,
      detail: config.formatDetail ? config.formatDetail(trimmedValue) : trimmedValue,
    };
  }

  const humanized = dbKey
    .replace(/^provider_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return { label: humanized, detail: trimmedValue };
}

function pickStrongerValidationStatus(
  left: DebriefPatternValidationStatus,
  right: DebriefPatternValidationStatus,
): DebriefPatternValidationStatus {
  return VALIDATION_STATUS_RANK[left] >= VALIDATION_STATUS_RANK[right] ? left : right;
}

function pickStrongerCommercialStatus(
  left: DebriefFindingCommercialStatus | null | undefined,
  right: DebriefFindingCommercialStatus | null | undefined,
): DebriefFindingCommercialStatus | null {
  if (!left) return right ?? null;
  if (!right) return left;
  return COMMERCIAL_STATUS_RANK[left] >= COMMERCIAL_STATUS_RANK[right] ? left : right;
}

function mergeEvidenceQuotes(left?: string, right?: string): string | undefined {
  const quotes = [left, right]
    .flatMap((quote) => String(quote ?? "").split(/\n+/))
    .map((quote) => quote.trim())
    .filter(Boolean);
  if (quotes.length === 0) return undefined;
  return [...new Set(quotes)].join("\n");
}

function pickPrimaryLabel(
  left: DebriefPatternValidationResult,
  right: DebriefPatternValidationResult,
): string {
  if (left.count !== right.count) {
    return left.count >= right.count ? left.pattern_label : right.pattern_label;
  }
  return left.pattern_label.length >= right.pattern_label.length ? left.pattern_label : right.pattern_label;
}

/** Merge observation-pattern validations that describe the same normalized concept. */
export function mergeDebriefPatternValidationsByCanonicalKey(
  results: DebriefPatternValidationResult[],
): DebriefPatternValidationResult[] {
  const merged = new Map<string, DebriefPatternValidationResult>();

  for (const row of results) {
    const key = row.canonical_finding_key ?? canonicalizeDebriefFindingKey(row.pattern_label);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...row, canonical_finding_key: key });
      continue;
    }

    merged.set(key, {
      ...existing,
      pattern_label: pickPrimaryLabel(existing, row),
      normalized_pattern_key: key,
      canonical_finding_key: key,
      count: Math.max(existing.count, row.count),
      total: Math.max(existing.total, row.total),
      status: pickStrongerValidationStatus(existing.status, row.status),
      commercial_status: pickStrongerCommercialStatus(existing.commercial_status, row.commercial_status) ?? undefined,
      provider_quote: mergeEvidenceQuotes(existing.provider_quote, row.provider_quote),
      reason: pickStrongerValidationStatus(existing.status, row.status) === existing.status ? existing.reason : row.reason,
      rep_accepted: existing.rep_accepted && row.rep_accepted,
      recorded_at: existing.recorded_at || row.recorded_at,
    });
  }

  return [...merged.values()];
}

export function commercialStatusPreventsOpportunityCreation(
  status: DebriefFindingCommercialStatus | null | undefined,
): boolean {
  return (
    status == null ||
    status === "mentioned_only" ||
    status === "qualified_issue" ||
    status === "rejected_issue" ||
    status === "no_active_opportunity"
  );
}

export function narrativeExpressesMeaningfulCommercialInterest(narrative: string): boolean {
  const text = narrative.trim();
  if (NARRATIVE_EVALUATION_REQUESTED.test(text)) return true;
  if (NARRATIVE_EVALUATION_DECLINED.test(text)) return false;
  if (NARRATIVE_NO_MAJOR_ISSUES.test(text) && !NARRATIVE_EVALUATION_REQUESTED.test(text)) {
    return false;
  }
  return (
    NARRATIVE_FUTURE_CONDITIONAL_INTEREST.test(text) &&
    /\b(meaningful clinical or workflow advantage|worth evaluating|want to evaluate|schedule)\b/i.test(text)
  );
}
