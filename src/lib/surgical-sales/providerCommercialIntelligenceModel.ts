/**
 * Structured commercial intelligence — workflow-driving objects, not sentence fragments.
 * Persisted on provider contact as provider_commercial_intelligence (JSONB).
 */

import type {
  ClinicalIntelligenceSignal,
  CommercialClinicalCategoryId,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";

export const PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY = "provider_commercial_intelligence";
export const PROVIDER_COMMERCIAL_INTELLIGENCE_VERSION = 1 as const;

export type IntelligenceTriState = "yes" | "no" | "unknown";
export type SchedulerIdentifiedState = "yes" | "partial" | "no" | "unknown";
export type ObservationInterestState = IntelligenceTriState;
export type ObservationApprovalStatus =
  | "approved"
  | "interested"
  | "discussed"
  | "not_approved"
  | "unknown";
export type ObservationReadinessState = "ready" | "conditional" | "not_ready" | "unknown";
export type ObservationAccessStatus = "open" | "partial" | "blocked" | "unknown";

export type ObservationIntelligence = {
  interest: ObservationInterestState;
  approval_status: ObservationApprovalStatus;
  credentialing_required: IntelligenceTriState;
  readiness: ObservationReadinessState;
  access_status: ObservationAccessStatus;
};

export type SchedulingIntelligence = {
  scheduler_identified: SchedulerIdentifiedState;
  scheduler_contact_linked: IntelligenceTriState;
  scheduling_workflow_known: IntelligenceTriState;
};

export type CredentialingIntelligence = {
  credentialing_required: IntelligenceTriState;
  credentialing_platform_known: IntelligenceTriState;
  credentialing_notes: string[];
};

export type ClinicalIntelligenceEntry = {
  category: CommercialClinicalCategoryId;
  display_label: string;
  source_text: string;
  signal?: ClinicalIntelligenceSignal | null;
  procedure_context?: string | null;
};

export type ClinicalIntelligence = {
  /** Structured clinical intelligence — category + normalized label + raw source. */
  entries: ClinicalIntelligenceEntry[];
  procedure_focus: string[];
  clinical_frustrations: string[];
  clinical_preferences: string[];
  workflow_observations: string[];
  product_interests: string[];
  trends: string[];
};

export type SupportContactScope = "provider" | "organization";

export type SupportContactIntelligence = {
  contact_name: string;
  contact_role: string | null;
  linked_contact_id: string | null;
  scope: SupportContactScope;
};

export type CandidateContactLifecycle = "mentioned" | "suggested" | "confirmed";

export type CandidateContactStatus = "active" | "dismissed" | "confirmed";

/** AI-detected person not yet linked as CRM support contact. */
export type CandidateContactIntelligence = {
  id: string;
  contact_name: string;
  contact_role: string | null;
  lifecycle: CandidateContactLifecycle;
  status: CandidateContactStatus;
  source_quote: string | null;
  source_reference: string | null;
  source_engagement_id: string | null;
  captured_at: string;
  linked_contact_id: string | null;
  mention_level: string | null;
  workflow_role: string | null;
};

export type ProviderCommercialIntelligence = {
  version: typeof PROVIDER_COMMERCIAL_INTELLIGENCE_VERSION;
  observation: ObservationIntelligence;
  scheduling: SchedulingIntelligence;
  credentialing: CredentialingIntelligence;
  clinical: ClinicalIntelligence;
  support_contacts: SupportContactIntelligence[];
  candidate_contacts: CandidateContactIntelligence[];
  updated_at: string | null;
};

export function emptyProviderCommercialIntelligence(): ProviderCommercialIntelligence {
  return {
    version: PROVIDER_COMMERCIAL_INTELLIGENCE_VERSION,
    observation: {
      interest: "unknown",
      approval_status: "unknown",
      credentialing_required: "unknown",
      readiness: "unknown",
      access_status: "unknown",
    },
    scheduling: {
      scheduler_identified: "unknown",
      scheduler_contact_linked: "unknown",
      scheduling_workflow_known: "unknown",
    },
    credentialing: {
      credentialing_required: "unknown",
      credentialing_platform_known: "unknown",
      credentialing_notes: [],
    },
    clinical: {
      entries: [],
      procedure_focus: [],
      clinical_frustrations: [],
      clinical_preferences: [],
      workflow_observations: [],
      product_interests: [],
      trends: [],
    },
    support_contacts: [],
    candidate_contacts: [],
    updated_at: null,
  };
}

function isTriState(value: unknown): value is IntelligenceTriState {
  return value === "yes" || value === "no" || value === "unknown";
}

function isSchedulerState(value: unknown): value is SchedulerIdentifiedState {
  return value === "yes" || value === "partial" || value === "no" || value === "unknown";
}

function isApprovalStatus(value: unknown): value is ObservationApprovalStatus {
  return (
    value === "approved" ||
    value === "interested" ||
    value === "discussed" ||
    value === "not_approved" ||
    value === "unknown"
  );
}

function normalizeReadinessState(value: unknown): ObservationReadinessState {
  if (value === "partial" || value === "conditional") return "conditional";
  if (value === "ready" || value === "not_ready" || value === "unknown") return value;
  return "unknown";
}

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function isAccessStatus(value: unknown): value is ObservationAccessStatus {
  return value === "open" || value === "partial" || value === "blocked" || value === "unknown";
}

function parseSupportContact(raw: unknown): SupportContactIntelligence | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const contact_name = String(row.contact_name ?? "").trim();
  if (!contact_name) return null;
  const linked = row.linked_contact_id;
  const scopeRaw = String(row.scope ?? "provider").trim().toLowerCase();
  return {
    contact_name,
    contact_role: row.contact_role != null ? String(row.contact_role).trim() || null : null,
    linked_contact_id:
      typeof linked === "string" && linked.trim() ? linked.trim() : null,
    scope: scopeRaw === "organization" ? "organization" : "provider",
  };
}

