/**

 * Provider relationship stage — account maturity with this provider.

 * Separate from: intelligence completeness, engagement pre-call status, case workflow.

 */



import {

  formatIntelligenceConfidenceDisplayLabel,

  weakestSectionConfidence,

  type IntelligenceSectionConfidence,

} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";



/** Canonical values stored on surgical_sales_contacts.provider_relationship_stage */

export const PROVIDER_RELATIONSHIP_STAGES = [

  "early_discovery",

  "active_evaluation",

  "active_relationship",

  "established_customer",

  "dormant",

  "archived",

] as const;



export type ProviderRelationshipStage = (typeof PROVIDER_RELATIONSHIP_STAGES)[number];



/** Legacy DB / client values migrated to canonical stages (read-time normalization). */

const LEGACY_RELATIONSHIP_STAGE_ALIASES: Record<string, ProviderRelationshipStage> = {

  prospect: "early_discovery",

  pre_call_planning: "early_discovery",

  engagement_active: "active_evaluation",

  observation_requested: "active_evaluation",

  observation_scheduled: "active_evaluation",

};



export const PROVIDER_RELATIONSHIP_STAGE_LABELS: Record<ProviderRelationshipStage, string> = {

  early_discovery: "Early discovery",

  active_evaluation: "Active evaluation",

  active_relationship: "Active relationship",

  established_customer: "Established customer",

  dormant: "Dormant / reactivation",

  archived: "Archived",

};



export const PROVIDER_RELATIONSHIP_STAGE_DESCRIPTIONS: Record<ProviderRelationshipStage, string> = {

  early_discovery: "No established operational relationship yet.",

  active_evaluation: "Product or workflow evaluation is underway.",

  active_relationship: "Ongoing commercial relationship — regular touchpoints.",

  established_customer: "Won business or ongoing customer.",

  dormant: "Inactive relationship you're bringing back.",

  archived: "Archived provider record.",

};



/** Onboarding question on Add Provider — maps to provider_relationship_stage. */

/** Short helper for Add Provider compact tiles (full description remains in `description`). */
export const PROVIDER_ONBOARDING_RELATIONSHIP_SHORT_HINTS: Record<
  | "early_discovery"
  | "active_evaluation"
  | "active_relationship"
  | "established_customer"
  | "dormant_reactivation",
  string
> = {
  early_discovery: "No operational relationship yet",
  active_evaluation: "Evaluation underway",
  active_relationship: "Regular touchpoints",
  established_customer: "Won / ongoing customer",
  dormant_reactivation: "Re-engaging inactive",
};

export const PROVIDER_ONBOARDING_RELATIONSHIP_OPTIONS = [
  {
    id: "early_discovery",
    label: "Early discovery",
    description: PROVIDER_RELATIONSHIP_STAGE_DESCRIPTIONS.early_discovery,
    shortHint: PROVIDER_ONBOARDING_RELATIONSHIP_SHORT_HINTS.early_discovery,
  },
  {
    id: "active_evaluation",
    label: "Active evaluation",
    description: PROVIDER_RELATIONSHIP_STAGE_DESCRIPTIONS.active_evaluation,
    shortHint: PROVIDER_ONBOARDING_RELATIONSHIP_SHORT_HINTS.active_evaluation,
  },
  {
    id: "active_relationship",
    label: "Active relationship",
    description: PROVIDER_RELATIONSHIP_STAGE_DESCRIPTIONS.active_relationship,
    shortHint: PROVIDER_ONBOARDING_RELATIONSHIP_SHORT_HINTS.active_relationship,
  },
  {
    id: "established_customer",
    label: "Established customer",
    description: PROVIDER_RELATIONSHIP_STAGE_DESCRIPTIONS.established_customer,
    shortHint: PROVIDER_ONBOARDING_RELATIONSHIP_SHORT_HINTS.established_customer,
  },
  {
    id: "dormant_reactivation",
    label: "Dormant / reactivation",
    description: PROVIDER_RELATIONSHIP_STAGE_DESCRIPTIONS.dormant,
    shortHint: PROVIDER_ONBOARDING_RELATIONSHIP_SHORT_HINTS.dormant_reactivation,
  },
] as const;

