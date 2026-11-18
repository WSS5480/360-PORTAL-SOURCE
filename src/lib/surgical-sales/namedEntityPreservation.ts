/**
 * Preserve explicitly named people in debrief / discovery copy — never swap names for generic summaries.
 */

import {
  CONTACT_INFO_MISSING_RE,
  extractContactLeadsFromDebriefText,
  isPlausiblePersonName,
  type DebriefPersonMentionLevel,
} from "@/lib/surgical-sales/debriefContactLeadExtraction";
import {
  detectSchedulingContactReplacement,
  isDepartedSchedulingOwner,
  normalizeExtractedPersonName,
} from "@/lib/surgical-sales/schedulingContactOwnership";

export type NamedEntityConfidence = "High" | "Medium" | "Low";

export type PreservedNamedEntity = {
  name: string;
  possibleRole: string | null;
  nameConfidence: NamedEntityConfidence;
  roleConfidence: NamedEntityConfidence;
};

const SHARED_SCHEDULING_RE =
  /\b(works?\s+with\s+(?:the\s+)?or\s+scheduling|office\s+and\s+or|both\s+office\s+and|or\s+scheduling\s+team)\b/i;

const PARTIAL_LEAD_NAME_RE = /\[Partial lead\]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;

const NAMED_OWNERSHIP_RE =
  /\b([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)?)\s+(?:handles?|schedules?|coordinates?|runs?|manages?|evaluates?|approves?|owns?|oversees?|gets?\s+involved)\b/gi;

const OFFICE_NAME_RE = /\b([A-Za-z][a-z]+)\s+from\s+(?:(?:his|her|their)|the)\s+office\b/gi;

const OFFICE_IN_NAME_RE = /\b([A-Za-z][a-z]+)\s+in\s+(?:his|her|their)\s+office\b/gi;

const CAME_UP_NAME_RE = /\b([A-Za-z][a-z]+)\s+came up\b/gi;

const LEADING_NAME_PAREN_RE = /\b([A-Za-z][a-z]+)\s+\(/g;

const PA_NAME_RE = /\b([A-Za-z][a-z]+),?\s+(?:his|her|their)\s+PA\b/gi;

const SCHEDULING_NAME_RE =
  /\b([A-Za-z][a-z]+)\s+(?:handles?|schedules?).{0,64}scheduling\b/gi;

const FOLLOW_UP_WITH_NAME_RE =
  /\bfollow(?:\s|-)?up\s+with\s+([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)?)\b/gi;

const ROLE_WITH_NAME_RE =
  /\b(?:scheduler|coordinator|office\s+manager|or\s+coordinator|materials\s+manager)\s*(?:[:\-–—]\s*|\bis\s+)?([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)?)\b/gi;

const TITLED_NAME_RE = /\b(?:Dr\.|Mr\.|Ms\.|Mrs\.)\s+([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)?)\b/gi;

function normalizePersonName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function schedulingContextWindowForName(name: string, text: string): string {
  const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, "i");
  const match = re.exec(text);
  if (match?.index == null) return text.trim();
  return text.slice(match.index, Math.min(text.length, match.index + 320));
}

function pronounSchedulingOwnershipNearName(name: string, text: string): boolean {
  const window = schedulingContextWindowForName(name, text);
  return /\b(?:she|he)\s+handles?\s+(?:most\s+of\s+the\s+)?scheduling\b/i.test(window);
}

function sentenceContainingName(name: string, text: string): string {
  const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, "i");
  const sentence = text
    .split(/(?<=[.!?])\s+/)
    .find((part) => re.test(part));
  return sentence?.trim() || text.trim();
}

function roleContextForPerson(name: string, text: string): string {
  const sentence = sentenceContainingName(name, text);
  if (pronounSchedulingOwnershipNearName(name, text)) {
    return `${sentence} ${schedulingContextWindowForName(name, text)}`.trim();
  }
  return sentence;
}

function collectNamesFromPattern(text: string, pattern: RegExp, group = 1): string[] {
  const names: string[] = [];
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const raw = match[group] ?? match[1] ?? match[2] ?? "";
    if (raw) names.push(raw);
  }
  return names;
}

