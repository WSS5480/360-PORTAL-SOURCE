/**
 * Syncs typed review card fields after build / dedup merge.
 */

import type { DebriefFactConfidence } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import { normalizeNextActionDisplayTitle } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefNextActionDisplay";
import { formatProductInterestHeadline } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductInterestDisplay";
import type {
  ClinicalFocusReviewCard,
  ContactCandidateReviewCard,
  DebriefActionableReviewCard,
  FollowUpTaskReviewCard,
  ObservationAccessReviewCard,
  OrganizationIntelligenceReviewCard,
  ProductIntelligenceReviewCard,
} from "@/lib/surgical-sales/debriefActionableReviewCardTypes";

export function followUpTaskPresentation(headline: string): {
  followUpReason?: string;
  suggestedDue: string;
} {
  const h = headline.toLowerCase();
  if (/credential|platform/.test(h)) {
    return {
      followUpReason: "Credentialing required before OR access.",
      suggestedDue: "Next Touch",
    };
  }
  if (/jennifer|contact|phone|email|identify/.test(h)) {
    return {
      followUpReason: "Contact details needed for workflow.",
      suggestedDue: "Next Touch",
    };
  }
  if (/schedul/.test(h) && /confirm|who|control/.test(h)) {
    return {
      followUpReason: "Scheduling ownership affects observation access.",
      suggestedDue: "Next Touch",
    };
  }
  return { suggestedDue: "Next Touch" };
}

function observationFields(
  observationStatus: string,
  approval: string,
  credentialing: string,
  confidence?: DebriefFactConfidence,
) {
  const fields = [
    { label: "Observation Status", value: observationStatus },
    { label: "Approval", value: approval },
    { label: "Credentialing", value: credentialing },
  ];
  if (confidence) fields.push({ label: "Confidence", value: confidence });
  return fields;
}

export function normalizeContactCandidateCard(
  card: Omit<ContactCandidateReviewCard, "displayName" | "roleLabel" | "roleValue" | "confidence"> &
    Partial<Pick<ContactCandidateReviewCard, "displayName" | "roleLabel" | "roleValue" | "confidence">>,
): ContactCandidateReviewCard {
  const roleField = card.fields.find((f) => /role/i.test(f.label));
  const confidenceField = card.fields.find((f) => f.label === "Confidence");
  const confidence = (card.confidence ??
    confidenceField?.value ??
    "Medium") as DebriefFactConfidence;

  return {
    ...card,
    category: "workflow_participant",
    displayName: card.displayName ?? card.headline,
    headline: card.displayName ?? card.headline,
    roleLabel: card.roleLabel ?? roleField?.label,
    roleValue: card.roleValue ?? roleField?.value,
    confidence,
  };
}

export function normalizeObservationAccessCard(
  card: Omit<
    ObservationAccessReviewCard,
    "observationStatus" | "approval" | "credentialing"
  > &
    Partial<Pick<ObservationAccessReviewCard, "observationStatus" | "approval" | "credentialing">>,
): ObservationAccessReviewCard {
  const status =
    card.observationStatus ??
    card.fields.find((f) => f.label === "Observation Status" || f.label === "Status")?.value ??
    "Needs validation";
  const approval = card.approval ?? card.fields.find((f) => f.label === "Approval")?.value ?? "";
  const credentialing =
    card.credentialing ?? card.fields.find((f) => f.label === "Credentialing")?.value ?? "";
  const confidence =
    card.confidence ?? (card.fields.find((f) => f.label === "Confidence")?.value as DebriefFactConfidence);

  return {
    ...card,
    category: "observation_access",
    headline: "Observation Access",
    observationStatus: status,
    approval,
    credentialing,
    confidence,
    fields: observationFields(status, approval, credentialing, confidence),
  };
}

export function normalizeClinicalFocusCard(
  card: Omit<ClinicalFocusReviewCard, "insightTitle"> & Partial<Pick<ClinicalFocusReviewCard, "insightTitle">>,
): ClinicalFocusReviewCard {
  const insightTitle = card.insightTitle ?? card.headline;
  const confidence =
    card.confidence ?? (card.fields.find((f) => f.label === "Confidence")?.value as DebriefFactConfidence);
  const categoryField = card.fields.find((f) => f.label === "Category");
  const intelligenceField = card.fields.find((f) => f.label === "Intelligence");
  const signalField = card.fields.find((f) => f.label === "Signal");
  const fields = [
    ...(categoryField ? [categoryField] : []),
    ...(intelligenceField ? [intelligenceField] : []),
    ...(signalField ? [signalField] : []),
    ...(confidence ? [{ label: "Confidence", value: confidence }] : []),
  ];

  return {
    ...card,
    category: "clinical_focus",
    headline: insightTitle,
    insightTitle,
    clinicalCategoryLabel: card.clinicalCategoryLabel ?? categoryField?.value,
    clinicalDisplayValue: card.clinicalDisplayValue ?? intelligenceField?.value,
    clinicalSourceText: card.clinicalSourceText,
    confidence,
    fields,
  };
}

