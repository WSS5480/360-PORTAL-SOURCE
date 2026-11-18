/**
 * Twelve dictation-style scenarios for debrief extraction regression tests.
 */

import { ANDY_KAREN_DEBRIEF_REGRESSION_NOTE } from "@/lib/surgical-sales/debriefPartialIntelligenceEnrichment";
import type { DebriefIntelligenceCategory } from "@/lib/surgical-sales/debriefIntelligenceCategories";
import type { ClassifiedEngagementOutcomeId } from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";
import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import type { ObservationStatusChoice } from "@/lib/surgical-sales/observationStatus";
import type { DebriefPersonMentionLevel } from "@/lib/surgical-sales/debriefDetectedContact";
import { emptyDebriefMapping } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";

export type DebriefExtractionScenarioExpectations = {
  outcomeId: ClassifiedEngagementOutcomeId;
  observationApprovalExplicit: boolean;
  providerObservationStatus: ObservationStatusChoice | null;
  /** Pathway stage must not change from debrief/outcome alone. */
  pathwayUnchangedByDebriefAlone: boolean;
  /** Stage after validated observation approval on file (only clear approval scenarios). */
  pathwayAfterApprovalOnFile?: SalesPathwayStageId;
  minProposedContacts: number;
  maxProposedContacts?: number;
  contactMentionLevels?: DebriefPersonMentionLevel[];
  anyContactDetailsMissing?: boolean;
  allContactsHaveEmailOrPhone?: boolean;
  categoriesMustInclude: DebriefIntelligenceCategory[];
  categoriesMustExclude?: DebriefIntelligenceCategory[];
  signalKindsMustInclude?: string[];
  signalKindsMustExclude?: string[];
  minIntelligenceUpdates?: number;
  minRepFriendlyUpdates?: number;
  anyConfidence?: Array<"High" | "Medium" | "Low">;
  allEvidenceAnchored: boolean;
  recommendedNextStepIncludes?: RegExp | string;
  rationaleIncludes?: RegExp;
};

export type DebriefExtractionScenario = {
  id: string;
  label: string;
  dictation: string;
  mapping?: LogUpdateOpenAiMapping;
  recommendedNextMoves?: Array<{ action: string; priority?: string }>;
  expect: DebriefExtractionScenarioExpectations;
};

