import type {

  DebriefCommercialNextStepOption,

  DebriefFindingCommercialStatus,

} from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";



export const DEBRIEF_COMMERCIAL_STATUS_LABEL: Record<DebriefFindingCommercialStatus, string> = {

  mentioned_only: "Mentioned Only",

  qualified_issue: "Qualified Issue",

  rejected_issue: "Rejected Issue",

  validated_pain_point: "Validated Pain Point",

  active_opportunity: "Active Opportunity",

  no_active_opportunity: "No Active Opportunity",

};



export const DEBRIEF_COMMERCIAL_NEXT_STEP_OPTIONS: DebriefCommercialNextStepOption[] = [

  { id: "no_action", label: "No Action" },

  { id: "follow_up", label: "Follow Up" },

  { id: "evaluation", label: "Evaluation" },

  { id: "360_experience", label: "360 Experience" },

  { id: "product_trial", label: "Product Trial" },

  { id: "opportunity_creation", label: "Opportunity Creation" },

];



export const DEBRIEF_COMPLETION_REVIEW_HEADINGS = {

  whatWeLearned: "What did we learn?",

  whatChanged: "What changed?",

  whatShouldWeDoNext: "What should we do next?",

  providerProfileUpdates: "Provider Profile Updates",

  commercialFindings: "Commercial Findings",

  recommendedNextStep: "Recommended Next Step",

  validatedPainPoints: "Validated pain points",

  qualifiedPainPoints: "Qualified pain points",

  rejectedPainPoints: "Rejected pain points",

  opportunitiesIdentified: "Opportunities identified",

  opportunitiesRejected: "Opportunities rejected",

  keyFindings: "Key findings",

  recordUpdates: "Record updates",

  nextStep: "Next step",

} as const;


