import {
  findPlanningSection,
  type ProviderPlanningCompletion,
  type ProviderPlanningSectionCompletion,
} from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  PROVIDER_PLANNING_CLINICAL_WORKFLOW_FIELD_KEYS,
  PROVIDER_PLANNING_COMMERCIAL_SIGNALS_FIELD_KEYS,
  PROVIDER_PLANNING_OBSERVATION_READINESS_FIELD_KEYS,
  PROVIDER_PLANNING_OR_ENVIRONMENT_FIELD_KEYS,
  PROVIDER_PLANNING_RELATIONSHIP_INTELLIGENCE_FIELD_KEYS,
  PROVIDER_PLANNING_SECTION_LABELS,
} from "@/lib/surgical-sales/providerPlanningTabSections";
import { PROVIDER_WIZARD_CLINICAL_FIELDS } from "@/lib/surgical-sales/providerWizardFields";
import { intelligenceCaptureHasSignal } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  formatIntelligenceConfidenceDisplayLabel,
  formatSectionSignalsCapturedDetail,
  weakestSectionConfidence,
  type IntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import { formatMissingAreaDisplay, INTELLIGENCE_TRACK_LABEL } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import {
  buildIntelligenceLearningGapsForDisplay,
  INTELLIGENCE_LEARNING_GAPS_TITLE,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  FIELD_INTELLIGENCE_NOT_STARTED,
  providerHasFieldIntelligenceEvidence,
  type ProviderFieldIntelligenceEvidenceInput,
} from "@/lib/surgical-sales/providerFieldIntelligenceEvidence";

export type { IntelligenceStrengthLabel, IntelligenceTrackId } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import type { IntelligenceStrengthLabel, IntelligenceTrackId } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";

export type IntelligenceTrackSummary = {
  id: IntelligenceTrackId;
  label: string;
  status: IntelligenceStrengthLabel;
  percent: number;
  detail: string;
};

export type ProviderIntelligenceSummaryView = {
  overallStatus: IntelligenceStrengthLabel;
  /** Short strategic read (primary message). */
  interpretation: string;
  /** Prose summary of priority gaps (no chip list). */
  focusSummary: string | null;
  tracks: IntelligenceTrackSummary[];
  missingAreas: string[];
  /** User-facing labels for missing areas. */
  missingAreaLabels: string[];
  recommendation: string;
  recommendationSectionId: string | null;
};

const FIELD_LABELS: Record<string, string> = {
  provider_procedure_focus: "procedures",
  provider_technique_preferences: "modality",
  provider_technique_detail: "technique preferences",
  provider_workflow_pain_points: "workflow pain points",
  provider_case_volume_estimate: "case mix",
  provider_or_team_dynamics: "OR team dynamics",
  provider_credentialing_status: "credentialing",
  provider_current_vendors: "vendor access",
  provider_support_expectations: "support expectations",
  provider_communication_style: "communication style",
  provider_responsiveness: "responsiveness",
  provider_evaluation_openness: "evaluation openness",
  provider_preference_card_signals: "adoption barriers",
  provider_competitive_products: "competitor usage",
  provider_dissatisfaction_areas: "dissatisfaction areas",
  influence_level: "influence level",
  provider_decision_maker_status: "decision-maker status",
  provider_champion_potential: "champion potential",
  provider_follow_up_approach: "follow-up rhythm",
  provider_observation_feasibility: "observation allowed",
  provider_observation_credentialing_needed: "observation credentialing",
  provider_ideal_observation_cases: "ideal procedures to observe",
  provider_observation_access_path: "OR access constraints",
  provider_observation_coordinator_contact: "coordinator contact",
  provider_observation_cadence_preference: "observation cadence",
  provider_observation_best_days_case_types: "best days and case types",
  provider_first_observation_questions: "questions to validate",
};

function strengthFromSectionConfidence(confidence: IntelligenceSectionConfidence): IntelligenceStrengthLabel {
  if (confidence === "validated" || confidence === "confirmed") return "Strong";
  if (confidence === "partial") return "Building";
  return "Limited";
}

function trackConfidence(
  sections: ProviderPlanningSectionCompletion[],
  ids: string[],
): IntelligenceSectionConfidence {
  const confidences = ids
    .map((id) => sections.find((s) => s.id === id)?.confidence)
    .filter((c): c is IntelligenceSectionConfidence => Boolean(c));
  return confidences.length > 0 ? weakestSectionConfidence(confidences) : "unknown";
}

