/**

 * Map UF extraction facts → actionable review cards (Phase 1 UF-primary display).

 */



import {

  DEBRIEF_REVIEW_ADD_CLINICAL_INSIGHT,

  DEBRIEF_REVIEW_CREATE_FOLLOW_UP,

  DEBRIEF_REVIEW_SAVE_ACCESS_INTELLIGENCE,

  DEBRIEF_REVIEW_SAVE_INTELLIGENCE,

  DEBRIEF_WORKFLOW_PARTICIPANT_CREATE,

  DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE,

  DEBRIEF_WORKFLOW_PARTICIPANT_LINK,

} from "@/lib/surgical-sales/debriefApprovalUx";

import type { DebriefActionableReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";

import {

  normalizeClinicalFocusCard,

  normalizeContactCandidateCard,

  normalizeFollowUpTaskCard,

  normalizeObservationAccessCard,

  normalizeOrganizationIntelligenceCard,

  normalizeProductIntelligenceCard,

} from "@/lib/surgical-sales/debriefActionableReviewCardNormalize";

import { normalizeCardEvidenceQuotes } from "@/lib/surgical-sales/debriefReviewEvidencePipeline";

import { formatProductInterestHeadline } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductInterestDisplay";
import { normalizeNextActionDisplayTitle } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefNextActionDisplay";

import {

  clinicalOverlayFromFact,
  expandClinicalOverlaysFromFact,
  flattenDebriefUniversalFacts,

  productOverlayFromFact,

  workflowOverlayFromFact,

} from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToDebriefClinicalBrief";

import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

import type { UniversalSurgicalFactRow } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

import { clinicalReviewSemanticKey } from "@/lib/surgical-sales/debriefClinicalFactExtraction";

import { normalizeClinicalIntelligenceFromFact } from "@/lib/surgical-sales/debriefClinicalFactExtraction";

import { shouldSkipUniversalFactWorkflowCard } from "@/lib/surgical-sales/universalExtractor/reviewProposedValueFromFact";
import {
  knownProductMentionedInText,
  knownProductsMentionedInText,
  resolveKnownProduct,
} from "@/lib/surgical-sales/sharedIntelligence/productCatalog";
import {
  findProposedContactForPersonName,
  findProposedContactIdForPersonName,
  type DebriefProposedContactItem,
} from "@/lib/surgical-sales/debriefDetectedContact";
import {
  shouldExcludeContactForReview,
  type ReviewUpdateGuardContext,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateGuards";



const CLINICAL_CONCEPTS = new Set([

  "procedure_volume_trend",

  "procedure_focus",

  "technology_preference",

]);



const PRODUCT_CONCEPTS = new Set(["current_product", "competitor_product", "product_interest"]);



const WORKFLOW_ORG_CONCEPTS = new Set([

  "visualization_or_access_issue",

  "workflow_or_timing_issue",

  "placement_or_positioning_issue",

  "sizing_or_fit_issue",

  "inventory_availability_issue",

  "product_performance_issue",

  "training_or_familiarity_issue",

  "support_needed",

  "staff_workflow",

  "requested_item",

  "unavailable_item",

  "alternative_used",

  "credentialing_requirement",

  "provider_sentiment",

]);



function confidenceFromFact(fact: UniversalSurgicalFactRow): "High" | "Medium" | "Low" {

  if (fact.confidence === "high") return "High";

  if (fact.confidence === "low") return "Low";

  return "Medium";

}

function isGenericProductInterestName(name: string): boolean {
  return /\b(?:product interest|product feature interest|product setup|learning-curve question|product)\b/i.test(
    name.trim(),
  );
}

function productNameForInterestCard(
  overlayProductName: string,
  fact: UniversalSurgicalFactRow,
  dictation: string,
): string {
  const resolved = resolveKnownProduct(fact.product_mentioned ?? overlayProductName);
  if (resolved.known) return resolved.productName;
  if (!isGenericProductInterestName(overlayProductName)) return overlayProductName;

  const evidenceProduct = knownProductMentionedInText(fact.evidence_text ?? "");
  if (evidenceProduct) return evidenceProduct;

  // Do not attach a competitor/current product from elsewhere in the note to generic interest labels.
  if (/comparison|clinical[- ]data|published outcomes|evidence request/i.test(overlayProductName)) {
    return overlayProductName;
  }

  // Prefer a single clear catalog hit; if several are mentioned, keep the first as the interest label.
  const mentioned = knownProductsMentionedInText(dictation);
  return mentioned[0] ?? overlayProductName;
}



function cardFromClinicalOverlay(
  fact: UniversalSurgicalFactRow,
  overlay: NonNullable<ReturnType<typeof clinicalOverlayFromFact>>,
  dictation: string,
  cardIdSuffix = "",
): DebriefActionableReviewCard {
  const cardId = `uf:${fact.id}${cardIdSuffix}`;

  return normalizeClinicalFocusCard({
    id: cardId,
    category: "clinical_focus",
    headline: overlay.primaryLine,
    insightTitle: overlay.primaryLine,
    clinicalCategoryLabel: overlay.categoryLabel,
    clinicalDisplayValue: overlay.displayValue,
    clinicalProcedureFocus: overlay.procedureFocus,
    clinicalSourceText: overlay.sourceText ?? undefined,
    fields: [
      { label: "Category", value: overlay.categoryLabel },
      { label: "Intelligence", value: overlay.displayValue },
      { label: "Confidence", value: confidenceFromFact(fact) },
    ],
    evidenceQuotes: normalizeCardEvidenceQuotes(overlay.evidenceQuotes, {
      cardCategory: "clinical_focus",
      dictation,
      preserveProvidedQuotes: true,
    }),
    confidence: confidenceFromFact(fact),
    actions: [
      {
        id: `${cardId}-add`,
        type: "add_clinical_focus",
        label: DEBRIEF_REVIEW_ADD_CLINICAL_INSIGHT,
        primary: true,
      },
      { id: `${cardId}-ignore`, type: "ignore", label: DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE },
    ],
    linkedFieldUpdateIds: [],
    linkedIntelligenceIds: [],
  });
}

function cardsFromClinicalFact(fact: UniversalSurgicalFactRow, dictation: string): DebriefActionableReviewCard[] {
  const overlays = expandClinicalOverlaysFromFact(fact);
  return overlays.map((overlay, index) =>
    cardFromClinicalOverlay(fact, overlay, dictation, overlays.length > 1 ? `:${index}` : ""),
  );
}

function cardFromClinicalFact(fact: UniversalSurgicalFactRow, dictation: string): DebriefActionableReviewCard | null {
  const cards = cardsFromClinicalFact(fact, dictation);
  return cards[0] ?? null;
}



function productImpactLineForCard(
  fact: UniversalSurgicalFactRow,
  overlay: NonNullable<ReturnType<typeof productOverlayFromFact>>,
  productName: string,
): string {
  if (fact.concept === "current_product") {
    return `Current product: ${productName}`;
  }
  if (fact.concept === "competitor_product") {
    return `Competitor product: ${productName}`;
  }
  if (fact.concept === "product_interest") {
    const evidence = fact.evidence_text?.trim() || "";
    // Prefer a resolved catalog product over generic extractor jargon labels.
    if (productName && !isGenericProductInterestName(productName)) {
      return `Product interest: ${productName}`;
    }
    if (/^Product interest:/i.test(overlay.impactLine)) {
      return formatProductInterestHeadline(overlay.impactLine, evidence);
    }
    if (
      isGenericProductInterestName(overlay.impactLine) ||
      /comparison|clinical[- ]data|published outcomes|evidence request|desire for published/i.test(overlay.impactLine)
    ) {
      return formatProductInterestHeadline(
        overlay.impactLine.startsWith("Product interest:")
          ? overlay.impactLine
          : `Product interest: ${overlay.impactLine.replace(/^Product interest:\s*/i, "").trim()}`,
        evidence,
      );
    }
  }
  if (isGenericProductInterestName(productName) || isGenericProductInterestName(overlay.impactLine)) {
    return overlay.impactLine;
  }
  if (/^Product interest:/i.test(overlay.impactLine)) {
    return overlay.impactLine;
  }
  return `Product interest: ${productName}`;
}

function cardFromProductFact(fact: UniversalSurgicalFactRow, dictation: string): DebriefActionableReviewCard | null {

  const overlay = productOverlayFromFact(fact);

  if (!overlay) return null;



  const cardId = `uf:${fact.id}`;
  const productName =
    fact.concept === "product_interest"
      ? productNameForInterestCard(overlay.productName, fact, dictation)
      : overlay.productName;
  const impactLine = productImpactLineForCard(fact, overlay, productName);

  return normalizeProductIntelligenceCard({

    id: cardId,

    category: "product_intelligence",

    headline: impactLine,

    productName,

    evidenceStatus:
      fact.concept === "product_interest"
        ? "Interest noted"
        : fact.confidence === "high"
          ? "Validated"
          : "Needs confirmation",

    impactLine,

    fields: [{ label: "Confidence", value: confidenceFromFact(fact) }],

    evidenceQuotes: normalizeCardEvidenceQuotes(overlay.evidenceQuotes, {

      cardCategory: "product_intelligence",

      dictation,

    }),

    confidence: confidenceFromFact(fact),

    actions: [

      {

        id: `${cardId}-add`,

        type: "add_product_intelligence",

        label: DEBRIEF_REVIEW_SAVE_INTELLIGENCE,

        primary: true,

      },

      { id: `${cardId}-ignore`, type: "ignore", label: DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE },

    ],

    linkedFieldUpdateIds: [],

    linkedIntelligenceIds: [],

  });

}



function cardFromWorkflowFact(fact: UniversalSurgicalFactRow, dictation: string): DebriefActionableReviewCard | null {
  if (shouldSkipUniversalFactWorkflowCard(fact)) return null;
  if (
    String(fact.concept) === "staff_workflow" &&
    /team influence on case flow|positive staff workflow observed/i.test(fact.normalized_label ?? "")
  ) {
    return null;
  }

  const overlay = workflowOverlayFromFact(fact);

  if (!overlay) return null;

  if (/credential/i.test(overlay.primaryLine)) return null;



  const cardId = `uf:${fact.id}`;

  return normalizeOrganizationIntelligenceCard({

    id: cardId,

    category: "organization_intelligence",

    headline: overlay.primaryLine,

    topicTitle: overlay.primaryLine,

    fields: [{ label: "Confidence", value: confidenceFromFact(fact) }],

    evidenceQuotes: normalizeCardEvidenceQuotes(overlay.evidenceQuotes, {

      cardCategory: "organization_intelligence",

      dictation,

    }),

    confidence: confidenceFromFact(fact),

    actions: [

      {

        id: `${cardId}-add`,

        type: "add_organization_intelligence",

        label: DEBRIEF_REVIEW_SAVE_INTELLIGENCE,

        primary: true,

      },

      { id: `${cardId}-ignore`, type: "ignore", label: DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE },

    ],

    linkedFieldUpdateIds: [],

    linkedIntelligenceIds: [],

  });

}



function cardFromAccessPathwayFact(
  fact: UniversalSurgicalFactRow,
  dictation: string,
): DebriefActionableReviewCard | null {
  const evidence = fact.evidence_text?.trim() || fact.normalized_label?.trim() || "";
  if (!evidence) return null;

  const denied = /\b(?:denied|declined|not allowed|would not allow|not open to observation)\b/i.test(evidence);
  const explicitlyNotApproved = /\b(?:not approved|wasn't approved|was not approved|no approval|nothing was approved|not yet approved|not formally approve)\b/i.test(evidence);
  const approved =
    !explicitlyNotApproved &&
    !denied &&
    /\b(?:approved|cleared|allowed|okay to observe|okayed|green light|can observe|come observe)\b/i.test(evidence);
  const credentialingRequired = /\bcredential/i.test(evidence) && /\b(?:required|complete|before|through|needed)\b/i.test(evidence);

  const statusLine = approved
    ? "Observation approved"
    : denied
      ? "Observation declined"
      : credentialingRequired
        ? "Credentialing required before observation"
        : explicitlyNotApproved || /receptive to the idea/i.test(evidence)
          ? "Interested — not yet approved"
          : /interested|receptive|open to/i.test(evidence)
            ? "Observation interest noted"
            : /observation access interest|interest in observation access/i.test(fact.normalized_label?.trim() ?? "")
              ? "Observation interest noted"
              : fact.normalized_label?.trim() || "Observation access discussed";
  const approval = approved ? "Approved" : denied ? "Declined" : "Not yet approved";
  const credentialing = credentialingRequired ? "Credentialing required" : "Not captured in this note";

  const cardId = `uf:${fact.id}`;
  return normalizeObservationAccessCard({
    id: cardId,
    category: "observation_access",
    headline: "Observation access",
    observationStatus: statusLine,
    approval,
    credentialing,
    fields: [{ label: "Confidence", value: confidenceFromFact(fact) }],
    evidenceQuotes: normalizeCardEvidenceQuotes([evidence], {
      cardCategory: "observation_access",
      dictation,
    }),

    confidence: confidenceFromFact(fact),

    actions: [

      {

        id: `${cardId}-update`,

        type: "update_access_status",

        label: DEBRIEF_REVIEW_SAVE_ACCESS_INTELLIGENCE,

        primary: true,

      },

      { id: `${cardId}-ignore`, type: "ignore", label: DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE },

    ],

    linkedFieldUpdateIds: [],

    linkedIntelligenceIds: [],

  });

}



function cardFromContactRoleFact(
  fact: UniversalSurgicalFactRow,
  dictation: string,
  proposedContacts: DebriefProposedContactItem[] = [],
  guardContext?: ReviewUpdateGuardContext,
  supportContacts?: Iterable<{ name: string }>,
): DebriefActionableReviewCard | null {

  const person = fact.person_mentioned?.trim();
  const label = fact.normalized_label?.trim() || "";
  const rawName = person || label.split("·")[0]?.trim() || label;
  const proposedMatch = findProposedContactForPersonName(rawName, proposedContacts);
  const displayName = proposedMatch?.displayName ?? rawName;

  if (!displayName) return null;

  if (
    shouldExcludeContactForReview({
      name: displayName,
      ctx: guardContext,
      supportContacts,
    }).exclude
  ) {
    return null;
  }



  const roleValue = label.includes("·") ? label.split("·").slice(1).join("·").trim() : "Scheduling Coordinator";

  const cardId = `uf:${fact.id}`;
  const contactId =
    findProposedContactIdForPersonName(displayName, proposedContacts) ??
    `contact-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown"}`;

  return normalizeContactCandidateCard({
    id: cardId,
    category: "workflow_participant",
    contactId,

    headline: displayName,

    displayName,

    roleLabel: "Role",

    roleValue: roleValue || undefined,

    fields: [

      { label: "Role", value: roleValue || "Scheduling Coordinator" },

      { label: "Confidence", value: confidenceFromFact(fact) },

    ],

    evidenceQuotes: normalizeCardEvidenceQuotes([fact.evidence_text?.trim() || label], {

      cardCategory: "workflow_participant",

      dictation,

      personName: displayName,

    }),

    confidence: confidenceFromFact(fact),

    actions: [

      {

        id: `${cardId}-create`,

        type: "create_contact",

        label: DEBRIEF_WORKFLOW_PARTICIPANT_CREATE,

        primary: true,

      },

      { id: `${cardId}-link`, type: "link_contact", label: DEBRIEF_WORKFLOW_PARTICIPANT_LINK },

      { id: `${cardId}-ignore`, type: "ignore", label: DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE },

    ],

    linkedFieldUpdateIds: [],

    linkedIntelligenceIds: [],

  });

}



/** Expand truncated UF evidence using the source dictation sentence when possible. */
function expandNextActionSourceFromDictation(source: string, dictation: string): string {
  const trimmed = source.trim();
  const note = dictation.trim();
  if (!trimmed || !note || trimmed.length >= 120) return trimmed;

  const needle = trimmed.replace(/[.!?]+$/g, "").toLowerCase();
  if (needle.length < 10) return trimmed;

  const sentences = note.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim());
  const exact = sentences.find((sentence) =>
    sentence.toLowerCase().includes(needle),
  );
  if (exact) return exact;

  const anchor = needle.slice(0, Math.min(needle.length, 48));
  const partial = sentences.find((sentence) => sentence.toLowerCase().includes(anchor));
  return partial ?? trimmed;
}

/** Turn a rep-stated next step into a concise, actionable task title. */
function nextActionTaskTitle(fact: UniversalSurgicalFactRow, dictation: string): string {
  const evidence = fact.evidence_text?.trim() || "";
  const label = fact.normalized_label?.trim() || "";
  let source = evidence || (/(next step|recommended)/i.test(label) ? "" : label) || label;
  if (!source) return "";
  source = expandNextActionSourceFromDictation(source, dictation);
  return normalizeNextActionDisplayTitle(source);
}

function cardFromNextActionFact(
  fact: UniversalSurgicalFactRow,
  dictation: string,
): DebriefActionableReviewCard | null {
  const taskTitle = nextActionTaskTitle(fact, dictation);
  if (!taskTitle) return null;

  const cardId = `uf:${fact.id}`;
  const evidence = fact.evidence_text?.trim() || fact.normalized_label?.trim() || "";
  const sentenceContainingEvidence = dictation
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .find((sentence) => evidence && sentence.toLowerCase().includes(evidence.toLowerCase().replace(/[.!?]+$/g, "")));
  const evidenceQuote = sentenceContainingEvidence ?? evidence;

  return normalizeFollowUpTaskCard({
    id: cardId,
    category: "follow_up_task",
    headline: taskTitle,
    taskTitle,
    fields: [],
    evidenceQuotes: normalizeCardEvidenceQuotes(evidenceQuote ? [evidenceQuote] : [], {
      cardCategory: "follow_up_task",
      dictation,
      preserveProvidedQuotes: true,
    }),
    actions: [
      {
        id: `${cardId}-create`,
        type: "create_follow_up",
        label: DEBRIEF_REVIEW_CREATE_FOLLOW_UP,
        primary: true,
      },
      { id: `${cardId}-ignore`, type: "ignore", label: DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE },
    ],
    linkedFieldUpdateIds: [],
    linkedIntelligenceIds: [],
  });
}



function reviewCardSemanticKey(
  fact: UniversalSurgicalFactRow,
  card: DebriefActionableReviewCard,
): string {
  if (card.category === "clinical_focus") {
    const normalized = normalizeClinicalIntelligenceFromFact({
      value: fact.normalized_label?.trim() || fact.evidence_text?.trim() || String(fact.concept),
      evidence: fact.evidence_text?.trim() || fact.normalized_label?.trim() || "",
      attribute: "Clinical Trend",
    });
    if (normalized) return clinicalReviewSemanticKey(normalized);
  }

  const headline = card.headline.trim().toLowerCase();
  if (card.category === "workflow_participant") {
    return `${card.category}:${headline.split(/\s+/)[0] ?? headline}`;
  }

  return `${card.category}:${headline}`;
}



export function mapUniversalFactsToActionableReviewCards(input: {
  dictation: string;
  debriefRuns: UniversalFactExtractionRun[];
  proposedContacts?: DebriefProposedContactItem[];
  guardContext?: ReviewUpdateGuardContext;
  supportContacts?: Iterable<{ name: string }>;
}): {
  cards: DebriefActionableReviewCard[];
  ufFactIdsByCardId: Record<string, string[]>;
} {
  const proposedContacts = input.proposedContacts ?? [];
  const facts = flattenDebriefUniversalFacts(input.debriefRuns);

  const cards: DebriefActionableReviewCard[] = [];

  const ufFactIdsByCardId: Record<string, string[]> = {};

  const seen = new Set<string>();



  for (const fact of facts) {

    const concept = String(fact.concept);

    if (CLINICAL_CONCEPTS.has(concept)) {
      for (const clinicalCard of cardsFromClinicalFact(fact, input.dictation)) {
        if (seen.has(reviewCardSemanticKey(fact, clinicalCard))) continue;
        seen.add(reviewCardSemanticKey(fact, clinicalCard));
        cards.push(clinicalCard);
        ufFactIdsByCardId[clinicalCard.id] = [fact.id];
      }
      continue;
    }

    let card: DebriefActionableReviewCard | null = null;

    if (PRODUCT_CONCEPTS.has(concept)) {

      card = cardFromProductFact(fact, input.dictation);

    } else if (concept === "access_pathway") {

      card = cardFromAccessPathwayFact(fact, input.dictation);

    } else if (concept === "contact_role") {
      card = cardFromContactRoleFact(
        fact,
        input.dictation,
        proposedContacts,
        input.guardContext,
        input.supportContacts,
      );

    } else if (concept === "next_action") {

      card = cardFromNextActionFact(fact, input.dictation);

    } else if (WORKFLOW_ORG_CONCEPTS.has(concept)) {

      card = cardFromWorkflowFact(fact, input.dictation);

    }



    if (!card || seen.has(reviewCardSemanticKey(fact, card))) continue;

    seen.add(reviewCardSemanticKey(fact, card));

    cards.push(card);

    ufFactIdsByCardId[card.id] = [fact.id];

  }



  return { cards, ufFactIdsByCardId };

}


