/**
 * Rapid Discovery — transform captured signals into operational intelligence (not CRM dumps).
 */

import {
  PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
  PROVIDER_INTELLIGENCE_SECTION_LABELS,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  parseIntelligenceCaptureValue,
  type IntelligenceCaptureOption,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { intelligenceCaptureSpecForKey } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import type { SectionOperationalMappingProgress } from "@/lib/surgical-sales/providerIntelligenceOperationalMapping";
import type { IntelligenceLearningGap } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  accountUnderstandingAreaForSection,
  ACCOUNT_UNDERSTANDING_AREAS,
} from "@/lib/surgical-sales/providerAccountUnderstanding";
import { sanitizeUnansweredIntelligenceCopy } from "@/lib/surgical-sales/aiSynthesisGuardrails";
import { fieldScanSummaryLine } from "@/lib/surgical-sales/intelligenceSectionScanView";
import { intelligenceSectionEmptyConfirmed } from "@/lib/surgical-sales/providerIntelligenceCardStatus";
import {
  isIncompleteSentenceFragment,
  isLowQualityIntelligenceText,
  isOperationalIntelligenceDisplayable,
} from "@/lib/surgical-sales/operationalIntelligenceDisplay";

type SynthesisRule = {
  tokens?: string[];
  match?: RegExp;
  insight: string;
  feedback: string;
};

const FIELD_SYNTHESIS_RULES: Partial<Record<string, SynthesisRule[]>> = {
  provider_observation_feasibility: [
    { tokens: ["easy"], insight: "Observation access observed — needs validation in field.", feedback: "Observation access noted" },
    { tokens: ["restricted"], insight: "Observation access not yet confirmed.", feedback: "Observation access noted" },
    { tokens: ["credentialing_required"], insight: "Credentialing required before observation.", feedback: "Credentialing noted" },
  ],
  provider_observation_access_path: [
    { tokens: ["scheduler", "coordinator"], insight: "Scheduling path observed during discovery.", feedback: "Access path noted" },
    { tokens: ["credentialing", "vendor_rep"], insight: "Access path not yet confirmed.", feedback: "Access path noted" },
  ],
  provider_observation_coordinator_contact: [
    { match: /.+/, insight: "Scheduling owner observed during discovery.", feedback: "Scheduling owner noted" },
  ],
  provider_technique_preferences: [
    { tokens: ["robotic"], insight: "Robotic mix observed — needs validation in field.", feedback: "Procedure mix noted" },
    { tokens: ["laparoscopic"], insight: "Lap mix observed — needs validation in field.", feedback: "Procedure mix noted" },
    { tokens: ["open"], insight: "Open mix observed — needs validation in field.", feedback: "Procedure mix noted" },
    { tokens: ["hybrid"], insight: "Mixed modality — not yet confirmed.", feedback: "Procedure mix noted" },
  ],
  provider_procedure_focus: [
    { match: /.+/, insight: "Procedure mix not yet confirmed.", feedback: "Procedure focus noted" },
  ],
  provider_case_volume_estimate: [
    { tokens: ["high"], insight: "Higher case volume noted in field.", feedback: "Case volume noted" },
    { tokens: ["moderate"], insight: "Moderate case volume noted in field.", feedback: "Case volume noted" },
  ],
  provider_evaluation_openness: [
    { tokens: ["open", "active"], insight: "Evaluation openness discussed — needs validation in field.", feedback: "Evaluation openness noted" },
    { tokens: ["cautious"], insight: "Evaluation openness cautious — not yet confirmed.", feedback: "Evaluation posture noted" },
    { tokens: ["closed"], insight: "Evaluation openness not discussed yet.", feedback: "Evaluation posture noted" },
  ],
  provider_or_team_dynamics: [
    { match: /.+/, insight: "OR workflow noted — needs validation in field.", feedback: "OR workflow noted" },
  ],
  provider_workflow_pain_points: [
    { match: /.+/, insight: "Workflow friction observed during discovery.", feedback: "Workflow friction noted" },
  ],
  provider_credentialing_status: [
    { tokens: ["cleared"], insight: "Vendor clearance observed on file.", feedback: "Credentialing noted" },
    { tokens: ["in_progress"], insight: "Vendor clearance in progress.", feedback: "Credentialing noted" },
    { tokens: ["blocked"], insight: "Vendor clearance not yet confirmed.", feedback: "Credentialing noted" },
  ],
  provider_responsiveness: [
    { tokens: ["fast"], insight: "Office appears responsive — scheduling moves should be tractable.", feedback: "Office responsiveness clarified" },
    { tokens: ["slow"], insight: "Office response may lag — build buffer into observation scheduling.", feedback: "Scheduling risk noted" },
  ],
  provider_communication_style: [
    { match: /.+/, insight: "Engagement style signal captured for next touch planning.", feedback: "Relationship read improved" },
  ],
};

