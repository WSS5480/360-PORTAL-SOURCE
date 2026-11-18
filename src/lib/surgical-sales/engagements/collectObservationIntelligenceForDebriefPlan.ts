/**
 * Normalizes observation case inputs into a structured intelligence bundle
 * for the Provider Debrief Planning engine.
 */

import { buildObservationTimeline, type ObservationTimelineEntry } from "@/lib/surgical-sales/buildObservationTimeline";
import {
  buildObservationAiExtractedInsightsView,
  type ObservationAiExtractedInsightsView,
} from "@/lib/surgical-sales/observationAiExtractedInsights";
import { buildObservationOverviewMission } from "@/lib/surgical-sales/buildObservationOverviewBrief";
import type { ObservationNoteEntityType } from "@/lib/surgical-sales/extractObservationNoteEntities";
import {
  observationObjectivesFromCaseRow,
  type ObservationObjectivesDraft,
} from "@/lib/surgical-sales/observationObjectives";
import {
  observationQuickFindingsFromCaseRow,
  type ObservationQuickFindingsDraft,
} from "@/lib/surgical-sales/observationQuickFindings";
import {
  formatObservationWatchItemLabel,
  observationWatchItemsFromCaseRow,
  type ObservationWatchItem,
} from "@/lib/surgical-sales/observationWatchItems";
import type {
  ProviderDebriefPlanConfidence,
  ProviderDebriefPlanInput,
  ProviderDebriefPlanLearningCategory,
  ProviderDebriefPlanLearningItem,
} from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import type { ProviderLongitudinalIntelligence } from "@/lib/surgical-sales/buildProviderLongitudinalIntelligence";
import {
  buildProviderLongitudinalIntelligence,
  providerLongitudinalHasSignals,
} from "@/lib/surgical-sales/buildProviderLongitudinalIntelligence";

export type ObservationIntelligenceBundle = {
  caseId: string;
  providerId: string | null;
  providerName: string | null;
  facilityName: string | null;
  procedureLabel: string | null;
  caseDateLabel: string | null;
  observationMission: string | null;
  timelineNotes: ObservationTimelineEntry[];
  snapshotView: ObservationAiExtractedInsightsView;
  quickFindings: ObservationQuickFindingsDraft;
  validationTargets: ObservationWatchItem[];
  liveObservationFields: {
    workflow: string | null;
    clinicalPainPoints: string | null;
    surgeonReactions: string | null;
    productFit: string | null;
    competitors: string | null;
    staffProcess: string | null;
    questions: string | null;
    followUpItems: string | null;
    debriefKeyFindings: string | null;
  };
  providerClinicalFields: {
    procedureFocus: string | null;
    workflowPainPoints: string | null;
    competitiveProducts: string | null;
    evaluationOpenness: string | null;
    techniquePreferences: string | null;
  };
  noteCount: number;
  extractedSignalCount: number;
  objectives: ObservationObjectivesDraft;
  learnings: ProviderDebriefPlanLearningItem[];
  longitudinalIntelligence: ProviderLongitudinalIntelligence;
};

function readTrimmed(row: Record<string, unknown>, key: string): string | null {
  const value = String(row[key] ?? "").trim();
  return value || null;
}

function formatCaseDateLabel(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function entityTypeFromExtractedLabel(label: string, category: string): ObservationNoteEntityType {
  const normalized = label.toLowerCase();
  if (normalized.includes("competitor")) return "competitor_signal";
  if (normalized.includes("product")) return "product_signal";
  if (normalized.includes("staff")) return "staff_signal";
  if (normalized.includes("procedure")) return "procedure_focus";
  if (normalized.includes("scheduling")) return "scheduling_contact";
  if (normalized.includes("follow")) return "follow_up_signal";
  if (category === "Competitor") return "competitor_signal";
  if (category === "Product") return "product_signal";
  if (category === "Staff Comment") return "staff_signal";
  if (category === "Follow Up") return "follow_up_signal";
  return "workflow_signal";
}

function entityTypeToCategory(type: ObservationNoteEntityType): ProviderDebriefPlanLearningCategory {
  switch (type) {
    case "competitor_signal":
      return "competitive_usage";
    case "product_signal":
      return "product_signal";
    case "staff_signal":
      return "staff_observation";
    case "procedure_focus":
      return "procedure_insight";
    case "workflow_signal":
    case "scheduling_contact":
      return "workflow_friction";
    case "follow_up_signal":
      return "clinical_pain_point";
    default:
      return "procedure_insight";
  }
}

function mapConfidence(raw: string | undefined): ProviderDebriefPlanConfidence {
  if (raw === "High") return "High";
  if (raw === "Low") return "Low";
  return "Medium";
}

function learningKey(category: string, signal: string): string {
  return `${category}:${signal.trim().toLowerCase()}`;
}

function pushLearning(
  target: ProviderDebriefPlanLearningItem[],
  seen: Set<string>,
  item: Omit<ProviderDebriefPlanLearningItem, "id"> & { id?: string },
): void {
  const signal = item.signal.trim();
  if (!signal) return;
  const key = learningKey(item.category, signal);
  if (seen.has(key)) return;
  seen.add(key);
  target.push({
    id: item.id ?? key.replace(/[^a-z0-9]+/gi, "-"),
    category: item.category,
    signal,
    evidence: item.evidence?.trim() || null,
    source: item.source,
    confidence: item.confidence,
    sourceNoteId: item.sourceNoteId ?? null,
    sourceNoteTime: item.sourceNoteTime ?? null,
  });
}

function splitLines(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);
}

