/**

 * Debrief person extraction — three mention levels; no hallucinated support contacts.

 */

export type DebriefPersonMentionLevel =
  | "mentioned_person"
  | "workflow_participant"
  | "potential_support_contact"
  | "confirmed_support_contact";

/** @deprecated Use DebriefPersonMentionLevel */

export type DebriefContactLeadConfidence = "ignore" | "partial" | "strong";

export type DebriefContactLeadCandidate = {
  name: string;

  quote: string;

  level: DebriefPersonMentionLevel;

  /** @deprecated Use level */

  confidence: DebriefContactLeadConfidence;
};

export const CONTACT_INFO_MISSING_RE =
  /\b(?:don'?t|do not)\s+have\s+(?:her|his|their|the|[A-Za-z]+'s)?\s*(?:contact|info|number|email|phone)|need\s+to\s+get\s+(?:her|his|their|[A-Za-z]+'s)?\s*(?:info|contact|number|email|phone)|(?:still\s+)?need(?:s)?\s+(?:her|his|their|[A-Za-z]+'s)?\s*(?:contact|info|number|email|phone)\b/i;

const EXPLICIT_USE_CONTACT_RE =
  /\b(?:call|email|text|reach(?:\s+out)?\s+to)\s+(?:her|him|them|[A-Za-z]+)\b|\bcontact\s+(?:her|him|them)\b|\buse\s+(?:her|him|them|[A-Za-z]+)\b(?:\s+for|\s+to|\s+when)?/i;

const CONTACT_METHOD_RE =
  /\b(?:his|her|their)\s+(?:number|email|phone|cell|extension)\b/i;

/** Phrases that must never produce a structured contact lead on their own. */

const VAGUE_CONTACT_PHRASE_RE = [
  /\bthe\s+right\s+people\b/i,

  /\bright\s+people\b/i,

  /\bsomeone\s+in\s+admin\b/i,

  /\btheir\s+team\b/i,

  /\bpeople\s+at\s+the\s+hospital\b/i,

  /\bsupport\s+staff\b/i,

  /\bthe\s+office\b/i,

  /\bthe\s+or\b/i,

  /\bwork\s+through\s+the\s+right\s+people\b/i,

  /\bgeneral\s+support\b/i,

  /\bappropriate\s+contacts?\b/i,
];

const BLOCKLISTED_NAMES = new Set(
  [
    "if",
    "we",
    "he",
    "she",
    "they",
    "them",
    "their",
    "i",
    "you",
    "it",
    "the",
    "that",
    "this",
    "these",
    "those",
    "which",
    "do",
    "did",
    "not",
    "what",
    "when",
    "where",
    "who",
    "how",
    "why",
    "all",
    "also",
    "and",
    "but",
    "follow",
    "next",
    "step",
    "up",
    "then",
    "there",
    "here",
    "still",
    "usually",
    "required",
    "complete",
    "surgical",
    "normally",
    "before",
    "after",
    "during",
    "while",
    "once",
    "until",
    "about",
    "into",
    "from",
    "for",
    "with",
    "without",
    "through",
    "because",
    "although",
    "though",
    "however",
    "mentioned",
    "said",
    "told",
    "noted",
    "something",
    "everything",
    "nothing",
    "anything",
    "other",
    "another",
    "each",
    "every",
    "both",
    "either",
    "neither",
    "right",
    "people",
    "person",
    "team",
    "office",
    "or",
    "hospital",
    "staff",
    "someone",
    "anyone",
    "everyone",
    "admin",
    "support",
    "vendor",
    "rep",
    "doctor",
    "surgeon",
    "provider",
    "andy",
    "dr",
    "like",
    "sounds",
    "stuff",
    "times",
    "side",
    "most",
    "their",
    "on",
    "to",
    "as",
    "credentialing",
    "observation",
    "evaluation",
    "approval",
    "access",
    "scheduling",
    "appears",
    "appeared",
    "seems",
    "seemed",
    "open",
    "interested",
    "receptive",
    "willing",
    "probably",
    "maybe",
    "helps",
    "help",
    "coordinate",
    "coordinates",
    "owner",
    "me",
    "her",
    "him",
    "identified",
    "partially",
    "partial",
    "named",
    "contact",
    "scheduler",
    "scheduling",
    "provider",
    "shared",
    "workflow",
    "coordinator",
    "confirmed",
    "unknown",
    "possible",
    "role",
    "evidence",
    "lead",
    "office",
  ].map((s) => s.toLowerCase()),
);

