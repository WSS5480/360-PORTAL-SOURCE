/**
 * Incremental provider intelligence — prioritize unknowns, lightweight capture,
 * progressive depth unlock, and next-interaction recommendations.
 */

import {
  PROVIDER_INTELLIGENCE_REQUIRED_DB_KEYS,
  PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
  PROVIDER_INTELLIGENCE_SECTION_LABELS,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import {
  deriveIntelligenceSectionConfidence,
  SECTION_CONFIDENCE_ANCHORS,
  type IntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import {
  intelligenceCaptureHasSignal,
  intelligenceCaptureSpecForKey,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { isOperationalIntelligenceDisplayable } from "@/lib/surgical-sales/operationalIntelligenceDisplay";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  maturityCaptureScoreBoost,
  type ProviderIntelligenceMaturitySnapshot,
} from "@/lib/surgical-sales/providerIntelligenceMaturity";
import { isVendorFootprintDiscoveryVisibleForMaturityStage } from "@/lib/surgical-sales/providerIntelligenceDiscoveryRouting";
import { formatLearningGapsHeadline } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { buildProviderEvidenceBasedRecommendations } from "@/lib/surgical-sales/providerEvidenceBasedRecommendations";
import {
  discoveryInteractionPrompt,
  isIntelligenceFieldAppropriateForStakeholder,
  stakeholderPriorityBoost,
  type IntelligenceDiscoveryStakeholder,
} from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";
import type { WizardFieldConfig } from "@/lib/surgical-sales/providerWizardFields";

export type IntelligenceFieldTier = "anchor" | "supporting" | "depth";

export type IntelligenceCapturePriority = {
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
  sectionLabel: string;
  fieldLabel: string;
  tier: IntelligenceFieldTier;
  priorityScore: number;
  lightweight: boolean;
  reason: string;
};

export type IntelligenceInteractionRecommendation = {
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
  sectionLabel: string;
  fieldLabel: string;
  prompt: string;
  timingLabel: string;
  priorityScore: number;
};

export type IntelligenceSectionFieldSplit = {
  quickFields: WizardFieldConfig[];
  deepFields: WizardFieldConfig[];
  deepUnlocked: boolean;
  missingQuickCount: number;
  missingDeepCount: number;
};

const FIELD_LABEL_BY_KEY = new Map(PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label]));

/** Narrative / secondary fields — shown after anchors have signal. */
const DEPTH_FIELD_KEYS = new Set([
  "provider_technique_detail",
  "provider_workflow_pain_points",
  "provider_case_volume_estimate",
  "provider_or_team_dynamics",
  "provider_support_expectations",
  "provider_decision_maker_status",
  "provider_champion_potential",
  "provider_follow_up_approach",
  "provider_dissatisfaction_areas",
  "provider_preference_card_signals",
  "provider_first_observation_questions",
]);

const SECTION_GAP_PRIORITY: Record<ProviderIntelligenceSectionId, number> = {
  observation_readiness: 0,
  clinical_workflow: 1,
  relationship_intelligence: 2,
  or_environment: 3,
  commercial_signals: 4,
};

export const INTELLIGENCE_CAPTURE_INTERACTION_PROMPTS: Record<
  string,
  { prompt: string; timingLabel: string }
> = {
  provider_procedure_focus: {
    prompt: "Which procedures are they prioritizing right now?",
    timingLabel: "Next interaction",
  },
  provider_technique_preferences: {
    prompt: "Confirm primary modality — open, lap, or robotic?",
    timingLabel: "Next case day",
  },
  provider_observation_feasibility: {
    prompt: "Is observation allowed with this provider today?",
    timingLabel: "Next interaction",
  },
  provider_credentialing_status: {
    prompt: "Where are you in credentialing / vendor clearance?",
    timingLabel: "Next visit",
  },
  provider_observation_access_path: {
    prompt: "How does observation access work here?",
    timingLabel: "Before scheduling observation",
  },
  provider_current_vendors: {
    prompt: "Which vendors are under contract or embedded in purchasing today?",
    timingLabel: "During evaluation",
  },
  provider_communication_style: {
    prompt: "How do they prefer to communicate between visits?",
    timingLabel: "Next touch",
  },
  provider_responsiveness: {
    prompt: "How fast does the provider or office get back to you?",
    timingLabel: "Next touch",
  },
  influence_level: {
    prompt: "Who shapes technique and workflow choices on their cases?",
    timingLabel: "Next interaction",
  },
  provider_evaluation_openness: {
    prompt: "Are they open to evaluating alternatives — and on what timeline?",
    timingLabel: "Next interaction",
  },
  provider_competitive_products: {
    prompt: "What systems are entrenched in their cases today?",
    timingLabel: "During evaluation",
  },
  provider_or_team_dynamics: {
    prompt: "What makes OR workflow smoother or harder on case days?",
    timingLabel: "Observation or case day",
  },
  provider_ideal_observation_cases: {
    prompt: "Which procedures are best to observe for adoption?",
    timingLabel: "When scheduling",
  },
  provider_observation_coordinator_contact: {
    prompt: "Who coordinates vendor observation scheduling?",
    timingLabel: "Before first observation",
  },
  provider_observation_credentialing_needed: {
    prompt: "What approvals are required before observation access?",
    timingLabel: "Before first case day",
  },
  provider_observation_best_days_case_types: {
    prompt: "How far in advance should observation requests be submitted?",
    timingLabel: "When scheduling",
  },
  provider_observation_cadence_preference: {
    prompt: "How often can we observe — per case, monthly, or ad hoc?",
    timingLabel: "Next touch",
  },
  provider_first_observation_questions: {
    prompt: "What hypotheses do you still need to validate in the OR?",
    timingLabel: "Before observation",
  },
};