export function extractPersonNamesFromNote(text: string): string[] {
  const blob = String(text ?? "").trim();
  if (!blob) return [];

  const seen = new Set<string>();
  const names: string[] = [];
  const add = (raw: string) => {
    const name = normalizeExtractedPersonName(normalizePersonName(raw));
    if (!isPlausiblePersonName(name)) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    names.push(name);
  };

  const partialLead = blob.match(PARTIAL_LEAD_NAME_RE);
  if (partialLead?.[1]) add(partialLead[1]);

  for (const lead of extractContactLeadsFromDebriefText(blob)) {
    add(lead.name);
  }

  for (const pattern of [
    NAMED_OWNERSHIP_RE,
    OFFICE_NAME_RE,
    OFFICE_IN_NAME_RE,
    LEADING_NAME_PAREN_RE,
    CAME_UP_NAME_RE,
    PA_NAME_RE,
    SCHEDULING_NAME_RE,
    FOLLOW_UP_WITH_NAME_RE,
    ROLE_WITH_NAME_RE,
    TITLED_NAME_RE,
  ]) {
    for (const raw of collectNamesFromPattern(blob, pattern)) add(raw);
  }

  return names;
}

function mentionLevelForName(name: string, text: string): DebriefPersonMentionLevel | null {
  const lead = extractContactLeadsFromDebriefText(text).find(
    (candidate) => candidate.name.toLowerCase() === name.toLowerCase(),
  );
  return lead?.level ?? null;
}

function inferRoleForPerson(name: string, text: string): { role: string | null; confidence: NamedEntityConfidence } {
  const sentence = roleContextForPerson(name, text);

  if (/\bhandles?\s+scheduling\b/i.test(sentence)) {
    return { role: "Scheduling Coordinator", confidence: "High" };
  }
  if (/\bcoordinat\w*\s+(?:\w+\s+){0,2}scheduling\b/i.test(sentence)) {
    return { role: "Scheduling Coordinator", confidence: "High" };
  }
  if (/\bhelp(?:s|ed)?\s+(?:coordinate\s+)?scheduling\b/i.test(sentence)) {
    return { role: "Scheduling Coordinator", confidence: "High" };
  }
  if (/\boffice\s+manager\b/i.test(sentence)) {
    return { role: "Office Manager", confidence: "High" };
  }
  if (/\b(?:or\s+coordinator|or\s+contact)\b/i.test(sentence)) {
    return { role: "OR Coordinator", confidence: "High" };
  }
  if (/\bscheduler\b/i.test(sentence)) {
    return { role: "Scheduler", confidence: "High" };
  }
  if (/\bcredentialing\b/i.test(sentence)) {
    return { role: "Credentialing Contact", confidence: "Medium" };
  }
  if (/\b(?:,\s*|\b)(?:his|her|their)\s+PA\b/i.test(sentence) || /\bPA\b/.test(sentence)) {
    return { role: "Physician Assistant", confidence: "High" };
  }
  if (/\bhelp(?:s|ed)?\s+with\s+timing\b/i.test(sentence)) {
    return { role: "Scheduling Coordinator", confidence: "Medium" };
  }
  if (/\bcame up\b/i.test(sentence) && /\b(?:timing|schedule|scheduling)\b/i.test(sentence)) {
    return { role: "Scheduling Coordinator", confidence: "Medium" };
  }
  if (/\b(?:workflow|evaluat\w*|product)\b/i.test(sentence)) {
    return { role: "Workflow Participant", confidence: "Medium" };
  }
  if (/\bschedul/i.test(sentence)) {
    return { role: "Scheduling Coordinator", confidence: "Medium" };
  }

  return { role: null, confidence: "Low" };
}