const GENERIC_MULTIWORD_PERSON_LABELS = new Set(
  [
    "partially identified",
    "identified partially",
    "named contact",
    "contact identified",
    "scheduler identified",
    "scheduling contact",
    "scheduling owner",
    "provider office",
    "shared workflow",
    "office contact",
    "unnamed contact",
    "follow up",
    "next step",
    "do not",
    "did not",
  ].map((s) => s.toLowerCase()),
);

/** Words that commonly follow "mentioned" in dictation but are not person names. */
const WORDS_AFTER_MENTIONED = [
  "that",
  "this",
  "these",
  "those",
  "the",
  "a",
  "an",
  "it",
  "if",
  "we",
  "he",
  "she",
  "they",
  "vendor",
  "credentialing",
  "scheduling",
  "observation",
  "evaluation",
  "access",
  "approval",
  "all",
  "also",
  "but",
  "not",
  "no",
  "what",
  "when",
  "where",
  "who",
  "how",
  "why",
  "there",
  "usually",
  "required",
  "complete",
].join("|");

const OPERATIONAL_ROLE_RE =
  /\b(scheduler|scheduling\s+coordinator|office\s+manager|or\s+coordinator|coordinator|materials\s+manager|value\s+analysis|credentialing\s+(?:coordinator|contact)|\bPA\b|physician\s+assistant)\b/i;

const OWNERSHIP_VERB_RE =
  /\b(handles?|schedules?|coordinates?|runs?|manages?|evaluates?|approves?|owns?|oversees?|gets?\s+involved)\b/i;

const NAME_TOKEN = "([A-Za-z][a-z]+(?:\\s+[A-Za-z][a-z]+)?)";

const NAMED_OWNERSHIP_RE = new RegExp(
  `\\b${NAME_TOKEN}\\s+(?:handles?|schedules?|coordinates?|runs?|manages?|evaluates?|approves?|owns?|oversees?|gets?\\s+involved)\\b`,

  "i",
);

const ROLE_WITH_NAME_RE =
  /\b(?:scheduler|coordinator|office\s+manager|or\s+coordinator|materials\s+manager)\s*(?:[:\-–—]\s*|\bis\s+)?([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)?)\b/i;

const MENTIONED_NAME_RE = new RegExp(
  `\\b(?:mentioned|bringing\\s+up|brought\\s+up|name(?:d)?)\\s+(?!${WORDS_AFTER_MENTIONED}\\b)([A-Za-z][a-z]+)\\b`,
  "i",
);

const OFFICE_NAME_RE =
  /\b([A-Za-z][a-z]+)\s+from\s+(?:the|his|her|their)\s+office\b/i;

const OFFICE_IN_NAME_RE =
  /\b([A-Za-z][a-z]+)\s+in\s+(?:his|her|their)\s+office\b/i;

const SCHEDULE_HELP_RE =
  /\b([A-Za-z][a-z]+)\b[^.]{0,48}\b(?:will\s+help|help(?:s)?)\s+schedule\b/i;

const PA_NAME_RE = /\b([A-Za-z][a-z]+),?\s+(?:his|her|their)\s+PA\b/i;

const SCHEDULING_NAME_RE =
  /\b([A-Za-z][a-z]+)\s+(?:handles?|schedules?).{0,64}scheduling\b/i;

/** "Sarah, the surgery scheduler, handles..." — role between name and ownership verb. */
const COMMA_ROLE_SCHEDULER_RE =
  /\b([A-Za-z][a-z]+),\s*(?:the\s+)?(?:(?:surgery|or|case)\s+)?(?:scheduler|scheduling coordinator)\b/i;

const INVOLVED_SCHEDULING_NAME_RE =
  /\b([A-Za-z][a-z]+)\b[^.]{0,72}\b(?:appears\s+to\s+be\s+involved|may\s+be\s+involved|is\s+involved|may\s+coordinate|helps?\s+with)\b[^.]{0,48}\bschedul/i;

const FOLLOW_UP_WITH_NAME_RE =
  /\bfollow(?:\s|-)?up\s+with\s+([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)?)\b/i;

const MENTIONED_FULL_NAME_RE =
  /\b(?:specifically\s+)?mentioned\s+([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)?)\b/i;

