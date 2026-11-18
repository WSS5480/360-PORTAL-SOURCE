import type { CaseBriefingKind } from "@/lib/surgical-sales/caseIntelligenceSignals";

/** Maturity of a UF concept across completed observation cases. */
export type UfConceptMaturity = "absent" | "observed_once" | "established";

export type UfProgramSignalSummary = {
  concept: string;
  maturity: UfConceptMaturity;
  completedCaseCount: number;
  validatedCaseCount: number;
  sampleEvidence: string | null;
  productMentioned: string | null;
};

export type UfLearningGapCategory =
  | "provider_friction_unknown"
  | "staff_friction_unknown"
  | "product_usage_unknown"
  | "repeat_confirmation_needed";

export type UfCoachingGuidanceInputs = {
  source: "uf";
  briefingKind: CaseBriefingKind;
  programCompletedCount: number;
  priorCompletedCaseCount: number;
  priorSignals: UfProgramSignalSummary[];
  currentCaseSignals: UfProgramSignalSummary[];
  gaps: UfLearningGapCategory[];
};

export type OieIntelligenceSignalSummary = {
  normalizedFindingId: string;
  type: string;
  subtype: string | null;
  label: string;
  maturity: UfConceptMaturity;
  completedCaseCount: number;
  evidenceStatus: string;
  isCommercial: boolean;
  isPositiveStaff: boolean;
  sampleEvidence: string | null;
  sourceCaseIds: string[];
};

export type OieGuidanceTemplateHints = {
  hasWorkflow: boolean;
  hasProduct: boolean;
  providerPainGap: boolean;
  staffPainGap: boolean;
};

export type OieCoachingGuidanceInputs = {
  source: "oie";
  briefingKind: CaseBriefingKind;
  programCompletedCount: number;
  priorCompletedCaseCount: number;
  /** Prior-only signals — feeds Focus Today, Why This Matters, Still Need (briefing path). */
  briefingPriorSignals: OieIntelligenceSignalSummary[];
  /** Merged prior + current — feeds Focus For Next Observation (intelligence path). */
  focusNextSignals: OieIntelligenceSignalSummary[];
  currentCaseSignals: OieIntelligenceSignalSummary[];
  evidenceGaps: string[];
  gaps: UfLearningGapCategory[];
  focusCuesRaw: string[];
  engineStillMissing: string[];
  commercialNormalizedFindingIds: string[];
  templateHints: OieGuidanceTemplateHints;
};

export type CoachingGuidanceAlignmentTopic = {
  topic: string;
  oieNormalizedFindingIds: string[];
  ufConcepts: string[];
  notes?: string;
};

export type CoachingGuidanceAlignmentConflict = {
  topic: string;
  oieLabel: string;
  ufLabel: string;
  reason: string;
};

export type CoachingGuidanceInputsComparison = {
  caseId: string;
  providerId: string | null;
  caseNumber: string | null;
  evaluationOnly: true;
  oie: OieCoachingGuidanceInputs;
  uf: UfCoachingGuidanceInputs | null;
  alignment: {
    overlap: CoachingGuidanceAlignmentTopic[];
    oieOnly: Array<{ id: string; label: string; reason: string }>;
    ufOnly: Array<{ concept: string; label: string; reason: string }>;
    conflicts: CoachingGuidanceAlignmentConflict[];
  };
};
