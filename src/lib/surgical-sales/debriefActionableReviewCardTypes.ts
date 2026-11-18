import type { DebriefFactConfidence } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";

export type DebriefReviewCardCategory =
  | "workflow_participant"
  | "observation_access"
  | "clinical_focus"
  | "product_intelligence"
  | "organization_intelligence"
  | "follow_up_task";

export const DEBRIEF_REVIEW_CATEGORY_LABELS: Record<DebriefReviewCardCategory, string> = {
  workflow_participant: "Contact Candidate",
  observation_access: "Observation Access",
  clinical_focus: "Clinical Focus",
  product_intelligence: "Product Intelligence",
  organization_intelligence: "Organization Intelligence",
  follow_up_task: "Follow-Up Task",
};

export type DebriefReviewCardField = {
  label: string;
  value: string;
};

export type DebriefReviewCardActionType =
  | "create_contact"
  | "link_contact"
  | "update_access_status"
  | "add_clinical_focus"
  | "add_product_intelligence"
  | "add_organization_intelligence"
  | "create_follow_up"
  | "ignore";

export type DebriefReviewCardAction = {
  id: string;
  type: DebriefReviewCardActionType;
  label: string;
  primary?: boolean;
};

type ReviewCardCore = {
  id: string;
  headline: string;
  evidenceQuotes: string[];
  actions: DebriefReviewCardAction[];
  linkedFieldUpdateIds: string[];
  linkedIntelligenceIds: string[];
  /** Retained for dedup merge — not shown directly in typed layouts. */
  fields: DebriefReviewCardField[];
};

export type ContactCandidateReviewCard = ReviewCardCore & {
  category: "workflow_participant";
  contactId: string;
  displayName: string;
  roleLabel?: string;
  roleValue?: string;
  confidence: DebriefFactConfidence;
};

export type ObservationAccessReviewCard = ReviewCardCore & {
  category: "observation_access";
  observationStatus: string;
  approval: string;
  credentialing: string;
  confidence?: DebriefFactConfidence;
};

export type ClinicalFocusReviewCard = ReviewCardCore & {
  category: "clinical_focus";
  insightTitle: string;
  clinicalCategoryLabel?: string;
  clinicalDisplayValue?: string;
  clinicalSourceText?: string;
  clinicalProcedureFocus?: string;
  confidence?: DebriefFactConfidence;
};

export type FollowUpTaskReviewCard = ReviewCardCore & {
  category: "follow_up_task";
  taskTitle: string;
  followUpReason?: string;
  suggestedDue?: string;
};

export type OrganizationIntelligenceReviewCard = ReviewCardCore & {
  category: "organization_intelligence";
  topicTitle: string;
  confidence?: DebriefFactConfidence;
};

export type ProductIntelligenceReviewCard = ReviewCardCore & {
  category: "product_intelligence";
  productName: string;
  procedureContext?: string;
  evidenceStatus: string;
  impactLine: string;
  nextValidationStep?: string;
  confidence?: DebriefFactConfidence;
};

export type DebriefActionableReviewCard =
  | ContactCandidateReviewCard
  | ObservationAccessReviewCard
  | ClinicalFocusReviewCard
  | ProductIntelligenceReviewCard
  | FollowUpTaskReviewCard
  | OrganizationIntelligenceReviewCard;

export function isContactCandidateReviewCard(
  card: DebriefActionableReviewCard,
): card is ContactCandidateReviewCard {
  return card.category === "workflow_participant";
}

export function isObservationAccessReviewCard(
  card: DebriefActionableReviewCard,
): card is ObservationAccessReviewCard {
  return card.category === "observation_access";
}

export function isClinicalFocusReviewCard(
  card: DebriefActionableReviewCard,
): card is ClinicalFocusReviewCard {
  return card.category === "clinical_focus";
}

export function isFollowUpTaskReviewCard(
  card: DebriefActionableReviewCard,
): card is FollowUpTaskReviewCard {
  return card.category === "follow_up_task";
}

export function isOrganizationIntelligenceReviewCard(
  card: DebriefActionableReviewCard,
): card is OrganizationIntelligenceReviewCard {
  return card.category === "organization_intelligence";
}

export function isProductIntelligenceReviewCard(
  card: DebriefActionableReviewCard,
): card is ProductIntelligenceReviewCard {
  return card.category === "product_intelligence";
}

