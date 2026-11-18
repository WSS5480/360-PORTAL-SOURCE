/**
 * Intelligence tab — synthesized operational briefing (not dashboard widgets).
 */

import type { IntelligenceDashboardFactGroup } from "@/lib/surgical-sales/buildProviderIntelligenceDashboardView";
import type { IntelligenceDashboardAction } from "@/lib/surgical-sales/buildProviderIntelligenceDashboardView";
import type { ProviderIntelligenceScopeDisplay } from "@/lib/surgical-sales/buildProviderIntelligenceScopeDisplay";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderOverviewOperationalSignals,
  flattenOperationalSignalGroups,
  type OperationalFieldSignal,
} from "@/lib/surgical-sales/buildProviderOverviewOperationalSignals";
import type { ProviderOverviewIntelligenceDensity } from "@/lib/surgical-sales/buildProviderOverviewIntelligenceDensity";
import {
  PROVIDER_INTELLIGENCE_MATURITY_LABELS,
  type ProviderIntelligenceMaturitySnapshot,
} from "@/lib/surgical-sales/providerIntelligenceMaturity";
import {
  formatContextMemoryLine,
  FACILITY_CONTEXT_DEFAULTS,
  PROVIDER_CONTEXT_DEFAULTS,
  type OperationalChipStatus,
} from "@/lib/surgical-sales/providerOverviewMissionPresentation";
import type { OperationalVisibilityState } from "@/lib/surgical-sales/operationalVisibilityVocabulary";
import type { DeploymentConfidenceTier } from "@/lib/surgical-sales/commercialDeploymentReadiness";
import {
  buildProviderOperationalReadinessFramework,
} from "@/lib/surgical-sales/buildProviderOperationalReadinessFramework";
import type { OperationalReadinessVerdictId } from "@/lib/surgical-sales/providerOperationalReadinessVocabulary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  FIELD_INTELLIGENCE_NOT_STARTED,
  providerHasFieldIntelligenceEvidence,
  type ProviderFieldIntelligenceEvidenceInput,
} from "@/lib/surgical-sales/providerFieldIntelligenceEvidence";
import { sanitizeLegacyIntelligenceUserCopy } from "@/lib/surgical-sales/legacyIntelligenceUserCopy";
import { sanitizeOperationalIntelCopy } from "@/lib/surgical-sales/providerIntelligenceOperationalCopy";
import {
  filterPrimaryAlertItems,
  filterPrimaryAlertLabels,
  isAdminBackgroundDbKey,
  isAdminPrimaryAlertLabel,
  type ActiveScheduledFieldContext,
} from "@/lib/surgical-sales/backgroundIntelligenceSections";

const CHIP_STATUS_LABELS: Record<OperationalChipStatus, string> = {
  needs_validation: "Needs validation",
  confirmed: "Confirmed",
  still_learning: "Still learning",
  not_observed: "Not observed",
};

export type OperationalStatusSummary = {
  readinessHeadline: string;
  operationalConfidence: string;
  /** One tactical line when it adds more than operational confidence alone. */
  fieldNote: string | null;
  nextFieldMove: string;
};

/** Strip legacy CRM / warning vocabulary from intelligence-tab user copy. */
export function sanitizeIntelligenceTabUserCopy(text: string): string {
  let t = sanitizeLegacyIntelligenceUserCopy(text);
  t = sanitizeOperationalIntelCopy(t);
  t = sanitizeLegacyIntelligenceUserCopy(t);
  const replacements: [RegExp, string][] = [
    [/procedure mix captured but not validated/gi, "Procedure mix still needs detail"],
    [/commercialization-ready/gi, "Operationally ready"],
    [/commercialization/gi, "Operational context"],
    [/commercial influence/gi, "Influence path"],
    [/should we invest field time/gi, ""],
    [/\bopen questions?\b/gi, "still exploring"],
    [/\bconfirmed facts?\b/gi, "captured findings"],
    [/\bstrongest signals?\b/gi, "top highlights"],
    [/\bintelligence signals?\b/gi, "findings"],
    [/\bvalidate(?:d|tion)?\b/gi, "confirm"],
    [/\bmapping status\b/gi, "progress"],
    [/\bconfidence\b/gi, "context depth"],
  ];
  for (const [pattern, replacement] of replacements) {
    t = t.replace(pattern, replacement);
  }
  return t.replace(/\s{2,}/g, " ").replace(/\s+([.,;])/g, "$1").trim();
}

export type ImmediateBlocker = {
  id: string;
  title: string;
  statusLabel: string;
  detail: string;
  dbKey?: string;
  sectionId?: ProviderIntelligenceSectionId;
};

export type TacticalRealities = {
  facilityAccess: string[];
  surgeonWorkflow: string[];
};