const AS_SOMEONE_WHO_HELPS_RE =
  /\b([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)?)\s+as\s+someone\s+who\s+helps?\b/i;

const COLON_ATTRIBUTION_RE =
  /\b(?:scheduling|coordinator|office)\s*[:\-–—]\s*([A-Za-z][a-z]+)\b|\b([A-Za-z][a-z]+)\s*[:\-–—]\s*(?:scheduling|coordinator)\b/i;

const PRONOUN_NAME_RE = /^(?:she|he|they|them|her|him|it|we|you|i)$/i;

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const PHONE_RE =
  /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/;

function normalizeName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");

  return trimmed

    .split(/\s+/)

    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())

    .join(" ");
}

function isBlocklistedName(name: string): boolean {
  const n = normalizeName(name).toLowerCase();

  if (!n || n.length < 2) return true;

  if (BLOCKLISTED_NAMES.has(n)) return true;

  if (BLOCKLISTED_NAMES.has(n.split(/\s+/)[0] ?? "")) return true;

  return false;
}

function nameAppearsInBlob(name: string, blob: string): boolean {
  const normalized = normalizeName(name).toLowerCase();

  const lower = blob.toLowerCase();

  if (lower.includes(normalized)) return true;

  const first = normalized.split(/\s+/)[0] ?? "";

  return first.length >= 2 && new RegExp(`\\b${first}\\b`, "i").test(blob);
}

function hasContactInfoInBlob(blob: string): boolean {
  return EMAIL_RE.test(blob) || PHONE_RE.test(blob);
}

export function hasClearOperationalRoleForName(name: string, blob: string): boolean {
  if (!nameAppearsInBlob(name, blob)) return false;

  return (
    NAMED_OWNERSHIP_RE.test(blob) ||
    OFFICE_NAME_RE.test(blob) ||
    OFFICE_IN_NAME_RE.test(blob) ||
    SCHEDULE_HELP_RE.test(blob) ||
    PA_NAME_RE.test(blob) ||
    SCHEDULING_NAME_RE.test(blob) ||
    INVOLVED_SCHEDULING_NAME_RE.test(blob) ||
    ROLE_WITH_NAME_RE.test(blob) ||
    COLON_ATTRIBUTION_RE.test(blob) ||
    AS_SOMEONE_WHO_HELPS_RE.test(blob) ||
    (OPERATIONAL_ROLE_RE.test(blob) && OWNERSHIP_VERB_RE.test(blob))
  );
}

export function isWeakMentionOnly(
  name: string,
  quote: string,
  debriefText: string,
): boolean {
  const mentionOnly =
    MENTIONED_NAME_RE.test(quote) &&
    !OWNERSHIP_VERB_RE.test(quote) &&
    !OPERATIONAL_ROLE_RE.test(quote);

  if (!mentionOnly) return false;

  return !hasClearOperationalRoleForName(name, debriefText);
}

export function isVagueContactPhrase(text: string): boolean {
  const t = text.trim();

  if (!t) return true;

  return VAGUE_CONTACT_PHRASE_RE.some((re) => re.test(t));
}

const GENERIC_PERSON_NAME_TOKENS = new Set(
  [
    "partially",
    "identified",
    "named",
    "contact",
    "scheduler",
    "scheduling",
    "provider",
    "shared",
    "workflow",
    "owner",
    "office",
    "coordinator",
    "confirmed",
  ].map((s) => s.toLowerCase()),
);

export function isGenericPersonDisplayLabel(name: string): boolean {
  const n = normalizeName(name).toLowerCase();
  if (!n) return true;
  if (GENERIC_MULTIWORD_PERSON_LABELS.has(n)) return true;
  const parts = n.split(/\s+/);
  if (parts.length === 1 && BLOCKLISTED_NAMES.has(parts[0]!)) return true;
  if (parts.length >= 2 && parts.every((p) => GENERIC_PERSON_NAME_TOKENS.has(p))) return true;
  return false;
}