function snapshotSectionToCategory(sectionId: string): ProviderDebriefPlanLearningCategory {
  switch (sectionId) {
    case "competitor_observations":
      return "competitive_usage";
    case "product_opportunities":
      return "product_signal";
    case "surgeon_preferences":
      return "procedure_insight";
    case "follow_up_recommendations":
      return "clinical_pain_point";
    case "workflow_findings":
    default:
      return "workflow_friction";
  }
}

function collectFromTimelineNotes(
  timelineNotes: ObservationTimelineEntry[],
  learnings: ProviderDebriefPlanLearningItem[],
  seen: Set<string>,
): number {
  let signalCount = 0;

  for (const note of timelineNotes) {
    for (const entity of note.extraction ?? []) {
      signalCount += 1;
      const entityType = entityTypeFromExtractedLabel(entity.label, entity.category);
      pushLearning(learnings, seen, {
        category: entityTypeToCategory(entityType),
        signal: entity.value,
        evidence:
          String((entity as { evidence?: string }).evidence ?? "").trim() ||
          (note.text.length <= 160 ? note.text : `${note.text.slice(0, 157)}…`),
        source: "extracted_signal",
        confidence: mapConfidence(entity.confidence),
        sourceNoteId: note.id,
        sourceNoteTime: note.timestamp,
      });
    }

    if (!note.extraction?.length && note.text.length >= 16) {
      pushLearning(learnings, seen, {
        category: "procedure_insight",
        signal: note.text.length > 120 ? `${note.text.slice(0, 117)}…` : note.text,
        evidence: null,
        source: "observation_note",
        confidence: "Medium",
        sourceNoteId: note.id,
        sourceNoteTime: note.timestamp,
      });
    }
  }

  return signalCount;
}

function collectFromSnapshot(
  snapshotView: ObservationAiExtractedInsightsView,
  learnings: ProviderDebriefPlanLearningItem[],
  seen: Set<string>,
): void {
  for (const section of snapshotView.sections) {
    if (!section.hasItems) continue;
    const category = snapshotSectionToCategory(section.id);
    for (const item of section.items) {
      pushLearning(learnings, seen, {
        category,
        signal: item,
        evidence: null,
        source: "extracted_signal",
        confidence: "Medium",
        sourceNoteId: null,
        sourceNoteTime: snapshotView.extractedAt,
      });
    }
  }
}

