/**
 * Provider overview — compact positive findings under the deployment directive.
 * Validated / high-confidence only; max 4 bullets; no warnings or scores.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  isUpcomingEngagementStatus,
  sortUpcomingEngagements,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderFieldCommandBriefingItem } from "@/lib/surgical-sales/buildProviderFieldCommandBriefing";
import type { ProviderFieldTimeRisk } from "@/lib/surgical-sales/buildProviderFieldTimeRisk";
import { observationFeasibilityAllowed } from "@/lib/surgical-sales/buildProviderFieldTimeRisk";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { learningGapForField } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { assessIntelligenceFieldQuality } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  formatIntelligenceCaptureSummaryChip,
  parseIntelligenceCaptureValue,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  isIntelligenceSectionVisibleForCommercialStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { enforceOverviewRiskWordLimit } from "@/lib/surgical-sales/providerOverviewRiskCopy";

export const PROVIDER_OVERVIEW_KNOWN_SO_FAR_MAX = 4;

/** @deprecated Alias — same builder, overview label is "Confirmed so far" */
export const PROVIDER_OVERVIEW_CONFIRMED_SO_FAR_MAX = PROVIDER_OVERVIEW_KNOWN_SO_FAR_MAX;

const OBSERVATION_ENGAGEMENT_TYPES = new Set([
  "observation_request",
  "or_visit",
  "or_observation",
]);

type KnownSoFarCandidate = {
  id: string;
  line: string;
  rank: number;
};

const NEGATIVE_LINE_RE =
  /\b(not |unknown|unconfirmed|unclear|blocked|restricted|denied|partial|thin|weak|missing|fails?|risk|warning)\b/i;

function fieldText(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "").trim();
}

function sectionForDbKey(dbKey: string): ProviderIntelligenceSectionId {
  for (const [sectionId, keys] of Object.entries(PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER)) {
    if ((keys as string[]).includes(dbKey)) {
      return sectionId as ProviderIntelligenceSectionId;
    }
  }
  return "observation_readiness";
}

function isHighConfidenceField(
  contact: Record<string, unknown>,
  dbKey: string,
  commercialStage: ProviderCommercialWorkflowStage,
): boolean {
  const sectionId = sectionForDbKey(dbKey);
  if (!isIntelligenceSectionVisibleForCommercialStage(sectionId, commercialStage)) {
    return false;
  }
  const gap = learningGapForField(dbKey, sectionId, contact);
  if (gap) return false;
  const assessment = assessIntelligenceFieldQuality(dbKey, contact[dbKey] as string | null | undefined);
  return assessment.depth === "validated" || assessment.depth === "structured";
}

function polishLine(line: string): string {
  const trimmed = enforceOverviewRiskWordLimit(line.replace(/\s+/g, " ").trim(), 8);
  if (!trimmed) return "";
  const first = trimmed.charAt(0).toUpperCase();
  return first + trimmed.slice(1);
}

function pushCandidate(
  out: KnownSoFarCandidate[],
  id: string,
  line: string,
  rank: number,
): void {
  const polished = polishLine(line);
  if (!polished || NEGATIVE_LINE_RE.test(polished)) return;
  if (out.some((c) => c.id === id || c.line.toLowerCase() === polished.toLowerCase())) return;
  out.push({ id, line: polished, rank });
}

