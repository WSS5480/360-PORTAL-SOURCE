/**
 * Candidate contacts — Mentioned → Suggested → Confirmed lifecycle.
 * Persisted on provider_commercial_intelligence.candidate_contacts (JSONB).
 */

import {
  contactsApprovedForCandidateStorage,
  type DebriefProposedContactItem,
} from "@/lib/surgical-sales/debriefDetectedContact";
import {
  emptyProviderCommercialIntelligence,
  mergeProviderCommercialIntelligence,
  parseProviderCommercialIntelligence,
  type CandidateContactIntelligence,
  type CandidateContactLifecycle,
  type ProviderCommercialIntelligence,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

export type {
  CandidateContactIntelligence,
  CandidateContactLifecycle,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function isNewerMention(next: CandidateContactIntelligence, existing: CandidateContactIntelligence): boolean {
  const nextTime = Date.parse(next.captured_at);
  const existingTime = Date.parse(existing.captured_at);
  if (!Number.isFinite(nextTime) || !Number.isFinite(existingTime)) return false;
  return nextTime > existingTime;
}

function lifecycleFromProposed(contact: DebriefProposedContactItem): CandidateContactLifecycle {
  if (contact.linkedContactId?.trim()) return "confirmed";
  if (contact.disposition === "accepted" || contact.disposition === "link") {
    return "suggested";
  }
  if (contact.mentionLevel === "confirmed_support_contact") {
    return "confirmed";
  }
  if (
    contact.mentionLevel === "workflow_participant" ||
    contact.mentionLevel === "potential_support_contact"
  ) {
    return "suggested";
  }
  return "mentioned";
}

function statusFromProposed(contact: DebriefProposedContactItem): CandidateContactIntelligence["status"] {
  if (contact.linkedContactId?.trim()) return "confirmed";
  if (contact.disposition === "accepted" || contact.disposition === "link") return "active";
  return "active";
}

function workflowRoleFromContact(contact: DebriefProposedContactItem): string | null {
  const role = `${contact.roleLabel ?? ""} ${contact.workflowLabel ?? ""}`.trim();
  if (/schedul/i.test(role)) return "scheduler";
  if (role) return role.toLowerCase().replace(/\s+/g, "_");
  return null;
}

export function candidateContactFromProposed(
  contact: DebriefProposedContactItem,
  capture?: { sourceEngagementId?: string | null; capturedAt?: string },
): CandidateContactIntelligence | null {
  const contactName = contact.displayName.trim();
  if (!contactName) return null;

  const lifecycle = lifecycleFromProposed(contact);
  const status = statusFromProposed(contact);

  return {
    id: contact.id || `candidate-${normalizeNameKey(contactName)}`,
    contact_name: contactName,
    contact_role: contact.roleLabel?.trim() || contact.workflowLabel?.trim() || null,
    lifecycle: status === "confirmed" ? "confirmed" : lifecycle,
    status,
    source_quote: contact.sourceQuote?.trim() || null,
    source_reference: contact.sourceReference?.trim() || null,
    source_engagement_id: capture?.sourceEngagementId?.trim() || null,
    captured_at: capture?.capturedAt ?? new Date().toISOString(),
    linked_contact_id: contact.linkedContactId?.trim() || null,
    mention_level: contact.mentionLevel,
    workflow_role: workflowRoleFromContact(contact),
  };
}

export function mergeCandidateContacts(
  current: CandidateContactIntelligence[],
  incoming: CandidateContactIntelligence[],
): CandidateContactIntelligence[] {
  const byKey = new Map<string, CandidateContactIntelligence>();

  for (const row of current) {
    byKey.set(normalizeNameKey(row.contact_name), row);
  }

  for (const next of incoming) {
    const key = normalizeNameKey(next.contact_name);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, next);
      continue;
    }

    const lifecycleRank: Record<CandidateContactLifecycle, number> = {
      mentioned: 1,
      suggested: 2,
      confirmed: 3,
    };

    byKey.set(key, {
      ...existing,
      contact_role: next.contact_role ?? existing.contact_role,
      lifecycle:
        lifecycleRank[next.lifecycle] >= lifecycleRank[existing.lifecycle]
          ? next.lifecycle
          : existing.lifecycle,
      status:
        next.status === "confirmed" || existing.status === "confirmed"
          ? "confirmed"
          : next.status === "dismissed"
            ? "dismissed"
            : existing.status === "dismissed" && next.status === "active"
              ? isNewerMention(next, existing)
                ? "active"
                : "dismissed"
              : existing.status,
      source_quote: next.source_quote ?? existing.source_quote,
      source_reference: next.source_reference ?? existing.source_reference,
      source_engagement_id: next.source_engagement_id ?? existing.source_engagement_id,
      captured_at: next.captured_at || existing.captured_at,
      linked_contact_id: next.linked_contact_id ?? existing.linked_contact_id,
      mention_level: next.mention_level ?? existing.mention_level,
      workflow_role: next.workflow_role ?? existing.workflow_role,
    });
  }

  return [...byKey.values()];
}