function aggregateSections(
  sections: ProviderPlanningSectionCompletion[],
  ids: string[],
): { filled: number; total: number; percent: number } {
  let filled = 0;
  let total = 0;
  for (const id of ids) {
    const s = sections.find((x) => x.id === id);
    if (!s) continue;
    filled += s.filled;
    total += s.total;
  }
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
  return { filled, total, percent };
}

function trackDetail(
  confidence: IntelligenceSectionConfidence,
  filled: number,
  total: number,
): string {
  return formatSectionSignalsCapturedDetail(filled, total, { confidence });
}

function missingKeysForGroup(
  contact: Record<string, unknown>,
  keys: readonly string[],
  max = 3,
): string[] {
  const out: string[] = [];
  for (const key of keys) {
    const value = String(contact[key] ?? "").trim();
    const hasSignal = value ? intelligenceCaptureHasSignal(key, value) : false;
    if (!hasSignal) {
      out.push(FIELD_LABELS[key] ?? key.replace(/^provider_/, "").replace(/_/g, " "));
    }
    if (out.length >= max) return out;
  }
  return out;
}

function joinNaturalList(items: string[]): string {
  if (items.length === 0) return "core workflow and product signals";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function weakestTrack(tracks: IntelligenceTrackSummary[]): IntelligenceTrackSummary {
  return [...tracks].sort((a, b) => a.percent - b.percent)[0];
}

function buildFocusSummaryFromLearningGaps(
  contact: Record<string, unknown>,
  planning: ProviderPlanningCompletion,
): string | null {
  const gaps = buildIntelligenceLearningGapsForDisplay(contact, planning, 3);
  if (gaps.length === 0) return null;
  const list = joinNaturalList(gaps.map((g) => g.phrase));
  return `${INTELLIGENCE_LEARNING_GAPS_TITLE}: ${list}.`;
}

function buildInterpretation(
  overallStatus: IntelligenceStrengthLabel,
  tracks: IntelligenceTrackSummary[],
): string {
  if (overallStatus === "Strong") {
    return "Solid operational read — procedure, influence, and competitive context are deployment-ready for the next visit.";
  }

  const weak = weakestTrack(tracks);

  if (overallStatus === "Limited") {
    if (weak.id === "clinical") {
      return "You do not yet have a reliable read on how they operate procedurally — field time should prioritize workflow and technique signals.";
    }
    if (weak.id === "relationship") {
      return "Relationship not operationally mature yet — adoption authority and rep engagement style need field validation.";
    }
    return "Vendor and competitive context is thin — confirm what they use today before positioning product.";
  }

  if (weak.id === "clinical") {
    return "Clinical signals are coming together, but core procedural detail is still developing for a confident OR conversation.";
  }
  if (weak.id === "relationship") {
    return "Commercial rhythm is forming — tighten influence mapping and follow-up expectations on the next touch.";
  }
  if (weak.id === "product_competitor") {
    return "Product and competitive notes are partial — validate incumbents and evaluation appetite while the relationship is warm.";
  }
  return "Intelligence is building across the main commercial lanes — keep capturing detail while engagements are active.";
}

function gatherActionItems(
  raw: string[],
  max = 3,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const label = formatMissingAreaDisplay(item);
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= max) return out;
  }
  return out;
}