export function isInvalidSchedulingContactArtifact(text: string): boolean {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return true;
  if (/And Follow appears involved/i.test(trimmed)) return true;
  if (/appears involved in scheduler/i.test(trimmed)) return true;

  const inferredName = trimmed.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+appears involved/i)?.[1];
  if (inferredName && !isPlausiblePersonName(normalizeName(inferredName))) return true;

  if (/\bfollow up\b/i.test(trimmed) && !/\b[A-Z][a-z]{2,}\b/.test(trimmed.replace(/\bfollow up\b/gi, ""))) {
    return true;
  }

  const sentimentArtifact = trimmed.match(/^([A-Z][a-z]+)\s+(Seemed|Seems|Appeared|Appears|Open|Interested|Receptive|Willing)\b/);
  if (sentimentArtifact && !isPlausiblePersonName(normalizeName(sentimentArtifact[0] ?? ""))) {
    return true;
  }

  return false;
}

/** Prepositions and verbs that regex capture groups sometimes attach to person names. */
const CONTACT_NAME_ARTIFACT_TOKENS = new Set([
  "in",
  "into",
  "from",
  "with",
  "at",
  "the",
  "a",
  "an",
  "on",
  "for",
  "to",
  "by",
  "after",
  "before",
  "during",
  "while",
  "when",
  "where",
  "who",
  "ran",
  "also",
  "said",
  "mentioned",
  "noted",
  "appears",
  "seems",
  "lounge",
  "physician",
  "doctor",
  "dr",
  "prefers",
  "prefer",
  "preferred",
  "declined",
  "declines",
  "went",
  "goes",
  // Day-part / temporal tokens ("Lettuce Today", "Pepper Afternoon")
  "today",
  "yesterday",
  "tomorrow",
  "earlier",
  "later",
  "morning",
  "afternoon",
  "evening",
  "tonight",
  "between",
  // Verb / filler tokens captured by case-insensitive "Name … scrub tech" patterns
  "worked",
  "works",
  "working",
  "commented",
  "confirmed",
  "suggested",
  "setup",
  "staff",
  "team",
  "case",
  "or",
  "scrub",
  "tech",
  "circulator",
  "scheduler",
]);

export function isContactNameParsingArtifact(name: string): boolean {
  const normalized = name.trim().replace(/\s+/g, " ");
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return true;
  if (parts.length === 1 && CONTACT_NAME_ARTIFACT_TOKENS.has(parts[0]!.toLowerCase())) return true;
  if (parts.some((part) => CONTACT_NAME_ARTIFACT_TOKENS.has(part.toLowerCase()))) return true;
  return false;
}

export function isPlausiblePersonName(name: string): boolean {
  const n = normalizeName(name);

  if (!n || n.length < 2) return false;

  if (isGenericPersonDisplayLabel(n)) return false;

  if (isBlocklistedName(n)) return false;

  if (!/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(n)) return false;

  if (n.length > 32) return false;

  const parts = n.split(/\s+/);

  if (parts.some((part) => PRONOUN_NAME_RE.test(part))) return false;

  if (parts[0] && PRONOUN_NAME_RE.test(parts[0])) return false;

  const rolePrefixBlocklist = new Set([
    "appears",
    "seems",
    "scheduling",
    "owner",
    "office",
    "provider",
  ]);
  if (parts[0] && rolePrefixBlocklist.has(parts[0].toLowerCase())) return false;

  if (parts.some((part) => BLOCKLISTED_NAMES.has(part.toLowerCase()))) return false;

  if (isContactNameParsingArtifact(n)) return false;

  // Reject surname + sentiment/verb artifacts ("Ham Seemed", "Salt Open").
  if (parts.length > 1 && parts.slice(1).some((part) => BLOCKLISTED_NAMES.has(part.toLowerCase()))) {
    return false;
  }

  return true;
}

function quoteWindow(text: string, index: number, matchLen: number): string {
  const start = Math.max(0, index - 24);

  const end = Math.min(text.length, index + matchLen + 48);

  return text.slice(start, end).trim().slice(0, 220);
}

function levelToLegacyConfidence(
  level: DebriefPersonMentionLevel,
): DebriefContactLeadConfidence {
  if (level === "confirmed_support_contact") return "strong";

  if (level === "potential_support_contact" || level === "workflow_participant") return "strong";

  return "partial";
}

