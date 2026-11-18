/**
 * Provider Intelligence tab — read-only repository sections (no workflow CTAs).
 */

import {
  buildProviderDossierView,
  dossierFieldKeysForSection,
  type DossierKnowledgeCard,
  type ProviderDossierSectionId,
} from "@/lib/surgical-sales/buildProviderDossierView";
import {
  buildProviderIntelligenceTabView,
  type ProviderIntelligenceTimelineItem,
} from "@/lib/surgical-sales/buildProviderIntelligenceTabView";
import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { formatRepIntelligenceFieldValue } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { intelligenceFieldDisplayName } from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export type IntelligenceRepositoryFact = {
  id: string;
  label: string;
  value: string;
  meta: string | null;
};

export type IntelligenceRepositoryContact = {
  id: string;
  name: string;
  role: string | null;
  detail: string | null;
  href: string | null;
};

export type ProviderIntelligenceRepositoryView = {
  timeline: ProviderIntelligenceTimelineItem[];
  timelineEmptyLabel: string;
  knownInformation: IntelligenceRepositoryFact[];
  observedInformation: IntelligenceRepositoryFact[];
  workflowIntelligence: IntelligenceRepositoryFact[];
  contacts: IntelligenceRepositoryContact[];
  capturedLearnings: IntelligenceRepositoryFact[];
};

const KNOWN_SECTIONS: ProviderDossierSectionId[] = ["access", "relationship", "facility", "procedure"];

const CONTACT_FIELD_KEYS = [
  "provider_scheduling_contact",
  "provider_observation_coordinator_contact",
  "provider_facility_scheduling_contact",
  "provider_credentialing_contact",
  "provider_credentialing_approval_contact",
] as const;

const OBSERVATION_CASE_FIELDS: Array<{ key: string; label: string }> = [
  { key: "live_observation_clinical_pain_points", label: "Clinical pain points" },
  { key: "live_observation_workflow", label: "Workflow" },
  { key: "live_observation_staff_process", label: "Staff process" },
  { key: "live_observation_competitors", label: "Competitors" },
  { key: "live_observation_questions", label: "Questions surfaced" },
  { key: "live_observation_follow_up_items", label: "Follow-up items" },
  { key: "live_observation_product_fit", label: "Product fit" },
  { key: "observation_quick_finding_product_interest", label: "Product interest" },
  { key: "debrief_key_findings", label: "Key findings" },
];

function factFromCard(card: DossierKnowledgeCard): IntelligenceRepositoryFact {
  const metaParts = [card.sourceLabel, card.capturedLabel].filter(Boolean);
  return {
    id: card.id,
    label: card.label,
    value: card.value,
    meta: metaParts.length > 0 ? metaParts.join(" · ") : null,
  };
}

function factFromField(dbKey: string, raw: unknown, metaPrefix?: string): IntelligenceRepositoryFact | null {
  if (!fieldHasIntelligenceSignal(dbKey, raw as string | null | undefined)) return null;
  const text = String(raw ?? "").trim();
  const formatted = formatRepIntelligenceFieldValue(dbKey, text);
  const value = formatted?.trim() || text;
  if (!value) return null;
  return {
    id: `field-${dbKey}`,
    label: intelligenceFieldDisplayName(dbKey),
    value,
    meta: metaPrefix ?? null,
  };
}

function buildKnownInformation(
  sections: ReturnType<typeof buildProviderDossierView>["sections"],
): IntelligenceRepositoryFact[] {
  const rows: IntelligenceRepositoryFact[] = [];
  for (const sectionId of KNOWN_SECTIONS) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) continue;
    for (const card of section.known) {
      rows.push(factFromCard(card));
    }
  }
  return rows;
}

function buildWorkflowIntelligence(
  sections: ReturnType<typeof buildProviderDossierView>["sections"],
): IntelligenceRepositoryFact[] {
  const section = sections.find((s) => s.id === "workflow");
  if (!section) return [];
  return section.known.map(factFromCard);
}

