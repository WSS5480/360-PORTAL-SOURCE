/**
 * Guided field intelligence — rep-facing operational questions per discovery signal.
 */

import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import type { ProviderIntelligenceActionId } from "@/lib/surgical-sales/resolveProviderIntelligenceAction";
import type { StageMappingExpectationLevel, StageMappingSignalSpec } from "@/lib/surgical-sales/stageMappingAnswerTypes";
import {
  OPPORTUNITY_INTELLIGENCE_STAGE_MAPPING_QUESTIONS,
  OPPORTUNITY_INTELLIGENCE_STAGE_MAPPING_SPECS,
} from "@/lib/surgical-sales/opportunityIntelligenceSignals";
import {
  WORKFLOW_MATURITY_OPTIONS,
  WORKFLOW_UNDERSTANDING_QUESTION,
} from "@/lib/surgical-sales/workflowUnderstandingConstants";
import { REP_INTELLIGENCE_VOCAB } from "@/lib/surgical-sales/intelligenceCapture/repIntelligenceVocabulary";

export const STAGE_MAPPING_UI = {
  entryEyebrow: "Field intelligence",
  entryTitle: REP_INTELLIGENCE_VOCAB.whatDidYouLearn,
  entryBody: REP_INTELLIGENCE_VOCAB.captureSubtitle,
  entryCta: "Start Discovery",
  entryCtaGeneric: "Add Intelligence",
  panelTitle: "Add Intelligence",
  panelTitleByAction: {
    start_discovery: "Start Discovery",
    build_intelligence: "Build Intelligence",
    capture_field_insights: "Capture Field Insights",
    review_findings: "Review Findings",
  } satisfies Record<ProviderIntelligenceActionId, string>,
  progressLabel: "captured",
  /** @deprecated Use progressLabel */
  mappedLabel: "captured",
  salesIntelligenceOpen: "Product fit questions open",
  accessIntelligenceOpen: "Access questions open",
  opportunityOpen: "Still exploring on site",
  operationalOpen: "Still exploring access",
  salesOpen: "Still exploring product fit",
  confirmedIntelligence: REP_INTELLIGENCE_VOCAB.captured,
  requiredRemaining: "Priority items remaining",
  helpfulOpen: "Helpful items open",
  laterStageOpen: "Later items",
  resolvedSession: "saved this session",
  saveProgress: "Save progress",
  finishLater: "Finish later",
  saveIntel: "Save intel",
  resolveNext: "Review next item",
  resolveNextOpportunity: "Capture what you saw on site",
  resolveNextOperational: "Review access details",
  resolveNextSales: "Review product fit",
  logFieldIntel: "Log field intel",
  notesOptional: "Notes (optional)",
  laterStageToggle: "Later items",
  laterStageToggleHint: "Usually captured after observation access is confirmed",
  optionalSuffix: "(optional)",
  notesPlaceholder: "Notes…",
  linkContact: "Link contact",
  addContactPrompt: "Add contact?",
  addContactYes: "Yes",
  addContactNo: "No",
  confirmAnswer: "Confirm",
  confirmAndUpdate: "Confirm & update",
  validateFinding: REP_INTELLIGENCE_VOCAB.confirm,
  additionalDetails: "Details",
  whatWeKnow: REP_INTELLIGENCE_VOCAB.whatWeKnow,
  rawEvidence: REP_INTELLIGENCE_VOCAB.evidence,
  mappedIntelligence: "Your answer",
  answerLabel: "Answer",
  evidenceLabel: REP_INTELLIGENCE_VOCAB.evidence,
  confidenceLabel: REP_INTELLIGENCE_VOCAB.howYouKnow,
  addIntelligence: "Capture finding",
  editIntelligence: "Edit finding",
  validateIntelligence: REP_INTELLIGENCE_VOCAB.confirm,
  saveIntelligence: REP_INTELLIGENCE_VOCAB.saveFinding,
  whatWeStillNeed: REP_INTELLIGENCE_VOCAB.whatWeStillNeed,
  suggestedNextAction: "Suggested next action",
  nothingCapturedYet: "No answer captured yet.",
  intelligenceReviewGuidance:
    "Work access first, capture observation learnings during the case, then develop the commercial opportunity.",
  sessionCompleteNote:
    "You have a solid picture of access, what the provider cares about, and where opportunity may exist.",
  confirmedIntelligenceNote: REP_INTELLIGENCE_VOCAB.capturedInArea,
  expectation: {
    required_now: "Helpful when scheduling",
    helpful: "Helpful if known",
    later_stage: "Later stage",
  } satisfies Record<StageMappingExpectationLevel, string>,
  sectionLabels: {
    opportunity_intelligence: "What you learned on site",
    access_readiness: "Access pathway",
    clinical_fit: "Procedure alignment",
    champion_landscape: "Product fit development",
  } as const,
} as const;