export function candidateContactsFromProposedList(
  contacts: DebriefProposedContactItem[],
  capture?: { sourceEngagementId?: string | null; capturedAt?: string },
): CandidateContactIntelligence[] {
  return contacts
    .map((contact) => candidateContactFromProposed(contact, capture))
    .filter((row): row is CandidateContactIntelligence => row != null);
}

export function readCandidateContacts(contact: Record<string, unknown>): CandidateContactIntelligence[] {
  const intel = parseProviderCommercialIntelligence(contact);
  return intel?.candidate_contacts ?? [];
}

/** Active suggested contacts — not confirmed, not dismissed. */
export function listActiveSuggestedContacts(
  contact: Record<string, unknown>,
): CandidateContactIntelligence[] {
  return readCandidateContacts(contact).filter(
    (row) =>
      row.status !== "confirmed" &&
      row.status !== "dismissed" &&
      row.lifecycle !== "confirmed" &&
      !row.linked_contact_id,
  );
}

export function resolveSuggestedSchedulerCandidate(
  contact: Record<string, unknown>,
): CandidateContactIntelligence | null {
  const candidates = listActiveSuggestedContacts(contact);
  const scheduler = candidates.find(
    (row) =>
      row.workflow_role === "scheduler" ||
      /schedul/i.test(`${row.contact_role ?? ""} ${row.workflow_role ?? ""}`),
  );
  if (scheduler) return scheduler;

  const intel = parseProviderCommercialIntelligence(contact);
  const unlinked = intel?.support_contacts.find(
    (row) => !row.linked_contact_id && /schedul/i.test(row.contact_role ?? ""),
  );
  if (unlinked) {
    return {
      id: `support-${normalizeNameKey(unlinked.contact_name)}`,
      contact_name: unlinked.contact_name,
      contact_role: unlinked.contact_role,
      lifecycle: "suggested",
      status: "active",
      source_quote: null,
      source_reference: null,
      source_engagement_id: null,
      captured_at: intel?.updated_at ?? new Date().toISOString(),
      linked_contact_id: null,
      mention_level: "potential_support_contact",
      workflow_role: "scheduler",
    };
  }

  return null;
}

export function mergeCandidateContactsIntoCommercialIntelligence(
  existing: ProviderCommercialIntelligence | null,
  incomingCandidates: CandidateContactIntelligence[],
): ProviderCommercialIntelligence {
  const base = existing ?? emptyProviderCommercialIntelligence();
  return mergeProviderCommercialIntelligence(base, {
    ...emptyProviderCommercialIntelligence(),
    candidate_contacts: incomingCandidates,
    updated_at: new Date().toISOString(),
  });
}

export async function persistProviderCandidateContacts(input: {
  providerId: string;
  contacts: DebriefProposedContactItem[];
  sourceEngagementId?: string | null;
}): Promise<void> {
  const approved = contactsApprovedForCandidateStorage(input.contacts);
  if (!approved.length) return;
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(input.providerId)}/candidate-contacts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contacts: approved,
        source_engagement_id: input.sourceEngagementId ?? null,
      }),
    },
  );
  const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string };
  if (!res.ok || !payload?.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Could not save candidate contacts.");
  }
}

export async function dismissProviderCandidateContact(input: {
  providerId: string;
  candidateId: string;
}): Promise<void> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(input.providerId)}/candidate-contacts`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_id: input.candidateId, action: "dismiss" }),
    },
  );
  const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string };
  if (!res.ok || !payload?.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Could not dismiss candidate contact.");
  }
}

export async function confirmProviderCandidateContact(input: {
  providerId: string;
  candidateId: string;
  linkedContactId?: string | null;
}): Promise<void> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(input.providerId)}/candidate-contacts`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_id: input.candidateId,
        action: "confirm",
        linked_contact_id: input.linkedContactId ?? null,
      }),
    },
  );
  const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string };
  if (!res.ok || !payload?.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Could not confirm candidate contact.");
  }
}