export function classifyPersonMentionFromDebrief(input: {
  name: string;

  quote: string;

  debriefText?: string;
}): DebriefPersonMentionLevel | "ignore" {
  const name = normalizeName(input.name);

  const blob = `${input.quote} ${input.debriefText ?? ""}`.trim();

  if (!isPlausiblePersonName(name)) return "ignore";

  if (
    isVagueContactPhrase(blob) &&
    !hasClearOperationalRoleForName(name, blob)
  ) {
    return "ignore";
  }

  const contactInfoMissing =
    CONTACT_INFO_MISSING_RE.test(blob) && nameAppearsInBlob(name, blob);

  if (
    hasContactInfoInBlob(blob) &&
    nameAppearsInBlob(name, blob) &&
    !contactInfoMissing
  ) {
    return "potential_support_contact";
  }

  if (
    nameAppearsInBlob(name, blob) &&
    !contactInfoMissing &&
    (EXPLICIT_USE_CONTACT_RE.test(blob) || CONTACT_METHOD_RE.test(blob))
  ) {
    return "potential_support_contact";
  }

  if (hasClearOperationalRoleForName(name, blob) || contactInfoMissing) {
    return "workflow_participant";
  }

  if (isWeakMentionOnly(name, input.quote, input.debriefText ?? "")) {
    return "mentioned_person";
  }

  if (nameAppearsInBlob(name, blob) && MENTIONED_NAME_RE.test(blob)) {
    return "mentioned_person";
  }

  return "ignore";
}

/** @deprecated Use classifyPersonMentionFromDebrief */

export function assessContactLeadConfidence(input: {
  name: string;

  quote: string;

  debriefText?: string;
}): DebriefContactLeadConfidence {
  const level = classifyPersonMentionFromDebrief(input);

  if (level === "ignore") return "ignore";

  return levelToLegacyConfidence(level);
}

/** Role-only mentions without a name — narrative only, not a contact card. */

export function isRoleOnlyContactMention(text: string): boolean {
  const t = text.trim();

  if (!t) return false;

  if (isVagueContactPhrase(t)) return true;

  if (
    OPERATIONAL_ROLE_RE.test(t) &&
    !/\b[A-Z][a-z]{2,}\b/.test(t.replace(OPERATIONAL_ROLE_RE, ""))
  ) {
    return true;
  }

  return false;
}

export function personMentionEligibleForSupportContactReview(
  lead: Pick<DebriefContactLeadCandidate, "level">,
): boolean {
  return lead.level === "confirmed_support_contact";
}

export function personMentionEligibleForWorkflowParticipantReview(
  lead: Pick<DebriefContactLeadCandidate, "level">,
): boolean {
  return (
    lead.level === "workflow_participant" || lead.level === "potential_support_contact"
  );
}

/** @deprecated Use personMentionEligibleForSupportContactReview */

export function contactLeadEligibleForReviewCard(
  lead: Pick<
    DebriefContactLeadCandidate,
    "name" | "quote" | "confidence" | "level"
  >,
): boolean {
  const level =
    lead.level ??
    (lead.confidence === "strong"
      ? "potential_support_contact"
      : lead.confidence === "partial"
        ? "mentioned_person"
        : null);

  if (!level) return false;

  return (
    personMentionEligibleForSupportContactReview({ level }) ||
    personMentionEligibleForWorkflowParticipantReview({ level })
  );
}

function addCandidate(
  found: DebriefContactLeadCandidate[],

  seen: Map<string, DebriefContactLeadCandidate>,

  input: { name: string; quote: string; debriefText: string },
): void {
  const name = normalizeName(input.name);

  const level = classifyPersonMentionFromDebrief({
    name,

    quote: input.quote,

    debriefText: input.debriefText,
  });

  if (level === "ignore") return;

  const key = name.toLowerCase();

  const candidate: DebriefContactLeadCandidate = {
    name,

    quote: input.quote,

    level,

    confidence: levelToLegacyConfidence(level),
  };

  const existing = seen.get(key);

  if (!existing) {
    seen.set(key, candidate);

    found.push(candidate);

    return;
  }

  const rank: Record<DebriefPersonMentionLevel, number> = {
    mentioned_person: 0,
    workflow_participant: 1,
    potential_support_contact: 1,
    confirmed_support_contact: 2,
  };

  if (rank[level] > rank[existing.level]) {
    seen.set(key, candidate);

    const idx = found.findIndex((c) => c.name.toLowerCase() === key);

    if (idx >= 0) found[idx] = candidate;
  }
}