function pickRecommendation(input: {
  tracks: IntelligenceTrackSummary[];
  missingAreas: string[];
  contact: Record<string, unknown>;
  planning: ProviderPlanningCompletion;
}): { text: string; sectionId: string | null } {
  const learningGaps = buildIntelligenceLearningGapsForDisplay(input.contact, input.planning, 2);
  if (learningGaps.length > 0) {
    const primary = learningGaps[0]!;
    const secondary = learningGaps[1];
    const text = secondary
      ? `On the next touch, learn ${primary.phrase.toLowerCase()} and ${secondary.phrase.toLowerCase()}.`
      : `On the next touch, learn ${primary.phrase.toLowerCase()}.`;
    return { text, sectionId: primary.sectionId };
  }

  const clinical = input.tracks.find((t) => t.id === "clinical");
  const product = input.tracks.find((t) => t.id === "product_competitor");
  const relationship = input.tracks.find((t) => t.id === "relationship");

  if (clinical?.status === "Limited") {
    const raw = [
      ...missingKeysForGroup(input.contact, PROVIDER_PLANNING_CLINICAL_WORKFLOW_FIELD_KEYS, 2),
      ...missingKeysForGroup(input.contact, PROVIDER_PLANNING_OR_ENVIRONMENT_FIELD_KEYS, 1),
    ];
    if (!raw.some((k) => k.includes("procedure"))) raw.unshift("procedure focus");
    if (product?.status !== "Strong" && !raw.some((k) => k.includes("product") || k.includes("vendor"))) {
      raw.push("current product usage");
    }
    const list = joinNaturalList(gatherActionItems(raw, 3));
    return {
      text: `Use the next case or visit to capture ${list}.`,
      sectionId: "clinical_workflow",
    };
  }

  if (product?.status === "Limited" || product?.status === "Building") {
    const raw = missingKeysForGroup(input.contact, PROVIDER_PLANNING_COMMERCIAL_SIGNALS_FIELD_KEYS);
    const list = joinNaturalList(
      gatherActionItems(
        raw.length > 0 ? raw : ["current product usage", "competitive products"],
        3,
      ),
    );
    const verb = product?.status === "Limited" ? "Use the next call to confirm" : "On the next call, confirm";
    return {
      text: `${verb} ${list}.`,
      sectionId: "commercial_signals",
    };
  }

  if (relationship?.status === "Limited" || relationship?.status === "Building") {
    const raw = missingKeysForGroup(input.contact, PROVIDER_PLANNING_RELATIONSHIP_INTELLIGENCE_FIELD_KEYS);
    const list = joinNaturalList(
      gatherActionItems(
        raw.length > 0 ? raw : ["communication style", "influence level", "follow-up approach"],
        3,
      ),
    );
    const verb = relationship?.status === "Limited" ? "On your next touch, capture" : "On your next touch, lock in";
    return {
      text: `${verb} ${list}.`,
      sectionId: "relationship_intelligence",
    };
  }

  if (clinical?.status === "Building") {
    const raw = [...missingKeysForGroup(input.contact, PROVIDER_PLANNING_CLINICAL_WORKFLOW_FIELD_KEYS, 2)];
    const list = joinNaturalList(
      gatherActionItems(
        raw.length > 0 ? raw : ["procedure focus", "OR team dynamics"],
        3,
      ),
    );
    return {
      text: `Use the next engagement to deepen ${list} while the visit is fresh.`,
      sectionId: "clinical_workflow",
    };
  }

  return {
    text: "Keep clinical and competitive notes current after the next case or visit.",
    sectionId: null,
  };
}

