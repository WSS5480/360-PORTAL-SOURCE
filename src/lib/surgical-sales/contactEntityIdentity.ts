/**
 * Named-entity identity for contact-field merge decisions.
 *
 * Before a contact field update becomes a replace/keep-both merge card, the
 * pipeline must resolve WHO each value refers to. "Karen — Scheduling
 * Coordinator" vs "Karen still handles observation scheduling" is the same
 * person occupying the same role slot — corroborating evidence, not a
 * conflict. Only a different person in the same slot (Karen → Amy) is a
 * genuine merge decision.
 */

import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { extractPersonNamesFromNote } from "@/lib/surgical-sales/namedEntityPreservation";
import { normalizeExtractedPersonName } from "@/lib/surgical-sales/schedulingContactOwnership";

export {
  buildSchedulingReplacementProposedValue,
  detectSchedulingContactReplacement,
  isDepartedSchedulingOwner,
  normalizeExtractedPersonName,
  schedulingContactReplacementNamed,
  type SchedulingContactReplacement,
} from "@/lib/surgical-sales/schedulingContactOwnership";

/** Contact fields whose values identify a person occupying a role slot. */
const CONTACT_ENTITY_FIELD_DB_KEYS = new Set([
  "provider_scheduling_contact",
  "provider_observation_coordinator_contact",
  "provider_facility_scheduling_contact",
]);

export function isContactEntityDbKey(dbKey: string): boolean {
  return CONTACT_ENTITY_FIELD_DB_KEYS.has(dbKey);
}

/**
 * Leading "Name —/=/:/, role" or "Name handles/coordinates/is …" shapes cover
 * how contact values are stored and proposed; anything else falls back to the
 * pattern-driven note extractor.
 */
const LEADING_NAME_RE =
  /^\s*"?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:—|–|-|=|:|,|\.|\(|\b(?:handles?|handled|handling|coordinates?|coordinating|owns?|manages?|managing|covers?|runs?|is|was|will|still|now|usually|currently|in|from|at)\b)/;

/** Role/workflow words that title-cased copy can disguise as a person name. */
const ROLE_WORD_TOKENS = new Set([
  "scheduler",
  "scheduling",
  "coordinator",
  "coordination",
  "observation",
  "credentialing",
  "badge",
  "access",
  "contact",
  "office",
  "manager",
  "involved",
  "in",
  "on",
  "the",
  "facility",
  "hospital",
  "team",
]);

function isUsablePersonName(name: string): boolean {
  if (!isPlausiblePersonName(name)) return false;
  return name
    .toLowerCase()
    .split(/\s+/)
    .every((token) => !ROLE_WORD_TOKENS.has(token));
}

export function primaryPersonNameFromContactValue(value: string): string | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;

  const leading = trimmed.match(LEADING_NAME_RE)?.[1]?.trim();
  if (leading && isUsablePersonName(leading)) return leading;

  const fromNote = extractPersonNamesFromNote(trimmed).find(isUsablePersonName);
  return fromNote ?? null;
}

function firstNameKey(name: string): string {
  return name.trim().split(/\s+/)[0]!.toLowerCase();
}

/**
 * True when both values resolve to the same person (matched on normalized
 * first name, consistent with the person merge key used by review dedupe).
 * Unresolvable names on either side never claim identity — the caller keeps
 * its existing conflict behavior.
 */
export function contactValuesReferToSamePerson(
  existingValue: string,
  proposedValue: string,
): boolean {
  const existingName = primaryPersonNameFromContactValue(existingValue);
  if (!existingName) return false;
  const proposedName = primaryPersonNameFromContactValue(proposedValue);
  if (!proposedName) return false;
  return firstNameKey(existingName) === firstNameKey(proposedName);
}

/**
 * Same person, same role slot — the note corroborates the stored contact.
 * Treat as evidence only: no field change, no merge card.
 */
export function contactUpdateCorroboratesExisting(input: {
  dbKey: string;
  existingValue: string;
  proposedValue: string;
}): boolean {
  if (!isContactEntityDbKey(input.dbKey)) return false;
  if (!input.existingValue.trim() || !input.proposedValue.trim()) return false;
  return contactValuesReferToSamePerson(input.existingValue, input.proposedValue);
}