const SECTION_SYNTHESIS_FALLBACK: Partial<Record<ProviderIntelligenceSectionId, string>> = {
  observation_readiness: "Observation path is clearer — validate scheduling on next touch.",
  or_environment: "OR access and scheduling picture is sharpening.",
  clinical_workflow: "Clinical workflow read is building from live signals.",
  relationship_intelligence: "Relationship and influence picture is updating.",
  commercial_signals: "Commercial and evaluation signals are taking shape.",
};

const SECTION_LEARNED_FEEDBACK: Partial<Record<ProviderIntelligenceSectionId, string>> = {
  observation_readiness: "Evaluation readiness increased",
  or_environment: "OR access partially clarified",
  clinical_workflow: "Workflow visibility improved",
  relationship_intelligence: "Relationship map updated",
  commercial_signals: "Commercial posture clarified",
};

function optionLabel(dbKey: string, token: string): string | null {
  const spec = intelligenceCaptureSpecForKey(dbKey);
  const pools: (IntelligenceCaptureOption[] | undefined)[] = [
    spec?.options,
    spec?.suggestedChips,
  ];
  for (const pool of pools) {
    const hit = pool?.find((o) => o.value === token);
    if (hit) return hit.label;
  }
  return null;
}

function tokenMatches(rule: SynthesisRule, tokens: string[], notes: string): boolean {
  if (rule.match && rule.match.test(notes)) return true;
  if (!rule.tokens?.length) return false;
  return rule.tokens.some((t) => tokens.includes(t));
}

export function intelligenceSectionForDbKey(dbKey: string): ProviderIntelligenceSectionId | null {
  for (const sectionId of Object.keys(PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER) as ProviderIntelligenceSectionId[]) {
    const keys = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? [];
    if (keys.includes(dbKey)) return sectionId;
  }
  return null;
}

/** Operational insight line for a single captured field (scan card / drawer). */
export function synthesizeOperationalInsight(dbKey: string, raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!fieldHasIntelligenceSignal(dbKey, trimmed)) return null;

  const parsed = parseIntelligenceCaptureValue(dbKey, trimmed);
  const notes = parsed.notes?.trim() ?? "";
  const rules = FIELD_SYNTHESIS_RULES[dbKey] ?? [];

  for (const rule of rules) {
    if (tokenMatches(rule, parsed.tokens, notes)) {
      const line = sanitizeUnansweredIntelligenceCopy(rule.insight);
      if (!isLowQualityIntelligenceText(line) && !isIncompleteSentenceFragment(line)) {
        return line;
      }
    }
  }

  // Raw note fragments are never promoted to card synthesis — rules only.
  if (
    notes.length >= 12 &&
    isOperationalIntelligenceDisplayable(dbKey, notes) &&
    !isIncompleteSentenceFragment(notes)
  ) {
    return null;
  }

  if (parsed.tokens.length > 0) {
    const labels = parsed.tokens
      .filter((t) => t !== "unknown")
      .map((t) => optionLabel(dbKey, t) ?? t.replace(/_/g, " "))
      .slice(0, 2);
    if (labels.length > 0) {
      return `Captured: ${labels.join(", ")} — validate live on next touch.`;
    }
  }

  return null;
}