function assessNameConfidence(
  name: string,
  text: string,
  mentionLevel: DebriefPersonMentionLevel | null,
): NamedEntityConfidence {
  const sentence = roleContextForPerson(name, text);

  if (mentionLevel === "confirmed_support_contact") return "High";
  if (PARTIAL_LEAD_NAME_RE.test(text) && new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(text)) {
    return "High";
  }
  if (/\b(?:Dr\.|Mr\.|Ms\.|Mrs\.)\s+/i.test(sentence)) return "High";
  if (/\bhandles?\s+scheduling\b/i.test(sentence)) return "High";
  if (/\bhandles?\s+(?:most\s+of\s+the\s+)?scheduling\b/i.test(sentence)) return "High";
  if (pronounSchedulingOwnershipNearName(name, text)) return "High";
  if (/\bcoordinat\w*\s+scheduling\b/i.test(sentence)) return "High";
  if (/\b(?:,\s*|\b)(?:his|her|their)\s+PA\b/i.test(sentence)) return "High";
  if (mentionLevel === "potential_support_contact" || mentionLevel === "workflow_participant") return "High";
  if (/\bcame up\b/i.test(sentence)) return "High";
  if (/\bhelp(?:s|ed)?\s+(?:coordinate\s+)?scheduling\b/i.test(sentence)) return "High";
  if (/\bhelp(?:s|ed)?\s+with\s+timing\b/i.test(sentence)) return "Medium";
  if (/\b(?:mentioned|bringing\s+up|brought\s+up|name(?:d)?)\b/i.test(sentence)) return "Medium";
  if (mentionLevel === "mentioned_person") return "Medium";
  return "Low";
}

export function buildPreservedNamedEntity(name: string, text: string): PreservedNamedEntity {
  const normalizedName = normalizePersonName(name);
  const mentionLevel = mentionLevelForName(normalizedName, text);
  const role = inferRoleForPerson(normalizedName, text);
  return {
    name: normalizedName,
    possibleRole: role.role,
    nameConfidence: assessNameConfidence(normalizedName, text, mentionLevel),
    roleConfidence: role.confidence,
  };
}

export function extractPreservedNamedEntities(text: string): PreservedNamedEntity[] {
  return extractPersonNamesFromNote(text).map((name) => buildPreservedNamedEntity(name, text));
}

export function extractPrimaryNamedPerson(text: string): PreservedNamedEntity | null {
  const entities = extractPreservedNamedEntities(text);
  if (entities.length === 0) return null;

  const rank: Record<NamedEntityConfidence, number> = { High: 3, Medium: 2, Low: 1 };
  return [...entities].sort((a, b) => {
    const scoreA = rank[a.nameConfidence] * 10 + rank[a.roleConfidence];
    const scoreB = rank[b.nameConfidence] * 10 + rank[b.roleConfidence];
    return scoreB - scoreA;
  })[0]!;
}

function entityHasSchedulingContext(entity: PreservedNamedEntity, text: string): boolean {
  const role = entity.possibleRole?.toLowerCase() ?? "";
  if (role.includes("scheduling") || role.includes("scheduler") || role.includes("office manager")) {
    return true;
  }
  const context = roleContextForPerson(entity.name, text);
  return (
    pronounSchedulingOwnershipNearName(entity.name, text) ||
    /\bschedul/i.test(context) ||
    /\bhelp(?:s|ed)?\s+with\s+timing\b/i.test(context) ||
    /\bcame up\b/i.test(context)
  );
}

export function extractPrimarySchedulingNamedPerson(text: string): PreservedNamedEntity | null {
  const replacement = detectSchedulingContactReplacement(text);
  if (replacement) {
    return buildPreservedNamedEntity(replacement.successorName, text);
  }

  const schedulingEntities = extractPreservedNamedEntities(text).filter(
    (entity) =>
      entityHasSchedulingContext(entity, text) &&
      !isDepartedSchedulingOwner(entity.name, text),
  );
  if (schedulingEntities.length === 0) return null;

  const rank: Record<NamedEntityConfidence, number> = { High: 3, Medium: 2, Low: 1 };
  return [...schedulingEntities].sort((a, b) => {
    const scoreA = rank[a.nameConfidence] * 10 + rank[a.roleConfidence];
    const scoreB = rank[b.nameConfidence] * 10 + rank[b.roleConfidence];
    return scoreB - scoreA;
  })[0]!;
}

const CONFIDENCE_RANK: Record<NamedEntityConfidence, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export function shouldUseStructuredNamedEntityDisplay(entity: PreservedNamedEntity): boolean {
  if (!entity.possibleRole) return entity.nameConfidence !== "Low";
  return CONFIDENCE_RANK[entity.nameConfidence] > CONFIDENCE_RANK[entity.roleConfidence];
}