export type RequiredAction = {
  id: string;
  label: string;
  sectionId: ProviderIntelligenceSectionId;
};

const FIELD_NOTE_BY_VERDICT: Record<OperationalReadinessVerdictId, string> = {
  not_viable_yet: "Build facility and provider context before committing field time.",
  observation_possible_with_risk:
    "Validate access and vendor gates before posting OR time or heavy field spend.",
  operationally_qualified: "Plan observation with coordinator confirmation — confirm access on file.",
  evaluation_ready: "Align trial timing with mapped access and clinical lead.",
  commercial_expansion_candidate: "Maintain operational intelligence while expanding supported cases.",
};

const OPERATIONAL_CONFIDENCE_BY_VERDICT: Record<OperationalReadinessVerdictId, string> = {
  not_viable_yet: "Still learning — case support context is thin.",
  observation_possible_with_risk: "Developing — validate access and clearance on the next touch.",
  operationally_qualified: "Developing — enough context to plan observation with control.",
  evaluation_ready: "Confirmed enough for evaluation motion with mapped access.",
  commercial_expansion_candidate: "Confirmed — operational path supports continued field investment.",
};

const FACILITY_TOPIC_PATTERNS: { pattern: RegExp; fallback: string }[] = [
  { pattern: /vendor|clearance|credential/i, fallback: "Vendor approval pathway still unclear" },
  { pattern: /access|observation.*path|feasibility/i, fallback: "OR access process not yet confirmed" },
  { pattern: /schedul|coordinator|days_case/i, fallback: "Observation workflow not standardized" },
  { pattern: /purchas|preference|vendors/i, fallback: "Purchasing involvement unknown" },
];

const PROVIDER_TOPIC_PATTERNS: { pattern: RegExp; fallback: string }[] = [
  { pattern: /procedure|technique|modality|robotic|open/i, fallback: "Procedure mix partially understood" },
  { pattern: /workflow|pain|team|turnover/i, fallback: "Turnover and pacing not observed" },
  { pattern: /preference|dock|instrument|setup/i, fallback: "Setup expectations unclear" },
  { pattern: /volume|case|procedural/i, fallback: "Procedural behavior still developing" },
  { pattern: /communication|relationship|influence|champion|follow/i, fallback: "Communication preferences not mapped" },
];

function densityFromTier(tier: DeploymentConfidenceTier): ProviderOverviewIntelligenceDensity {
  if (tier === "low") return "sparse";
  if (tier === "high") return "grounded";
  return "developing";
}

function lineFromGroups(
  groups: IntelligenceDashboardFactGroup[],
  patterns: { pattern: RegExp; fallback: string }[],
  defaults: readonly string[],
  max: number,
): string[] {
  const facts = groups.flatMap((g) => g.facts);
  const lines: string[] = [];
  const used = new Set<string>();

  for (const { pattern, fallback } of patterns) {
    const match = facts.find((f) => pattern.test(f.dbKey) || pattern.test(f.label));
    const raw = match ? formatContextMemoryLine(match.line) : fallback;
    const key = raw.toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    lines.push(sanitizeIntelligenceTabUserCopy(raw));
    if (lines.length >= max) break;
  }

  if (lines.length === 0) return [...defaults].slice(0, max);
  while (lines.length < Math.min(max, defaults.length)) {
    const next = defaults[lines.length];
    if (next && !used.has(next.toLowerCase())) {
      lines.push(next);
      used.add(next.toLowerCase());
    } else break;
  }

  return lines.slice(0, max);
}

function lineFromBullets(
  bullets: ProviderIntelligenceScopeDisplay["facility"]["bullets"],
  patterns: { pattern: RegExp; fallback: string }[],
  defaults: readonly string[],
  max: number,
): string[] {
  const syntheticGroups: IntelligenceDashboardFactGroup[] = [
    {
      id: "scope",
      title: "",
      hint: "",
      facts: bullets.map((b) => ({
        dbKey: b.dbKey,
        label: b.label,
        line: b.line,
        state: b.state,
        scope: b.scope,
      })),
    },
  ];
  return lineFromGroups(syntheticGroups, patterns, defaults, max);
}

const GENERIC_BLOCKER_DETAIL =
  /needs validation on next|still learning|confirm on first field|validated on file/i;

function blockerDetail(signal: OperationalFieldSignal, title: string): string | null {
  const detail = sanitizeIntelligenceTabUserCopy(
    scanLine((signal.meaning?.trim() || signal.label) ?? "", 72),
  );
  if (!detail) return null;
  if (detail.toLowerCase() === title.toLowerCase()) return null;
  if (GENERIC_BLOCKER_DETAIL.test(detail)) return null;
  return detail;
}

