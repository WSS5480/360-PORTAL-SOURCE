/**
 * Lightweight support contacts detected from AI debrief / log update.
 */

import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  discoveryIntelligenceSignalSupportsContact,
  discoverySupportContactPrimaryDbKey,
} from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";
import {
  assignProviderSupportContact,
} from "@/lib/surgical-sales/assignProviderSupportContact";
import {
  emptySupportContactDraft,
  type RapidDiscoverySupportContactDraft,
} from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import type {
  OperationalContactTypeId,
  SchedulingContactOwnershipType,
  WorkflowResponsibilityId,
} from "@/lib/surgical-sales/operationalSupportContact";
import { workflowResponsibilityLabel } from "@/lib/surgical-sales/operationalSupportContact";
import { buildPreservedNamedEntity } from "@/lib/surgical-sales/namedEntityPreservation";
import {
  DEBRIEF_CONFIRMED_CONTACT_STATUS,
  DEBRIEF_CONTACT_NOT_YET_ADDED,
  DEBRIEF_CONTACT_REQUIRES_DECISION,
  DEBRIEF_REVIEW_CONTACT_ACTION,
} from "@/lib/surgical-sales/debriefContactUxLabels";
import type { DebriefRecommendedAction } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import {
  type DebriefPersonMentionLevel,
  extractReviewableContactsFromDebriefText,
  isPlausiblePersonName,
} from "@/lib/surgical-sales/debriefContactLeadExtraction";

export type { DebriefPersonMentionLevel };

export const DEBRIEF_CONTACT_DETAILS_MISSING_MARKER = "[ai_debrief:contact_details_missing]";
export const SUGGESTED_CONTACT_SOURCE_LABEL = "Source: AI Extraction";

function supportContactSignalId(
  signalId: DiscoveryStructuredSignalId | null,
): import("@/lib/surgical-sales/discoveryIntelligenceSupportContact").DiscoverySupportContactSignalId | undefined {
  if (!signalId || !discoveryIntelligenceSignalSupportsContact(signalId)) return undefined;
  return signalId;
}

export type DebriefContactDisposition = "pending" | "add_details" | "link" | "skipped" | "accepted";

export type DebriefProposedContactItem = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  notes: string;
  contactTypeId: OperationalContactTypeId;
  contactTypeLabel: string;
  ownershipType: SchedulingContactOwnershipType;
  ownershipLabel: string;
  workflowResponsibilityId: WorkflowResponsibilityId;
  workflowLabel: string;
  roleLabel: string;
  sourceQuote: string | null;
  sourceReference: string;
  linkedContactId: string | null;
  linkedContactName: string | null;
  intelligenceDbKey: string;
  discoverySignalId: DiscoveryStructuredSignalId | null;
  disposition: DebriefContactDisposition;
  contactDetailsMissing: boolean;
  mentionLevel: DebriefPersonMentionLevel;
};

export const SUPPORT_CONTACT_INFO_NEEDED_LABEL = "Contact info needed";

export const DEBRIEF_PERSON_MENTION_LEVEL_LABELS: Record<DebriefPersonMentionLevel, string> = {
  mentioned_person: "Mentioned person",
  workflow_participant: "Workflow participant",
  potential_support_contact: "Potential support contact",
  confirmed_support_contact: "Confirmed support contact",
};

export const WORKFLOW_PARTICIPANT_STATUS = DEBRIEF_CONTACT_REQUIRES_DECISION;

export function contactRowNeedsDetails(contact: Record<string, unknown>): boolean {
  const email = String(contact.email ?? "").trim();
  const phone = String(contact.phone ?? contact.mobile_phone ?? "").trim();
  return !email && !phone;
}

export function relationshipNotesIndicateDetailsMissing(notes: string | null | undefined): boolean {
  return String(notes ?? "").includes(DEBRIEF_CONTACT_DETAILS_MISSING_MARKER);
}

export function splitPersonName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export function debriefContactFollowUpTask(displayName: string): string {
  const first = displayName.trim().split(/\s+/)[0] || "this contact";
  return `Get ${first}'s contact info.`;
}

