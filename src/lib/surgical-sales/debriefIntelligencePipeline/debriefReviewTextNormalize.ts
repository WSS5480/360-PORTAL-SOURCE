/**
 * Text normalization for Review Updates person / follow-up extraction.
 */

import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";

const INVALID_FOLLOW_UP_PERSON_TOKENS = new Set([
  "s",
  "her",
  "his",
  "their",
  "the",
  "get",
  "identify",
  "contact",
  "phone",
  "email",
]);

/** Curly/smart quotes → straight ASCII for regex-safe parsing. */
export function normalizeReviewTextApostrophes(text: string): string {
  return text
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"');
}

export function isValidFollowUpContactPerson(name: string): boolean {
  const normalized = normalizeReviewTextApostrophes(name.trim());
  if (!normalized || normalized.length < 2) return false;
  if (INVALID_FOLLOW_UP_PERSON_TOKENS.has(normalized.toLowerCase())) return false;
  if (/^s$/i.test(normalized)) return false;
  return isPlausiblePersonName(normalized);
}

/** Extract a named person from contact-info follow-up phrasing — never possessive fragments. */
export function extractContactPersonFromFollowUpTitle(title: string): string | null {
  const normalized = normalizeReviewTextApostrophes(title.trim()).replace(/\.$/, "");
  if (!normalized) return null;

  const patterns = [
    /\bget\s+([a-z]+(?:\s+[a-z]+)?)'s\s+(?:phone|email|contact\b)/i,
    /\bidentify\s+([a-z]+(?:\s+[a-z]+)?)'s\s+(?:contact|phone|email)/i,
    /\bidentify\s+([a-z]+(?:\s+[a-z]+)?)(?:'s)?\s+contact\s+(?:info|information)/i,
    /\b([a-z]+(?:\s+[a-z]+)?)'s\s+(?:phone|email|contact\b)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const raw = match?.[1]?.trim();
    if (!raw) continue;
    const person = raw
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
    if (isValidFollowUpContactPerson(person)) return person;
  }

  return null;
}

export function buildContactInfoFollowUpTitle(person: string | null | undefined): string {
  if (person && isValidFollowUpContactPerson(person)) {
    const first = person.trim().split(/\s+/)[0]!;
    return `Get ${first}'s phone or email.`;
  }
  return "Get scheduler phone or email.";
}

/** Hard block for possessive-fragment corruption (e.g. curly-apostrophe "S"). */
export function isBlockedContactFollowUpTitle(title: string): boolean {
  const normalized = normalizeReviewTextApostrophes(title.trim()).replace(/\.$/, "");
  if (/^get s's phone or email$/i.test(normalized)) return true;
  const person = extractContactPersonFromFollowUpTitle(normalized);
  if (!person && /^get [a-z]'s phone or email$/i.test(normalized)) return true;
  return false;
}

export function isContactInfoFollowUpTitle(title: string): boolean {
  const lower = normalizeReviewTextApostrophes(title).toLowerCase();
  return /\b(?:phone|email|contact info|contact information|identify.*contact|get .* contact)\b/i.test(
    lower,
  );
}