function chipStatusLabel(status: OperationalChipStatus | undefined): string {
  if (!status) return "Needs validation";
  return CHIP_STATUS_LABELS[status] ?? "Needs validation";
}

function signalToBlocker(signal: OperationalFieldSignal): ImmediateBlocker | null {
  if (signal.chipStatus === "confirmed") return null;
  if (isAdminBackgroundDbKey(signal.dbKey)) return null;
  const title = sanitizeIntelligenceTabUserCopy(scanLine(signal.shortLabel || signal.label, 48));
  if (isAdminPrimaryAlertLabel(title)) return null;
  const detail = blockerDetail(signal, title);
  return {
    id: signal.id,
    title,
    statusLabel: chipStatusLabel(signal.chipStatus),
    detail: detail ?? "",
    dbKey: signal.dbKey,
    sectionId: signal.sectionId,
  };
}

function fieldNoteForVerdict(input: {
  verdictId: OperationalReadinessVerdictId;
  operationalConfidence: string;
  fieldGuidance?: string | null;
}): string | null {
  const fallback = FIELD_NOTE_BY_VERDICT[input.verdictId];
  const guidance = input.fieldGuidance?.trim();
  const candidate = sanitizeIntelligenceTabUserCopy(
    guidance ? scanLine(guidance, 96) : fallback,
  );
  if (!candidate) return null;
  const v = input.operationalConfidence.toLowerCase();
  const c = candidate.toLowerCase();
  if (v.includes(c.slice(0, 24)) || c.includes(v.slice(0, 24))) return null;
  return candidate;
}

export function buildOperationalStatusSummary(input: {
  contact: Record<string, unknown>;
  maturitySnapshot?: ProviderIntelligenceMaturitySnapshot | null;
  nextBestMove: string;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  opportunities?: Array<Record<string, unknown>>;
  relationshipStage?: string | null;
  activityTimeline?: ProviderFieldIntelligenceEvidenceInput["activityTimeline"];
  clinicalDiscoveryAnswers?: ProviderFieldIntelligenceEvidenceInput["clinicalDiscoveryAnswers"];
}): OperationalStatusSummary {
  const hasFieldEvidence = providerHasFieldIntelligenceEvidence({
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
    activityTimeline: input.activityTimeline,
    clinicalDiscoveryAnswers: input.clinicalDiscoveryAnswers,
  });

  if (!hasFieldEvidence) {
    return {
      readinessHeadline: FIELD_INTELLIGENCE_NOT_STARTED.statusLabel,
      operationalConfidence: FIELD_INTELLIGENCE_NOT_STARTED.message,
      fieldNote: null,
      nextFieldMove: sanitizeIntelligenceTabUserCopy(
        scanLine(
          `${FIELD_INTELLIGENCE_NOT_STARTED.recommendedActions.startIntroCall} or ${FIELD_INTELLIGENCE_NOT_STARTED.recommendedActions.createFirstEngagement.toLowerCase()}`,
          64,
        ),
      ),
    };
  }

  const framework = buildProviderOperationalReadinessFramework({
    contact: input.contact,
    relationshipStage: input.relationshipStage,
    engagements: input.engagements,
    cases: input.cases,
    opportunities: input.opportunities,
  });

  const verdict = framework.verdict;
  const stageLabel = input.maturitySnapshot
    ? PROVIDER_INTELLIGENCE_MATURITY_LABELS[input.maturitySnapshot.stage]
    : "Early discovery";

  const operationalConfidence =
    OPERATIONAL_CONFIDENCE_BY_VERDICT[verdict.id] ?? OPERATIONAL_CONFIDENCE_BY_VERDICT.not_viable_yet;

  return {
    readinessHeadline: sanitizeIntelligenceTabUserCopy(stageLabel),
    operationalConfidence: sanitizeIntelligenceTabUserCopy(operationalConfidence),
    fieldNote: fieldNoteForVerdict({
      verdictId: verdict.id,
      operationalConfidence,
      fieldGuidance: framework.fieldGuidance,
    }),
    nextFieldMove: sanitizeIntelligenceTabUserCopy(scanLine(input.nextBestMove, 64)),
  };
}

export function buildImmediateBlockers(
  signals: OperationalFieldSignal[],
  max = 5,
  fieldContext: ActiveScheduledFieldContext = {},
): ImmediateBlocker[] {
  const blockers: ImmediateBlocker[] = [];
  const seen = new Set<string>();

  for (const signal of signals) {
    const row = signalToBlocker(signal);
    if (!row) continue;
    const key = row.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    blockers.push(row);
    if (blockers.length >= max) break;
  }

  return filterPrimaryAlertItems(blockers, (blocker) => blocker.title, fieldContext).slice(0, max);
}

