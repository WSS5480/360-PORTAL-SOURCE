/**
 * Hard guards for canonical Review Updates item generation.
 */

import { isPlausiblePersonName, isContactNameParsingArtifact } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import { quoteIsAnchoredInDictation } from "@/lib/surgical-sales/debriefDictationEvidence";
import { isRepPlanningEvidence } from "@/lib/surgical-sales/debriefReviewEvidencePipeline";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import {
  buildContactInfoFollowUpTitle,
  extractContactPersonFromFollowUpTitle,
  isBlockedContactFollowUpTitle,
  isContactInfoFollowUpTitle,
  isValidFollowUpContactPerson,
  normalizeReviewTextApostrophes,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewTextNormalize";

export type ReviewUpdateGuardContext = {
  providerDisplayName?: string | null;
  providerRecordName?: string | null;
  engagementParticipantNames?: string[];
  organizationContactNames?: string[];
};

function normalizePersonKey(name: string): string {
  return normalizeReviewTextApostrophes(name.trim()).toLowerCase().replace(/\s+/g, " ");
}

/** True when two display names likely refer to the same individual. */
export function personNamesReferToSameIndividual(a: string, b: string): boolean {
  const left = normalizePersonKey(a);
  const right = normalizePersonKey(b);
  if (!left || !right) return false;
  if (left === right) return true;

  const leftParts = left.split(/\s+/);
  const rightParts = right.split(/\s+/);

  if (leftParts[0] && leftParts[0] === rightParts[0] && leftParts[0].length >= 3) {
    if (leftParts.length === 1 && right.startsWith(leftParts[0]!)) return true;
    if (rightParts.length === 1 && left.startsWith(rightParts[0]!)) return true;
  }

  if (leftParts.length >= 2 && rightParts.length >= 2) {
    const leftLast = leftParts[leftParts.length - 1]!;
    const rightLast = rightParts[rightParts.length - 1]!;
    if (leftLast.length >= 3 && leftLast === rightLast) {
      if (leftParts[0] === rightParts[0]) return true;
      if (leftParts.length === 1 || rightParts.length === 1) return true;
    }
  }

  return false;
}

function providerNameCandidates(ctx: ReviewUpdateGuardContext): string[] {
  const names = new Set<string>();
  if (ctx.providerDisplayName?.trim()) names.add(ctx.providerDisplayName.trim());
  if (ctx.providerRecordName?.trim()) names.add(ctx.providerRecordName.trim());
  for (const name of ctx.engagementParticipantNames ?? []) {
    if (name?.trim()) names.add(name.trim());
  }
  return [...names];
}

function matchesProviderNameFragment(name: string, ctx: ReviewUpdateGuardContext): boolean {
  const lower = normalizePersonKey(name);
  if (!lower) return false;
  for (const provider of providerNameCandidates(ctx)) {
    if (personNamesReferToSameIndividual(name, provider)) return true;
    const parts = provider.split(/\s+/).map((part) => part.toLowerCase());
    if (parts.some((part) => part.length >= 2 && part === lower)) return true;
  }
  return false;
}

function matchesAnyKnownPerson(name: string, candidates: string[] | undefined): boolean {
  if (!candidates?.length) return false;
  return candidates.some((candidate) => personNamesReferToSameIndividual(name, candidate));
}

export function shouldExcludeContactCandidate(
  name: string,
  ctx: ReviewUpdateGuardContext | undefined,
): { exclude: boolean; reason?: string } {
  if (!ctx) return { exclude: false };

  const normalized = normalizeReviewTextApostrophes(name.trim());
  if (/^s$/i.test(normalized)) {
    return { exclude: true, reason: "invalid_possessive_fragment" };
  }
  if (!isPlausiblePersonName(normalized)) {
    return { exclude: true, reason: "invalid_person_name" };
  }

  if (matchesProviderNameFragment(normalized, ctx)) {
    return { exclude: true, reason: "matches_provider" };
  }

  if (matchesAnyKnownPerson(normalized, ctx.providerDisplayName ? [ctx.providerDisplayName] : undefined)) {
    return { exclude: true, reason: "matches_provider" };
  }
  if (matchesAnyKnownPerson(normalized, ctx.providerRecordName ? [ctx.providerRecordName] : undefined)) {
    return { exclude: true, reason: "matches_provider_record" };
  }
  if (matchesAnyKnownPerson(normalized, ctx.engagementParticipantNames)) {
    return { exclude: true, reason: "matches_engagement_participant" };
  }
  if (matchesAnyKnownPerson(normalized, ctx.organizationContactNames)) {
    return { exclude: true, reason: "matches_organization_contact" };
  }

  return { exclude: false };
}

/** Semantic intent key for follow-up task deduplication. */
export function followUpSemanticDedupeKey(title: string): string {
  const normalized = normalizeReviewTextApostrophes(title.trim()).replace(/\.$/, "");
  const lower = normalized.toLowerCase();
  if (!lower) return "empty";

  if (isContactInfoFollowUpTitle(normalized)) {
    const person = extractContactPersonFromFollowUpTitle(normalized);
    return person ? `task:contact_info:${person.toLowerCase()}` : "task:contact_info:generic";
  }

  if (/\b(?:credential|platform|pathway|vendor approv)\b/i.test(lower)) {
    return "task:credentialing_pathway";
  }

  if (
    !/\b(?:identify|find|understand|discover)\b/i.test(lower) &&
    /\b(?:observation|observe|case|schedul)\b/i.test(lower) &&
    /\b(?:upcoming|available|approval|timing)\b/i.test(lower)
  ) {
    return "task:observation_readiness";
  }

  return `task:generic:${lower.replace(/\s+/g, " ").slice(0, 120)}`;
}

export function canonicalContactInfoFollowUpTitle(
  title: string,
  dedupeKey: string,
  knownContacts: Iterable<[string, { entity: string }]>,
): string {
  if (!dedupeKey.startsWith("task:contact_info:")) {
    return normalizeReviewTextApostrophes(title);
  }

  const slug = dedupeKey.replace("task:contact_info:", "");
  if (!slug || slug === "generic") {
    return buildContactInfoFollowUpTitle(null);
  }

  for (const [name, row] of knownContacts) {
    if (name === slug || name.startsWith(`${slug} `)) {
      return buildContactInfoFollowUpTitle(row.entity.trim());
    }
  }

  const fromTitle = extractContactPersonFromFollowUpTitle(title);
  if (fromTitle) return buildContactInfoFollowUpTitle(fromTitle);

  const fromSlug = slug
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  if (isValidFollowUpContactPerson(fromSlug)) {
    return buildContactInfoFollowUpTitle(fromSlug);
  }

  return buildContactInfoFollowUpTitle(null);
}

/** Follow-ups absorbed by the Observation Readiness card (scheduling/approval overlap only). */
export function isObservationReadinessFollowUp(title: string): boolean {
  if (/\b(?:identify|find|understand|discover)\b/i.test(title)) return false;
  const key = followUpSemanticDedupeKey(title);
  return (
    key === "task:observation_readiness" ||
    /\b(?:observation approval|scheduling.*observation)\b/i.test(title)
  );
}

/** Block contact-related follow-up tasks for the engagement provider (runs on canonical title). */
export function shouldExcludeFollowUpTask(
  title: string,
  ctx: ReviewUpdateGuardContext | undefined,
): { exclude: boolean; reason?: string } {
  const normalized = normalizeReviewTextApostrophes(title.trim()).replace(/\.$/, "");
  if (!isContactInfoFollowUpTitle(normalized)) return { exclude: false };
  if (isBlockedContactFollowUpTitle(normalized)) {
    return { exclude: true, reason: "invalid_possessive_fragment" };
  }
  if (!ctx) return { exclude: false };

  const person = extractContactPersonFromFollowUpTitle(normalized);
  if (!person) return { exclude: false };

  return shouldExcludeContactCandidate(person, ctx);
}

export { buildContactInfoFollowUpTitle, extractContactPersonFromFollowUpTitle, normalizeReviewTextApostrophes };

export function contactMatchesKnownSupportPerson(
  name: string,
  supportContacts: Iterable<{ name: string }> | undefined,
): boolean {
  if (!supportContacts) return false;
  for (const contact of supportContacts) {
    if (personNamesReferToSameIndividual(name, contact.name)) return true;
  }
  return false;
}

export function shouldExcludeContactForReview(input: {
  name: string;
  ctx?: ReviewUpdateGuardContext;
  supportContacts?: Iterable<{ name: string }>;
}): { exclude: boolean; reason?: string } {
  if (isContactNameParsingArtifact(input.name)) {
    return { exclude: true, reason: "name_parsing_artifact" };
  }
  const guard = shouldExcludeContactCandidate(input.name, input.ctx);
  if (guard.exclude) return guard;
  if (contactMatchesKnownSupportPerson(input.name, input.supportContacts)) {
    return { exclude: true, reason: "matches_known_support_contact" };
  }
  return { exclude: false };
}

export function filterProposedContactsWithGuardContext(
  contacts: DebriefProposedContactItem[],
  ctx: ReviewUpdateGuardContext | undefined,
  supportContacts?: Iterable<{ name: string }>,
): DebriefProposedContactItem[] {
  return contacts.filter((contact) => {
    return !shouldExcludeContactForReview({
      name: contact.displayName,
      ctx,
      supportContacts,
    }).exclude;
  });
}

export function formatClinicalEvidence(evidence: string): string {
  return evidence.trim().replace(/^["']+|["']+$/g, "").trim();
}

/** Clinical cards require anchored, non-planning evidence. */
export function hasValidClinicalEvidence(fact: DebriefAtomicFact, dictation: string): boolean {
  const evidence = formatClinicalEvidence(fact.evidence);
  if (!evidence || evidence.length < 12) return false;
  if (isRepPlanningEvidence(evidence)) return false;
  return quoteIsAnchoredInDictation(evidence, dictation);
}