export function extractContactLeadsFromDebriefText(
  text: string,
): DebriefContactLeadCandidate[] {
  const found: DebriefContactLeadCandidate[] = [];

  const seen = new Map<string, DebriefContactLeadCandidate>();

  const patterns: RegExp[] = [
    NAMED_OWNERSHIP_RE,

    OFFICE_NAME_RE,

    OFFICE_IN_NAME_RE,

    SCHEDULE_HELP_RE,

    PA_NAME_RE,

    COMMA_ROLE_SCHEDULER_RE,

    SCHEDULING_NAME_RE,

    INVOLVED_SCHEDULING_NAME_RE,

    FOLLOW_UP_WITH_NAME_RE,

    ROLE_WITH_NAME_RE,

    COLON_ATTRIBUTION_RE,

    MENTIONED_FULL_NAME_RE,

    AS_SOMEONE_WHO_HELPS_RE,
  ];

  for (const pattern of patterns) {
    const re = new RegExp(
      pattern.source,
      pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
    );

    let match: RegExpExecArray | null;

    while ((match = re.exec(text)) !== null) {
      const name = match[1] ?? match[2] ?? "";

      addCandidate(found, seen, {
        name,

        quote: quoteWindow(text, match.index, match[0].length),

        debriefText: text,
      });
    }
  }

  const mentionedRe =
    /\b(?:mentioned|bringing\s+up|brought\s+up|name(?:d)?)\s+([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)?)\b/gi;

  let mentionMatch: RegExpExecArray | null;

  while ((mentionMatch = mentionedRe.exec(text)) !== null) {
    addCandidate(found, seen, {
      name: mentionMatch[1] ?? "",

      quote: quoteWindow(text, mentionMatch.index, mentionMatch[0].length),

      debriefText: text,
    });
  }

  return dropSurnameOnlyDuplicates(found.slice(0, 6));
}

function dropSurnameOnlyDuplicates(
  leads: DebriefContactLeadCandidate[],
): DebriefContactLeadCandidate[] {
  const multiWord = leads.filter((lead) => lead.name.trim().split(/\s+/).length > 1);
  return leads.filter((lead) => {
    const parts = lead.name.trim().split(/\s+/);
    if (parts.length !== 1) return true;
    const surname = lead.name.toLowerCase();
    return !multiWord.some((full) => {
      const tokens = full.name.toLowerCase().split(/\s+/);
      return tokens.length > 1 && tokens[tokens.length - 1] === surname;
    });
  });
}

export function extractMentionedPeopleFromDebriefText(
  text: string,
): Array<{ name: string; quote: string }> {
  return extractContactLeadsFromDebriefText(text)
    .filter((c) => c.level === "mentioned_person")

    .map(({ name, quote }) => ({ name, quote }));
}

export function extractWorkflowParticipantCandidatesFromDebriefText(
  text: string,
): Array<{ name: string; quote: string; level: DebriefPersonMentionLevel }> {
  return extractContactLeadsFromDebriefText(text)
    .filter(personMentionEligibleForWorkflowParticipantReview)
    .map(({ name, quote, level }) => ({ name, quote, level }));
}

export function extractSupportContactCandidatesFromDebriefText(
  text: string,
): Array<{ name: string; quote: string; level: DebriefPersonMentionLevel }> {
  return extractContactLeadsFromDebriefText(text)
    .filter(personMentionEligibleForSupportContactReview)
    .map(({ name, quote, level }) => ({ name, quote, level }));
}

export function extractReviewableContactsFromDebriefText(
  text: string,
): Array<{ name: string; quote: string; level: DebriefPersonMentionLevel }> {
  const byName = new Map<
    string,
    { name: string; quotes: string[]; level: DebriefPersonMentionLevel }
  >();
  const rank: Record<DebriefPersonMentionLevel, number> = {
    mentioned_person: 0,
    workflow_participant: 1,
    potential_support_contact: 1,
    confirmed_support_contact: 2,
  };

  for (const lead of [
    ...extractWorkflowParticipantCandidatesFromDebriefText(text),
    ...extractSupportContactCandidatesFromDebriefText(text),
  ]) {
    const key = lead.name.toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { name: lead.name, quotes: [lead.quote], level: lead.level });
      continue;
    }
    if (lead.quote.trim() && !existing.quotes.includes(lead.quote)) {
      existing.quotes.push(lead.quote);
    }
    if (rank[lead.level] > rank[existing.level]) {
      existing.level = lead.level;
      existing.name = lead.name;
    }
  }

  return [...byName.values()].map(({ name, quotes, level }) => ({
    name,
    quote: quotes.find((q) => q.trim()) ?? "",
    level,
  }));
}