/** Official sales-pathway choices on Add Provider — Customer is a separate track. */
export const PROVIDER_CREATE_PATHWAY_STAGES = [
  {
    id: "discovery",
    label: "Discovery",
    shortHint: "No operational relationship yet",
    onboardingId: "early_discovery" as const,
  },
  {
    id: "observation",
    label: "Observation",
    shortHint: "OR access or observation in progress",
    onboardingId: "active_evaluation" as const,
  },
  {
    id: "evaluation",
    label: "Evaluation",
    shortHint: "Product or workflow evaluation underway",
    onboardingId: "active_relationship" as const,
  },
  {
    id: "reactivation",
    label: "Reactivation",
    shortHint: "Re-engaging an inactive relationship",
    onboardingId: "dormant_reactivation" as const,
  },
] as const;

/** Off-pathway classification — already moved through the sales pathway. */
export const PROVIDER_CREATE_CUSTOMER_STAGE = {
  id: "customer",
  label: "Customer",
  shortHint: "Already moved through the sales pathway",
  onboardingId: "established_customer" as const,
} as const;

export const PROVIDER_CREATE_STAGE_OPTIONS = [
  ...PROVIDER_CREATE_PATHWAY_STAGES,
  PROVIDER_CREATE_CUSTOMER_STAGE,
] as const;

export type ProviderCreatePathwayStageId = (typeof PROVIDER_CREATE_STAGE_OPTIONS)[number]["id"];
export type ProviderCreateSalesTrackId = "sales_pathway" | "customer";

export function onboardingAnswerFromPathwayStage(
  stageId: ProviderCreatePathwayStageId,
): ProviderOnboardingRelationshipAnswer {
  const match = PROVIDER_CREATE_STAGE_OPTIONS.find((s) => s.id === stageId);
  return match?.onboardingId ?? "early_discovery";
}

export function pathwayStageFromOnboardingAnswer(
  answer: ProviderOnboardingRelationshipAnswer,
): ProviderCreatePathwayStageId {
  const match = PROVIDER_CREATE_STAGE_OPTIONS.find((s) => s.onboardingId === answer);
  return match?.id ?? "discovery";
}

export function salesTrackFromOnboardingAnswer(
  answer: ProviderOnboardingRelationshipAnswer,
): ProviderCreateSalesTrackId {
  return answer === "established_customer" ? "customer" : "sales_pathway";
}

export function salesTrackFromRelationshipStage(stage: string | null | undefined): ProviderCreateSalesTrackId {
  return isProviderSalesCustomer(stage) ? "customer" : "sales_pathway";
}



export type ProviderOnboardingRelationshipAnswer =

  (typeof PROVIDER_ONBOARDING_RELATIONSHIP_OPTIONS)[number]["id"];



export function normalizeProviderRelationshipStage(raw: unknown): ProviderRelationshipStage {

  const key = String(raw ?? "").trim().toLowerCase();

  if (!key) return "early_discovery";

  if ((PROVIDER_RELATIONSHIP_STAGES as readonly string[]).includes(key)) {

    return key as ProviderRelationshipStage;

  }

  return LEGACY_RELATIONSHIP_STAGE_ALIASES[key] ?? "early_discovery";

}

export type ProviderSalesCustomerInput =
  | string
  | null
  | undefined
  | {
      provider_relationship_stage?: string | null;
      relationship_stage?: string | null;
    };

/**
 * Explicit sales-customer classification — already moved through the sales pathway.
 * Does not use CRM status `active`, which is also applied to in-pathway evaluation providers.
 */
export function isProviderSalesCustomer(input?: ProviderSalesCustomerInput): boolean {
  if (input == null) return false;
  if (typeof input === "string") {
    return normalizeProviderRelationshipStage(input) === "established_customer";
  }
  return (
    normalizeProviderRelationshipStage(
      input.provider_relationship_stage ?? input.relationship_stage ?? null,
    ) === "established_customer"
  );
}



export function formatProviderRelationshipStage(raw: string | null | undefined): string {

  const canonical = normalizeProviderRelationshipStage(raw);

  return PROVIDER_RELATIONSHIP_STAGE_LABELS[canonical];

}