function positiveLineForDbKey(contact: Record<string, unknown>, dbKey: string): string | null {
  const raw = fieldText(contact, dbKey);
  if (!fieldHasIntelligenceSignal(dbKey, raw)) return null;

  if (dbKey === "provider_observation_feasibility") {
    if (!observationFeasibilityAllowed(contact)) return null;
    return "Observation appears feasible";
  }

  if (dbKey === "provider_evaluation_openness") {
    const parsed = parseIntelligenceCaptureValue(dbKey, raw);
    const token = String(parsed.token ?? "").toLowerCase();
    if (token === "open" || token === "trial_ready") {
      return "Observation discussion initiated";
    }
    return null;
  }

  if (dbKey === "provider_communication_style") {
    const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
    if (!chip || NEGATIVE_LINE_RE.test(chip)) return null;
    const style = chip.toLowerCase();
    if (style === "cold") return "Rep interaction style is reserved";
    if (style === "neutral") return "Rep interaction style is neutral/professional";
    if (style === "warm") return "Rep interaction style is warm and collaborative";
    if (style === "advocate") return "Rep interaction style is advocate-level";
    return `Rep interaction style is ${style}`;
  }

  if (dbKey === "provider_observation_access_path") {
    return "Know the OR access path";
  }

  if (dbKey === "provider_observation_coordinator_contact") {
    return "Know who owns scheduling";
  }

  if (dbKey === "provider_procedure_focus" || dbKey === "provider_technique_preferences") {
    const combined = `${fieldText(contact, "provider_procedure_focus")} ${fieldText(contact, "provider_technique_preferences")}`.toLowerCase();
    if (/\blap\b|laparoscopic/i.test(combined)) return "Laparoscopic procedures likely present";
    if (/\brobotic\b|\bdavinci\b/i.test(combined)) return "Robotic cases identified";
    if (/\bopen\b/i.test(combined) && /\blap\b/i.test(combined)) return "Open and lap cases in the mix";
    const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
    if (chip && !NEGATIVE_LINE_RE.test(chip)) {
      return dbKey === "provider_procedure_focus" ? `${chip} procedures in focus` : chip;
    }
    return "Procedure focus locked in";
  }

  if (dbKey === "provider_credentialing_status") {
    return "Vendor clearance figured out";
  }

  if (dbKey === "provider_decision_maker_status") {
    return "Know who signs off";
  }

  if (dbKey === "provider_champion_potential") {
    const parsed = parseIntelligenceCaptureValue(dbKey, raw);
    const token = String(parsed.token ?? "").toLowerCase();
    if (token.includes("champion") || token.includes("advocate") || /\bchampion\b/i.test(raw)) {
      return "Internal champion identified";
    }
    return null;
  }

  if (dbKey === "influence_level") {
    return "Know who moves the trial";
  }

  const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
  if (!chip || NEGATIVE_LINE_RE.test(chip)) return null;
  return polishLine(chip);
}

function detectRelationship(contact: Record<string, unknown>): string | null {
  const strength = String(contact.relationship_strength ?? "").trim().toLowerCase();
  if (strength === "strong" || strength === "established" || strength === "partner") {
    return "Surgeon relationship established";
  }
  const stage = String(contact.provider_relationship_stage ?? "").trim().toLowerCase();
  if (
    stage === "active_customer" ||
    stage === "observation_scheduled" ||
    stage === "observation_completed" ||
    stage === "evaluation_active" ||
    stage === "active_relationship" ||
    stage === "established_customer"
  ) {
    return "Surgeon relationship established";
  }
  if (
    stage === "engagement_active" ||
    stage === "early_discovery" ||
    stage === "active_evaluation" ||
    strength === "developing" ||
    strength === "moderate"
  ) {
    return "Surgeon relationship started";
  }
  return null;
}

function detectEngagement(engagements: ProviderEngagementSummary[]): string | null {
  const upcoming = sortUpcomingEngagements(engagements);

  const observationTouch = upcoming.find((e) =>
    OBSERVATION_ENGAGEMENT_TYPES.has(String(e.engagement_type ?? "").toLowerCase()),
  );
  if (observationTouch) return "Observation discussion initiated";

  const intro = upcoming.find(
    (e) =>
      /\bintro\b/i.test(e.engagement_type) ||
      /\bintro\b/i.test(e.engagement_type_label) ||
      /\bintro\b/i.test(String(e.title ?? "")),
  );
  if (intro) return "Intro engagement active";

  const touch = upcoming[0];
  if (touch) {
    const label = touch.engagement_type_label?.trim() || "Field touch";
    if (!NEGATIVE_LINE_RE.test(label)) {
      return `${label} on calendar`;
    }
  }

  const recent = [...engagements]
    .filter((e) => {
      const s = e.status.toLowerCase();
      return s === "completed" || s === "done";
    })
    .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")))[0];

  if (recent && /\bintro\b/i.test(recent.engagement_type_label)) {
    return "Intro engagement completed";
  }

  return null;
}