export type StageMappingSignalId = Exclude<DiscoveryStructuredSignalId, "decision_influence">;

export const STAGE_MAPPING_QUESTIONS: Record<StageMappingSignalId, string> = {
  ...OPPORTUNITY_INTELLIGENCE_STAGE_MAPPING_QUESTIONS,
  observation_approval: "Has observation access been approved?",
  scheduling_owner: "Where is observation scheduling controlled?",
  facility_vendor_pathway: "Are vendor credentials or facility approval required?",
  observation_logistics: "When is observation scheduled?",
  workflow_visibility: WORKFLOW_UNDERSTANDING_QUESTION,
  product_alignment: "How well does our product fit what you've seen?",
  case_opportunity: "What is the estimated case opportunity?",
  clinical_champion: "Is there a clinical champion?",
};

export const STAGE_MAPPING_SIGNAL_SPECS: Record<StageMappingSignalId, StageMappingSignalSpec> = {
  ...OPPORTUNITY_INTELLIGENCE_STAGE_MAPPING_SPECS,
  observation_approval: {
    questionType: "approval",
    expectationLevel: "helpful",
    expectationHelper: "Helpful when planning an observation — not required to start field work.",
    choices: [
      { value: "approved", label: "Approved", tone: "positive" },
      { value: "partial", label: "Partial", tone: "partial" },
      { value: "pending", label: "Pending", tone: "partial" },
      { value: "declined", label: "Declined", tone: "negative" },
    ],
    metadataFields: [
      { key: "approval_owner", label: "Approval owner", type: "text", optional: true },
      { key: "date_confirmed", label: "Date confirmed", type: "date", optional: true },
    ],
    notesPlaceholder: "Approval context, conditions, or follow-up…",
  },
  scheduling_owner: {
    questionType: "ownership",
    expectationLevel: "helpful",
    expectationHelper: "Capture when you learn who controls scheduling — optional background reference.",
    structuredForm: "scheduling_ownership",
    choices: [
      { value: "provider_office", label: "Provider office", tone: "positive" },
      { value: "facility", label: "Facility / hospital", tone: "positive" },
      { value: "shared_workflow", label: "Shared scheduling workflow", tone: "partial" },
      { value: "unknown", label: "Unknown", tone: "neutral" },
    ],
    notesPlaceholder: "Scheduling handoff or coordination notes…",
  },
  facility_vendor_pathway: {
    questionType: "pathway",
    expectationLevel: "helpful",
    expectationHelper: "Vendor credentialing and facility access — capture when known, not a rep action item.",
    structuredForm: "facility_credentialing",
    supportsInlineContact: true,
    contactPanelTitle: "Facility / vendor contact",
    contactPanelHint: "Link the contact who clears vendor or facility access",
    choices: [
      { value: "path_clear", label: "Path clear", tone: "positive" },
      { value: "partial_path", label: "Partial path", tone: "partial" },
      { value: "required_pending", label: "Required — pending", tone: "partial" },
      { value: "unknown", label: "Unknown", tone: "neutral" },
    ],
    notesPlaceholder: "Credentialing steps, vendor requirements, blockers…",
  },
  observation_logistics: {
    questionType: "timing",
    expectationLevel: "helpful",
    expectationHelper: "Target observation timing — helpful reference when scheduling a case.",
    choices: [
      { value: "immediate", label: "Immediate access", tone: "positive" },
      { value: "scheduled", label: "Scheduled", tone: "partial" },
      { value: "delayed", label: "Delayed", tone: "partial" },
      { value: "unknown", label: "Unknown", tone: "neutral" },
    ],
    metadataFields: [
      { key: "target_date", label: "Target date", type: "date", optional: true },
      { key: "scheduling_notes", label: "Scheduling notes", type: "textarea", optional: true },
      { key: "blocker_notes", label: "Blocker notes", type: "textarea", optional: true },
    ],
    notesPlaceholder: "Best days, case types, timing constraints…",
  },
  workflow_visibility: {
    questionType: "workflow",
    expectationLevel: "helpful",
    expectationHelper:
      "Capture from intro calls, discussions, partial exposure, or observation — maturity builds over time.",
    choices: WORKFLOW_MATURITY_OPTIONS.map((o) => ({
      value: o.value,
      label: o.label,
      tone: o.tone,
    })),
    metadataFields: [
      { key: "workflow_notes", label: "Workflow notes", type: "textarea", optional: true },
    ],
    notesPlaceholder: "Procedure focus, technique preferences, pain points…",
  },
  product_alignment: {
    questionType: "product_fit",
    expectationLevel: "later_stage",
    expectationHelper: "Usually refined after workflow discussion.",
    choices: [
      { value: "high", label: "Strong field context", tone: "positive" },
      { value: "moderate", label: "Developing field context", tone: "partial" },
      { value: "low", label: "Limited field context available", tone: "negative" },
      { value: "unknown", label: "Unknown", tone: "neutral" },
    ],
    metadataFields: [
      { key: "product_selection", label: "Product selection", type: "text", optional: true },
      { key: "supporting_evidence", label: "Supporting evidence", type: "textarea", optional: true },
    ],
    notesPlaceholder: "Competitive landscape, observed use case…",
  },
  case_opportunity: {
    questionType: "opportunity",
    expectationLevel: "later_stage",
    expectationHelper: "Sizing usually confirmed after deeper engagement.",
    choices: [
      { value: "high", label: "High", tone: "positive" },
      { value: "medium", label: "Medium", tone: "partial" },
      { value: "low", label: "Low", tone: "negative" },
      { value: "unknown", label: "Unknown", tone: "neutral" },
    ],
    metadataFields: [
      { key: "monthly_volume", label: "Est. monthly volume", type: "text", optional: true },
      { key: "procedure_types", label: "Procedure types", type: "text", optional: true },
      { key: "strategic_importance", label: "Strategic importance", type: "select", optional: true, options: [
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ]},
    ],
    notesPlaceholder: "Volume estimate, ideal observation cases…",
  },
  clinical_champion: {
    questionType: "champion",
    expectationLevel: "helpful",
    expectationHelper: "Capture now if a champion is visible.",
    supportsInlineContact: true,
    contactPanelTitle: "Clinical champion",
    contactPanelHint: "Link or create the champion contact",
    choices: [
      { value: "confirmed", label: "Confirmed", tone: "positive" },
      { value: "suspected", label: "Suspected", tone: "partial" },
      { value: "none_identified", label: "None identified", tone: "negative" },
    ],
    metadataFields: [
      {
        key: "influence_strength",
        label: "Influence strength",
        type: "select",
        optional: true,
        options: [
          { value: "high", label: "High" },
          { value: "medium", label: "Medium" },
          { value: "low", label: "Low" },
        ],
      },
    ],
    notesPlaceholder: "Champion dynamics, team alignment…",
  },
};

export function getStageMappingSignalSpec(signalId: StageMappingSignalId): StageMappingSignalSpec {
  return STAGE_MAPPING_SIGNAL_SPECS[signalId];
}

export function isStageMappingSignalId(
  signalId: string,
): signalId is StageMappingSignalId {
  return signalId in STAGE_MAPPING_SIGNAL_SPECS;
}