/** Short “+ …” feedback after a discovery answer. */
export function buildDiscoveryLearnedFeedback(dbKey: string, raw: string | null | undefined): string {
  const trimmed = String(raw ?? "").trim();
  const parsed = parseIntelligenceCaptureValue(dbKey, trimmed);
  const notes = parsed.notes?.trim() ?? "";
  const rules = FIELD_SYNTHESIS_RULES[dbKey] ?? [];

  for (const rule of rules) {
    if (tokenMatches(rule, parsed.tokens, notes)) return rule.feedback;
  }

  const sectionId = intelligenceSectionForDbKey(dbKey);
  if (sectionId && SECTION_LEARNED_FEEDBACK[sectionId]) {
    return SECTION_LEARNED_FEEDBACK[sectionId]!;
  }

  const label = PROVIDER_INTELLIGENCE_SECTION_LABELS[sectionId ?? "clinical_workflow"];
  return `${label} updated`;
}

export function pickSectionSynthesisField(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  preferDbKey?: string,
): string | null {
  const keys = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? [];
  if (preferDbKey && keys.includes(preferDbKey)) {
    const line = synthesizeOperationalInsight(preferDbKey, contact[preferDbKey] as string);
    if (line) return line;
  }
  for (const dbKey of keys) {
    const line = synthesizeOperationalInsight(dbKey, contact[dbKey] as string);
    if (line) return line;
  }
  return null;
}

export function buildSectionSynthesizedScanSummary(input: {
  sectionId: ProviderIntelligenceSectionId;
  contact: Record<string, unknown>;
  progress: SectionOperationalMappingProgress;
  topGap?: IntelligenceLearningGap | null;
  preferDbKey?: string;
}): string {
  const { sectionId, contact, progress, topGap, preferDbKey } = input;

  if (progress.mapped === 0 || progress.readinessTone === "not_started") {
    if (topGap?.dbKey) return fieldScanSummaryLine(topGap.dbKey);
    const areaId = accountUnderstandingAreaForSection(sectionId);
    if (areaId) {
      const hint = ACCOUNT_UNDERSTANDING_AREAS[areaId]?.hint;
      if (hint) return hint;
    }
    return intelligenceSectionEmptyConfirmed(sectionId);
  }

  if (
    progress.unresolvedCount === 0 &&
    progress.total > 0 &&
    progress.mapped >= progress.total
  ) {
    return (
      SECTION_SYNTHESIS_FALLBACK[sectionId] ??
      "Area mapped enough to plan the next field touch"
    );
  }

  const synthesized = pickSectionSynthesisField(sectionId, contact, preferDbKey);
  if (synthesized) return synthesized;

  if (topGap?.dbKey) return fieldScanSummaryLine(topGap.dbKey);

  if (progress.unresolvedCount > 0) {
    return sanitizeUnansweredIntelligenceCopy(
      `${progress.unresolvedCount} open item${progress.unresolvedCount === 1 ? "" : "s"} for later`,
    );
  }

  return SECTION_SYNTHESIS_FALLBACK[sectionId] ?? intelligenceSectionEmptyConfirmed(sectionId);
}

/** Deployment-oriented badge label for scan cards. */
export function deploymentReadinessBadgeLabel(
  progress: SectionOperationalMappingProgress,
): string {
  const { mapped, total, unresolvedCount, confidence, readinessTone } = progress;
  const open = Math.max(unresolvedCount, Math.max(0, total - mapped));

  if (readinessTone === "not_started" || mapped === 0) return "Not started";
  if (
    confidence === "validated" ||
    (mapped >= total && total > 0 && open === 0)
  ) {
    return "Ready for field execution";
  }
  if (mapped > 0 && open > 0 && mapped >= Math.ceil(total * 0.5)) {
    return "Operationally understood";
  }
  if (readinessTone === "unmapped") return "Developing";
  if (readinessTone === "partial") return "Partial";
  if (readinessTone === "confirmed") return "Confirmed";
  return "Partial";
}