export function buildTacticalRealities(input: {
  facilityGroups: IntelligenceDashboardFactGroup[];
  providerGroups: IntelligenceDashboardFactGroup[];
  facilityBullets: ProviderIntelligenceScopeDisplay["facility"]["bullets"];
  providerBullets: ProviderIntelligenceScopeDisplay["provider"]["bullets"];
}): TacticalRealities {
  const facilityFromGroups = lineFromGroups(
    input.facilityGroups,
    FACILITY_TOPIC_PATTERNS,
    FACILITY_CONTEXT_DEFAULTS,
    4,
  );
  const providerFromGroups = lineFromGroups(
    input.providerGroups,
    PROVIDER_TOPIC_PATTERNS,
    PROVIDER_CONTEXT_DEFAULTS,
    4,
  );

  return {
    facilityAccess:
      facilityFromGroups.length >= 2
        ? facilityFromGroups
        : lineFromBullets(input.facilityBullets, FACILITY_TOPIC_PATTERNS, FACILITY_CONTEXT_DEFAULTS, 4),
    surgeonWorkflow:
      providerFromGroups.length >= 2
        ? providerFromGroups
        : lineFromBullets(input.providerBullets, PROVIDER_TOPIC_PATTERNS, PROVIDER_CONTEXT_DEFAULTS, 4),
  };
}

export function buildRequiredActions(
  actions: IntelligenceDashboardAction[],
  options?: { max?: number; excludeLabels?: string[] },
): RequiredAction[] {
  const max = options?.max ?? 4;
  const exclude = new Set(
    (options?.excludeLabels ?? []).map((l) => l.trim().toLowerCase()).filter(Boolean),
  );
  const seen = new Set<string>();
  const out: RequiredAction[] = [];

  for (const action of actions) {
    const label = sanitizeIntelligenceTabUserCopy(scanLine(action.label, 64));
    const key = label.toLowerCase();
    if (seen.has(key) || exclude.has(key)) continue;
    seen.add(key);
    out.push({ id: action.id, label, sectionId: action.sectionId });
    if (out.length >= max) break;
  }

  return out;
}

export function buildIntelligenceCriticalUnknowns(input: {
  scope: ProviderIntelligenceScopeDisplay;
  organizationLinked: boolean;
  hasObservationHistory: boolean;
  combinedTier: DeploymentConfidenceTier;
}): OperationalFieldSignal[] {
  const groups = buildProviderOverviewOperationalSignals({
    scope: input.scope,
    organizationLinked: input.organizationLinked,
    hasObservationHistory: input.hasObservationHistory,
    density: densityFromTier(input.combinedTier),
  });
  return flattenOperationalSignalGroups(groups).slice(0, 8);
}

export function resolveIntelligenceObservationHistory(input: {
  cases?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
}): boolean {
  return (
    (input.cases ?? []).some((c) => String(c.case_type || "").toLowerCase() === "observation") ||
    (input.engagements ?? []).some((e) =>
      /observation|or_visit|or_observation/i.test(String(e.engagement_type || "")),
    )
  );
}

/** @deprecated Use buildOperationalStatusSummary — kept for transitional imports */
export type IntelligenceCommandBarView = {
  stageLabel: string;
  operationalConfidence: string;
  nextFieldMove: string;
  guidanceLine: string;
  confidenceRailFill: number;
  primaryCta: string;
};

export function buildIntelligenceCommandGuidance(
  visibilityState: OperationalVisibilityState,
): string {
  const map: Record<OperationalVisibilityState, string> = {
    early: "Validate workflow, OR access, and vendor clearance path before observation planning.",
    developing: "Close access and workflow gaps on your next touch before scheduling observation.",
    strong: "Observation path is taking shape — confirm scheduling and credentialing details.",
    validated: "Field context is solid — align next touch with evaluation or case support.",
  };
  return map[visibilityState] ?? map.developing;
}

export function buildFacilityOperationalContextLines(input: {
  groups: IntelligenceDashboardFactGroup[];
  scopeBullets: ProviderIntelligenceScopeDisplay["facility"]["bullets"];
}): string[] {
  return buildTacticalRealities({
    facilityGroups: input.groups,
    providerGroups: [],
    facilityBullets: input.scopeBullets,
    providerBullets: [],
  }).facilityAccess;
}

export function buildProviderOperationalContextLines(input: {
  groups: IntelligenceDashboardFactGroup[];
  scopeBullets: ProviderIntelligenceScopeDisplay["provider"]["bullets"];
}): string[] {
  return buildTacticalRealities({
    facilityGroups: [],
    providerGroups: input.groups,
    facilityBullets: [],
    providerBullets: input.scopeBullets,
  }).surgeonWorkflow;
}