function isCandidateLifecycle(value: unknown): value is CandidateContactLifecycle {
  return value === "mentioned" || value === "suggested" || value === "confirmed";
}

function isCandidateStatus(value: unknown): value is CandidateContactStatus {
  return value === "active" || value === "dismissed" || value === "confirmed";
}

function parseCandidateContact(raw: unknown): CandidateContactIntelligence | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const contact_name = String(row.contact_name ?? "").trim();
  if (!contact_name) return null;
  const lifecycle = row.lifecycle;
  const status = row.status;
  const linked = row.linked_contact_id;
  return {
    id: String(row.id ?? `candidate-${contact_name.toLowerCase().replace(/\s+/g, "-")}`).trim(),
    contact_name,
    contact_role: row.contact_role != null ? String(row.contact_role).trim() || null : null,
    lifecycle: isCandidateLifecycle(lifecycle) ? lifecycle : "mentioned",
    status: isCandidateStatus(status) ? status : "active",
    source_quote: row.source_quote != null ? String(row.source_quote).trim() || null : null,
    source_reference:
      row.source_reference != null ? String(row.source_reference).trim() || null : null,
    source_engagement_id:
      row.source_engagement_id != null ? String(row.source_engagement_id).trim() || null : null,
    captured_at: String(row.captured_at ?? new Date().toISOString()),
    linked_contact_id:
      typeof linked === "string" && linked.trim() ? linked.trim() : null,
    mention_level: row.mention_level != null ? String(row.mention_level).trim() || null : null,
    workflow_role: row.workflow_role != null ? String(row.workflow_role).trim() || null : null,
  };
}

function isCommercialClinicalCategory(value: unknown): value is CommercialClinicalCategoryId {
  return (
    value === "procedure_focus" ||
    value === "clinical_frustration" ||
    value === "clinical_trend" ||
    value === "clinical_preference" ||
    value === "product_opportunity"
  );
}

function parseClinicalEntry(raw: unknown): ClinicalIntelligenceEntry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const category = row.category;
  const display_label = String(row.display_label ?? "").trim();
  const source_text = String(row.source_text ?? "").trim();
  if (!isCommercialClinicalCategory(category) || !display_label) return null;
  const signalRaw = row.signal;
  const signal =
    typeof signalRaw === "string" &&
    [
      "procedure_focus",
      "increasing_procedure_volume",
      "increasing_case_volume",
      "new_procedure_adoption",
      "clinical_frustration",
      "technology_preference",
      "product_opportunity",
    ].includes(signalRaw)
      ? (signalRaw as ClinicalIntelligenceSignal)
      : null;
  const procedure_context =
    row.procedure_context != null ? String(row.procedure_context).trim() || null : null;
  return {
    category,
    display_label,
    source_text: source_text || display_label,
    signal,
    procedure_context,
  };
}