function collectFromQuickFindings(
  quickFindings: ObservationQuickFindingsDraft,
  learnings: ProviderDebriefPlanLearningItem[],
  seen: Set<string>,
): void {
  if (quickFindings.workflow_friction === "Yes") {
    pushLearning(learnings, seen, {
      category: "workflow_friction",
      signal: "You noted workflow friction during the case",
      evidence: null,
      source: "quick_finding",
      confidence: "High",
      sourceNoteId: null,
      sourceNoteTime: null,
    });
  }

  if (quickFindings.competitor_seen === "Yes") {
    pushLearning(learnings, seen, {
      category: "competitive_usage",
      signal: "A competitor product was in the OR",
      evidence: null,
      source: "quick_finding",
      confidence: "High",
      sourceNoteId: null,
      sourceNoteTime: null,
    });
  }

  if (quickFindings.workflow_fit === "Strong" || quickFindings.workflow_fit === "Possible") {
    pushLearning(learnings, seen, {
      category: "product_signal",
      signal: `Workflow fit looked ${quickFindings.workflow_fit.toLowerCase()} from what you observed`,
      evidence: null,
      source: "quick_finding",
      confidence: quickFindings.workflow_fit === "Strong" ? "High" : "Medium",
      sourceNoteId: null,
      sourceNoteTime: null,
    });
  }

  if (quickFindings.product_interest === "Mentioned" || quickFindings.product_interest === "Strong") {
    pushLearning(learnings, seen, {
      category: "product_signal",
      signal: `Product interest came up during observation (${quickFindings.product_interest.toLowerCase()})`,
      evidence: null,
      source: "quick_finding",
      confidence: quickFindings.product_interest === "Strong" ? "High" : "Medium",
      sourceNoteId: null,
      sourceNoteTime: null,
    });
  }

  const keyFinding = quickFindings.key_finding_note.trim();
  if (keyFinding) {
    pushLearning(learnings, seen, {
      category: "clinical_pain_point",
      signal: keyFinding.length > 140 ? `${keyFinding.slice(0, 137)}…` : keyFinding,
      evidence: null,
      source: "case_field",
      confidence: "High",
      sourceNoteId: null,
      sourceNoteTime: null,
    });
  }
}

function collectFromValidationTargets(
  targets: ObservationWatchItem[],
  learnings: ProviderDebriefPlanLearningItem[],
  seen: Set<string>,
): void {
  for (const target of targets) {
    if (target.status !== "observed") continue;
    pushLearning(learnings, seen, {
      category: "procedure_insight",
      signal: `${formatObservationWatchItemLabel(target.label)} was validated on this case`,
      evidence: null,
      source: "validation_target",
      confidence: "High",
      sourceNoteId: null,
      sourceNoteTime: null,
    });
  }
}

function collectFromLiveFields(
  liveFields: ObservationIntelligenceBundle["liveObservationFields"],
  learnings: ProviderDebriefPlanLearningItem[],
  seen: Set<string>,
): void {
  const mappings: Array<[string | null, ProviderDebriefPlanLearningCategory]> = [
    [liveFields.clinicalPainPoints, "clinical_pain_point"],
    [liveFields.workflow, "workflow_friction"],
    [liveFields.staffProcess, "staff_observation"],
    [liveFields.competitors, "competitive_usage"],
    [liveFields.productFit, "product_signal"],
    [liveFields.surgeonReactions, "procedure_insight"],
    [liveFields.debriefKeyFindings, "clinical_pain_point"],
  ];

  for (const [raw, category] of mappings) {
    for (const line of splitLines(raw)) {
      pushLearning(learnings, seen, {
        category,
        signal: line,
        evidence: null,
        source: "case_field",
        confidence: "Medium",
        sourceNoteId: null,
        sourceNoteTime: null,
      });
    }
  }
}

function collectFromProviderProfile(
  providerClinicalFields: ObservationIntelligenceBundle["providerClinicalFields"],
  learnings: ProviderDebriefPlanLearningItem[],
  seen: Set<string>,
): void {
  const mappings: Array<[string | null, ProviderDebriefPlanLearningCategory]> = [
    [providerClinicalFields.workflowPainPoints, "clinical_pain_point"],
    [providerClinicalFields.competitiveProducts, "competitive_usage"],
    [providerClinicalFields.evaluationOpenness, "product_signal"],
    [providerClinicalFields.techniquePreferences, "procedure_insight"],
    [providerClinicalFields.procedureFocus, "procedure_insight"],
  ];

  for (const [raw, category] of mappings) {
    for (const line of splitLines(raw)) {
      pushLearning(learnings, seen, {
        category,
        signal: line,
        evidence: null,
        source: "provider_profile",
        confidence: "Medium",
        sourceNoteId: null,
        sourceNoteTime: null,
      });
    }
  }
}

function formatCaseDateLabelFromRow(caseRow: Record<string, unknown>): string | null {
  return formatCaseDateLabel(caseRow.case_date);
}