export function buildProviderIntelligenceSummaryView(input: {
  contact: Record<string, unknown>;
  planning: ProviderPlanningCompletion;
  engagements?: ProviderFieldIntelligenceEvidenceInput["engagements"];
  cases?: ProviderFieldIntelligenceEvidenceInput["cases"];
  clinicalDiscoveryAnswers?: ProviderFieldIntelligenceEvidenceInput["clinicalDiscoveryAnswers"];
  activityTimeline?: ProviderFieldIntelligenceEvidenceInput["activityTimeline"];
}): ProviderIntelligenceSummaryView {
  const hasFieldEvidence = providerHasFieldIntelligenceEvidence({
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
    clinicalDiscoveryAnswers: input.clinicalDiscoveryAnswers,
    activityTimeline: input.activityTimeline,
  });

  if (!hasFieldEvidence) {
    return {
      overallStatus: "Limited",
      interpretation: FIELD_INTELLIGENCE_NOT_STARTED.message,
      focusSummary: null,
      tracks: [],
      missingAreas: [],
      missingAreaLabels: [],
      recommendation: `${FIELD_INTELLIGENCE_NOT_STARTED.recommendedActions.startIntroCall} or ${FIELD_INTELLIGENCE_NOT_STARTED.recommendedActions.createFirstEngagement.toLowerCase()}.`,
      recommendationSectionId: null,
    };
  }

  const sections = input.planning.sections;

  const clinicalSec = aggregateSections(sections, [
    "clinical_workflow",
    "or_environment",
    "observation_readiness",
  ]);
  const emptySection = (
    id: ProviderPlanningSectionCompletion["id"],
  ): ProviderPlanningSectionCompletion => ({
    filled: 0,
    total: 0,
    percent: 0,
    id,
    label: "",
    status: "not_started",
    confidence: "unknown",
    confidence_score: 0,
    confidence_progress: 0,
    anchors_confirmed: false,
    recency_factor: 0.5,
    attribution_factor: 0,
    last_updated_at: null,
  });
  const relAgg =
    findPlanningSection(input.planning, "relationship_intelligence") ??
    emptySection("relationship_intelligence");
  const prodAgg =
    findPlanningSection(input.planning, "commercial_signals") ?? emptySection("commercial_signals");

  const clinicalConfidence = trackConfidence(sections, [
    "clinical_workflow",
    "or_environment",
    "observation_readiness",
  ]);
  const relationshipConfidence = relAgg.confidence ?? "unknown";
  const commercialConfidence = prodAgg.confidence ?? "unknown";

  const tracks: IntelligenceTrackSummary[] = [
    {
      id: "clinical",
      label: INTELLIGENCE_TRACK_LABEL.clinical,
      status: strengthFromSectionConfidence(clinicalConfidence),
      percent: clinicalSec.percent,
      detail: trackDetail(clinicalConfidence, clinicalSec.filled, clinicalSec.total),
    },
    {
      id: "relationship",
      label: INTELLIGENCE_TRACK_LABEL.relationship,
      status: strengthFromSectionConfidence(relationshipConfidence),
      percent: relAgg.percent,
      detail: trackDetail(relationshipConfidence, relAgg.filled, relAgg.total),
    },
    {
      id: "product_competitor",
      label: INTELLIGENCE_TRACK_LABEL.product_competitor,
      status: strengthFromSectionConfidence(commercialConfidence),
      percent: prodAgg.percent,
      detail: trackDetail(commercialConfidence, prodAgg.filled, prodAgg.total),
    },
  ];

  const overallConfidence = weakestSectionConfidence(
    sections.map((s) => s.confidence),
  );
  let overallStatus = strengthFromSectionConfidence(overallConfidence);
  if (input.planning.status === "not_started") overallStatus = "Limited";

  const missingAreas: string[] = [];
  for (const track of tracks) {
    if (track.status === "Strong") continue;
    if (track.id === "clinical") {
      missingAreas.push(
        ...missingKeysForGroup(input.contact, PROVIDER_PLANNING_CLINICAL_WORKFLOW_FIELD_KEYS, 2),
        ...missingKeysForGroup(input.contact, PROVIDER_PLANNING_OR_ENVIRONMENT_FIELD_KEYS, 1),
        ...missingKeysForGroup(input.contact, PROVIDER_PLANNING_OBSERVATION_READINESS_FIELD_KEYS, 1),
      );
      if (track.status === "Limited" && missingAreas.length === 0) {
        missingAreas.push(PROVIDER_PLANNING_SECTION_LABELS.clinical_workflow);
      }
    } else if (track.id === "relationship") {
      missingAreas.push(
        ...missingKeysForGroup(input.contact, PROVIDER_PLANNING_RELATIONSHIP_INTELLIGENCE_FIELD_KEYS, 3),
      );
    } else {
      missingAreas.push(
        ...missingKeysForGroup(input.contact, PROVIDER_PLANNING_COMMERCIAL_SIGNALS_FIELD_KEYS, 2),
      );
    }
  }

  const uniqueMissing = [...new Set(missingAreas)].slice(0, 5);
  const missingAreaLabels = uniqueMissing.map(formatMissingAreaDisplay).slice(0, 4);
  const interpretation = buildInterpretation(overallStatus, tracks);
  const focusSummary = buildFocusSummaryFromLearningGaps(input.contact, input.planning);
  const { text: recommendation, sectionId: recommendationSectionId } = pickRecommendation({
    tracks,
    missingAreas: uniqueMissing,
    contact: input.contact,
    planning: input.planning,
  });

  return {
    overallStatus,
    interpretation,
    focusSummary,
    tracks,
    missingAreas: uniqueMissing,
    missingAreaLabels,
    recommendation,
    recommendationSectionId,
  };
}

/** Human labels for wizard clinical fields (used in missing-area hints). */
export function clinicalFieldLabel(key: string): string {
  const fromWizard = PROVIDER_WIZARD_CLINICAL_FIELDS.find((f) => f.key === key)?.label;
  return fromWizard ?? FIELD_LABELS[key] ?? key;
}