function buildObservedInformation(cases: Array<Record<string, unknown>> | undefined): IntelligenceRepositoryFact[] {
  const rows: IntelligenceRepositoryFact[] = [];
  const observationCases = (cases ?? []).filter(
    (c) => String(c.case_type ?? "").trim().toLowerCase() === "observation",
  );

  for (const caseRow of observationCases) {
    const caseLabel = String(caseRow.case_number ?? "Observation case").trim();
    for (const spec of OBSERVATION_CASE_FIELDS) {
      const fact = factFromField(spec.key, caseRow[spec.key], caseLabel);
      if (fact) {
        rows.push({ ...fact, id: `${fact.id}-${String(caseRow.id)}`, label: `${spec.label}` });
      }
    }
  }

  return rows;
}

function buildContacts(
  contact: Record<string, unknown>,
  relatedContacts: Array<Record<string, unknown>> | undefined,
): IntelligenceRepositoryContact[] {
  const rows: IntelligenceRepositoryContact[] = [];

  for (const related of relatedContacts ?? []) {
    const id = String(related.id ?? "").trim();
    if (!id) continue;
    const name = contactDisplayName(
      related as { first_name?: string; last_name?: string; email?: string },
    );
    const role = String(related.role_type_label ?? related.role_type ?? "").trim() || null;
    const detail = String(related.title ?? related.organization_name ?? "").trim() || null;
    rows.push({
      id: `related-${id}`,
      name,
      role,
      detail,
      href: `/portal/sales/contacts/${encodeURIComponent(id)}`,
    });
  }

  for (const dbKey of CONTACT_FIELD_KEYS) {
    const raw = contact[dbKey];
    if (!String(raw ?? "").trim()) continue;
    rows.push({
      id: `contact-field-${dbKey}`,
      name: String(raw).trim(),
      role: intelligenceFieldDisplayName(dbKey),
      detail: null,
      href: null,
    });
  }

  return rows;
}

function isCapturedLearningTimelineItem(item: ProviderIntelligenceTimelineItem): boolean {
  const title = item.title.toLowerCase();
  return (
    title.includes("debrief") ||
    title.includes("pain point") ||
    title.includes("competitor") ||
    title.includes("champion") ||
    title.includes("clinical interest") ||
    title.includes("observation interest") ||
    title.includes("scheduler") ||
    title.includes("field note")
  );
}

function buildCapturedLearnings(input: {
  timeline: ProviderIntelligenceTimelineItem[];
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];
}): IntelligenceRepositoryFact[] {
  const fromTimeline = input.timeline
    .filter(isCapturedLearningTimelineItem)
    .map((item) => ({
      id: `learning-${item.id}`,
      label: item.title,
      value: item.detail?.trim() || item.sourceLabel,
      meta: item.whenLabel,
    }));

  const fromDiscovery = (input.clinicalDiscoveryAnswers ?? [])
    .filter((a) => String(a.response ?? "").trim())
    .map((a) => ({
      id: `discovery-${a.id}`,
      label: String(a.questionLabel ?? a.questionText ?? "Discovery note").trim(),
      value: String(a.response).trim(),
      meta: a.updatedAt
        ? new Date(a.updatedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null,
    }));

  return [...fromTimeline, ...fromDiscovery];
}

export function buildProviderIntelligenceRepositoryView(input: {
  contact: Record<string, unknown>;
  providerId: string;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  activityTimeline?: Array<Record<string, unknown>>;
  relatedContacts?: Array<Record<string, unknown>>;
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];
}): ProviderIntelligenceRepositoryView {
  const dossier = buildProviderDossierView(input);
  const tabView = buildProviderIntelligenceTabView({
    contact: input.contact,
    providerId: input.providerId,
    planning: input.planning,
    engagements: input.engagements,
    cases: input.cases,
    activityTimeline: input.activityTimeline,
    clinicalDiscoveryAnswers: input.clinicalDiscoveryAnswers,
  });

  const capturedLearnings = buildCapturedLearnings({
    timeline: tabView.timeline,
    clinicalDiscoveryAnswers: input.clinicalDiscoveryAnswers,
  });

  return {
    timeline: tabView.timeline,
    timelineEmptyLabel: tabView.timelineEmptyLabel,
    knownInformation: buildKnownInformation(dossier.sections),
    observedInformation: buildObservedInformation(input.cases),
    workflowIntelligence: buildWorkflowIntelligence(dossier.sections),
    contacts: buildContacts(input.contact, input.relatedContacts),
    capturedLearnings,
  };
}

/** @internal — exported for tests documenting section field coverage */
export function intelligenceRepositoryWorkflowFieldKeys(): readonly string[] {
  return dossierFieldKeysForSection("workflow");
}