function mergeLongitudinalLearnings(
  learnings: ProviderDebriefPlanLearningItem[],
  seen: Set<string>,
  longitudinal: ProviderLongitudinalIntelligence,
): void {
  if (!providerLongitudinalHasSignals(longitudinal)) return;

  for (const pain of longitudinal.recurringPainPoints.filter((item) => item.count >= 2).slice(0, 3)) {
    pushLearning(learnings, seen, {
      category: "clinical_pain_point",
      signal: pain.signal,
      evidence: pain.lastCaseDate ? `Last seen ${pain.lastCaseDate}` : "Seen across prior observations",
      source: "prior_observation",
      confidence: pain.count >= 3 ? "High" : "Medium",
      sourceNoteId: null,
      sourceNoteTime: pain.lastCaseDate,
    });
  }

  for (const competitor of longitudinal.competitiveProductsSeen.slice(0, 2)) {
    pushLearning(learnings, seen, {
      category: "competitive_usage",
      signal: competitor.signal,
      evidence: competitor.lastCaseDate ? `Last seen ${competitor.lastCaseDate}` : null,
      source: "prior_observation",
      confidence: competitor.count >= 2 ? "High" : "Medium",
      sourceNoteId: null,
      sourceNoteTime: competitor.lastCaseDate,
    });
  }

  for (const opportunity of longitudinal.opportunitySignals.slice(0, 2)) {
    pushLearning(learnings, seen, {
      category: "product_signal",
      signal:
        opportunity.count > 1
          ? `Opportunity pattern (${opportunity.count} observations): ${opportunity.signal}`
          : `Prior opportunity signal: ${opportunity.signal}`,
      evidence: opportunity.lastCaseDate ? `Last seen ${opportunity.lastCaseDate}` : null,
      source: "prior_observation",
      confidence: opportunity.count >= 2 ? "High" : "Medium",
      sourceNoteId: null,
      sourceNoteTime: opportunity.lastCaseDate,
    });
  }

  for (const trend of longitudinal.productFitTrends.slice(0, 2)) {
    pushLearning(learnings, seen, {
      category: "product_signal",
      signal: trend.label,
      evidence: trend.latestSignal ? `Latest signal: ${trend.latestSignal}` : null,
      source: "prior_observation",
      confidence: trend.count >= 2 ? "High" : "Medium",
      sourceNoteId: null,
      sourceNoteTime: null,
    });
  }

  for (const procedure of longitudinal.observedProcedures.filter((item) => item.count >= 2).slice(0, 2)) {
    pushLearning(learnings, seen, {
      category: "procedure_insight",
      signal: procedure.procedure,
      evidence: procedure.lastCaseDate ? `Most recent ${procedure.lastCaseDate}` : null,
      source: "prior_observation",
      confidence: "Medium",
      sourceNoteId: null,
      sourceNoteTime: procedure.lastCaseDate,
    });
  }
}

function mergePriorCaseLearnings(
  learnings: ProviderDebriefPlanLearningItem[],
  seen: Set<string>,
  priorCases: Array<Record<string, unknown>>,
  currentCaseId: string,
): void {
  for (const priorCase of priorCases.slice(0, 8)) {
    const priorCaseId = String(priorCase.id ?? "").trim();
    if (!priorCaseId || priorCaseId === currentCaseId) continue;

    const caseLabel = [
      readTrimmed(priorCase, "procedure_type"),
      formatCaseDateLabelFromRow(priorCase),
    ]
      .filter(Boolean)
      .join(" · ");

    const priorFields = {
      clinicalPainPoints: readTrimmed(priorCase, "live_observation_clinical_pain_points"),
      workflow: readTrimmed(priorCase, "live_observation_workflow"),
      competitors: readTrimmed(priorCase, "live_observation_competitors"),
      productFit: readTrimmed(priorCase, "live_observation_product_fit"),
      debriefKeyFindings: readTrimmed(priorCase, "debrief_key_findings"),
    };

    const mappings: Array<[string | null, ProviderDebriefPlanLearningCategory]> = [
      [priorFields.clinicalPainPoints, "clinical_pain_point"],
      [priorFields.workflow, "workflow_friction"],
      [priorFields.competitors, "competitive_usage"],
      [priorFields.productFit, "product_signal"],
      [priorFields.debriefKeyFindings, "clinical_pain_point"],
    ];

    for (const [raw, category] of mappings) {
      for (const line of splitLines(raw)) {
        pushLearning(learnings, seen, {
          category,
          signal: line,
          evidence: caseLabel || null,
          source: "prior_observation",
          confidence: "Medium",
          sourceNoteId: null,
          sourceNoteTime: formatCaseDateLabelFromRow(priorCase),
        });
      }
    }
  }
}