function detectFieldTimeStrength(fieldTimeRisk: ProviderFieldTimeRisk | null | undefined): KnownSoFarCandidate[] {
  if (!fieldTimeRisk) return [];
  const out: KnownSoFarCandidate[] = [];
  for (const input of fieldTimeRisk.inputs) {
    if (input.status !== "strong") continue;
    if (input.id === "observation_feasibility") {
      pushCandidate(out, "ft:observation", "Observation appears feasible", 12);
    } else if (input.id === "coordinator_mapped") {
      pushCandidate(out, "ft:coordinator", "Know who owns scheduling", 28);
    } else if (input.id === "or_access_known") {
      pushCandidate(out, "ft:access", "Know the OR access path", 24);
    } else if (input.id === "scheduling_clarity") {
      pushCandidate(out, "ft:scheduling", "Case schedule makes sense", 32);
    } else if (input.id === "workflow_intelligence") {
      pushCandidate(out, "ft:workflow", "Case workflow makes sense", 26);
    } else if (input.id === "relationship_maturity") {
      pushCandidate(out, "ft:relationship", "Surgeon relationship established", 14);
    }
  }
  return out;
}

const PRIORITY_DB_KEYS: string[] = [
  "provider_evaluation_openness",
  "provider_observation_feasibility",
  "provider_observation_access_path",
  "provider_procedure_focus",
  "provider_technique_preferences",
  "provider_observation_coordinator_contact",
  "provider_ideal_observation_cases",
  "provider_credentialing_status",
  "provider_decision_maker_status",
  "provider_champion_potential",
  "provider_communication_style",
  "influence_level",
];

/** Overview — validated positives only (max 4). */
export const buildProviderOverviewConfirmedSoFar = buildProviderOverviewKnownSoFar;

export function buildProviderOverviewKnownSoFar(input: {
  contact: Record<string, unknown>;
  commercialStage: ProviderCommercialWorkflowStage;
  engagements?: ProviderEngagementSummary[];
  briefingValidated?: ProviderFieldCommandBriefingItem[];
  fieldTimeRisk?: ProviderFieldTimeRisk | null;
  maxItems?: number;
}): string[] {
  const maxItems = input.maxItems ?? PROVIDER_OVERVIEW_KNOWN_SO_FAR_MAX;
  const candidates: KnownSoFarCandidate[] = [];

  for (const dbKey of PRIORITY_DB_KEYS) {
    if (!isHighConfidenceField(input.contact, dbKey, input.commercialStage)) continue;
    const line = positiveLineForDbKey(input.contact, dbKey);
    if (line) pushCandidate(candidates, `field:${dbKey}`, line, 20);
  }

  const relationship = detectRelationship(input.contact);
  if (relationship) pushCandidate(candidates, "relationship", relationship, 14);

  const engagements = input.engagements ?? [];
  const engagementLine = detectEngagement(engagements);
  if (engagementLine) {
    const hasUpcoming = engagements.some((e) => isUpcomingEngagementStatus(e.status));
    pushCandidate(candidates, "engagement", engagementLine, hasUpcoming ? 18 : 40);
  }

  for (const item of detectFieldTimeStrength(input.fieldTimeRisk)) {
    pushCandidate(candidates, item.id, item.line, item.rank);
  }

  for (const item of input.briefingValidated ?? []) {
    if (!isHighConfidenceField(input.contact, item.dbKey, input.commercialStage)) {
      const line = positiveLineForDbKey(input.contact, item.dbKey);
      if (line) pushCandidate(candidates, `brief:${item.dbKey}`, line, 36);
      continue;
    }
    const line = positiveLineForDbKey(input.contact, item.dbKey) ?? polishLine(item.label);
    if (line) pushCandidate(candidates, `brief:${item.dbKey}`, line, 34);
  }

  return candidates
    .sort((a, b) => a.rank - b.rank)
    .slice(0, maxItems)
    .map((c) => c.line);
}