export function intelligenceFieldTier(dbKey: string, sectionId: ProviderIntelligenceSectionId): IntelligenceFieldTier {
  const anchors = SECTION_CONFIDENCE_ANCHORS[sectionId] ?? [];
  if (anchors.includes(dbKey)) return "anchor";
  if (DEPTH_FIELD_KEYS.has(dbKey)) return "depth";
  return "supporting";
}

const SCHEDULING_CONTROL_PATH_VALUES = new Set([
  "provider_office",
  "facility",
  "shared_workflow",
  "unknown",
]);

export function fieldHasIntelligenceSignal(dbKey: string, raw: unknown): boolean {
  const value = String(raw ?? "").trim();
  if (!value) return false;
  if (
    dbKey === "provider_observation_scheduling_control" &&
    SCHEDULING_CONTROL_PATH_VALUES.has(value)
  ) {
    return value !== "unknown";
  }
  if (intelligenceCaptureSpecForKey(dbKey)) {
    return intelligenceCaptureHasSignal(dbKey, value);
  }
  if (dbKey === "influence_level" || dbKey === "preferred_contact_method") {
    return value !== "unknown";
  }
  return isOperationalIntelligenceDisplayable(dbKey, value);
}

export function isLightweightIntelligenceField(field: WizardFieldConfig): boolean {
  const spec = field.capture;
  if (spec) {
    return (
      spec.input === "segmented" ||
      spec.input === "chips" ||
      spec.input === "select" ||
      spec.input === "segmented_plus_notes"
    );
  }
  return field.input === "select" || field.input === "compact_text";
}

/** Single-tap answers in Rapid Discovery — auto-save after brief confirmation. */
export function shouldAutoAdvanceRapidDiscoveryAnswer(field: WizardFieldConfig): boolean {
  const spec = field.capture;
  if (!spec) return field.input === "select";
  return spec.input === "segmented" || spec.input === "select" || spec.input === "chips";
}

export function sectionDeepFieldsUnlocked(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  confidence?: IntelligenceSectionConfidence,
): boolean {
  const tier = confidence ?? deriveIntelligenceSectionConfidence(sectionId, contact).confidence;
  if (tier === "confirmed" || tier === "validated") return true;
  const anchors = SECTION_CONFIDENCE_ANCHORS[sectionId] ?? [];
  return anchors.some((key) => fieldHasIntelligenceSignal(key, contact[key] as string | null | undefined));
}

function priorityScoreForGap(
  sectionId: ProviderIntelligenceSectionId,
  dbKey: string,
  tier: IntelligenceFieldTier,
  sectionConfidence: IntelligenceSectionConfidence,
): number {
  let score = 100 - SECTION_GAP_PRIORITY[sectionId] * 12;
  if (tier === "anchor") score += 45;
  else if (tier === "supporting") score += 22;
  else score += 8;
  if ((PROVIDER_INTELLIGENCE_REQUIRED_DB_KEYS as readonly string[]).includes(dbKey)) score += 80;
  if (sectionConfidence === "unknown") score += 18;
  else if (sectionConfidence === "partial") score += 10;
  if (INTELLIGENCE_CAPTURE_INTERACTION_PROMPTS[dbKey]) score += 6;
  return score;
}