function extractEmailFromText(text: string): string {
  const m = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  return m?.[0]?.trim() ?? "";
}

function extractPhoneFromText(text: string): string {
  const m = text.match(
    /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/,
  );
  return m?.[0]?.trim() ?? "";
}

function inferSchedulingFromQuote(quote: string): boolean {
  return /\b(schedul|coordinator|office manager|handles? cases|runs? the schedule|schedules?\b)/i.test(
    quote,
  );
}

export function isWorkflowParticipantContact(contact: DebriefProposedContactItem): boolean {
  return contact.mentionLevel === "workflow_participant";
}

export function workflowParticipantPossibleRole(
  contact: DebriefProposedContactItem,
  debriefText?: string,
): string | null {
  const text = `${contact.sourceQuote ?? ""} ${debriefText ?? ""}`.trim();
  return buildPreservedNamedEntity(contact.displayName, text).possibleRole;
}

export function roleLabelForProposedContact(input: {
  scheduling: boolean;
  mentionLevel: DebriefPersonMentionLevel;
  name?: string;
  quote?: string;
  debriefText?: string;
}): string {
  if (input.mentionLevel === "workflow_participant" && input.name) {
    const role = workflowParticipantPossibleRole(
      {
        displayName: input.name,
        sourceQuote: input.quote ?? null,
      } as DebriefProposedContactItem,
      input.debriefText,
    );
    if (role) return role;
  }
  if (input.scheduling) {
    return "Scheduling Coordinator";
  }
  if (input.mentionLevel === "workflow_participant" || input.mentionLevel === "potential_support_contact") {
    return "Workflow Participant";
  }
  return "Support contact";
}

export function buildProposedContactFromExtraction(input: {
  name: string;
  quote: string;
  sourceReference: string;
  debriefText: string;
  index: number;
  mentionLevel?: DebriefPersonMentionLevel;
}): DebriefProposedContactItem {
  const displayName = input.name.trim();
  if (!isPlausiblePersonName(displayName)) {
    throw new Error(`Invalid proposed contact name: ${displayName}`);
  }
  const { firstName, lastName } = splitPersonName(displayName);
  const email = extractEmailFromText(`${input.quote} ${input.debriefText}`);
  const phone = extractPhoneFromText(`${input.quote} ${input.debriefText}`);
  const scheduling = inferSchedulingFromQuote(`${input.quote} ${input.debriefText}`);
  const mentionLevel: DebriefPersonMentionLevel =
    input.mentionLevel ??
    (email || phone ? "confirmed_support_contact" : "workflow_participant");
  const workflowResponsibilityId: WorkflowResponsibilityId = scheduling
    ? "observation_scheduling_owner"
    : "case_coordination";
  const contactTypeId: OperationalContactTypeId = scheduling ? "scheduler" : "office_staff";
  const ownershipType: SchedulingContactOwnershipType = "provider";
  const intelligenceDbKey = scheduling
    ? "provider_scheduling_contact"
    : "provider_or_team_dynamics";
  const discoverySignalId: DiscoveryStructuredSignalId | null = scheduling ? "scheduling_owner" : null;

  return {
    id: `contact-${input.index}`,
    firstName,
    lastName,
    displayName,
    email,
    phone,
    notes: "",
    contactTypeId,
    contactTypeLabel: scheduling ? "Scheduler" : "Office staff",
    ownershipType,
    ownershipLabel: "Provider office team",
    workflowResponsibilityId,
    workflowLabel: workflowResponsibilityLabel(workflowResponsibilityId),
    roleLabel: roleLabelForProposedContact({
      scheduling,
      mentionLevel,
      name: input.name,
      quote: input.quote,
      debriefText: input.debriefText,
    }),
    sourceQuote: input.quote || null,
    sourceReference: input.sourceReference,
    linkedContactId: null,
    linkedContactName: null,
    intelligenceDbKey: discoverySignalId
      ? discoverySupportContactPrimaryDbKey(discoverySignalId)
      : intelligenceDbKey,
    discoverySignalId,
    disposition: "pending",
    contactDetailsMissing: !email && !phone,
    mentionLevel,
  };
}

