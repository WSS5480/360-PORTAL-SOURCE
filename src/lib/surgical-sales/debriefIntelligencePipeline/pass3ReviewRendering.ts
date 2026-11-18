/**
 * PASS 3 — Deterministic UI rendering from classified entities + rules (templates only).
 */

import { buildConcreteDebriefNextSteps } from "@/lib/surgical-sales/buildConcreteDebriefNextSteps";
import { debriefExplicitProductFitConnection } from "@/lib/surgical-sales/debriefIntelligenceCategories";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import { workflowParticipantPossibleRole } from "@/lib/surgical-sales/debriefDetectedContact";
import {
  buildPreservedNamedEntity,
  extractPreservedNamedEntities,
} from "@/lib/surgical-sales/namedEntityPreservation";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import {
  ACTION_TITLES,
  briefingAccessSummaryLines,
  briefingCredentialingLine,
  formatClinicalFocusCardLearned,
  INTELLIGENCE_CARD_TITLES,
  learnedLineForCredentialing,
  learnedLineForObservationAccess,
  learnedLineForWorkflowOwnership,
  whatWillUpdateForKind,
  workflowContactBody,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewTemplates";
import {
  classifyCapturedItemMaturity,
  extractedIntelligenceMaturityLabel,
} from "@/lib/surgical-sales/extractedIntelligenceClassification";
import { sanitizePipelineSalesCopy } from "@/lib/surgical-sales/debriefIntelligencePipeline/salesCopy";
import type {
  DebriefClassifiedFact,
  DebriefIntelligenceCapturedItem,
  DebriefPass4Synthesis,
  DebriefRecommendedAction,
  DebriefRulesOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/types";

const MAX_INTELLIGENCE_ITEMS = 5;
const MAX_ACTIONS = 5;

function cardConfidence(facts: DebriefClassifiedFact[]): "High" | "Medium" | "Low" {
  if (facts.some((f) => f.confidence === "High")) return "High";
  if (facts.every((f) => f.confidence === "Low")) return "Low";
  return "Medium";
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const cleaned = sanitizePipelineSalesCopy(line, 320);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

function pushIntelligenceItem(
  items: DebriefIntelligenceCapturedItem[],
  draft: Omit<DebriefIntelligenceCapturedItem, "intelligenceMaturity" | "intelligenceMaturityLabel">,
  context: { observationApprovedExplicit?: boolean; credentialingPlatformConfirmed?: boolean },
): void {
  const intelligenceMaturity = classifyCapturedItemMaturity(draft, context);
  items.push({
    ...draft,
    intelligenceMaturity,
    intelligenceMaturityLabel: extractedIntelligenceMaturityLabel(intelligenceMaturity),
  });
}

function buildIntelligenceCaptured(input: {
  acceptedFacts: DebriefClassifiedFact[];
  rules: DebriefRulesOutcome;
}): DebriefIntelligenceCapturedItem[] {
  const items: DebriefIntelligenceCapturedItem[] = [];
  const { acceptedFacts, rules } = input;
  const maturityContext = {
    observationApprovedExplicit: rules.observationApprovedExplicit,
    credentialingPlatformConfirmed: rules.credentialingPlatformConfirmed,
  };

  const obsFacts = acceptedFacts.filter((f) => f.classification === "observation_access");
  const obsEvidence = [...new Set(obsFacts.map((f) => f.evidence_quote.trim()).filter(Boolean))].slice(0, 4);
  if (
    obsEvidence.length > 0 ||
    rules.observationApprovedExplicit ||
    rules.observationInterestOnly
  ) {
    pushIntelligenceItem(
      items,
      {
        id: "intel-observation-access",
        kind: "observation_access_status",
        title: INTELLIGENCE_CARD_TITLES.observation_access_status,
        learned: sanitizePipelineSalesCopy(learnedLineForObservationAccess(rules), 320),
        evidenceQuotes: obsEvidence,
        confidence: cardConfidence(obsFacts),
        whatWillUpdate: whatWillUpdateForKind("observation_access_status"),
        intelligenceCategory: "access_intelligence",
        linkedFactIds: obsFacts.map((f) => f.id),
        fieldUpdateIds: [],
      },
      maturityContext,
    );
  }

  const credFacts = acceptedFacts.filter((f) => f.classification === "credentialing");
  const credEvidence = [...new Set(credFacts.map((f) => f.evidence_quote.trim()).filter(Boolean))].slice(0, 4);
  if (credEvidence.length > 0 || rules.credentialingPlatformLabel === "Unknown") {
    pushIntelligenceItem(
      items,
      {
        id: "intel-credentialing",
        kind: "credentialing_requirement",
        title: INTELLIGENCE_CARD_TITLES.credentialing_requirement,
        learned: sanitizePipelineSalesCopy(learnedLineForCredentialing(rules, credFacts), 320),
        evidenceQuotes: credEvidence,
        confidence: cardConfidence(credFacts),
        whatWillUpdate: whatWillUpdateForKind("credentialing_requirement"),
        intelligenceCategory: "access_intelligence",
        linkedFactIds: credFacts.map((f) => f.id),
        fieldUpdateIds: [],
        platformId: rules.credentialingPlatformLabel === "Unknown" ? "platform-unknown" : undefined,
      },
      maturityContext,
    );
  }

  const schedFacts = acceptedFacts.filter((f) => f.classification === "scheduling");
  const ownershipLearned = learnedLineForWorkflowOwnership(schedFacts);
  const schedEvidence = [...new Set(schedFacts.map((f) => f.evidence_quote.trim()).filter(Boolean))].slice(0, 4);
  if (ownershipLearned && schedEvidence.length > 0) {
    pushIntelligenceItem(
      items,
      {
        id: "intel-workflow-ownership",
        kind: "workflow_ownership",
        title: INTELLIGENCE_CARD_TITLES.workflow_ownership,
        learned: sanitizePipelineSalesCopy(ownershipLearned, 320),
        evidenceQuotes: schedEvidence,
        confidence: cardConfidence(schedFacts),
        whatWillUpdate: whatWillUpdateForKind("workflow_ownership"),
        intelligenceCategory: "access_intelligence",
        linkedFactIds: schedFacts.map((f) => f.id),
        fieldUpdateIds: [],
      },
      maturityContext,
    );
  }

  const clinicalFacts = acceptedFacts.filter((f) => f.classification === "clinical_focus");
  const clinicalLearned = formatClinicalFocusCardLearned(clinicalFacts);
  const clinicalEvidence = [...new Set(clinicalFacts.map((f) => f.evidence_quote.trim()).filter(Boolean))].slice(
    0,
    4,
  );
  if (clinicalLearned && clinicalEvidence.length > 0) {
    pushIntelligenceItem(
      items,
      {
        id: "intel-clinical-focus",
        kind: "clinical_focus",
        title: INTELLIGENCE_CARD_TITLES.clinical_focus,
        learned: clinicalLearned,
        evidenceQuotes: clinicalEvidence,
        confidence: cardConfidence(clinicalFacts),
        whatWillUpdate: whatWillUpdateForKind("clinical_focus"),
        intelligenceCategory: "clinical_focus",
        linkedFactIds: clinicalFacts.map((f) => f.id),
        fieldUpdateIds: [],
      },
      maturityContext,
    );
  }

  const productFacts = acceptedFacts.filter((f) => f.classification === "current_product");
  if (productFacts.length > 0) {
    const productNames = [
      ...new Set(
        productFacts
          .map((f) => String(f.attributes?.productName ?? f.subject ?? "").trim())
          .filter(Boolean),
      ),
    ];
    const productEvidence = [...new Set(productFacts.map((f) => f.evidence_quote.trim()).filter(Boolean))];
    if (productNames.length > 0) {
      pushIntelligenceItem(
        items,
        {
          id: "intel-current-product",
          kind: "current_product_use",
          title: INTELLIGENCE_CARD_TITLES.current_product_use,
          learned: productNames.map((name) => `Current product identified: ${name}`).join("\n"),
          evidenceQuotes: productEvidence,
          confidence: cardConfidence(productFacts),
          whatWillUpdate: whatWillUpdateForKind("current_product_use"),
          intelligenceCategory: "competitive_intelligence",
          linkedFactIds: productFacts.map((f) => f.id),
          fieldUpdateIds: [],
        },
        maturityContext,
      );
    }
  }

  const productFitFacts = acceptedFacts.filter((f) => f.classification === "product_fit");
  const explicit = productFitFacts.filter((f) => debriefExplicitProductFitConnection(f.evidence_quote));
  const source = explicit.length > 0 ? explicit : productFitFacts;
  if (source.length > 0) {
    const productLearned = formatClinicalFocusCardLearned(source);
    const productEvidence = [...new Set(source.map((f) => f.evidence_quote.trim()).filter(Boolean))];
    if (productLearned && productEvidence.length > 0) {
      pushIntelligenceItem(
        items,
        {
          id: "intel-product-relevance",
          kind: "product_relevance",
          title:
            explicit.length > 0
              ? INTELLIGENCE_CARD_TITLES.product_relevance
              : "Possible product relevance",
          learned: productLearned,
          evidenceQuotes: productEvidence,
          confidence: cardConfidence(source),
          whatWillUpdate: whatWillUpdateForKind("product_relevance"),
          intelligenceCategory: "product_fit_signals",
          linkedFactIds: source.map((f) => f.id),
          fieldUpdateIds: [],
        },
        maturityContext,
      );
    }
  }

  return items.slice(0, MAX_INTELLIGENCE_ITEMS);
}

function contactInfoStatus(contact: DebriefProposedContactItem): "On file" | "Missing" | "Partial" {
  const hasEmail = Boolean(contact.email.trim());
  const hasPhone = Boolean(contact.phone.trim());
  if (hasEmail && hasPhone) return "On file";
  if (hasEmail || hasPhone) return "Partial";
  return "Missing";
}

function buildWorkflowContactActions(
  proposedContacts: DebriefProposedContactItem[],
  dictation: string,
): DebriefRecommendedAction[] {
  const actions: DebriefRecommendedAction[] = [];
  const seenNames = new Set<string>();

  const pushContact = (input: {
    id: string;
    displayName: string;
    evidenceQuote: string | null;
    possibleRole: string | null;
    contactInfoStatus: "On file" | "Missing" | "Partial";
    confidence: "High" | "Medium" | "Low";
    contactId?: string;
  }) => {
    const key = input.displayName.toLowerCase();
    if (seenNames.has(key)) return;
    seenNames.add(key);
    actions.push({
      id: input.id,
      kind: "create_workflow_contact",
      title: ACTION_TITLES.createWorkflowContact(input.displayName),
      body: workflowContactBody({
        displayName: input.displayName,
        possibleRole: input.possibleRole,
      }),
      confidence: input.confidence,
      evidenceQuote: input.evidenceQuote,
      contactId: input.contactId,
      participantName: input.displayName,
      possibleRole: input.possibleRole,
      contactInfoStatus: input.contactInfoStatus,
      fieldUpdateIds: [],
    });
  };

  for (const contact of proposedContacts) {
    if (contact.disposition === "skipped") continue;
    const missingDetails = contact.contactDetailsMissing;
    const isWorkflow =
      contact.mentionLevel === "workflow_participant" ||
      (contact.mentionLevel === "potential_support_contact" && missingDetails);
    if (!isWorkflow || !missingDetails) continue;
    if (contact.disposition === "link" && contact.linkedContactId) continue;
    if (contact.disposition === "add_details" && (contact.email.trim() || contact.phone.trim())) {
      continue;
    }
    const role =
      workflowParticipantPossibleRole(contact) ??
      buildPreservedNamedEntity(contact.displayName, contact.sourceQuote ?? dictation).possibleRole;
    pushContact({
      id: `action-contact-${contact.id}`,
      displayName: contact.displayName,
      evidenceQuote: contact.sourceQuote,
      possibleRole: role,
      contactInfoStatus: contactInfoStatus(contact),
      confidence: contact.mentionLevel === "confirmed_support_contact" ? "High" : "Medium",
      contactId: contact.id,
    });
  }

  for (const entity of extractPreservedNamedEntities(dictation)) {
    const key = entity.name.toLowerCase();
    if (seenNames.has(key)) continue;
    const hasContactRow = proposedContacts.some(
      (c) => c.displayName.toLowerCase() === key && !c.contactDetailsMissing,
    );
    if (hasContactRow) continue;
    const sentence = dictation
      .split(/(?<=[.!?])\s+/)
      .find((part) => new RegExp(`\\b${entity.name}\\b`, "i").test(part));
    pushContact({
      id: `action-contact-mention-${key.replace(/\s+/g, "-")}`,
      displayName: entity.name,
      evidenceQuote: sentence?.trim().slice(0, 280) ?? null,
      possibleRole: entity.possibleRole,
      contactInfoStatus: "Missing",
      confidence: entity.nameConfidence,
    });
  }

  return actions;
}

function buildRecommendedActions(input: {
  dictation: string;
  acceptedFacts: DebriefClassifiedFact[];
  rules: DebriefRulesOutcome;
  proposedContacts: DebriefProposedContactItem[];
  nextActionLines: string[];
}): DebriefRecommendedAction[] {
  const actions: DebriefRecommendedAction[] = [];
  actions.push(...buildWorkflowContactActions(input.proposedContacts, input.dictation));

  if (input.rules.observationApprovedExplicit) {
    actions.push({
      id: "action-observation-approved",
      kind: "update_observation_status",
      title: ACTION_TITLES.updateObservationStatus,
      body: "Observation was explicitly approved in this debrief.",
      confidence: "High",
      evidenceQuote:
        input.dictation.match(/[^.!?]*\b(?:approved|cleared|permission)\b[^.!?]*[.!?]?/i)?.[0] ?? null,
      actionLabel: "Mark observation access as approved",
      fieldUpdateIds: [],
    });
  } else if (input.rules.engagementOutcomeId === "observation_denied") {
    actions.push({
      id: "action-observation-denied",
      kind: "update_observation_status",
      title: ACTION_TITLES.updateObservationStatus,
      body: "Observation access was denied or blocked in this debrief.",
      confidence: "High",
      evidenceQuote:
        input.dictation.match(/[^.!?]*\b(?:denied|not allow|won't allow)\b[^.!?]*[.!?]?/i)?.[0] ?? null,
      actionLabel: "Mark observation access as denied",
      fieldUpdateIds: [],
    });
  } else if (input.rules.observationInterestOnly) {
    actions.push({
      id: "action-observation-discussed",
      kind: "update_observation_status",
      title: ACTION_TITLES.updateObservationStatus,
      body: "Observation was discussed but not explicitly approved.",
      confidence: "Medium",
      evidenceQuote: null,
      actionLabel: "Mark observation as discussed (follow-up needed)",
      fieldUpdateIds: [],
    });
  }

  const seenFollowUp = new Set<string>();
  for (const line of input.nextActionLines) {
    const key = line.toLowerCase();
    if (seenFollowUp.has(key)) continue;
    seenFollowUp.add(key);
    actions.push({
      id: `action-followup-${actions.length}`,
      kind: "follow_up_task",
      title: ACTION_TITLES.followUpTask,
      body: sanitizePipelineSalesCopy(line, 200),
      confidence: "Medium",
      evidenceQuote: null,
      actionLabel: line,
      fieldUpdateIds: [],
    });
  }

  const priority = new Map<DebriefRecommendedAction["kind"], number>([
    ["create_workflow_contact", 0],
    ["update_observation_status", 1],
    ["schedule_engagement", 2],
    ["follow_up_task", 3],
  ]);

  return actions
    .sort((a, b) => (priority.get(a.kind) ?? 9) - (priority.get(b.kind) ?? 9))
    .slice(0, MAX_ACTIONS);
}

function buildSynthesis(input: {
  dictation: string;
  acceptedFacts: DebriefClassifiedFact[];
  rules: DebriefRulesOutcome;
  proposedContacts?: DebriefProposedContactItem[];
}): DebriefPass4Synthesis {
  const accessFacts = input.acceptedFacts.filter((f) =>
    ["observation_access", "credentialing", "scheduling"].includes(f.classification),
  );

  const accessSummaryLines = uniqueLines([
    ...briefingAccessSummaryLines(input.rules),
    ...(briefingCredentialingLine(input.rules) ? [briefingCredentialingLine(input.rules)!] : []),
    ...accessFacts
      .filter((f) => f.classification === "scheduling" && f.named_people[0])
      .map((f) => `${f.named_people[0]} identified in scheduling context.`),
  ]);

  const clinicalFocusLines = uniqueLines(
    formatClinicalFocusCardLearned(
      input.acceptedFacts.filter((f) => f.classification === "clinical_focus"),
    )
      .split("\n")
      .map((l) => l.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean),
  );

  const nextActionLines = buildConcreteDebriefNextSteps({
    dictation: input.dictation,
    rules: input.rules,
    acceptedFacts: input.acceptedFacts,
    proposedContacts: input.proposedContacts,
  });

  return {
    accessSummaryLines,
    clinicalFocusLines,
    relationshipNextStepLines: [],
    keyTakeawayLines: uniqueLines([...accessSummaryLines, ...clinicalFocusLines]),
    nextActionLines,
  };
}

export type DebriefPass3RenderResult = {
  synthesis: DebriefPass4Synthesis;
  intelligenceCaptured: DebriefIntelligenceCapturedItem[];
  recommendedActions: DebriefRecommendedAction[];
};

/** Pass 3 — render all review UI from classified facts (no new facts, no AI copy). */
export function runPass3ReviewRendering(input: {
  dictation: string;
  review?: import("@/lib/surgical-sales/logUpdateParseFreeform").LogUpdateParseResult | null;
  acceptedFacts: DebriefClassifiedFact[];
  rules: DebriefRulesOutcome;
  proposedContacts: DebriefProposedContactItem[];
}): DebriefPass3RenderResult {
  const synthesis = buildSynthesis(input);
  const intelligenceCaptured = buildIntelligenceCaptured({
    acceptedFacts: input.acceptedFacts,
    rules: input.rules,
  });
  const recommendedActions = buildRecommendedActions({
    dictation: input.dictation,
    acceptedFacts: input.acceptedFacts,
    rules: input.rules,
    proposedContacts: input.proposedContacts,
    nextActionLines: synthesis.nextActionLines,
  });

  return { synthesis, intelligenceCaptured, recommendedActions };
}
