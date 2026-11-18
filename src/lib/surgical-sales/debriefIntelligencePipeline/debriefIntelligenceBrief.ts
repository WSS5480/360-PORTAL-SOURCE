/**
 * Business intelligence brief — groups review decisions for rep-facing display.
 */

import type { DebriefActionableReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import {
  isClinicalFocusReviewCard,
  isContactCandidateReviewCard,
  isFollowUpTaskReviewCard,
  isObservationAccessReviewCard,
  isOrganizationIntelligenceReviewCard,
  isProductIntelligenceReviewCard,
} from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import type { DebriefReviewDecision } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDecisions";
import {
  executiveContactTakeaway,
  enrichClinicalProcedureFocusWithModality,
  isProductInterestOutcome,
  isProductUsageOutcome,
  mergeSchedulingPreferenceLines,
  refineClinicalPrimaryLine,
  refineWorkflowPrimaryLine,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDisplayRefinement";
import { formatProductInterestHeadline } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductInterestDisplay";
import {
  INTELLIGENCE_BRIEF_PRODUCT_STATUS,
  contactSummaryLine,
  displayClinicalInsight,
  displayCredentialingSummary,
  displayFollowUpAction,
  displayObservationApproval,
  inferFollowUpPriority,
  INTELLIGENCE_BRIEF_CONTACT_STATUS,
  INTELLIGENCE_BRIEF_OBSERVATION_SUMMARY,
  type FollowUpPriority,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import { formatReviewEvidenceQuote } from "@/lib/surgical-sales/debriefReviewEvidencePipeline";
import { followUpMergeKey } from "@/lib/surgical-sales/debriefReviewIntelligenceDedup";
import {
  CLINICAL_INSIGHT_GROUP_LABEL,
  CLINICAL_INSIGHT_GROUP_ORDER,
  clinicalBriefPrimaryLine,
  clinicalInsightGroupIdFromLabel,
  clinicalInsightGroupIdFromOutcome,
  commercialClinicalCategoryFromSignal,
  formatClinicalStorageValue,
  formatCommercialClinicalReviewLine,
  isGenericClinicalFactText,
  normalizeClinicalIntelligenceFromFact,
  type CommercialClinicalCategoryId,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import type { DebriefReviewCardActionType } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import {
  attachPathwayImpactToOutcomes,
  pathwayImpactForBriefOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligencePathwayImpact";
import {
  normalizeDebriefIntelligenceBriefForReview,
  normalizeIntelligenceBriefOutcomes,
  type NormalizeIntelligenceBriefOptions,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/normalizeIntelligenceBriefForReview";

export type IntelligenceBriefObservationFields = {
  status: string;
  approval: string;
  requirements: string;
};

export type IntelligenceBriefContactItem = {
  kind: "contact";
  id: string;
  cardId: string;
  contactId?: string;
  primaryLine: string;
  subtitle?: string;
  evidenceQuotes: string[];
  linkedFieldUpdateIds: string[];
  confirmActionType: DebriefReviewCardActionType;
  dismissActionType: DebriefReviewCardActionType;
};

export type IntelligenceBriefObservationItem = {
  kind: "observation_access";
  id: string;
  cardId: string;
  bullets: string[];
  observationFields: IntelligenceBriefObservationFields;
  evidenceQuotes: string[];
  linkedFieldUpdateIds: string[];
  confirmActionType: DebriefReviewCardActionType;
  dismissActionType: DebriefReviewCardActionType;
};

export type IntelligenceBriefClinicalItem = {
  kind: "clinical_insight";
  id: string;
  cardId: string;
  primaryLine: string;
  categoryLabel: string;
  categoryId: CommercialClinicalCategoryId;
  displayValue: string;
  procedureFocus: string;
  sourceText: string | null;
  evidenceQuotes: string[];
  linkedFieldUpdateIds: string[];
  confirmActionType: DebriefReviewCardActionType;
  dismissActionType: DebriefReviewCardActionType;
};

export type IntelligenceBriefFollowUpItem = {
  kind: "follow_up";
  id: string;
  cardId: string;
  primaryLine: string;
  followUpReason?: string;
  priority: FollowUpPriority;
  evidenceQuotes: string[];
  linkedFieldUpdateIds: string[];
  confirmActionType: DebriefReviewCardActionType;
  dismissActionType: DebriefReviewCardActionType;
};

export type IntelligenceBriefProductItem = {
  kind: "product_intelligence";
  id: string;
  cardId: string;
  productName: string;
  procedureContext?: string;
  evidenceStatus: string;
  impactLine: string;
  nextValidationStep?: string;
  evidenceQuotes: string[];
  linkedFieldUpdateIds: string[];
  confirmActionType: DebriefReviewCardActionType;
  dismissActionType: DebriefReviewCardActionType;
};

/** Facility/workflow finding that isn't credentialing — Workflow Insights card. */
export type IntelligenceBriefWorkflowItem = {
  kind: "workflow_insight";
  id: string;
  cardId: string;
  primaryLine: string;
  evidenceQuotes: string[];
  linkedFieldUpdateIds: string[];
  confirmActionType: DebriefReviewCardActionType;
  dismissActionType: DebriefReviewCardActionType;
};

export type DebriefIntelligenceBrief = {
  contacts: IntelligenceBriefContactItem[];
  observationAccess: IntelligenceBriefObservationItem | null;
  clinicalInsights: IntelligenceBriefClinicalItem[];
  productIntelligence: IntelligenceBriefProductItem[];
  workflowInsights: IntelligenceBriefWorkflowItem[];
  followUpActions: IntelligenceBriefFollowUpItem[];
};

export type IntelligenceBriefOutcomeKind =
  | "contact"
  | "observation_access"
  | "clinical_insight"
  | "product_intelligence"
  | "workflow_insight"
  | "follow_up";

/** One selectable conversation outcome in the review UI. */
export type IntelligenceBriefOutcome = {
  id: string;
  kind: IntelligenceBriefOutcomeKind;
  cardIds: string[];
  summaryLine: string;
  /** @deprecated use summaryLine */
  primaryLine?: string;
  subtitle?: string;
  statusLine?: string;
  observationFields?: IntelligenceBriefObservationFields;
  priority?: FollowUpPriority;
  /** Legacy flat bullets — prefer summaryLine / observationFields */
  bullets: string[];
  evidenceQuotes: string[];
  linkedFieldUpdateIds: string[];
  contactId?: string;
  followUpReason?: string;
  /** How this intelligence changes provider progression when accepted. */
  pathwayImpactLine?: string;
  productName?: string;
  productProcedureContext?: string;
  productEvidenceStatus?: string;
  productImpactLine?: string;
  productNextValidationStep?: string;
};

function contactFromCard(card: DebriefActionableReviewCard): IntelligenceBriefContactItem | null {
  if (!isContactCandidateReviewCard(card)) return null;
  return {
    kind: "contact",
    id: card.id,
    cardId: card.id,
    contactId: card.contactId,
    primaryLine: card.displayName,
    subtitle: card.roleValue?.trim() || undefined,
    evidenceQuotes: card.evidenceQuotes,
    linkedFieldUpdateIds: card.linkedFieldUpdateIds,
    confirmActionType: "create_contact",
    dismissActionType: "ignore",
  };
}

function observationFieldsFromCard(card: DebriefActionableReviewCard): IntelligenceBriefObservationFields | null {
  if (isObservationAccessReviewCard(card)) {
    // Interest already conveys that approval is pending — a negative approval
    // claim ("Not Yet Approved") must never surface for discussion-only
    // debriefs. Only explicit approval shows on the approval axis.
    const suppressNegativeApproval =
      card.observationStatus === "Interested" && card.approval !== "Confirmed";
    return {
      status: card.observationStatus,
      approval: suppressNegativeApproval ? "" : displayObservationApproval(card.approval),
      requirements: displayCredentialingSummary(card.credentialing),
    };
  }
  if (isOrganizationIntelligenceReviewCard(card) && /credential/i.test(card.topicTitle)) {
    return {
      status: "Needs validation",
      approval: "",
      requirements: "Credentialing Required",
    };
  }
  return null;
}

function observationFromCard(card: DebriefActionableReviewCard): IntelligenceBriefObservationItem | null {
  const observationFields = observationFieldsFromCard(card);
  if (!observationFields) return null;

  const bullets = [
    observationFields.status,
    observationFields.requirements,
    observationFields.approval,
  ].filter(Boolean);

  return {
    kind: "observation_access",
    id: card.id,
    cardId: card.id,
    bullets,
    observationFields,
    evidenceQuotes: card.evidenceQuotes,
    linkedFieldUpdateIds: card.linkedFieldUpdateIds,
    confirmActionType: isObservationAccessReviewCard(card)
      ? "update_access_status"
      : "add_organization_intelligence",
    dismissActionType: "ignore",
  };
}

function clinicalFromCard(card: DebriefActionableReviewCard): IntelligenceBriefClinicalItem | null {
  if (!isClinicalFocusReviewCard(card)) return null;

  if (card.clinicalCategoryLabel && card.clinicalDisplayValue) {
    const structuredValue = card.insightTitle.includes(" · ")
      ? card.insightTitle
      : card.clinicalProcedureFocus
        ? `${card.clinicalProcedureFocus} · ${card.clinicalDisplayValue}`
        : card.clinicalDisplayValue;

    const normalized = normalizeClinicalIntelligenceFromFact({
      value: structuredValue,
      evidence: card.evidenceQuotes[0] ?? card.clinicalSourceText ?? card.insightTitle,
      attribute: card.clinicalCategoryLabel,
    });
    const categoryId =
      normalized?.categoryId ??
      commercialClinicalCategoryFromSignal(
        card.clinicalDisplayValue.toLowerCase().includes("volume") ||
          card.clinicalDisplayValue.toLowerCase().includes("adoption")
          ? "increasing_procedure_volume"
          : "procedure_focus",
      );
    const procedureFocus =
      categoryId === "procedure_focus"
        ? enrichClinicalProcedureFocusWithModality(
            normalized?.procedureFocus ?? card.clinicalProcedureFocus ?? card.clinicalDisplayValue,
            card.evidenceQuotes[0] ?? card.clinicalSourceText ?? card.insightTitle,
          )
        : (normalized?.procedureFocus ?? card.clinicalProcedureFocus ?? card.clinicalDisplayValue);
    if (!normalized && isGenericClinicalFactText(procedureFocus)) return null;
    const displayValue = normalized?.displayValue ?? card.clinicalDisplayValue;
    const presentation = {
      categoryId,
      categoryLabel: card.clinicalCategoryLabel ?? normalized?.categoryLabel,
      displayValue: categoryId === "procedure_focus" ? procedureFocus : displayValue,
      procedureFocus,
    };
    return {
      kind: "clinical_insight",
      id: card.id,
      cardId: card.id,
      primaryLine:
        categoryId === "procedure_focus"
          ? procedureFocus
          : clinicalBriefPrimaryLine(presentation),
      categoryLabel: card.clinicalCategoryLabel ?? normalized?.categoryLabel ?? "Clinical Trend",
      categoryId,
      displayValue: card.clinicalDisplayValue,
      procedureFocus,
      sourceText: card.clinicalSourceText ?? card.evidenceQuotes[0] ?? null,
      evidenceQuotes: card.evidenceQuotes,
      linkedFieldUpdateIds: card.linkedFieldUpdateIds,
      confirmActionType: "add_clinical_focus",
      dismissActionType: "ignore",
    };
  }

  const normalized = normalizeClinicalIntelligenceFromFact({
    value: card.insightTitle,
    evidence: card.evidenceQuotes[0] ?? card.insightTitle,
  });
  if (normalized) {
    const evidence = normalized.sourceText ?? card.evidenceQuotes[0] ?? card.insightTitle;
    const procedureFocus =
      normalized.categoryId === "procedure_focus"
        ? enrichClinicalProcedureFocusWithModality(normalized.procedureFocus, evidence)
        : normalized.procedureFocus;
    const primaryLine =
      normalized.categoryId === "procedure_focus" && procedureFocus
        ? procedureFocus
        : clinicalBriefPrimaryLine(normalized);
    return {
      kind: "clinical_insight",
      id: card.id,
      cardId: card.id,
      primaryLine,
      categoryLabel: normalized.categoryLabel,
      categoryId: normalized.categoryId,
      displayValue: normalized.displayValue,
      procedureFocus,
      sourceText: normalized.sourceText,
      evidenceQuotes: card.evidenceQuotes,
      linkedFieldUpdateIds: card.linkedFieldUpdateIds,
      confirmActionType: "add_clinical_focus",
      dismissActionType: "ignore",
    };
  }

  const procedureFocus = enrichClinicalProcedureFocusWithModality(
    displayClinicalInsight(card.insightTitle),
    card.evidenceQuotes[0] ?? card.insightTitle,
  );
  if (isGenericClinicalFactText(procedureFocus)) return null;
  const signal = card.fields.find((field) => field.label === "Signal")?.value;
  const primaryLine = signal ? formatClinicalStorageValue(procedureFocus, signal) : procedureFocus;
  return {
    kind: "clinical_insight",
    id: card.id,
    cardId: card.id,
    primaryLine,
    categoryLabel: "Procedure Focus",
    categoryId: "procedure_focus",
    displayValue: procedureFocus,
    procedureFocus,
    sourceText: card.evidenceQuotes[0] ?? card.insightTitle,
    evidenceQuotes: card.evidenceQuotes,
    linkedFieldUpdateIds: card.linkedFieldUpdateIds,
    confirmActionType: "add_clinical_focus",
    dismissActionType: "ignore",
  };
}

function productFromCard(card: DebriefActionableReviewCard): IntelligenceBriefProductItem | null {
  if (!isProductIntelligenceReviewCard(card)) return null;
  return {
    kind: "product_intelligence",
    id: card.id,
    cardId: card.id,
    productName: card.productName,
    procedureContext: card.procedureContext,
    evidenceStatus: card.evidenceStatus,
    impactLine: card.impactLine,
    nextValidationStep: card.nextValidationStep,
    evidenceQuotes: card.evidenceQuotes,
    linkedFieldUpdateIds: card.linkedFieldUpdateIds,
    confirmActionType: "add_product_intelligence",
    dismissActionType: "ignore",
  };
}

function workflowInsightFromCard(
  card: DebriefActionableReviewCard,
): IntelligenceBriefWorkflowItem | null {
  if (!isOrganizationIntelligenceReviewCard(card)) return null;
  // Credentialing-flavored org cards already surface on the Observation
  // Access card — only non-credentialing facility/workflow findings here.
  if (/credential/i.test(card.topicTitle)) return null;
  return {
    kind: "workflow_insight",
    id: card.id,
    cardId: card.id,
    primaryLine: card.topicTitle,
    evidenceQuotes: card.evidenceQuotes,
    linkedFieldUpdateIds: card.linkedFieldUpdateIds,
    confirmActionType: "add_organization_intelligence",
    dismissActionType: "ignore",
  };
}

function workflowInsightKey(item: IntelligenceBriefWorkflowItem): string {
  const line = item.primaryLine.toLowerCase();
  if (/relationship momentum|provider sentiment|continued discussion|continued conversation/.test(line)) {
    return "relationship_momentum";
  }
  return line.replace(/[^a-z0-9]+/g, " ").trim();
}

function dedupeWorkflowInsights(items: IntelligenceBriefWorkflowItem[]): IntelligenceBriefWorkflowItem[] {
  const refined = items.map((item) => ({
    ...item,
    primaryLine: refineWorkflowPrimaryLine(
      item.primaryLine,
      item.evidenceQuotes[0] ?? item.primaryLine,
    ),
  }));

  const schedulingItems = refined.filter((item) => isSchedulingPreferenceWorkflowLine(item.primaryLine));
  const otherItems = refined.filter((item) => !isSchedulingPreferenceWorkflowLine(item.primaryLine));
  const mergedSchedulingLine = mergeSchedulingPreferenceLines(
    schedulingItems.map((item) => item.primaryLine),
  );

  const byKey = new Map<string, IntelligenceBriefWorkflowItem>();
  for (const item of otherItems) {
    const key = workflowInsightKey(item);
    const existing = byKey.get(key);
    if (!existing || item.primaryLine.length < existing.primaryLine.length) {
      byKey.set(key, item);
    }
  }

  if (mergedSchedulingLine && schedulingItems.length > 0) {
    byKey.set("scheduling_preference", {
      ...schedulingItems[0]!,
      primaryLine: mergedSchedulingLine,
    });
  }

  return [...byKey.values()];
}

function isSchedulingPreferenceWorkflowLine(line: string): boolean {
  return /^workflow priority:/i.test(line.trim());
}

function followUpFromCard(card: DebriefActionableReviewCard): IntelligenceBriefFollowUpItem | null {
  if (!isFollowUpTaskReviewCard(card)) return null;
  const primaryLine = displayFollowUpAction(card.taskTitle);
  return {
    kind: "follow_up",
    id: card.id,
    cardId: card.id,
    primaryLine,
    followUpReason: card.followUpReason,
    priority: inferFollowUpPriority(primaryLine, card.followUpReason),
    evidenceQuotes: card.evidenceQuotes,
    linkedFieldUpdateIds: card.linkedFieldUpdateIds,
    confirmActionType: "create_follow_up",
    dismissActionType: "ignore",
  };
}

export function buildDebriefIntelligenceBrief(input: {
  cards: DebriefActionableReviewCard[];
  decisions?: DebriefReviewDecision[];
}): DebriefIntelligenceBrief {
  const contacts: IntelligenceBriefContactItem[] = [];
  let observationAccess: IntelligenceBriefObservationItem | null = null;
  const clinicalInsights: IntelligenceBriefClinicalItem[] = [];
  const productIntelligence: IntelligenceBriefProductItem[] = [];
  const workflowInsights: IntelligenceBriefWorkflowItem[] = [];
  const followUpActions: IntelligenceBriefFollowUpItem[] = [];

  for (const card of input.cards) {
    const contact = contactFromCard(card);
    if (contact) {
      contacts.push(contact);
      continue;
    }

    const observation = observationFromCard(card);
    if (observation) {
      if (!observationAccess || isObservationAccessReviewCard(card)) {
        observationAccess = observation;
      }
      continue;
    }

    const clinical = clinicalFromCard(card);
    if (clinical) {
      clinicalInsights.push(clinical);
      continue;
    }

    const product = productFromCard(card);
    if (product) {
      productIntelligence.push(product);
      continue;
    }

    const workflow = workflowInsightFromCard(card);
    if (workflow) {
      workflowInsights.push(workflow);
      continue;
    }

    const followUp = followUpFromCard(card);
    if (followUp) {
      followUpActions.push(followUp);
    }
  }

  return {
    contacts,
    observationAccess,
    clinicalInsights,
    productIntelligence,
    workflowInsights: dedupeWorkflowInsights(workflowInsights),
    followUpActions,
  };
}

/**
 * Cross-section dedup — a follow-up row is suppressed when the same work is
 * already represented by a confirmed intelligence outcome:
 * - "Get {name}'s contact info" duplicates the contact row (its Add Details
 *   action is the same work).
 * - "Confirm credentialing pathway/platform" duplicates the Observation
 *   Access card when its requirements chip already says credentialing is
 *   required.
 * - "Confirm who controls scheduling" duplicates a scheduling-role contact.
 */
export function followUpImpliedByConfirmedIntelligence(
  followUp: Pick<IntelligenceBriefFollowUpItem, "primaryLine" | "followUpReason">,
  outcomes: IntelligenceBriefOutcome[],
): boolean {
  const line = `${followUp.primaryLine} ${followUp.followUpReason ?? ""}`.toLowerCase();
  const contactOutcomes = outcomes.filter((o) => o.kind === "contact");
  const compoundNextStep =
    /;/.test(line) ||
    (/\bconnect\b/.test(line) && /\b(?:observation process|relationship|credentialing pathway)\b/.test(line));

  if (/contact (?:info|information|details)|phone|email/.test(line)) {
    for (const contact of contactOutcomes) {
      const firstName = (contact.primaryLine ?? contact.summaryLine)
        .trim()
        .split(/\s+/)[0]
        ?.toLowerCase();
      if (firstName && firstName.length >= 3 && line.includes(firstName)) return true;
    }
  }

  const observation = outcomes.find((o) => o.kind === "observation_access");
  if (
    observation &&
    /credential|platform/.test(line) &&
    (/credential/i.test(observation.observationFields?.requirements ?? "") ||
      /credential/i.test(observation.summaryLine ?? ""))
  ) {
    return true;
  }

  if (
    /schedul/.test(line) &&
    /confirm|who|control|identify/.test(line) &&
    contactOutcomes.some((c) => /schedul/i.test(c.subtitle ?? ""))
  ) {
    return true;
  }

  if (contactOutcomes.length > 0) {
    if (
      !compoundNextStep &&
      /office staff|his office|her office|their office|the office/.test(line) &&
      /connect|reach out|follow up|coordinate|work through|learn more/.test(line) &&
      contactOutcomes.some((c) => /schedul|coordinat/i.test(`${c.subtitle ?? ""} ${c.primaryLine ?? ""}`))
    ) {
      return true;
    }

    for (const contact of contactOutcomes) {
      const personLine = `${contact.primaryLine ?? ""} ${contact.summaryLine ?? ""}`.toLowerCase();
      const tokens = personLine.split(/\s+/).filter((token) => token.length >= 3);
      if (!tokens.some((token) => line.includes(token))) continue;
      if (!compoundNextStep && /connect|reach|follow|identify|contact|schedul|coordinate|office staff/.test(line)) {
        return true;
      }
    }
  }

  return false;
}

function dedupeFollowUpBriefActions(
  actions: IntelligenceBriefFollowUpItem[],
): IntelligenceBriefFollowUpItem[] {
  const sorted = [...actions].sort((a, b) => b.primaryLine.length - a.primaryLine.length);
  const kept: IntelligenceBriefFollowUpItem[] = [];
  const seenKeys = new Set<string>();

  for (const action of sorted) {
    const key = followUpMergeKey(action.primaryLine);
    if (seenKeys.has(key)) continue;

    const actionNorm = action.primaryLine.toLowerCase().replace(/\.$/, "");
    const subsumed = kept.some((existing) => {
      const existingNorm = existing.primaryLine.toLowerCase().replace(/\.$/, "");
      return existingNorm.includes(actionNorm) && existingNorm.length > actionNorm.length + 8;
    });
    if (subsumed) continue;

    for (let index = kept.length - 1; index >= 0; index -= 1) {
      const keptNorm = kept[index]!.primaryLine.toLowerCase().replace(/\.$/, "");
      if (actionNorm.includes(keptNorm) && actionNorm.length > keptNorm.length + 8) {
        seenKeys.delete(followUpMergeKey(kept[index]!.primaryLine));
        kept.splice(index, 1);
      }
    }

    seenKeys.add(key);
    kept.push(action);
  }

  return kept;
}

const INTERNAL_EVIDENCE_LABEL_RE =
  /^(?:commercial disposition:|relationship:|workflow priority:|observation access interest)/i;

function coalesceEvidenceQuotes(
  quotes: readonly string[],
  ...fallbacks: Array<string | null | undefined>
): string[] {
  const existing = quotes.map((quote) => quote.trim()).filter(Boolean);
  if (existing.length > 0) return existing;

  for (const fallback of fallbacks) {
    const text = fallback?.trim();
    if (!text || text.length < 16) continue;
    if (INTERNAL_EVIDENCE_LABEL_RE.test(text)) continue;
    const formatted = formatReviewEvidenceQuote(text);
    if (formatted) return [formatted];
  }

  return [];
}

export function buildIntelligenceBriefOutcomes(
  brief: DebriefIntelligenceBrief,
  options?: NormalizeIntelligenceBriefOptions,
): IntelligenceBriefOutcome[] {
  const normalizedBrief = options
    ? normalizeDebriefIntelligenceBriefForReview(brief, options)
    : brief;
  const outcomes: IntelligenceBriefOutcome[] = [];

  for (const contact of normalizedBrief.contacts) {
    const summaryLine = contactSummaryLine(contact.primaryLine, contact.subtitle);
    outcomes.push({
      id: contact.id,
      kind: "contact",
      cardIds: [contact.cardId],
      summaryLine,
      primaryLine: contact.primaryLine,
      subtitle: contact.subtitle,
      statusLine: INTELLIGENCE_BRIEF_CONTACT_STATUS,
      bullets: [],
      evidenceQuotes: coalesceEvidenceQuotes(contact.evidenceQuotes, contact.subtitle, contact.primaryLine),
      linkedFieldUpdateIds: contact.linkedFieldUpdateIds,
      contactId: contact.contactId,
    });
  }

  if (normalizedBrief.observationAccess) {
    outcomes.push({
      id: normalizedBrief.observationAccess.id,
      kind: "observation_access",
      cardIds: [normalizedBrief.observationAccess.cardId],
      summaryLine: INTELLIGENCE_BRIEF_OBSERVATION_SUMMARY,
      observationFields: normalizedBrief.observationAccess.observationFields,
      bullets: normalizedBrief.observationAccess.bullets,
      evidenceQuotes: coalesceEvidenceQuotes(
        normalizedBrief.observationAccess.evidenceQuotes,
        options?.sourceText,
      ),
      linkedFieldUpdateIds: normalizedBrief.observationAccess.linkedFieldUpdateIds,
    });
  }

  for (const clinical of normalizedBrief.clinicalInsights) {
    const primaryLine = refineClinicalPrimaryLine(clinical.primaryLine, clinical.sourceText ?? clinical.evidenceQuotes[0] ?? "");
    outcomes.push({
      id: clinical.id,
      kind: "clinical_insight",
      cardIds: [clinical.cardId],
      summaryLine: primaryLine,
      primaryLine,
      subtitle: clinical.categoryLabel,
      bullets: [clinical.categoryLabel, clinical.displayValue],
      evidenceQuotes: coalesceEvidenceQuotes(
        clinical.evidenceQuotes,
        clinical.sourceText,
        clinical.displayValue,
      ),
      linkedFieldUpdateIds: clinical.linkedFieldUpdateIds,
    });
  }

  for (const product of normalizedBrief.productIntelligence) {
    const isUsage =
      /^Competitor product:/i.test(product.impactLine) ||
      /^Current product:/i.test(product.impactLine) ||
      product.evidenceStatus === INTELLIGENCE_BRIEF_PRODUCT_STATUS.validated ||
      product.evidenceStatus === INTELLIGENCE_BRIEF_PRODUCT_STATUS.needsConfirmation;
    const isInterest =
      !isUsage &&
      (/^Product interest:/i.test(product.impactLine) ||
        /comparison|clinical[- ]data|published outcomes|evidence request/i.test(
          `${product.productName} ${product.impactLine}`,
        ));
    outcomes.push({
      id: product.id,
      kind: "product_intelligence",
      cardIds: [product.cardId],
      summaryLine: isInterest
        ? formatProductInterestHeadline(
            /^Product interest:/i.test(product.impactLine)
              ? product.impactLine
              : `Product interest: ${product.productName}`,
            product.evidenceQuotes[0],
          )
        : `Current product identified: ${product.productName}`,
      primaryLine: product.productName,
      statusLine: product.evidenceStatus,
      bullets: [product.evidenceStatus, product.impactLine],
      evidenceQuotes: coalesceEvidenceQuotes(
        product.evidenceQuotes,
        product.impactLine,
        product.productName,
      ),
      linkedFieldUpdateIds: product.linkedFieldUpdateIds,
      productName: product.productName,
      productProcedureContext: product.procedureContext,
      productEvidenceStatus: product.evidenceStatus,
      productImpactLine: product.impactLine,
      productNextValidationStep: product.nextValidationStep,
    });
  }

  for (const workflow of normalizedBrief.workflowInsights) {
    const primaryLine = refineWorkflowPrimaryLine(
      workflow.primaryLine,
      workflow.evidenceQuotes[0] ?? workflow.primaryLine,
    );
    outcomes.push({
      id: workflow.id,
      kind: "workflow_insight",
      cardIds: [workflow.cardId],
      summaryLine: primaryLine,
      primaryLine,
      bullets: [primaryLine],
      evidenceQuotes: coalesceEvidenceQuotes(workflow.evidenceQuotes, workflow.primaryLine),
      linkedFieldUpdateIds: workflow.linkedFieldUpdateIds,
    });
  }

  const followUpActions = dedupeFollowUpBriefActions(
    normalizedBrief.followUpActions.filter(
      (followUp) => !followUpImpliedByConfirmedIntelligence(followUp, outcomes),
    ),
  );
  for (const followUp of followUpActions) {
    outcomes.push({
      id: followUp.id,
      kind: "follow_up",
      cardIds: [followUp.cardId],
      summaryLine: followUp.primaryLine,
      primaryLine: followUp.primaryLine,
      priority: followUp.priority,
      followUpReason: followUp.followUpReason,
      bullets: [followUp.primaryLine],
      evidenceQuotes: coalesceEvidenceQuotes(followUp.evidenceQuotes, followUp.primaryLine),
      linkedFieldUpdateIds: followUp.linkedFieldUpdateIds,
    });
  }

  const withImpact = attachPathwayImpactToOutcomes(outcomes);
  return options ? normalizeIntelligenceBriefOutcomes(withImpact, options) : withImpact;
}

export { pathwayImpactForBriefOutcome };

export function intelligenceBriefItemCount(brief: DebriefIntelligenceBrief): number {
  return buildIntelligenceBriefOutcomes(brief).length;
}

export function intelligenceBriefSelectedCount(
  brief: DebriefIntelligenceBrief,
  selectedOutcomeIds: ReadonlySet<string>,
): number {
  return buildIntelligenceBriefOutcomes(brief).filter((outcome) =>
    selectedOutcomeIds.has(outcome.id),
  ).length;
}

export function cardForBriefItem(
  brief: DebriefIntelligenceBrief,
  itemId: string,
  cards: DebriefActionableReviewCard[],
): DebriefActionableReviewCard | undefined {
  return cards.find((c) => c.id === itemId);
}

export type ClinicalInsightOutcomeGroup = {
  groupId: CommercialClinicalCategoryId;
  groupLabel: string;
  outcomes: IntelligenceBriefOutcome[];
};

export function groupClinicalInsightOutcomes(
  outcomes: IntelligenceBriefOutcome[],
): ClinicalInsightOutcomeGroup[] {
  const byGroup = new Map<CommercialClinicalCategoryId, IntelligenceBriefOutcome[]>();

  for (const outcome of outcomes) {
    if (outcome.kind !== "clinical_insight") continue;
    const groupId = clinicalInsightGroupIdFromOutcome(outcome);
    const list = byGroup.get(groupId) ?? [];
    list.push(outcome);
    byGroup.set(groupId, list);
  }

  return CLINICAL_INSIGHT_GROUP_ORDER.filter((groupId) => byGroup.has(groupId)).map((groupId) => ({
    groupId,
    groupLabel: CLINICAL_INSIGHT_GROUP_LABEL[groupId],
    outcomes: dedupeClinicalOutcomesInGroup(byGroup.get(groupId)!),
  }));
}

function dedupeClinicalOutcomesInGroup(
  outcomes: IntelligenceBriefOutcome[],
): IntelligenceBriefOutcome[] {
  const byLine = new Map<string, IntelligenceBriefOutcome>();

  for (const outcome of outcomes) {
    const line = (outcome.primaryLine ?? outcome.summaryLine).trim().toLowerCase();
    const category = (outcome.subtitle ?? "").trim().toLowerCase();
    const key = category ? `${category}:${line}` : line;
    const existing = byLine.get(key);
    if (!existing) {
      byLine.set(key, outcome);
      continue;
    }
    byLine.set(key, {
      ...existing,
      cardIds: [...new Set([...existing.cardIds, ...outcome.cardIds])],
      evidenceQuotes: [...new Set([...existing.evidenceQuotes, ...outcome.evidenceQuotes])],
      linkedFieldUpdateIds: [
        ...new Set([...existing.linkedFieldUpdateIds, ...outcome.linkedFieldUpdateIds]),
      ],
    });
  }

  return [...byLine.values()];
}

export function followUpOutcomesByPriority(
  outcomes: IntelligenceBriefOutcome[],
): Record<FollowUpPriority, IntelligenceBriefOutcome[]> {
  const followUps = outcomes.filter((o) => o.kind === "follow_up");
  return {
    high: followUps.filter((o) => o.priority === "high"),
    medium: followUps.filter((o) => o.priority === "medium"),
    low: followUps.filter((o) => o.priority === "low"),
  };
}

/**
 * Flat follow-up list — urgency drives order, not rep-visible priority chips.
 */
export function orderedFollowUpOutcomes(
  outcomes: IntelligenceBriefOutcome[],
): IntelligenceBriefOutcome[] {
  const grouped = followUpOutcomesByPriority(outcomes);
  return [...grouped.high, ...grouped.medium, ...grouped.low];
}

/**
 * Flat clinical list — deduped via grouping, but rendered without extraction
 * sub-category headings ("Procedure Focus", "Clinical Frustrations", …).
 */
export function flattenedClinicalOutcomes(
  outcomes: IntelligenceBriefOutcome[],
): IntelligenceBriefOutcome[] {
  return groupClinicalInsightOutcomes(outcomes).flatMap((group) => group.outcomes);
}