export function debriefContactCardPrompt(contact: DebriefProposedContactItem): string {
  const subject = isPlausiblePersonName(contact.displayName)
    ? contact.displayName
    : isPlausiblePersonName(contact.firstName.trim())
      ? contact.firstName.trim()
      : null;
  if (!subject) {
    return `${DEBRIEF_CONTACT_NOT_YET_ADDED} — ${DEBRIEF_REVIEW_CONTACT_ACTION.toLowerCase()}.`;
  }
  if (contact.mentionLevel === "workflow_participant" || contact.mentionLevel === "mentioned_person") {
    const role = workflowParticipantPossibleRole(contact);
    if (role) {
      return `${subject} — possible role: ${role}. ${DEBRIEF_CONTACT_NOT_YET_ADDED}.`;
    }
    return `${subject} — ${DEBRIEF_CONTACT_NOT_YET_ADDED}. ${DEBRIEF_REVIEW_CONTACT_ACTION}.`;
  }
  if (contact.mentionLevel === "confirmed_support_contact" && !contact.contactDetailsMissing) {
    return `${subject} — ${DEBRIEF_CONFIRMED_CONTACT_STATUS}. Confirm details or link an existing contact.`;
  }
  const role = workflowParticipantPossibleRole(contact) ?? contact.roleLabel;
  if (role && role !== "Support contact" && role !== "Workflow Participant") {
    return `${subject} — possible role: ${role}. ${DEBRIEF_CONTACT_NOT_YET_ADDED}.`;
  }
  return `${subject} — ${DEBRIEF_CONTACT_NOT_YET_ADDED}. ${DEBRIEF_REVIEW_CONTACT_ACTION}.`;
}

/** Ensure every workflow contact action has a proposed contact row for Create / Link / Skip. */
export function mergeWorkflowContactsForRecommendedActions(input: {
  contacts: DebriefProposedContactItem[];
  actions: DebriefRecommendedAction[];
  dictation: string;
  sourceReference: string;
}): { contacts: DebriefProposedContactItem[]; actions: DebriefRecommendedAction[] } {
  const merged = [...input.contacts];
  const actions = input.actions.map((action) => ({ ...action }));
  let nextIndex = merged.length;

  for (const action of actions) {
    if (action.kind !== "create_workflow_contact") continue;
    const name = action.participantName?.trim();
    if (!name || !isPlausiblePersonName(name)) continue;

    const existing = merged.find((c) => c.displayName.toLowerCase() === name.toLowerCase());
    if (existing) {
      action.contactId = existing.id;
      continue;
    }

    if (action.contactId && merged.some((c) => c.id === action.contactId)) continue;

    const contact = buildProposedContactFromExtraction({
      name,
      quote: action.evidenceQuote ?? "",
      sourceReference: input.sourceReference,
      debriefText: input.dictation,
      index: nextIndex++,
      mentionLevel: "workflow_participant",
    });
    merged.push(contact);
    action.contactId = contact.id;
  }

  return { contacts: merged, actions };
}