export function normalizeFollowUpTaskCard(
  card: Omit<FollowUpTaskReviewCard, "taskTitle" | "suggestedDue"> &
    Partial<Pick<FollowUpTaskReviewCard, "taskTitle" | "followUpReason" | "suggestedDue">>,
): FollowUpTaskReviewCard {
  const rawTitle = (card.taskTitle ?? card.headline).replace(/\.$/, "");
  const taskTitle = normalizeNextActionDisplayTitle(rawTitle);
  const presentation = followUpTaskPresentation(taskTitle);
  const fields = [];
  if (card.followUpReason ?? presentation.followUpReason) {
    fields.push({ label: "Reason", value: card.followUpReason ?? presentation.followUpReason! });
  }
  const suggestedDue = card.suggestedDue ?? presentation.suggestedDue;
  fields.push({ label: "Suggested Due", value: suggestedDue });

  return {
    ...card,
    category: "follow_up_task",
    headline: taskTitle,
    taskTitle,
    followUpReason: card.followUpReason ?? presentation.followUpReason,
    suggestedDue,
    fields,
  };
}

export function normalizeProductIntelligenceCard(
  card: Omit<
    ProductIntelligenceReviewCard,
    "productName" | "evidenceStatus" | "impactLine"
  > &
    Partial<
      Pick<
        ProductIntelligenceReviewCard,
        "productName" | "procedureContext" | "evidenceStatus" | "impactLine" | "nextValidationStep"
      >
    >,
): ProductIntelligenceReviewCard {
  const headlineText = card.headline.trim();
  const evidence = card.evidenceQuotes?.[0] ?? "";
  const isProductInterest =
    /^Product interest:/i.test(headlineText) ||
    /comparison|clinical[- ]data|published outcomes|alternatives for|desire for published/i.test(headlineText);
  const hasCanonicalHeadline = /^(?:Product interest|Current product|Competitor product):/i.test(headlineText);
  const productName =
    card.productName ??
    headlineText.replace(/^(?:Current product identified|Current product|Competitor product|Product interest):\s*/i, "").trim();
  const evidenceStatus = card.evidenceStatus ?? "Needs confirmation";
  const impactLine =
    card.impactLine ??
    (isProductInterest
      ? "Product interest helps focus observation planning and follow-up questions."
      : "Current product usage helps prepare observation strategy and future provider debrief.");
  const confidence =
    card.confidence ?? (card.fields.find((f) => f.label === "Confidence")?.value as DebriefFactConfidence);
  const productInterestHeadline = formatProductInterestHeadline(headlineText, evidence);

  return {
    ...card,
    category: "product_intelligence",
    headline: hasCanonicalHeadline
      ? isProductInterest
        ? productInterestHeadline
        : headlineText
      : isProductInterest
        ? productInterestHeadline
        : `Current product identified: ${productName}`,
    productName,
    procedureContext: card.procedureContext,
    evidenceStatus,
    impactLine,
    nextValidationStep: card.nextValidationStep,
    confidence,
    fields: [
      { label: "Status", value: evidenceStatus },
      ...(card.procedureContext ? [{ label: "Procedure context", value: card.procedureContext }] : []),
      ...(confidence ? [{ label: "Confidence", value: confidence }] : []),
    ],
  };
}

export function normalizeOrganizationIntelligenceCard(
  card: Omit<OrganizationIntelligenceReviewCard, "topicTitle"> &
    Partial<Pick<OrganizationIntelligenceReviewCard, "topicTitle">>,
): OrganizationIntelligenceReviewCard {
  const topicTitle = card.topicTitle ?? card.headline;
  const confidence =
    card.confidence ?? (card.fields.find((f) => f.label === "Confidence")?.value as DebriefFactConfidence);

  return {
    ...card,
    category: "organization_intelligence",
    headline: topicTitle,
    topicTitle,
    confidence,
    fields: confidence ? [{ label: "Confidence", value: confidence }] : [],
  };
}

export function normalizeDebriefActionableReviewCard(card: DebriefActionableReviewCard): DebriefActionableReviewCard {
  switch (card.category) {
    case "workflow_participant":
      return normalizeContactCandidateCard(card);
    case "observation_access":
      return normalizeObservationAccessCard(card);
    case "clinical_focus":
      return normalizeClinicalFocusCard(card);
    case "product_intelligence":
      return normalizeProductIntelligenceCard(card);
    case "follow_up_task":
      return normalizeFollowUpTaskCard(card);
    case "organization_intelligence":
      return normalizeOrganizationIntelligenceCard(card);
    default:
      return card;
  }
}