export function collectObservationIntelligenceForDebriefPlan(
  input: ProviderDebriefPlanInput,
): ObservationIntelligenceBundle {
  const caseRow = input.caseRow;
  const caseId = String(caseRow.id ?? "").trim();
  const timelineNotes = buildObservationTimeline(input.activities);
  const snapshotView = buildObservationAiExtractedInsightsView(caseRow);
  const quickFindings = observationQuickFindingsFromCaseRow(caseRow);
  const validationTargets = observationWatchItemsFromCaseRow(caseRow);
  const objectives = observationObjectivesFromCaseRow(caseRow);
  const provider = input.providerContact ?? null;

  const liveObservationFields = {
    workflow: readTrimmed(caseRow, "live_observation_workflow"),
    clinicalPainPoints: readTrimmed(caseRow, "live_observation_clinical_pain_points"),
    surgeonReactions: readTrimmed(caseRow, "live_observation_surgeon_reactions"),
    productFit: readTrimmed(caseRow, "live_observation_product_fit"),
    competitors: readTrimmed(caseRow, "live_observation_competitors"),
    staffProcess: readTrimmed(caseRow, "live_observation_staff_process"),
    questions: readTrimmed(caseRow, "live_observation_questions"),
    followUpItems: readTrimmed(caseRow, "live_observation_follow_up_items"),
    debriefKeyFindings: readTrimmed(caseRow, "debrief_key_findings"),
  };

  const providerClinicalFields = {
    procedureFocus: provider ? readTrimmed(provider, "provider_procedure_focus") : null,
    workflowPainPoints: provider ? readTrimmed(provider, "provider_workflow_pain_points") : null,
    competitiveProducts: provider ? readTrimmed(provider, "provider_competitive_products") : null,
    evaluationOpenness: provider ? readTrimmed(provider, "provider_evaluation_openness") : null,
    techniquePreferences: provider ? readTrimmed(provider, "provider_technique_preferences") : null,
  };

  const learnings: ProviderDebriefPlanLearningItem[] = [];
  const seen = new Set<string>();
  const extractedSignalCount = collectFromTimelineNotes(timelineNotes, learnings, seen);

  collectFromSnapshot(snapshotView, learnings, seen);
  collectFromQuickFindings(quickFindings, learnings, seen);
  collectFromValidationTargets(validationTargets, learnings, seen);
  collectFromLiveFields(liveObservationFields, learnings, seen);
  collectFromProviderProfile(providerClinicalFields, learnings, seen);

  const allCases = [caseRow, ...(input.priorObservationCases ?? [])];
  const longitudinalIntelligence = buildProviderLongitudinalIntelligence(allCases);
  mergeLongitudinalLearnings(learnings, seen, longitudinalIntelligence);
  if ((input.priorObservationCases ?? []).length > 0) {
    mergePriorCaseLearnings(learnings, seen, input.priorObservationCases ?? [], caseId);
  }

  if (objectives.observation_signals_to_validate) {
    for (const line of splitLines(objectives.observation_signals_to_validate)) {
      pushLearning(learnings, seen, {
        category: "procedure_insight",
        signal: line,
        evidence: null,
        source: "case_field",
        confidence: "Low",
        sourceNoteId: null,
        sourceNoteTime: null,
      });
    }
  }

  return {
    caseId,
    providerId: provider ? readTrimmed(provider, "id") ?? readTrimmed(caseRow, "surgeon_contact_id") : readTrimmed(caseRow, "surgeon_contact_id"),
    providerName: input.providerName ?? (provider ? readTrimmed(provider, "display_name") ?? readTrimmed(provider, "full_name") : null),
    facilityName: input.facilityName ?? readTrimmed(caseRow, "pre_call_hospital_name"),
    procedureLabel: readTrimmed(caseRow, "procedure_type"),
    caseDateLabel: formatCaseDateLabel(caseRow.case_date),
    observationMission: buildObservationOverviewMission(caseRow, input.engagement),
    timelineNotes,
    snapshotView,
    quickFindings,
    validationTargets,
    liveObservationFields,
    providerClinicalFields,
    noteCount: timelineNotes.length,
    extractedSignalCount,
    objectives,
    learnings,
    longitudinalIntelligence,
  };
}

export function allObservationIntelligenceText(bundle: ObservationIntelligenceBundle): string[] {
  const texts = [
    ...bundle.learnings.map((item) => item.signal),
    ...bundle.learnings.map((item) => item.evidence ?? ""),
    ...bundle.timelineNotes.map((note) => note.text),
    bundle.liveObservationFields.clinicalPainPoints ?? "",
    bundle.liveObservationFields.competitors ?? "",
    bundle.liveObservationFields.productFit ?? "",
    bundle.liveObservationFields.debriefKeyFindings ?? "",
    bundle.providerClinicalFields.evaluationOpenness ?? "",
  ];
  return texts.map((text) => text.trim()).filter(Boolean);
}