function mergeClinicalEntries(
  base: ClinicalIntelligenceEntry[],
  incoming: ClinicalIntelligenceEntry[],
): ClinicalIntelligenceEntry[] {
  const merged = [...base];
  const seen = new Set(
    base.map((entry) => `${entry.category}:${entry.display_label}`.toLowerCase()),
  );
  for (const entry of incoming) {
    const key = `${entry.category}:${entry.display_label}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }
  return merged;
}

/** Parse persisted JSONB — returns null when absent or invalid. */
export function parseProviderCommercialIntelligence(
  contact: Record<string, unknown>,
): ProviderCommercialIntelligence | null {
  const raw = contact[PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (row.version !== PROVIDER_COMMERCIAL_INTELLIGENCE_VERSION) return null;

  const observationRaw = row.observation;
  const schedulingRaw = row.scheduling;
  const credentialingRaw = row.credentialing;
  const clinicalRaw = row.clinical;
  if (
    !observationRaw ||
    typeof observationRaw !== "object" ||
    !schedulingRaw ||
    typeof schedulingRaw !== "object" ||
    !credentialingRaw ||
    typeof credentialingRaw !== "object" ||
    !clinicalRaw ||
    typeof clinicalRaw !== "object"
  ) {
    return null;
  }

  const observation = observationRaw as Record<string, unknown>;
  const scheduling = schedulingRaw as Record<string, unknown>;
  const credentialing = credentialingRaw as Record<string, unknown>;
  const clinical = clinicalRaw as Record<string, unknown>;

  const base = emptyProviderCommercialIntelligence();

  return {
    version: PROVIDER_COMMERCIAL_INTELLIGENCE_VERSION,
    observation: {
      interest: isTriState(observation.interest) ? observation.interest : base.observation.interest,
      approval_status: isApprovalStatus(observation.approval_status)
        ? observation.approval_status
        : base.observation.approval_status,
      credentialing_required: isTriState(observation.credentialing_required)
        ? observation.credentialing_required
        : base.observation.credentialing_required,
      readiness: normalizeReadinessState(observation.readiness),
      access_status: isAccessStatus(observation.access_status)
        ? observation.access_status
        : base.observation.access_status,
    },
    scheduling: {
      scheduler_identified: isSchedulerState(scheduling.scheduler_identified)
        ? scheduling.scheduler_identified
        : base.scheduling.scheduler_identified,
      scheduler_contact_linked: isTriState(scheduling.scheduler_contact_linked)
        ? scheduling.scheduler_contact_linked
        : base.scheduling.scheduler_contact_linked,
      scheduling_workflow_known: isTriState(scheduling.scheduling_workflow_known)
        ? scheduling.scheduling_workflow_known
        : base.scheduling.scheduling_workflow_known,
    },
    credentialing: {
      credentialing_required: isTriState(credentialing.credentialing_required)
        ? credentialing.credentialing_required
        : base.credentialing.credentialing_required,
      credentialing_platform_known: isTriState(credentialing.credentialing_platform_known)
        ? credentialing.credentialing_platform_known
        : base.credentialing.credentialing_platform_known,
      credentialing_notes: uniqueNonEmpty(
        Array.isArray(credentialing.credentialing_notes)
          ? credentialing.credentialing_notes.map((n) => String(n))
          : [],
      ),
    },
    clinical: {
      entries: Array.isArray(clinical.entries)
        ? clinical.entries
            .map(parseClinicalEntry)
            .filter((entry): entry is ClinicalIntelligenceEntry => entry != null)
        : [],
      procedure_focus: uniqueNonEmpty(
        Array.isArray(clinical.procedure_focus)
          ? clinical.procedure_focus.map((n) => String(n))
          : [],
      ),
      clinical_frustrations: uniqueNonEmpty(
        Array.isArray(clinical.clinical_frustrations)
          ? clinical.clinical_frustrations.map((n) => String(n))
          : [],
      ),
      clinical_preferences: uniqueNonEmpty(
        Array.isArray(clinical.clinical_preferences)
          ? clinical.clinical_preferences.map((n) => String(n))
          : [],
      ),
      workflow_observations: uniqueNonEmpty(
        Array.isArray(clinical.workflow_observations)
          ? clinical.workflow_observations.map((n) => String(n))
          : [],
      ),
      product_interests: uniqueNonEmpty(
        Array.isArray(clinical.product_interests)
          ? clinical.product_interests.map((n) => String(n))
          : [],
      ),
      trends: uniqueNonEmpty(
        Array.isArray(clinical.trends) ? clinical.trends.map((n) => String(n)) : [],
      ),
    },
    support_contacts: Array.isArray(row.support_contacts)
      ? row.support_contacts
          .map(parseSupportContact)
          .filter((c): c is SupportContactIntelligence => c != null)
      : [],
    candidate_contacts: Array.isArray(row.candidate_contacts)
      ? row.candidate_contacts
          .map(parseCandidateContact)
          .filter((c): c is CandidateContactIntelligence => c != null)
      : [],
    updated_at: row.updated_at != null ? String(row.updated_at) : null,
  };
}

/** Parse JSONB object or legacy JSON string from contact. */
export function readProviderCommercialIntelligence(
  contact: Record<string, unknown>,
): ProviderCommercialIntelligence | null {
  const direct = parseProviderCommercialIntelligence(contact);
  if (direct) return direct;

  const raw = contact[PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY];
  if (typeof raw !== "string" || !raw.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parseProviderCommercialIntelligence({
      ...contact,
      [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: parsed,
    });
  } catch {
    return null;
  }
}

const TRI_STATE_RANK: Record<IntelligenceTriState, number> = { yes: 3, no: 2, unknown: 1 };
const SCHEDULER_RANK: Record<SchedulerIdentifiedState, number> = {
  yes: 4,
  partial: 3,
  no: 2,
  unknown: 1,
};
const APPROVAL_RANK: Record<ObservationApprovalStatus, number> = {
  approved: 5,
  interested: 4,
  discussed: 3,
  not_approved: 2,
  unknown: 1,
};
const ACCESS_STATUS_RANK: Record<ObservationAccessStatus, number> = {
  open: 4,
  partial: 3,
  blocked: 2,
  unknown: 1,
};
const READINESS_RANK: Record<ObservationReadinessState, number> = {
  ready: 4,
  conditional: 3,
  not_ready: 2,
  unknown: 1,
};

function mergeAccessStatus(
  current: ObservationAccessStatus,
  incoming: ObservationAccessStatus,
): ObservationAccessStatus {
  return ACCESS_STATUS_RANK[incoming] > ACCESS_STATUS_RANK[current] ? incoming : current;
}

function mergeTriState(current: IntelligenceTriState, incoming: IntelligenceTriState): IntelligenceTriState {
  return TRI_STATE_RANK[incoming] > TRI_STATE_RANK[current] ? incoming : current;
}

function mergeSchedulerState(
  current: SchedulerIdentifiedState,
  incoming: SchedulerIdentifiedState,
): SchedulerIdentifiedState {
  return SCHEDULER_RANK[incoming] > SCHEDULER_RANK[current] ? incoming : current;
}

function mergeApprovalStatus(
  current: ObservationApprovalStatus,
  incoming: ObservationApprovalStatus,
): ObservationApprovalStatus {
  return APPROVAL_RANK[incoming] > APPROVAL_RANK[current] ? incoming : current;
}

function mergeReadinessState(
  current: ObservationReadinessState,
  incoming: ObservationReadinessState,
): ObservationReadinessState {
  return READINESS_RANK[incoming] > READINESS_RANK[current] ? incoming : current;
}

function mergeStringArrays(current: string[], incoming: string[]): string[] {
  return uniqueNonEmpty([...current, ...incoming]);
}

function mergeSupportContacts(
  current: SupportContactIntelligence[],
  incoming: SupportContactIntelligence[],
): SupportContactIntelligence[] {
  const byName = new Map<string, SupportContactIntelligence>();
  for (const contact of [...current, ...incoming]) {
    const key = contact.contact_name.toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, contact);
      continue;
    }
    byName.set(key, {
      contact_name: existing.contact_name,
      contact_role: contact.contact_role ?? existing.contact_role,
      linked_contact_id: contact.linked_contact_id ?? existing.linked_contact_id,
      scope: contact.scope === "organization" ? "organization" : existing.scope,
    });
  }
  return [...byName.values()];
}

function mergeCandidateContactRows(
  current: CandidateContactIntelligence[],
  incoming: CandidateContactIntelligence[],
): CandidateContactIntelligence[] {
  const byKey = new Map<string, CandidateContactIntelligence>();
  for (const row of current) {
    byKey.set(row.contact_name.trim().toLowerCase(), row);
  }
  for (const next of incoming) {
    const key = next.contact_name.trim().toLowerCase();
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

/** Merge debrief-derived intelligence into existing stored object. */
export function mergeProviderCommercialIntelligence(
  existing: ProviderCommercialIntelligence | null,
  incoming: ProviderCommercialIntelligence,
): ProviderCommercialIntelligence {
  const base = existing ?? emptyProviderCommercialIntelligence();
  return {
    version: PROVIDER_COMMERCIAL_INTELLIGENCE_VERSION,
    observation: {
      interest: mergeTriState(base.observation.interest, incoming.observation.interest),
      approval_status: mergeApprovalStatus(
        base.observation.approval_status,
        incoming.observation.approval_status,
      ),
      credentialing_required: mergeTriState(
        base.observation.credentialing_required,
        incoming.observation.credentialing_required,
      ),
      readiness: mergeReadinessState(base.observation.readiness, incoming.observation.readiness),
      access_status: mergeAccessStatus(
        base.observation.access_status,
        incoming.observation.access_status,
      ),
    },
    scheduling: {
      scheduler_identified: mergeSchedulerState(
        base.scheduling.scheduler_identified,
        incoming.scheduling.scheduler_identified,
      ),
      scheduler_contact_linked: mergeTriState(
        base.scheduling.scheduler_contact_linked,
        incoming.scheduling.scheduler_contact_linked,
      ),
      scheduling_workflow_known: mergeTriState(
        base.scheduling.scheduling_workflow_known,
        incoming.scheduling.scheduling_workflow_known,
      ),
    },
    credentialing: {
      credentialing_required: mergeTriState(
        base.credentialing.credentialing_required,
        incoming.credentialing.credentialing_required,
      ),
      credentialing_platform_known: mergeTriState(
        base.credentialing.credentialing_platform_known,
        incoming.credentialing.credentialing_platform_known,
      ),
      credentialing_notes: mergeStringArrays(
        base.credentialing.credentialing_notes,
        incoming.credentialing.credentialing_notes,
      ),
    },
    clinical: {
      entries: mergeClinicalEntries(base.clinical.entries, incoming.clinical.entries),
      procedure_focus: mergeStringArrays(
        base.clinical.procedure_focus,
        incoming.clinical.procedure_focus,
      ),
      clinical_frustrations: mergeStringArrays(
        base.clinical.clinical_frustrations,
        incoming.clinical.clinical_frustrations,
      ),
      clinical_preferences: mergeStringArrays(
        base.clinical.clinical_preferences,
        incoming.clinical.clinical_preferences,
      ),
      workflow_observations: mergeStringArrays(
        base.clinical.workflow_observations,
        incoming.clinical.workflow_observations,
      ),
      product_interests: mergeStringArrays(
        base.clinical.product_interests,
        incoming.clinical.product_interests,
      ),
      trends: mergeStringArrays(base.clinical.trends, incoming.clinical.trends),
    },
    support_contacts: mergeSupportContacts(base.support_contacts, incoming.support_contacts),
    candidate_contacts: mergeCandidateContactRows(
      base.candidate_contacts,
      incoming.candidate_contacts,
    ),
    updated_at: incoming.updated_at ?? base.updated_at,
  };
}