export function formatNamedEntityStructuredDisplay(
  entity: PreservedNamedEntity,
  options?: { contactInfoMissing?: boolean; evidenceQuote?: string | null },
): string {
  const lines: string[] = [];
  if (entity.possibleRole) {
    lines.push(`Possible role: ${entity.possibleRole}`);
  }
  if (options?.contactInfoMissing) {
    lines.push("Contact information missing");
  }
  const quote = options?.evidenceQuote?.trim();
  if (quote) {
    lines.push(`Evidence: ${quote}`);
  }
  if (lines.length > 0) return lines.join("\n");

  const confidence =
    CONFIDENCE_RANK[entity.roleConfidence] < CONFIDENCE_RANK[entity.nameConfidence]
      ? entity.roleConfidence
      : entity.nameConfidence;
  return `Confidence: ${confidence}`;
}

export function contactInfoMissingForNamedEntity(name: string, text: string): boolean {
  const blob = `${text} ${roleContextForPerson(name, text)}`.trim();
  return CONTACT_INFO_MISSING_RE.test(blob) && new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(blob);
}

export function buildNamedEntityActionSummary(entity: PreservedNamedEntity, text: string): string {
  const sentence = roleContextForPerson(entity.name, text);
  const shared = SHARED_SCHEDULING_RE.test(text);

  if (/\bhandles?\s+(?:most\s+of\s+the\s+)?scheduling\b/i.test(sentence)) {
    return shared
      ? `${entity.name} handles scheduling and works with the OR scheduling team.`
      : `${entity.name} handles scheduling.`;
  }
  if (/\bhandles?\s+scheduling\b/i.test(sentence)) {
    return shared
      ? `${entity.name} handles scheduling and works with the OR scheduling team.`
      : `${entity.name} handles scheduling.`;
  }
  if (/\bcoordinat\w*\s+scheduling\b/i.test(sentence)) {
    return shared
      ? `${entity.name} coordinates scheduling with the OR scheduling team.`
      : `${entity.name} coordinates scheduling.`;
  }
  if (/\bhelp(?:s|ed)?\s+with\s+timing\b/i.test(sentence)) {
    return `${entity.name} appears to help with scheduling timing; role and authority still need confirmation.`;
  }
  if (entity.possibleRole) {
    return `${entity.name} appears involved in ${entity.possibleRole.toLowerCase()} on the provider side.`;
  }
  return `${entity.name} appears involved in scheduling coordination on the provider side.`;
}

export function buildPreservedNamedEntitySummary(
  text: string,
  options?: { fallback?: string; schedulingOnly?: boolean },
): string {
  const entity = options?.schedulingOnly
    ? extractPrimarySchedulingNamedPerson(text)
    : extractPrimaryNamedPerson(text);
  if (!entity || !isPlausiblePersonName(entity.name)) return options?.fallback?.trim() || "";

  if (shouldUseStructuredNamedEntityDisplay(entity)) {
    const sentence = sentenceContainingName(entity.name, text);
    return formatNamedEntityStructuredDisplay(entity, {
      contactInfoMissing: contactInfoMissingForNamedEntity(entity.name, text),
      evidenceQuote: sentence,
    });
  }

  const sentence = sentenceContainingName(entity.name, text);
  if (CONFIDENCE_RANK[entity.roleConfidence] >= 2) {
    return buildNamedEntityActionSummary(entity, text);
  }
  if (/\bschedul/i.test(sentence)) {
    return `${entity.name} appears to handle scheduling.`;
  }
  if (entity.possibleRole) {
    return `${entity.name} appears to serve as ${entity.possibleRole.toLowerCase()}.`;
  }
  return `${entity.name} was named in this debrief.`;
}

export function buildSchedulingOwnershipEvidenceSummary(note: string): string {
  const text = note.trim();
  if (!text) return "Scheduling coordination was discussed; ownership is not fully confirmed.";

  const preserved = buildPreservedNamedEntitySummary(text, { schedulingOnly: true });
  if (preserved) return preserved;

  if (SHARED_SCHEDULING_RE.test(text)) {
    return "Scheduling appears split between the provider office and facility OR scheduling.";
  }
  if (/\bhelp(?:s|ed)?\s+with\s+timing\b/i.test(text) || /\b(?:came up|mentioned)\b/i.test(text)) {
    return "Scheduling coordination was mentioned indirectly; ownership is not confirmed.";
  }
  return "Scheduling coordination was discussed; ownership is not fully confirmed.";
}