export function buildIntelligenceCapturePriorities(
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
  maxItems = 3,
  options?: {
    maturitySnapshot?: ProviderIntelligenceMaturitySnapshot;
    discoveryStakeholder?: IntelligenceDiscoveryStakeholder;
  },
): IntelligenceCapturePriority[] {
  const discoveryStakeholder = options?.discoveryStakeholder ?? "unspecified";
  const sectionConfidence = new Map(
    (planning?.sections ?? []).map((s) => [s.id, s.confidence] as const),
  );

  const gaps: IntelligenceCapturePriority[] = [];

  for (const sectionId of Object.keys(PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER) as ProviderIntelligenceSectionId[]) {
    const fieldKeys = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId];
    const confidence = sectionConfidence.get(sectionId) ?? deriveIntelligenceSectionConfidence(sectionId, contact).confidence;

    for (const dbKey of fieldKeys) {
      if (
        discoveryStakeholder !== "unspecified" &&
        !isIntelligenceFieldAppropriateForStakeholder(dbKey, discoveryStakeholder)
      ) {
        continue;
      }
      if (
        options?.maturitySnapshot &&
        !isVendorFootprintDiscoveryVisibleForMaturityStage(
          dbKey,
          options.maturitySnapshot.stage,
        )
      ) {
        continue;
      }
      if (fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined)) continue;
      const tier = intelligenceFieldTier(dbKey, sectionId);
      if (tier === "depth" && !sectionDeepFieldsUnlocked(sectionId, contact, confidence)) continue;

      let priorityScore = priorityScoreForGap(sectionId, dbKey, tier, confidence);
      priorityScore += stakeholderPriorityBoost(dbKey, discoveryStakeholder);
      if (options?.maturitySnapshot) {
        priorityScore += maturityCaptureScoreBoost(dbKey, options.maturitySnapshot);
      }
      const lightweight = !DEPTH_FIELD_KEYS.has(dbKey) && intelligenceCaptureSpecForKey(dbKey) != null;

      gaps.push({
        dbKey,
        sectionId,
        sectionLabel: PROVIDER_INTELLIGENCE_SECTION_LABELS[sectionId],
        fieldLabel: FIELD_LABEL_BY_KEY.get(dbKey) ?? dbKey,
        tier,
        priorityScore,
        lightweight,
        reason:
          tier === "anchor"
            ? "Core signal for this area"
            : tier === "supporting"
              ? "Quick add-on once basics are in"
              : "Deepen when you have context",
      });
    }
  }

  return gaps
    .sort((a, b) => {
      if (a.lightweight !== b.lightweight) return a.lightweight ? -1 : 1;
      return b.priorityScore - a.priorityScore;
    })
    .slice(0, maxItems);
}

export function buildInteractionCaptureRecommendations(
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
  maxItems = 3,
  discoveryStakeholder: IntelligenceDiscoveryStakeholder = "unspecified",
): IntelligenceInteractionRecommendation[] {
  void discoveryStakeholder;
  const chains = buildProviderEvidenceBasedRecommendations({
    contact,
    planning,
    maxItems: maxItems + 2,
  });
  const recs: IntelligenceInteractionRecommendation[] = [];

  for (const chain of chains) {
    const promptDef = INTELLIGENCE_CAPTURE_INTERACTION_PROMPTS[chain.dbKey];
    recs.push({
      dbKey: chain.dbKey,
      sectionId: chain.sectionId,
      sectionLabel: PROVIDER_INTELLIGENCE_SECTION_LABELS[chain.sectionId],
      fieldLabel: FIELD_LABEL_BY_KEY.get(chain.dbKey) ?? chain.dbKey,
      prompt: chain.recommendation,
      timingLabel: promptDef?.timingLabel ?? "Next interaction",
      priorityScore: chain.priorityScore,
    });
  }

  return recs.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, maxItems);
}

export function splitIntelligenceSectionFields(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  allFields: WizardFieldConfig[],
  confidence?: IntelligenceSectionConfidence,
): IntelligenceSectionFieldSplit {
  const deepUnlocked = sectionDeepFieldsUnlocked(sectionId, contact, confidence);
  const quickFields: WizardFieldConfig[] = [];
  const deepFields: WizardFieldConfig[] = [];

  for (const field of allFields) {
    const tier = intelligenceFieldTier(field.key, sectionId);
    const hasSignal = fieldHasIntelligenceSignal(field.key, contact[field.key] as string | null | undefined);
    if (tier === "depth") {
      if (deepUnlocked) deepFields.push(field);
      continue;
    }
    if (!hasSignal || tier === "anchor") {
      quickFields.push(field);
    } else if (deepUnlocked) {
      deepFields.push(field);
    }
  }

  const missingQuickCount = quickFields.filter(
    (f) => !fieldHasIntelligenceSignal(f.key, contact[f.key] as string | null | undefined),
  ).length;
  const missingDeepCount = deepFields.filter(
    (f) => !fieldHasIntelligenceSignal(f.key, contact[f.key] as string | null | undefined),
  ).length;

  return { quickFields, deepFields, deepUnlocked, missingQuickCount, missingDeepCount };
}

export function formatIntelligenceEvolutionHeadline(
  planning: ProviderPlanningCompletion | null | undefined,
  contact: Record<string, unknown>,
): string {
  if (!planning) return "Add one signal when you learn it — no need to finish everything at once.";
  return formatLearningGapsHeadline(planning, contact);
}

export function sortSectionsForIncrementalView<T extends { id: string; confidence: IntelligenceSectionConfidence }>(
  sections: T[],
): T[] {
  const order = Object.keys(SECTION_GAP_PRIORITY) as ProviderIntelligenceSectionId[];
  const rank = (s: T) => {
    const confRank =
      s.confidence === "unknown" ? 0 : s.confidence === "partial" ? 1 : s.confidence === "confirmed" ? 2 : 3;
    const sectionRank = SECTION_GAP_PRIORITY[s.id as ProviderIntelligenceSectionId] ?? 9;
    return confRank * 10 + sectionRank;
  };
  return [...sections].sort((a, b) => rank(a) - rank(b));
}