export const DEBRIEF_EXTRACTION_REGRESSION_SCENARIOS: DebriefExtractionScenario[] = [
  {
    id: "clear_approval",
    label: "Clear approval",
    dictation:
      "Observation approved for next month. Karen from the office will help schedule. We are cleared to observe his lap cases.",
    mapping: {
      ...emptyDebriefMapping(),
      summary: "Explicit observation approval with scheduling owner named.",
      confirmed_updates: [
        {
          domain: "or_access",
          label: "Observation approved",
          value: "Observation approved for next month; cleared to observe.",
          confidence: "high",
          save_target: "provider",
          reasoning:
            'Source quote: "Observation approved for next month. We are cleared to observe his lap cases."',
        },
        {
          domain: "scheduling",
          label: "Scheduling owner",
          value: "Karen from the office coordinates scheduling.",
          confidence: "high",
          save_target: "provider",
          reasoning: 'Source quote: "Karen from the office will help schedule."',
        },
      ],
      recommended_next_moves: [
        { action: "Schedule first observation with Karen", priority: "high", owner_type: "rep" },
      ],
    },
    expect: {
      outcomeId: "observation_approved",
      observationApprovalExplicit: true,
      providerObservationStatus: "permission_confirmed",
      pathwayUnchangedByDebriefAlone: true,
      pathwayAfterApprovalOnFile: "observe",
      minProposedContacts: 1,
      contactMentionLevels: ["workflow_participant"],
      categoriesMustInclude: ["access_intelligence", "people_contacts"],
      signalKindsMustInclude: ["approval_signal"],
      minIntelligenceUpdates: 1,
      minRepFriendlyUpdates: 1,
      anyConfidence: ["High", "Medium"],
      allEvidenceAnchored: true,
      recommendedNextStepIncludes: /schedule|observation|karen/i,
      rationaleIncludes: /explicit/i,
    },
  },
  {
    id: "conditional_approval",
    label: "Conditional approval",
    dictation:
      "He's open to observation once credentialing clears. Vendor access has to go through IntelliCentrics first — probably several weeks. I still need Karen's contact info before we can schedule.",
    mapping: {
      ...emptyDebriefMapping(),
      partial_updates: [
        {
          domain: "or_access",
          label: "Observation access partial",
          value: "Open to observation after credentialing; not approved yet.",
          still_needs: ["Credentialing complete", "Scheduling owner contact info"],
          confidence: "medium",
          save_target: "provider",
          reasoning: 'Source quote: "open to observation once credentialing clears"',
        },
      ],
      recommended_next_moves: [
        { action: "Complete credentialing and get Karen's info", priority: "high", owner_type: "credentialing" },
      ],
    },
    expect: {
      outcomeId: "follow_up_needed",
      observationApprovalExplicit: false,
      providerObservationStatus: "permission_not_yet_confirmed",
      pathwayUnchangedByDebriefAlone: true,
      minProposedContacts: 0,
      maxProposedContacts: 1,
      categoriesMustInclude: ["access_intelligence"],
      categoriesMustExclude: ["product_fit_signals"],
      signalKindsMustExclude: ["approval_signal"],
      minIntelligenceUpdates: 1,
      allEvidenceAnchored: true,
      recommendedNextStepIncludes: /credential|karen|contact/i,
      rationaleIncludes: /conditional|interest|follow-up|next step/i,
    },
  },
  {
    id: "positive_no_approval",
    label: "Positive but no approval",
    dictation: ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
    expect: {
      outcomeId: "follow_up_needed",
      observationApprovalExplicit: false,
      providerObservationStatus: "permission_not_yet_confirmed",
      pathwayUnchangedByDebriefAlone: true,
      minProposedContacts: 2,
      contactMentionLevels: ["workflow_participant"],
      anyContactDetailsMissing: true,
      categoriesMustInclude: ["workflow_intelligence", "people_contacts"],
      categoriesMustExclude: [],
      signalKindsMustExclude: ["approval_signal"],
      minIntelligenceUpdates: 2,
      minRepFriendlyUpdates: 2,
      allEvidenceAnchored: true,
      recommendedNextStepIncludes: /karen|contact|observe|acsis/i,
      rationaleIncludes: /interest|follow-up|approval/i,
    },
  },
  {
    id: "denial",
    label: "Denial",
    dictation:
      "They will not allow vendor observation at this facility. Surgeon was polite but said no observers in the main OR.",
    mapping: {
      ...emptyDebriefMapping(),
      confirmed_updates: [
        {
          domain: "or_access",
          label: "Observation denied",
          value: "Vendor observation not allowed at this facility.",
          confidence: "high",
          save_target: "provider",
          reasoning: 'Source quote: "will not allow vendor observation at this facility"',
        },
      ],
    },
    expect: {
      outcomeId: "observation_denied",
      observationApprovalExplicit: false,
      providerObservationStatus: "denied",
      pathwayUnchangedByDebriefAlone: true,
      minProposedContacts: 0,
      categoriesMustInclude: ["workflow_intelligence"],
      signalKindsMustInclude: ["confirmed_fact"],
      allEvidenceAnchored: true,
      rationaleIncludes: /declined|denied|blocked/i,
    },
  },
  {
    id: "mentioned_contact_no_info",
    label: "Mentioned contact without contact info",
    dictation:
      "Melissa handles scheduling but I don't have her contact info yet. Need to follow up before we can book observation.",
    expect: {
      outcomeId: "follow_up_needed",
      observationApprovalExplicit: false,
      providerObservationStatus: "permission_not_yet_confirmed",
      pathwayUnchangedByDebriefAlone: true,
      minProposedContacts: 1,
      maxProposedContacts: 1,
      contactMentionLevels: ["workflow_participant"],
      anyContactDetailsMissing: true,
      categoriesMustInclude: ["people_contacts"],
      minRepFriendlyUpdates: 1,
      allEvidenceAnchored: true,
      recommendedNextStepIncludes: /melissa|contact|follow/i,
    },
  },
  {
    id: "confirmed_contact_with_details",
    label: "Confirmed contact with phone/email",
    dictation:
      "Karen Smith runs scheduling for Dr. Lee — reach her at karen.smith@metrohospital.org or 555-123-4567. Observation approved starting next Tuesday.",
    mapping: {
      ...emptyDebriefMapping(),
      confirmed_updates: [
        {
          domain: "or_access",
          label: "Observation approved",
          value: "Observation approved starting next Tuesday.",
          confidence: "high",
          save_target: "provider",
          reasoning: 'Source quote: "Observation approved starting next Tuesday."',
        },
        {
          domain: "scheduling",
          label: "Scheduling contact",
          value: "Karen Smith — karen.smith@metrohospital.org, 555-123-4567",
          confidence: "high",
          save_target: "provider",
          reasoning:
            'Source quote: "Karen Smith runs scheduling — karen.smith@metrohospital.org or 555-123-4567"',
        },
      ],
    },
    expect: {
      outcomeId: "observation_approved",
      observationApprovalExplicit: true,
      providerObservationStatus: "permission_confirmed",
      pathwayUnchangedByDebriefAlone: true,
      pathwayAfterApprovalOnFile: "observe",
      minProposedContacts: 1,
      allContactsHaveEmailOrPhone: true,
      categoriesMustInclude: ["people_contacts", "access_intelligence"],
      minRepFriendlyUpdates: 2,
      anyConfidence: ["High"],
      allEvidenceAnchored: true,
      recommendedNextStepIncludes: /schedul|observation|karen/i,
    },
  },
  {
    id: "workflow_pain_no_product_fit",
    label: "Workflow pain with no product fit",
    dictation:
      "OR turnover is brutal and the team struggles with visualization during complex abdominal wall cases. No product discussion today — just workflow pain.",
    mapping: {
      ...emptyDebriefMapping(),
      confirmed_updates: [
        {
          domain: "workflow",
          label: "Workflow pain",
          value: "OR turnover delays and visualization struggles during complex abdominal wall cases.",
          confidence: "medium",
          save_target: "provider",
          reasoning:
            'Source quote: "OR turnover is brutal and the team struggles with visualization during complex abdominal wall cases."',
        },
      ],
      do_not_update: [
        {
          item: "Product fit",
          reason: "No explicit product or solution link in debrief.",
        },
      ],
    },
    expect: {
      outcomeId: "follow_up_needed",
      observationApprovalExplicit: false,
      providerObservationStatus: "permission_not_yet_confirmed",
      pathwayUnchangedByDebriefAlone: true,
      minProposedContacts: 0,
      categoriesMustInclude: ["workflow_intelligence"],
      categoriesMustExclude: ["product_fit_signals"],
      signalKindsMustInclude: ["pain_point"],
      signalKindsMustExclude: ["product_interest"],
      minIntelligenceUpdates: 1,
      allEvidenceAnchored: true,
    },
  },
  {
    id: "explicit_product_interest",
    label: "Explicit product interest",
    dictation:
      "He asked specifically about ACSIS for their robotic hernia workflow and wants to see how our solution compares after we observe a case.",
    recommendedNextMoves: [{ action: "Observe a case before positioning ACSIS fit", priority: "high" }],
    mapping: {
      ...emptyDebriefMapping(),
      confirmed_updates: [
        {
          domain: "product_fit",
          label: "ACSIS interest",
          value: "Surgeon asked about ACSIS for robotic hernia workflow; fit pending case observation.",
          confidence: "medium",
          save_target: "provider",
          reasoning: 'Source quote: "asked specifically about ACSIS for their robotic hernia workflow"',
        },
      ],
    },
    expect: {
      outcomeId: "follow_up_needed",
      observationApprovalExplicit: false,
      providerObservationStatus: "permission_not_yet_confirmed",
      pathwayUnchangedByDebriefAlone: true,
      minProposedContacts: 0,
      categoriesMustInclude: ["product_fit_signals"],
      signalKindsMustInclude: ["product_interest"],
      minIntelligenceUpdates: 1,
      allEvidenceAnchored: true,
      recommendedNextStepIncludes: /observe|acsis|case/i,
    },
  },
  {
    id: "competitive_product",
    label: "Competitive product mentioned",
    dictation:
      "They currently use Ethicon endo staplers on preference cards and are evaluating whether to stay with Medtronic mesh for complex cases.",
    mapping: {
      ...emptyDebriefMapping(),
      confirmed_updates: [
        {
          domain: "product_fit",
          label: "Competitive products",
          value: "Ethicon staplers on preference cards; Medtronic mesh under evaluation.",
          confidence: "high",
          save_target: "provider",
          reasoning:
            'Source quote: "use Ethicon endo staplers on preference cards" and "stay with Medtronic mesh"',
        },
      ],
    },
    expect: {
      outcomeId: "follow_up_needed",
      observationApprovalExplicit: false,
      providerObservationStatus: "permission_not_yet_confirmed",
      pathwayUnchangedByDebriefAlone: true,
      minProposedContacts: 0,
      categoriesMustInclude: ["competitive_intelligence"],
      minIntelligenceUpdates: 1,
      allEvidenceAnchored: true,
    },
  },
  {
    id: "rambling_unclear",
    label: "Rambling unclear dictation",
    dictation:
      "So yeah um we talked for a while about cases and stuff, Karen might be involved maybe, credentialing could be a thing, he seemed maybe interested in stuff we do but I'm not totally sure, need to follow up I guess.",
    recommendedNextMoves: [
      { action: "Follow up to clarify observation path and next steps", priority: "medium" },
    ],
    expect: {
      outcomeId: "follow_up_needed",
      observationApprovalExplicit: false,
      providerObservationStatus: "permission_not_yet_confirmed",
      pathwayUnchangedByDebriefAlone: true,
      minProposedContacts: 0,
      minIntelligenceUpdates: 1,
      anyConfidence: ["Medium", "Low"],
      allEvidenceAnchored: true,
      categoriesMustInclude: ["access_intelligence"],
      recommendedNextStepIncludes: /follow/i,
    },
  },
  {
    id: "very_short",
    label: "Very short dictation",
    dictation: "ok thanks",
    expect: {
      outcomeId: "no_meaningful_update",
      observationApprovalExplicit: false,
      providerObservationStatus: null,
      pathwayUnchangedByDebriefAlone: true,
      minProposedContacts: 0,
      maxProposedContacts: 0,
      categoriesMustInclude: [],
      minIntelligenceUpdates: 0,
      minRepFriendlyUpdates: 0,
      allEvidenceAnchored: true,
      rationaleIncludes: /no debrief|no actionable/i,
    },
  },
  {
    id: "mixed_positive_negative",
    label: "Mixed positive and negative signals",
    dictation:
      "He likes what we're doing with ACSIS conceptually and wants to learn more, but they will not allow vendor observation at the main campus. Might be possible at the satellite ASC after credentialing.",
    mapping: {
      ...emptyDebriefMapping(),
      partial_updates: [
        {
          domain: "product_fit",
          label: "ACSIS interest",
          value: "Positive interest in ACSIS; fit not validated.",
          still_needs: ["Observe cases", "Confirm access path"],
          confidence: "medium",
          save_target: "provider",
          reasoning: 'Source quote: "likes what we\'re doing with ACSIS"',
        },
      ],
    },
    expect: {
      outcomeId: "observation_denied",
      observationApprovalExplicit: false,
      providerObservationStatus: "denied",
      pathwayUnchangedByDebriefAlone: true,
      minProposedContacts: 0,
      categoriesMustInclude: ["product_fit_signals"],
      signalKindsMustInclude: ["product_interest"],
      minIntelligenceUpdates: 1,
      allEvidenceAnchored: true,
      rationaleIncludes: /declined|denied|blocked/i,
    },
  },
];

/** Dictation strings from regression scenarios — reused by parity harness. */
export const DEBRIEF_EXTRACTION_REGRESSION_DICTATIONS = DEBRIEF_EXTRACTION_REGRESSION_SCENARIOS.map(
  (scenario) => scenario.dictation,
);
