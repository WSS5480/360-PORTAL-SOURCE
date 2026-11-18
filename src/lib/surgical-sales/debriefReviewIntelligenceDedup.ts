/**
 * Reusable intelligence deduplication before Review Updates cards are rendered.
 * Merges duplicate people, clinical insights, access signals, org topics, and follow-ups.
 *
 * When UF review-primary is enabled, `dedupeReviewDisplayCards` runs first to prefer UF
 * cards over DIP on matching product/procedure keys; this module's card dedupe runs last.
 */

import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import {
  isWorkflowParticipantContact,
  workflowParticipantPossibleRole,
} from "@/lib/surgical-sales/debriefDetectedContact";
import type { DebriefFactKey } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefFactKeys";
import type { DebriefExtractedFactRecord } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefFactKeys";
import {
  mergeDebriefConfidence,
  scorePersonMentionConfidence,
  shouldPreselectDebriefFinding,
} from "@/lib/surgical-sales/debriefIntelligenceConfidence";
import type { DebriefFactConfidence } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import { normalizeDebriefActionableReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardNormalize";
import {
  normalizeProcedureKey,
  productMentionDedupeKey,
} from "@/lib/surgical-sales/sharedIntelligence/dedupeIntelligenceSignals";
import type {
  DebriefActionableReviewCard,
  DebriefReviewCardCategory,
  DebriefReviewCardField,
} from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import { isClinicalFocusReviewCard, isContactCandidateReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import { normalizeCardEvidenceQuotes } from "@/lib/surgical-sales/debriefReviewEvidencePipeline";
import { isExcludedNarrativeReviewPhrase } from "@/lib/surgical-sales/debriefReviewNarrativeExclusions";
import {
  combineContactRoleValues,
  contactRoleFieldLabel,
} from "@/lib/surgical-sales/debriefContactRoleMerge";

export {
  combineContactRoleValues,
  contactRoleFieldLabel,
  normalizeContactRoleValue,
} from "@/lib/surgical-sales/debriefContactRoleMerge";

const CONFIDENCE_RANK: Record<DebriefFactConfidence, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

const MENTION_LEVEL_RANK: Record<DebriefProposedContactItem["mentionLevel"], number> = {
  mentioned_person: 0,
  workflow_participant: 1,
  potential_support_contact: 2,
  confirmed_support_contact: 3,
};

/** Normalize evidence quotes for display (unique, quoted). */
export function mergeEvidenceQuotes(...quoteGroups: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of quoteGroups.flat(Infinity)) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const bare = trimmed.replace(/^["']|["']$/g, "");
    const key = bare.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(bare.startsWith('"') ? bare : `"${bare}"`);
  }
  return out;
}

export function highestConfidence(
  values: Array<DebriefFactConfidence | undefined>,
): DebriefFactConfidence {
  let best: DebriefFactConfidence = "Low";
  let rank = 0;
  for (const value of values) {
    if (!value) continue;
    const next = CONFIDENCE_RANK[value];
    if (next > rank) {
      rank = next;
      best = value;
    }
  }
  return best;
}

/** Person merge key — same first name collapses (Jennifer × N). */
export function personMergeKey(displayName: string): string {
  const parts = displayName.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  return parts.join(" ");
}

function preferDisplayName(current: string, candidate: string): string {
  const a = current.trim();
  const b = candidate.trim();
  if (!a) return b;
  if (!b) return a;
  if (b.length > a.length && personMergeKey(b) === personMergeKey(a)) return b;
  if (a.length >= b.length) return a;
  return b;
}

export type DedupedWorkflowParticipant = {
  primaryContact: DebriefProposedContactItem;
  mergedContactIds: string[];
  evidenceQuotes: string[];
  role: string | null;
  confidence: DebriefFactConfidence;
};

function inferSchedulingRole(contact: DebriefProposedContactItem, dictation: string): boolean {
  const blob = `${contact.sourceQuote ?? ""} ${contact.roleLabel} ${dictation}`;
  return /\b(schedul|coordinator|handles? (?:a lot of )?the scheduling|scheduling coordin)/i.test(blob);
}

function roleForMergedParticipant(
  contacts: DebriefProposedContactItem[],
  dictation: string,
): string | null {
  for (const contact of contacts) {
    const role = workflowParticipantPossibleRole(contact, dictation);
    if (role) return role;
  }
  if (contacts.some((c) => inferSchedulingRole(c, dictation) || c.contactTypeId === "scheduler")) {
    return "Scheduling Coordinator";
  }
  return null;
}

/** Merge proposed contacts that refer to the same person. */
export function dedupeProposedContactsForReview(
  contacts: DebriefProposedContactItem[],
  dictation: string,
): DedupedWorkflowParticipant[] {
  const groups = new Map<string, DebriefProposedContactItem[]>();

  for (const contact of contacts) {
    if (contact.disposition === "skipped") continue;
    const isWorkflow =
      contact.mentionLevel === "workflow_participant" ||
      (contact.mentionLevel === "potential_support_contact" && contact.contactDetailsMissing);
    if (!isWorkflow) continue;

    const key = personMergeKey(contact.displayName);
    if (!key) continue;
    const bucket = groups.get(key) ?? [];
    bucket.push(contact);
    groups.set(key, bucket);
  }

  const merged: DedupedWorkflowParticipant[] = [];

  for (const group of groups.values()) {
    const sorted = [...group].sort(
      (a, b) => MENTION_LEVEL_RANK[b.mentionLevel] - MENTION_LEVEL_RANK[a.mentionLevel],
    );
    const primary = sorted[0]!;
    let displayName = primary.displayName;
    for (const c of sorted) {
      displayName = preferDisplayName(displayName, c.displayName);
    }

    const primaryContact: DebriefProposedContactItem = {
      ...primary,
      displayName,
      firstName: displayName.split(/\s+/)[0] ?? primary.firstName,
      lastName: displayName.split(/\s+/).slice(1).join(" ") || primary.lastName,
    };

    const evidenceQuotes = mergeEvidenceQuotes(
      ...sorted.map((c) => (c.sourceQuote ? [c.sourceQuote] : [])),
    );
    const role = roleForMergedParticipant(sorted, dictation);
    const confidence = mergeDebriefConfidence(
      ...sorted.map((c) =>
        scorePersonMentionConfidence(c.displayName, c.sourceQuote ?? "", dictation),
      ),
    );

    merged.push({
      primaryContact,
      mergedContactIds: sorted.map((c) => c.id),
      evidenceQuotes,
      role,
      confidence,
    });
  }

  return merged;
}

const CLINICAL_INSIGHT_GROUP_BY_KEY: Partial<Record<DebriefFactKey, string>> = {
  clinical_robotic_ventral_hernia_increasing: "robotic_ventral_hernia",
  clinical_robotic_ventral_hernia: "robotic_ventral_hernia",
  clinical_abdominal_wall_reconstruction_increasing: "abdominal_wall_reconstruction",
  clinical_abdominal_wall_reconstruction: "abdominal_wall_reconstruction",
  clinical_procedure_discussed: "clinical_procedure",
};

export const CLINICAL_HEADLINE_BY_INSIGHT_GROUP: Record<string, string> = {
  robotic_ventral_hernia: "Robotic Ventral Hernia Repairs Increasing",
  abdominal_wall_reconstruction: "Abdominal Wall Reconstruction Volume Increasing",
  clinical_procedure: "Clinical Procedure Focus Discussed",
};

export type DedupedClinicalInsight = {
  groupId: string;
  headline: string;
  factKeys: DebriefFactKey[];
  evidenceQuotes: string[];
  confidence: DebriefFactConfidence;
};

/** Merge clinical facts that describe the same insight. */
export function dedupeClinicalInsights(input: {
  facts: Array<{ fact_key: DebriefFactKey; evidence_quote: string; confidence: DebriefFactConfidence }>;
  capturedEvidence?: string[];
  capturedConfidence?: DebriefFactConfidence;
}): DedupedClinicalInsight[] {
  const groups = new Map<string, DedupedClinicalInsight>();

  for (const fact of input.facts) {
    const groupId = CLINICAL_INSIGHT_GROUP_BY_KEY[fact.fact_key];
    if (!groupId) continue;
    if (groupId === "clinical_procedure") {
      const hasSpecific = input.facts.some(
        (f) =>
          f.fact_key === "clinical_robotic_ventral_hernia_increasing" ||
          f.fact_key === "clinical_abdominal_wall_reconstruction_increasing",
      );
      if (hasSpecific) continue;
    }

    const existing = groups.get(groupId);
    const headline = CLINICAL_HEADLINE_BY_INSIGHT_GROUP[groupId] ?? groupId;
    if (!existing) {
      groups.set(groupId, {
        groupId,
        headline,
        factKeys: [fact.fact_key],
        evidenceQuotes: mergeEvidenceQuotes(
          [fact.evidence_quote],
          input.capturedEvidence ?? [],
        ),
        confidence: fact.confidence,
      });
      continue;
    }

    existing.factKeys.push(fact.fact_key);
    existing.evidenceQuotes = mergeEvidenceQuotes(
      existing.evidenceQuotes,
      [fact.evidence_quote],
      input.capturedEvidence ?? [],
    );
    existing.confidence = highestConfidence([existing.confidence, fact.confidence, input.capturedConfidence]);
  }

  return [...groups.values()];
}

/** Shared-engine dedupe key alignment for parity compare and Phase 1 card dedupe. */
export function productReviewDedupeKey(productName: string, isCompetitor = false): string {
  return productMentionDedupeKey({ productName, isCompetitor });
}

export function procedureReviewDedupeKey(label: string): string {
  return normalizeProcedureKey(label);
}

export function dedupeFacilityIntelligenceRecords(
  records: DebriefExtractedFactRecord[],
): DebriefExtractedFactRecord[] {
  const byTopic = new Map<string, DebriefExtractedFactRecord>();

  for (const record of records) {
    const topicKey =
      record.factKey === "facility_access_partial"
        ? "facility_access"
        : record.factKey === "facility_credentialing_partial"
          ? "facility_credentialing"
          : record.factKey;

    const existing = byTopic.get(topicKey);
    if (!existing) {
      byTopic.set(topicKey, { ...record });
      continue;
    }
    existing.evidenceQuote = [existing.evidenceQuote, record.evidenceQuote].filter(Boolean).join(" ");
    existing.confidence = highestConfidence([existing.confidence, record.confidence]);
    existing.namedPeople = [...new Set([...existing.namedPeople, ...record.namedPeople])];
  }

  return [...byTopic.values()];
}

/** Normalize follow-up task text for merge. */
export function followUpMergeKey(task: string): string {
  const t = task.trim().toLowerCase().replace(/\.$/, "");
  if (/office staff/.test(t) && /connect|coordinate|reach|work through|follow up/.test(t)) {
    return "follow-up:office-staff-coordination";
  }
  if (/jennifer/.test(t) && /contact|phone|email|info|identify|connect|schedul/.test(t)) {
    return "follow-up:jennifer-contact";
  }
  if (/credential|platform|pathway/.test(t) && /confirm|identify|which/.test(t)) {
    return "follow-up:credentialing-pathway";
  }
  if (/observation/.test(t) && /approv|access|vendor/.test(t)) {
    return "follow-up:observation-approval";
  }
  if (/schedul/.test(t) && /confirm|who|control/.test(t)) {
    return "follow-up:scheduling-approval";
  }
  if (/upcoming|available/.test(t) && /case|observation/.test(t)) {
    return "follow-up:upcoming-cases";
  }
  return t.replace(/\s+/g, " ").slice(0, 120);
}

export type DedupedFollowUpTask = {
  mergeKey: string;
  headline: string;
  evidenceQuotes: string[];
};

export function dedupeFollowUpTasks(
  tasks: Array<{ text: string; evidenceQuote?: string }>,
): DedupedFollowUpTask[] {
  const groups = new Map<string, DedupedFollowUpTask>();

  for (const task of tasks) {
    const headline = task.text.trim().replace(/\.$/, "");
    if (!headline) continue;
    const mergeKey = followUpMergeKey(headline);
    const existing = groups.get(mergeKey);
    if (!existing) {
      groups.set(mergeKey, {
        mergeKey,
        headline: headline.endsWith(".") ? headline : `${headline}.`,
        evidenceQuotes: task.evidenceQuote ? mergeEvidenceQuotes([task.evidenceQuote]) : [],
      });
      continue;
    }
    if (headline.length > existing.headline.length) {
      existing.headline = headline.endsWith(".") ? headline : `${headline}.`;
    }
    if (task.evidenceQuote) {
      existing.evidenceQuotes = mergeEvidenceQuotes(
        existing.evidenceQuotes,
        [task.evidenceQuote],
      );
    }
  }

  return [...groups.values()];
}

function clinicalCardMergeKey(card: DebriefActionableReviewCard): string {
  if (!isClinicalFocusReviewCard(card)) {
    return `clinical:${card.headline.trim().toLowerCase()}`;
  }
  const procedure = card.clinicalProcedureFocus?.trim() || card.headline.trim();
  const trend = card.clinicalDisplayValue?.trim() || "";
  return `clinical:${procedureReviewDedupeKey(procedure)}:${procedureReviewDedupeKey(trend || procedure)}`;
}

function cardCategoryMergeKey(card: DebriefActionableReviewCard): string {
  switch (card.category) {
    case "workflow_participant":
      return `person:${personMergeKey(card.headline)}`;
    case "observation_access":
      return "observation-access";
    case "clinical_focus":
      return clinicalCardMergeKey(card);
    case "product_intelligence":
      return `product:${card.productName.trim().toLowerCase()}`;
    case "organization_intelligence":
      return `org:${card.headline.trim().toLowerCase()}`;
    case "follow_up_task":
      return `follow-up:${followUpMergeKey(card.headline)}`;
  }
}

const ROLE_FIELD_LABELS = new Set(["Role", "Possible Role"]);

function mergeCardFields(groups: DebriefReviewCardField[][]): DebriefReviewCardField[] {
  // Roles merge into one combined profile line; every other label keeps the
  // most detailed value.
  const combinedRole = combineContactRoleValues(
    groups.flat().filter((f) => ROLE_FIELD_LABELS.has(f.label)).map((f) => f.value),
  );

  const byLabel = new Map<string, string>();
  for (const fields of groups) {
    for (const field of fields) {
      if (ROLE_FIELD_LABELS.has(field.label)) continue;
      const existing = byLabel.get(field.label);
      if (!existing || field.value.length > existing.length) {
        byLabel.set(field.label, field.value);
      }
    }
  }

  const merged: DebriefReviewCardField[] = [];
  if (combinedRole) {
    merged.push({ label: contactRoleFieldLabel(combinedRole), value: combinedRole });
  }
  for (const [label, value] of byLabel) {
    if (label === "Confidence") continue;
    merged.push({ label, value });
  }
  const confidence = highestConfidence(
    groups
      .flat()
      .filter((f) => f.label === "Confidence")
      .map((f) => f.value as DebriefFactConfidence),
  );
  if (groups.some((g) => g.some((f) => f.label === "Confidence"))) {
    merged.push({ label: "Confidence", value: confidence });
  }
  return merged;
}

function mergeActionableCardGroup(
  group: DebriefActionableReviewCard[],
  dictation?: string,
): DebriefActionableReviewCard {
  const primary = group[0]!;
  const mergedIds = [...new Set(group.map((c) => c.id))];

  const mergedHeadline =
    group.find((c) => c.category === "workflow_participant")?.headline ??
    [...group].sort((a, b) => b.headline.length - a.headline.length)[0]!.headline;

  // One person, one card — combine every role signal into a single profile.
  const combinedRole = combineContactRoleValues(
    group.map((c) => (isContactCandidateReviewCard(c) ? c.roleValue : undefined)),
  );

  const mergedCard = normalizeDebriefActionableReviewCard({
    ...primary,
    id: mergedIds[0]!,
    headline: mergedHeadline,
    fields: mergeCardFields(group.map((c) => c.fields)),
    evidenceQuotes: mergeEvidenceQuotes(...group.map((c) => c.evidenceQuotes)),
    confidence: highestConfidence(
      group.map((c) => ("confidence" in c ? c.confidence : undefined)),
    ),
    linkedFieldUpdateIds: [...new Set(group.flatMap((c) => c.linkedFieldUpdateIds))],
    linkedIntelligenceIds: [...new Set(group.flatMap((c) => c.linkedIntelligenceIds))],
    contactId:
      group.find(isContactCandidateReviewCard)?.contactId ??
      (isContactCandidateReviewCard(primary) ? primary.contactId : undefined),
    actions: primary.actions,
    ...(isContactCandidateReviewCard(primary) && combinedRole
      ? { roleValue: combinedRole, roleLabel: contactRoleFieldLabel(combinedRole) }
      : {}),
  } as DebriefActionableReviewCard);

  const personName =
    mergedCard.category === "workflow_participant" ? mergedCard.displayName : undefined;

  return {
    ...mergedCard,
    evidenceQuotes: normalizeCardEvidenceQuotes(mergedCard.evidenceQuotes, {
      cardCategory: mergedCard.category,
      personName,
      dictation,
    }),
  };
}

/** Final safety pass — no duplicate cards per category merge key. */
export function dedupeDebriefActionableReviewCards(
  cards: DebriefActionableReviewCard[],
  dictation?: string,
): DebriefActionableReviewCard[] {
  const order: DebriefReviewCardCategory[] = [
    "workflow_participant",
    "observation_access",
    "clinical_focus",
    "product_intelligence",
    "organization_intelligence",
    "follow_up_task",
  ];

  const groups = new Map<string, DebriefActionableReviewCard[]>();
  for (const card of cards) {
    const key = `${card.category}:${cardCategoryMergeKey(card)}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(card);
    groups.set(key, bucket);
  }

  const merged = [...groups.values()]
    .map((group) => mergeActionableCardGroup(group, dictation))
    .filter(
      (card) =>
        !isExcludedNarrativeReviewPhrase(card.headline) &&
        // "Contact Info" carries fixed status labels (e.g. "Contact details
        // still being learned") — never narrative prose, so skip that field.
        !card.fields.some(
          (f) => f.label !== "Contact Info" && isExcludedNarrativeReviewPhrase(f.value),
        ),
    );
  return merged.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
}
