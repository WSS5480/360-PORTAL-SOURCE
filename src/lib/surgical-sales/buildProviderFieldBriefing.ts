/**

 * Field Briefing — tactical pre-meeting / pre-OR packet (read-only).

 */



import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

import {

  resolveProviderCommercialWorkflowStage,

  type ProviderCommercialWorkflowStage,

} from "@/lib/surgical-sales/providerCommercialWorkflowStage";

import {

  buildFieldBriefingLearnChips,

  buildProviderFieldBriefingAsks,

  type ProviderFieldBriefingAsk,

} from "@/lib/surgical-sales/buildProviderFieldBriefingAsks";

import { formatProviderRelationshipStage } from "@/lib/surgical-sales/providerRelationshipStage";

import { PROVIDER_FIELD_OPS_CTA } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

import type { FieldBriefingActiveTouch } from "@/lib/surgical-sales/providerFieldBriefingTouch";

import {

  fieldBriefingAvoidForTouch,

  fieldBriefingObjectiveForTouch,

  fieldBriefingTouchContextLine,

  fieldBriefingTouchSuccessOutcomes,

} from "@/lib/surgical-sales/providerFieldBriefingTouch";

import { buildProtectFieldTimeAssessment } from "@/lib/surgical-sales/buildProtectFieldTimeAssessment";

import type { ProviderFieldTimeRiskState } from "@/lib/surgical-sales/providerFieldTimeRiskVocabulary";

import { softenBriefingRiskToCoaching } from "@/lib/surgical-sales/providerFieldBriefingCoachingCopy";

import { sanitizeIntelligenceTabUserCopy } from "@/lib/surgical-sales/buildIntelligenceTabPresentation";



function sanitizeFieldBriefingModel<T>(value: T): T {

  if (typeof value === "string") return sanitizeIntelligenceTabUserCopy(value) as T;

  if (Array.isArray(value)) return value.map((item) => sanitizeFieldBriefingModel(item)) as T;

  if (value && typeof value === "object") {

    return Object.fromEntries(

      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [

        key,

        sanitizeFieldBriefingModel(entry),

      ]),

    ) as T;

  }

  return value;

}



export const PROVIDER_FIELD_BRIEFING_TITLE = "Field briefing";



/** Field prep sheet section labels — not CRM report language. */

export const PROVIDER_FIELD_BRIEFING_SECTION = {

  objective: "Objective",

  askThese: "Ask these",

  useThisTouchToLearn: "Use this touch to learn",

  avoid: "Avoid",

  goodTouchGetsYou: "A good touch gets you",

  afterTouch: "After the touch",

  afterTouchHint: "Log what you learned — names, workflow notes, and the next dated step.",

  logFieldUpdate: PROVIDER_FIELD_OPS_CTA.logFieldUpdate,

} as const;



export type { ProviderFieldBriefingAsk };



export type ProviderFieldBriefingChip = {

  id: string;

  label: string;

};



export type ProviderFieldBriefingMeetingObjective = {

  providerName: string;

  facilityName: string | null;

  objective: string;

  touchContext: string | null;

};



export type ProviderFieldBriefingFooter = {

  /** Set only for draft prep — opens create-engagement. Log update uses onLogFieldUpdate in UI. */

  logFieldUpdateHref: string | null;

  scheduleNextStepHref: string;

  intelligenceHref: string;

};



export type ProviderFieldBriefing = {

  touch: FieldBriefingActiveTouch;

  relationshipStageLabel: string;

  meetingObjective: ProviderFieldBriefingMeetingObjective;

  priorityAsks: ProviderFieldBriefingAsk[];

  criticalUnknowns: ProviderFieldBriefingChip[];

  tacticalWarnings: string[];

  successCriteria: string[];

  footer: ProviderFieldBriefingFooter;

};



function contextualAvoidLine(

  fieldTimeState: ProviderFieldTimeRiskState,

  protectHeadline: string | null,

): string | null {

  if (fieldTimeState === "efficient_field_target") return null;

  return softenBriefingRiskToCoaching(protectHeadline);

}



function buildMeetingObjective(

  providerName: string,

  facilityName: string | null,

  activeTouch: FieldBriefingActiveTouch,

): ProviderFieldBriefingMeetingObjective {

  return {

    providerName,

    facilityName,

    objective: fieldBriefingObjectiveForTouch(activeTouch.engagementType),

    touchContext: fieldBriefingTouchContextLine(activeTouch),

  };

}



export function buildProviderFieldBriefing(input: {

  contact: Record<string, unknown>;

  planning?: ProviderPlanningCompletion | null;

  relationshipStage?: string | null;

  specialty?: string | null;

  providerName?: string | null;

  facilityName?: string | null;

  engagements?: ProviderEngagementSummary[];

  opportunities?: Array<Record<string, unknown>>;

  cases?: Array<Record<string, unknown>>;

  prepareEngagementHref?: string | null;

  intelligenceHref: string;

  newEngagementHref: string;

  providerId: string;

  activeTouch: FieldBriefingActiveTouch;

}): ProviderFieldBriefing {

  const contact = input.contact;

  const relationshipStage = String(

    input.relationshipStage ?? contact.provider_relationship_stage ?? "prospect",

  )

    .trim()

    .toLowerCase();



  const commercialStage = resolveProviderCommercialWorkflowStage({

    relationshipStage,

    opportunities: input.opportunities,

    cases: input.cases,

    engagements: input.engagements,

  });



  const protect = buildProtectFieldTimeAssessment({

    contact,

    relationshipStage,

    commercialStage,

    engagements: input.engagements,

  });



  const providerName =

    String(input.providerName ?? contact.display_name ?? contact.full_name ?? "").trim() ||

    "Provider";



  const facilityName = String(input.facilityName ?? "").trim() || null;



  const touch = input.activeTouch;

  const scheduleHref =

    touch.prepareHref ?? input.prepareEngagementHref ?? touch.createEngagementHref;



  const priorityAsks = buildProviderFieldBriefingAsks({

    contact,

    planning: input.planning,

    engagementType: touch.engagementType,

    relationshipStage,

    commercialStage,

    limit: 5,

  });



  return sanitizeFieldBriefingModel({

    touch,

    relationshipStageLabel: formatProviderRelationshipStage(relationshipStage),

    meetingObjective: buildMeetingObjective(providerName, facilityName, touch),

    priorityAsks,

    criticalUnknowns: buildFieldBriefingLearnChips({

      contact,

      planning: input.planning,

      engagementType: touch.engagementType,

      excludeDbKeys: priorityAsks.map((a) => a.id),

      limit: 6,

    }),

    tacticalWarnings: fieldBriefingAvoidForTouch(

      touch.engagementType,

      contextualAvoidLine(protect.fieldTimeRisk.state, protect.topThreat?.scan ?? protect.headline ?? null),

    ),

    successCriteria: fieldBriefingTouchSuccessOutcomes(touch.engagementType),

    footer: {

      logFieldUpdateHref: touch.isDraft ? touch.createEngagementHref : null,

      scheduleNextStepHref: scheduleHref,

      intelligenceHref: input.intelligenceHref,

    },

  });

}



// Re-export CTA label for tests

export { PROVIDER_FIELD_OPS_CTA };