export function supportContactDraftFromProposed(
  contact: DebriefProposedContactItem,
  organizationId: string | null,
): RapidDiscoverySupportContactDraft {
  const base = emptySupportContactDraft({
    dbKey: contact.intelligenceDbKey,
    organizationId,
    discoverySignalId: supportContactSignalId(contact.discoverySignalId),
    ownershipType: contact.ownershipType,
    initialMode: contact.linkedContactId ? "select" : "create",
  });

  const sourceNote = [
    SUGGESTED_CONTACT_SOURCE_LABEL,
    `Source: ${contact.sourceReference}`,
    contact.contactDetailsMissing ? DEBRIEF_CONTACT_DETAILS_MISSING_MARKER : null,
    contact.sourceQuote ? `Context: ${contact.sourceQuote}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ...base,
    mode: contact.linkedContactId ? "select" : "create",
    selectedContactId: contact.linkedContactId ?? "",
    contactTypeId: contact.contactTypeId,
    workflowResponsibilities: [contact.workflowResponsibilityId],
    ownershipType: contact.ownershipType,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email.trim(),
    phone: contact.phone.trim(),
    notes: [contact.notes.trim(), sourceNote].filter(Boolean).join("\n\n"),
    jobTitle: contact.roleLabel,
  };
}

function contactHasVerifiedDetails(contact: DebriefProposedContactItem): boolean {
  return Boolean(contact.linkedContactId?.trim() || contact.email.trim() || contact.phone.trim());
}

/** Rep-approved contacts without contact details — lightweight suggested CRM rows. */
export function contactsReadyForSuggestedPersist(
  contacts: DebriefProposedContactItem[],
): DebriefProposedContactItem[] {
  return contacts.filter((contact) => {
    if (contact.disposition === "skipped" || contact.disposition === "pending") return false;
    if (contact.disposition === "link") return false;
    if (contact.disposition === "accepted" || contact.disposition === "add_details") {
      return !contactHasVerifiedDetails(contact) && Boolean(contact.displayName.trim());
    }
    return false;
  });
}

/** Match proposed contact rows when UF/DIP cards use a different id (e.g. uf:*) than contact-0. */
export function findProposedContactIdForPersonName(
  name: string,
  contacts: DebriefProposedContactItem[],
): string | undefined {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return undefined;

  const exact = contacts.find((contact) => contact.displayName.trim().toLowerCase() === normalized);
  if (exact) return exact.id;

  const firstToken = normalized.split(/\s+/)[0] ?? "";
  if (firstToken.length < 3) return undefined;

  const byFirst = contacts.find((contact) => {
    const contactName = contact.displayName.trim().toLowerCase();
    return contactName === firstToken || contactName.startsWith(`${firstToken} `);
  });
  if (byFirst) return byFirst.id;

  return contacts.find((contact) => {
    const contactName = contact.displayName.trim().toLowerCase();
    const contactFirst = contactName.split(/\s+/)[0] ?? "";
    return normalized.startsWith(`${contactFirst} `) || contactFirst === normalized;
  })?.id;
}

export function findProposedContactForPersonName(
  name: string,
  contacts: DebriefProposedContactItem[],
): DebriefProposedContactItem | undefined {
  const id = findProposedContactIdForPersonName(name, contacts);
  return id ? contacts.find((contact) => contact.id === id) : undefined;
}

function syntheticProposedContactId(displayName: string, index: number): string {
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug ? `contact-${slug}` : `contact-${index}`;
}

/** Ensure every workflow-participant review card has a matching proposed contact row. */
export function mergeProposedContactsFromWorkflowCards(input: {
  proposedContacts: DebriefProposedContactItem[];
  cards: Array<{
    category: string;
    contactId?: string;
    displayName?: string;
    headline: string;
    roleValue?: string;
    evidenceQuotes?: string[];
  }>;
  dictation: string;
  sourceReference: string;
}): DebriefProposedContactItem[] {
  const merged = [...input.proposedContacts];
  const ids = new Set(merged.map((contact) => contact.id));
  const names = new Set(merged.map((contact) => contact.displayName.trim().toLowerCase()));
  let nextIndex = merged.length;

  for (const card of input.cards) {
    if (card.category !== "workflow_participant") continue;
    const displayName = card.displayName?.trim() || card.headline?.trim();
    if (!displayName || !isPlausiblePersonName(displayName)) continue;

    const nameKey = displayName.toLowerCase();
    const existingId = findProposedContactIdForPersonName(displayName, merged);
    const targetContactId =
      (existingId && card.contactId && (card.contactId === existingId || card.contactId.startsWith("uf:"))
        ? existingId
        : card.contactId?.trim()) ||
      existingId ||
      syntheticProposedContactId(displayName, nextIndex);

    if (existingId) {
      if (card.contactId?.startsWith("uf:") && existingId !== card.contactId) {
        const idx = merged.findIndex((contact) => contact.id === existingId);
        if (idx >= 0) {
          merged[idx] = {
            ...merged[idx]!,
            roleLabel: card.roleValue?.trim() || merged[idx]!.roleLabel,
          };
        }
      }
      continue;
    }

    if (names.has(nameKey) || ids.has(targetContactId)) continue;

    const quote = card.evidenceQuotes?.[0] ?? "";
    try {
      const created = buildProposedContactFromExtraction({
        name: displayName,
        quote,
        sourceReference: input.sourceReference,
        debriefText: input.dictation,
        index: nextIndex++,
        mentionLevel: "workflow_participant",
      });
      merged.push({
        ...created,
        id: targetContactId,
        roleLabel: card.roleValue?.trim() || created.roleLabel,
      });
      ids.add(targetContactId);
      names.add(nameKey);
    } catch {
      // Skip invalid person names.
    }
  }

  return merged;
}

/** Contacts approved for candidate_contacts JSONB sync — pending rows stay on file for intelligence-page review. */
export function contactsApprovedForCandidateStorage(
  contacts: DebriefProposedContactItem[],
): DebriefProposedContactItem[] {
  return contacts.filter((contact) => contact.disposition !== "skipped");
}

export function contactsReadyToPersist(contacts: DebriefProposedContactItem[]): DebriefProposedContactItem[] {
  return contacts.filter((c) => {
    if (c.disposition === "skipped" || c.disposition === "pending") return false;
    if (c.disposition === "link" && Boolean(c.linkedContactId?.trim())) return true;
    if (c.disposition === "accepted" || c.disposition === "add_details") {
      return contactHasVerifiedDetails(c);
    }
    return false;
  });
}

export async function persistDebriefDetectedContacts(input: {
  providerId: string;
  organizationId: string | null;
  contacts: DebriefProposedContactItem[];
  sourceLabel?: string;
}): Promise<{
  saved: Array<{ contactId: string; displayName: string }>;
  followUpTasks: string[];
  errors: string[];
}> {
  const saved: Array<{ contactId: string; displayName: string }> = [];
  const followUpTasks: string[] = [];
  const errors: string[] = [];

  const persistItem = async (
    item: DebriefProposedContactItem,
    options: { validate: boolean; verificationStatus: "suggested" | "verified" },
  ) => {
    const draft = supportContactDraftFromProposed(item, input.organizationId);
    const result = await assignProviderSupportContact({
      providerId: input.providerId,
      dbKey: item.intelligenceDbKey,
      draft,
      sourceLabel: input.sourceLabel ?? "AI debrief",
      validate: options.validate,
      verificationStatus: options.verificationStatus,
      discoverySignalId: supportContactSignalId(item.discoverySignalId),
    });
    const contactId = String(result.linked.contact.id ?? "");
    const displayName = result.linked.displayName;
    saved.push({ contactId, displayName });
    item.linkedContactId = contactId;
    item.linkedContactName = displayName;
    if (item.contactDetailsMissing && options.verificationStatus === "verified") {
      const task = debriefContactFollowUpTask(displayName);
      if (!followUpTasks.includes(task)) followUpTasks.push(task);
    }
  };

  for (const item of contactsReadyToPersist(input.contacts)) {
    try {
      await persistItem(item, { validate: true, verificationStatus: "verified" });
    } catch (e: unknown) {
      errors.push(e instanceof Error ? e.message : `Could not save ${item.displayName}`);
    }
  }

  for (const item of contactsReadyForSuggestedPersist(input.contacts)) {
    try {
      await persistItem(item, { validate: false, verificationStatus: "suggested" });
    } catch (e: unknown) {
      errors.push(e instanceof Error ? e.message : `Could not save ${item.displayName}`);
    }
  }

  return { saved, followUpTasks, errors };
}

/** Workflow participants and confirmed support contacts — not bare mentioned people. */
export function extractContactNamesFromDebriefText(text: string): Array<{
  name: string;
  quote: string;
  mentionLevel: DebriefPersonMentionLevel;
}> {
  return extractReviewableContactsFromDebriefText(text).map(({ name, quote, level }) => ({
    name,
    quote,
    mentionLevel: level,
  }));
}