export function relationshipStageFromOnboardingAnswer(

  answer: ProviderOnboardingRelationshipAnswer,

): ProviderRelationshipStage {

  switch (answer) {

    case "early_discovery":

      return "early_discovery";

    case "active_evaluation":

      return "active_evaluation";

    case "active_relationship":

      return "active_relationship";

    case "established_customer":

      return "established_customer";

    case "dormant_reactivation":

      return "dormant";

    default:

      return "early_discovery";

  }

}



/** Mature relationships — no forced engagement onboarding on the provider profile. */

export function skipsMandatoryPlanningOnboarding(stage: string | null | undefined): boolean {

  const s = normalizeProviderRelationshipStage(stage);

  return (

    s === "active_relationship" ||

    s === "established_customer" ||

    s === "dormant" ||

    s === "archived"

  );

}



/** Early maturity — suggest creating an engagement (prep lives on the engagement, not here). */

export function encouragesEngagementPreCallOnboarding(stage: string | null | undefined): boolean {

  return normalizeProviderRelationshipStage(stage) === "early_discovery";

}



export function isEarlyDiscoveryRelationshipStage(stage: string | null | undefined): boolean {

  return normalizeProviderRelationshipStage(stage) === "early_discovery";

}



/** @deprecated Use isEarlyDiscoveryRelationshipStage */

export function isNewProspectRelationshipStage(stage: string | null | undefined): boolean {

  return isEarlyDiscoveryRelationshipStage(stage);

}



export function defaultCrmStatusForRelationshipStage(stage: ProviderRelationshipStage): string {

  if (stage === "dormant" || stage === "archived") return "inactive";

  if (

    stage === "active_relationship" ||

    stage === "established_customer" ||

    stage === "active_evaluation"

  ) {

    return "active";

  }

  return "prospect";

}



export type ProviderEngagementPlanningHint = {

  label: string;

  tone: "neutral" | "optional" | "encouraged" | "active";

};



export function engagementPlanningHintForStage(

  stage: string | null | undefined,

  upcomingEngagementCount: number,

): ProviderEngagementPlanningHint {

  if (skipsMandatoryPlanningOnboarding(stage)) {

    return { label: "Not required", tone: "optional" };

  }

  if (upcomingEngagementCount > 0) {

    return { label: `${upcomingEngagementCount} upcoming`, tone: "active" };

  }

  if (encouragesEngagementPreCallOnboarding(stage)) {

    return { label: "Create engagement recommended", tone: "encouraged" };

  }

  if (normalizeProviderRelationshipStage(stage) === "active_evaluation") {

    return { label: "Track on engagement", tone: "neutral" };

  }

  return { label: "None scheduled", tone: "neutral" };

}



export function observationSetupHintForStage(stage: string | null | undefined): ProviderEngagementPlanningHint {

  if (skipsMandatoryPlanningOnboarding(stage)) {

    return { label: "Not required", tone: "optional" };

  }

  const s = normalizeProviderRelationshipStage(stage);

  if (s === "active_evaluation") return { label: "When scheduled", tone: "neutral" };

  return { label: "When case scheduled", tone: "neutral" };

}



export function intelligenceHintFromPlanning(

  planningPercentOrCompletion:

    | number

    | {

        percent?: number;

        status?: string;

        sections?: Array<{ confidence: IntelligenceSectionConfidence }>;

      }

    | null

    | undefined,

  planningStatus?: string,

): ProviderEngagementPlanningHint {

  if (typeof planningPercentOrCompletion === "object" && planningPercentOrCompletion !== null) {

    const planning = planningPercentOrCompletion;

    const sections = planning.sections ?? [];

    if (sections.length > 0) {

      const confidence = weakestSectionConfidence(sections.map((s) => s.confidence));

      const label = formatIntelligenceConfidenceDisplayLabel(confidence);

      if (confidence === "validated") return { label, tone: "active" };

      if (confidence === "confirmed") return { label, tone: "active" };

      if (confidence === "partial") return { label, tone: "neutral" };

      return { label, tone: "optional" };

    }

    return intelligenceHintFromPlanning(planning.percent ?? 0, planning.status ?? "not_started");

  }



  const planningPercent = planningPercentOrCompletion;

  const status = planningStatus ?? "not_started";

  if (status === "complete") {

    return { label: "Validated", tone: "active" };

  }

  if ((planningPercent ?? 0) > 0) {

    return { label: "Partially mapped", tone: "neutral" };

  }

  return { label: "Discovery still developing", tone: "optional" };

}


