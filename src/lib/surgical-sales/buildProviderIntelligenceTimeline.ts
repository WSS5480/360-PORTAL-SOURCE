/**
 * Provider Intelligence Timeline — events from real activity only.
 */

import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { DiscoveryIntelligenceGroupId } from "@/lib/surgical-sales/discoveryIntelligenceProgress";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  parseProviderIntelligenceFieldMetadata,
  type IntelligenceFieldAttribution,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  isTraceableIntelligenceFieldEvidence,
  resolveIntelligenceDomainTraceSource,
} from "@/lib/surgical-sales/providerIntelligenceDomainEvidence";
import { formatRepIntelligenceFieldValue } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import { sanitizeDiscoveryEvidenceQuote } from "@/lib/surgical-sales/discoveryIntelligenceEvidence";
import { isInvalidSchedulingContactArtifact } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { isValidProductName } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductIntelligenceExtraction";

export type ProviderIntelligenceTimelineEventKind =
  | "intro_call_completed"
  | "observation_requested"
  | "observation_interest_captured"
  | "observation_completed"
  | "pain_point_captured"
  | "competitor_identified"
  | "champion_identified"
  | "debrief_completed"
  | "clinical_interest_identified"
  | "scheduler_referenced"
  | "discovery_note";

export type ProviderIntelligenceTimelineSourceKind =
  | "engagement"
  | "case"
  | "debrief"
  | "note";

export type ProviderIntelligenceTimelineEvent = {
  id: string;
  kind: ProviderIntelligenceTimelineEventKind;
  title: string;
  detail: string | null;
  occurredAt: string;
  whenLabel: string;
  href: string;
  sourceKind: ProviderIntelligenceTimelineSourceKind;
  sourceId: string;
  sourceLabel: string;
  domainIds: DiscoveryIntelligenceGroupId[];
  /** Field capture validated on file — separates verified facts from inferred captures. */
  validatedOnFile?: boolean;
  dbKey?: string;
};

export type ProviderIntelligenceTimelineView = {
  events: ProviderIntelligenceTimelineEvent[];
  emptyLabel: string;
};

const EVENT_TITLES: Record<ProviderIntelligenceTimelineEventKind, string> = {
  intro_call_completed: "Intro Call Completed",
  observation_requested: "Observation Requested",
  observation_interest_captured: "Observation Interest Captured",
  observation_completed: "Observation Completed",
  pain_point_captured: "Pain Point Captured",
  competitor_identified: "Competitor Identified",
  champion_identified: "Champion Identified",
  debrief_completed: "Debrief Completed",
  clinical_interest_identified: "Clinical Interest Identified",
  scheduler_referenced: "Scheduler Referenced",
  discovery_note: "Field Note Captured",
};

const SCHEDULER_FIELD_KEYS = new Set([
  "provider_observation_coordinator_contact",
  "provider_scheduling_contact",
]);

function fieldCaptureValidatedOnFile(meta: IntelligenceFieldAttribution | undefined): boolean {
  return (
    meta?.lifecycle_state === "validated" ||
    meta?.lifecycle_state === "confirmed" ||
    Boolean(meta?.validated_at?.trim())
  );
}

/** Timeline titles describe field evidence — not pathway milestones or conclusions. */
function resolveFieldCaptureTitle(
  dbKey: string,
  kind: ProviderIntelligenceTimelineEventKind,
  meta: IntelligenceFieldAttribution | undefined,
): string {
  if (SCHEDULER_FIELD_KEYS.has(dbKey)) {
    return fieldCaptureValidatedOnFile(meta)
      ? "Scheduler Contact Captured"
      : EVENT_TITLES.scheduler_referenced;
  }
  return EVENT_TITLES[kind];
}

const FIELD_KIND_MAP: Array<{
  dbKeys: string[];
  kind: ProviderIntelligenceTimelineEventKind;
  domains: DiscoveryIntelligenceGroupId[];
}> = [
  {
    dbKeys: ["provider_observation_feasibility", "provider_evaluation_openness"],
    kind: "observation_interest_captured",
    domains: ["access_readiness"],
  },
  {
    dbKeys: ["provider_observation_coordinator_contact", "provider_scheduling_contact"],
    kind: "scheduler_referenced",
    domains: ["access_readiness"],
  },
  {
    dbKeys: ["provider_workflow_pain_points", "provider_dissatisfaction_areas"],
    kind: "pain_point_captured",
    domains: ["clinical_fit", "opportunity_intelligence"],
  },
  {
    dbKeys: ["provider_competitive_products"],
    kind: "competitor_identified",
    domains: ["clinical_fit", "opportunity_intelligence"],
  },
  {
    dbKeys: ["provider_champion_potential"],
    kind: "champion_identified",
    domains: ["champion_landscape"],
  },
  {
    dbKeys: ["provider_preference_card_signals"],
    kind: "clinical_interest_identified",
    domains: ["clinical_fit", "opportunity_intelligence"],
  },
];

const CASE_FIELD_KIND_MAP: Array<{
  caseKeys: string[];
  kind: ProviderIntelligenceTimelineEventKind;
  domains: DiscoveryIntelligenceGroupId[];
}> = [
  {
    caseKeys: ["live_observation_clinical_pain_points"],
    kind: "pain_point_captured",
    domains: ["clinical_fit", "opportunity_intelligence"],
  },
  {
    caseKeys: ["live_observation_competitors"],
    kind: "competitor_identified",
    domains: ["clinical_fit", "opportunity_intelligence"],
  },
  {
    caseKeys: ["live_observation_product_fit", "observation_quick_finding_product_interest"],
    kind: "clinical_interest_identified",
    domains: ["clinical_fit", "opportunity_intelligence"],
  },
];

function normalizeCaseType(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

function parseIso(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const d = new Date(text.includes("T") ? text : `${text}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function formatIntelligenceTimelineWhen(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const diffMs = now.getTime() - d.getTime();
  const dayMs = 86_400_000;

  if (diffMs < dayMs) return "Today";
  if (diffMs < dayMs * 2) return "Yesterday";
  const days = Math.floor(diffMs / dayMs);
  if (days <= 14) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sourceKindFromMeta(meta: IntelligenceFieldAttribution | undefined): ProviderIntelligenceTimelineSourceKind {
  const trace = resolveIntelligenceDomainTraceSource(meta);
  if (!trace) return "note";
  if (trace.kind === "debrief") return "debrief";
  if (trace.kind === "observation" || trace.kind === "case") return "case";
  if (trace.kind === "engagement") return "engagement";
  return "note";
}

function hrefFromMeta(
  meta: IntelligenceFieldAttribution | undefined,
  providerId: string,
): { href: string; sourceId: string; sourceKind: ProviderIntelligenceTimelineSourceKind } {
  const sourceKind = sourceKindFromMeta(meta);
  if (meta?.source_engagement_id) {
    const id = meta.source_engagement_id;
    return {
      href:
        sourceKind === "debrief"
          ? `/portal/sales/engagements/${encodeURIComponent(id)}/debrief`
          : `/portal/sales/engagements/${encodeURIComponent(id)}`,
      sourceId: id,
      sourceKind,
    };
  }
  if (meta?.source_case_id) {
    const id = meta.source_case_id;
    return {
      href: `/portal/sales/cases/${encodeURIComponent(id)}`,
      sourceId: id,
      sourceKind: "case",
    };
  }
  return {
    href: `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=activity`,
    sourceId: providerId,
    sourceKind: "note",
  };
}

function pushEvent(
  events: ProviderIntelligenceTimelineEvent[],
  seen: Set<string>,
  event: ProviderIntelligenceTimelineEvent,
): void {
  const key = `${event.kind}|${event.sourceId}|${event.occurredAt}|${event.detail ?? ""}`;
  if (seen.has(key)) return;
  seen.add(key);
  events.push(event);
}

function buildEngagementEvents(
  engagements: ProviderEngagementSummary[] | undefined,
  seen: Set<string>,
  out: ProviderIntelligenceTimelineEvent[],
): void {
  for (const engagement of engagements ?? []) {
    const id = String(engagement.id ?? "").trim();
    if (!id) continue;

    const type = String(engagement.engagement_type ?? "").trim().toLowerCase();
    const status = String(engagement.status ?? "").trim().toLowerCase();
    const completedAt =
      parseIso(engagement.debrief_completed_at) ??
      parseIso(engagement.updated_at) ??
      parseIso(engagement.scheduled_at ?? engagement.engagement_date);

    if (engagement.debrief_completed) {
      pushEvent(out, seen, {
        id: `debrief-eng-${id}`,
        kind: "debrief_completed",
        title: EVENT_TITLES.debrief_completed,
        detail: engagement.title ?? engagement.engagement_type_label ?? null,
        occurredAt: completedAt ?? new Date().toISOString(),
        whenLabel: formatIntelligenceTimelineWhen(completedAt ?? new Date().toISOString()),
        href: `/portal/sales/engagements/${encodeURIComponent(id)}/debrief`,
        sourceKind: "debrief",
        sourceId: id,
        sourceLabel: engagement.engagement_type_label || "Engagement debrief",
        domainIds: ["champion_landscape", "clinical_fit", "access_readiness"],
      });
    }

    if (status === "completed" && type === "intro_call") {
      pushEvent(out, seen, {
        id: `intro-${id}`,
        kind: "intro_call_completed",
        title: EVENT_TITLES.intro_call_completed,
        detail: engagement.title ?? engagement.engagement_type_label ?? null,
        occurredAt: completedAt ?? new Date().toISOString(),
        whenLabel: formatIntelligenceTimelineWhen(completedAt ?? new Date().toISOString()),
        href: `/portal/sales/engagements/${encodeURIComponent(id)}/prepare`,
        sourceKind: "engagement",
        sourceId: id,
        sourceLabel: engagement.engagement_type_label || "Intro call",
        domainIds: ["access_readiness"],
      });
    }
  }
}

function buildCaseEvents(
  cases: Array<Record<string, unknown>> | undefined,
  seen: Set<string>,
  out: ProviderIntelligenceTimelineEvent[],
): void {
  for (const caseRow of cases ?? []) {
    const id = String(caseRow.id ?? "").trim();
    if (!id) continue;

    const caseType = normalizeCaseType(caseRow.case_type);
    const createdAt = parseIso(caseRow.created_at) ?? parseIso(caseRow.updated_at);
    const completedAt = parseIso(caseRow.updated_at) ?? createdAt;
    const status = String(caseRow.status ?? "").trim().toLowerCase();
    const caseLabel = String(caseRow.case_number ?? "Observation case").trim();
    const href = `/portal/sales/cases/${encodeURIComponent(id)}`;

    if (caseType === "observation") {
      if (createdAt) {
        pushEvent(out, seen, {
          id: `obs-req-${id}`,
          kind: "observation_requested",
          title: EVENT_TITLES.observation_requested,
          detail: caseLabel,
          occurredAt: createdAt,
          whenLabel: formatIntelligenceTimelineWhen(createdAt),
          href,
          sourceKind: "case",
          sourceId: id,
          sourceLabel: caseLabel,
          domainIds: ["access_readiness"],
        });
      }

      if (status === "completed" || status === "closed") {
        pushEvent(out, seen, {
          id: `obs-done-${id}`,
          kind: "observation_completed",
          title: EVENT_TITLES.observation_completed,
          detail: caseLabel,
          occurredAt: completedAt ?? new Date().toISOString(),
          whenLabel: formatIntelligenceTimelineWhen(completedAt ?? new Date().toISOString()),
          href,
          sourceKind: "case",
          sourceId: id,
          sourceLabel: caseLabel,
          domainIds: ["clinical_fit", "access_readiness"],
        });
      }

      if (caseRow.debrief_completed) {
        pushEvent(out, seen, {
          id: `debrief-case-${id}`,
          kind: "debrief_completed",
          title: EVENT_TITLES.debrief_completed,
          detail: caseLabel,
          occurredAt: completedAt ?? new Date().toISOString(),
          whenLabel: formatIntelligenceTimelineWhen(completedAt ?? new Date().toISOString()),
          href: `${href}?panel=debrief`,
          sourceKind: "debrief",
          sourceId: id,
          sourceLabel: caseLabel,
          domainIds: ["champion_landscape", "clinical_fit"],
        });
      }

      for (const spec of CASE_FIELD_KIND_MAP) {
        for (const key of spec.caseKeys) {
          const raw = String(caseRow[key] ?? "").trim();
          if (!raw) continue;
          const quote = sanitizeDiscoveryEvidenceQuote(raw) ?? raw;
          pushEvent(out, seen, {
            id: `case-field-${id}-${key}`,
            kind: spec.kind,
            title: EVENT_TITLES[spec.kind],
            detail: quote.length > 120 ? `${quote.slice(0, 117)}…` : quote,
            occurredAt: completedAt ?? createdAt ?? new Date().toISOString(),
            whenLabel: formatIntelligenceTimelineWhen(completedAt ?? createdAt ?? new Date().toISOString()),
            href,
            sourceKind: "case",
            sourceId: id,
            sourceLabel: caseLabel,
            domainIds: spec.domains,
          });
        }
      }
    }
  }
}

function buildFieldMetadataEvents(input: {
  contact: Record<string, unknown>;
  providerId: string;
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
  seen: Set<string>;
  out: ProviderIntelligenceTimelineEvent[];
}): void {
  for (const spec of FIELD_KIND_MAP) {
    for (const dbKey of spec.dbKeys) {
      if (!isTraceableIntelligenceFieldEvidence({ dbKey, contact: input.contact, fieldMeta: input.fieldMeta })) {
        continue;
      }

      const meta = input.fieldMeta[dbKey];

      const raw = String(input.contact[dbKey] ?? "").trim();
      if (!raw || !fieldHasIntelligenceSignal(dbKey, raw)) continue;
      if (SCHEDULER_FIELD_KEYS.has(dbKey) && isInvalidSchedulingContactArtifact(raw)) continue;

      const occurredAt = parseIso(meta?.validated_at ?? meta?.updated_at) ?? new Date().toISOString();
      const { href, sourceId, sourceKind } = hrefFromMeta(meta, input.providerId);
      const evidenceText = sanitizeDiscoveryEvidenceQuote(meta?.evidence_text);
      const display =
        (evidenceText && !(SCHEDULER_FIELD_KEYS.has(dbKey) && isInvalidSchedulingContactArtifact(evidenceText))
          ? evidenceText
          : null) ??
        (SCHEDULER_FIELD_KEYS.has(dbKey) && isInvalidSchedulingContactArtifact(raw)
          ? null
          : formatRepIntelligenceFieldValue(dbKey, raw)) ??
        (SCHEDULER_FIELD_KEYS.has(dbKey) || dbKey === "provider_competitive_products"
          ? null
          : raw);

      if (!display) continue;
      if (
        dbKey === "provider_competitive_products" &&
        !isValidProductName(
          String(display).replace(/^current product identified:\s*/i, "").trim(),
        ) &&
        !/\bbard mesh\b/i.test(display)
      ) {
        continue;
      }

      pushEvent(input.out, input.seen, {
        id: `field-${dbKey}-${occurredAt}`,
        kind: spec.kind,
        title: resolveFieldCaptureTitle(dbKey, spec.kind, meta),
        detail: display.length > 120 ? `${display.slice(0, 117)}…` : display,
        occurredAt,
        whenLabel: formatIntelligenceTimelineWhen(occurredAt),
        href,
        sourceKind,
        sourceId,
        sourceLabel: meta?.source_label?.trim() || "Field capture",
        domainIds: spec.domains,
        validatedOnFile: fieldCaptureValidatedOnFile(meta),
        dbKey,
      });
    }
  }
}

function mapActivityTimelineEvent(
  item: Record<string, unknown>,
  providerId: string,
): ProviderIntelligenceTimelineEvent | null {
  const at = parseIso(item.at ?? item.created_at);
  if (!at) return null;

  const href = String(item.href ?? "").trim();
  const id = String(item.id ?? `${at}`).trim();
  const activityType = String(item.activity_type ?? "").trim().toLowerCase();
  const title = String(item.title ?? item.question_label ?? "").trim();
  const body = String(item.body ?? item.question_label ?? "").trim();

  if (activityType.includes("clinical_discovery") || item.category === "discovery") {
    return {
      id: `activity-${id}`,
      kind: "discovery_note",
      title: title || EVENT_TITLES.discovery_note,
      detail: body || null,
      occurredAt: at,
      whenLabel: formatIntelligenceTimelineWhen(at),
      href: href || `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=activity`,
      sourceKind: "note",
      sourceId: id,
      sourceLabel: title || "Discovery note",
      domainIds: ["clinical_fit", "opportunity_intelligence"],
    };
  }

  return null;
}

function buildActivityFeedEvents(
  activityTimeline: Array<Record<string, unknown>> | undefined,
  providerId: string,
  seen: Set<string>,
  out: ProviderIntelligenceTimelineEvent[],
): void {
  for (const item of activityTimeline ?? []) {
    const mapped = mapActivityTimelineEvent(item, providerId);
    if (mapped) pushEvent(out, seen, mapped);
  }
}

export function buildProviderIntelligenceTimeline(input: {
  providerId: string;
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  activityTimeline?: Array<Record<string, unknown>>;
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];
}): ProviderIntelligenceTimelineView {
  const events: ProviderIntelligenceTimelineEvent[] = [];
  const seen = new Set<string>();
  const fieldMeta = parseProviderIntelligenceFieldMetadata(input.contact.provider_intelligence_field_metadata);

  buildEngagementEvents(input.engagements, seen, events);
  buildCaseEvents(input.cases, seen, events);
  buildFieldMetadataEvents({
    contact: input.contact,
    providerId: input.providerId,
    fieldMeta,
    seen,
    out: events,
  });
  buildActivityFeedEvents(input.activityTimeline, input.providerId, seen, events);

  events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return {
    events,
    emptyLabel: "No activity yet.",
  };
}

export function timelineEventsForDomain(
  events: ProviderIntelligenceTimelineEvent[],
  domainId: DiscoveryIntelligenceGroupId,
): ProviderIntelligenceTimelineEvent[] {
  return events.filter((event) => event.domainIds.includes(domainId));
}

export function timelineHasEvidence(events: ProviderIntelligenceTimelineEvent[]): boolean {
  return events.length > 0;
}

/** Verified on-file field captures and factual activity — not inferred milestone labels. */
export function timelineEventIsVerifiedFinding(event: ProviderIntelligenceTimelineEvent): boolean {
  if (event.kind === "debrief_completed" || event.kind === "observation_completed") {
    return true;
  }
  if (!event.validatedOnFile) return false;
  return (
    event.kind === "clinical_interest_identified" ||
    event.kind === "champion_identified" ||
    event.kind === "observation_interest_captured" ||
    event.kind === "scheduler_referenced"
  );
}

const FINDING_KIND_SECTIONS: Array<{
  sectionId: string;
  title: string;
  kinds: ProviderIntelligenceTimelineEventKind[];
}> = [
  { sectionId: "pain_points", title: "Pain Points", kinds: ["pain_point_captured"] },
  { sectionId: "competitors", title: "Competitors Observed", kinds: ["competitor_identified"] },
  { sectionId: "clinical_interest", title: "Clinical Interest Signals", kinds: ["clinical_interest_identified"] },
];

export function buildIntelligenceKnownFromTimeline(
  events: ProviderIntelligenceTimelineEvent[],
  input: { specialty?: string | null; organizationName?: string | null },
): Array<{ id: string; label: string; value: string }> {
  const items: Array<{ id: string; label: string; value: string }> = [];

  const specialty = String(input.specialty ?? "").trim();
  if (specialty) items.push({ id: "specialty", label: "Specialty", value: specialty });

  const facility = String(input.organizationName ?? "").trim();
  if (facility) items.push({ id: "facility", label: "Facility", value: facility });

  for (const event of events) {
    if (!event.detail) continue;
    if (event.kind === "observation_interest_captured") {
      items.push({ id: event.id, label: "Observation openness", value: event.detail });
    }
    if (event.kind === "competitor_identified") {
      items.push({ id: event.id, label: "Current products", value: event.detail });
    }
    if (event.kind === "pain_point_captured") {
      items.push({ id: event.id, label: "Workflow understanding", value: event.detail });
    }
  }

  const unique = new Map<string, { id: string; label: string; value: string }>();
  for (const item of items) {
    unique.set(`${item.label}|${item.value}`, item);
  }
  return [...unique.values()];
}

export function buildIntelligenceFindingsFromTimeline(
  events: ProviderIntelligenceTimelineEvent[],
): Array<{ id: string; title: string; items: string[] }> {
  const sections: Array<{ id: string; title: string; items: string[] }> = [];

  for (const spec of FINDING_KIND_SECTIONS) {
    const items = events
      .filter((event) => spec.kinds.includes(event.kind) && event.detail)
      .map((event) => event.detail as string);
    const unique = [...new Set(items)];
    if (unique.length > 0) {
      sections.push({ id: spec.sectionId, title: spec.title, items: unique });
    }
  }

  return sections;
}

export function buildIntelligenceValidatedFromTimeline(
  events: ProviderIntelligenceTimelineEvent[],
): Array<{ id: string; title: string; items: string[] }> {
  const sections: Array<{ id: string; title: string; items: string[] }> = [];

  const clinicalInterest = events
    .filter((e) => e.kind === "clinical_interest_identified" && e.detail && e.validatedOnFile)
    .map((e) => e.detail as string);
  if (clinicalInterest.length > 0) {
    sections.push({
      id: "clinical_interest",
      title: "Clinical Interest Signals",
      items: [...new Set(clinicalInterest)],
    });
  }

  const champion = events
    .filter((e) => e.kind === "champion_identified" && e.detail && e.validatedOnFile)
    .map((e) => e.detail as string);
  if (champion.length > 0) {
    sections.push({
      id: "champion",
      title: "Champion Signals",
      items: [...new Set(champion)],
    });
  }

  const access = events
    .filter(
      (e) =>
        e.detail &&
        (e.kind === "observation_completed" ||
          (e.kind === "observation_interest_captured" && e.validatedOnFile) ||
          (e.kind === "scheduler_referenced" && e.validatedOnFile)),
    )
    .map((e) => e.detail as string);
  if (access.length > 0) {
    sections.push({
      id: "access",
      title: "Access Signals",
      items: [...new Set(access)],
    });
  }

  const opportunity = events
    .filter((e) => (e.kind === "pain_point_captured" || e.kind === "competitor_identified") && e.detail)
    .map((e) => e.detail as string);
  if (opportunity.length > 0) {
    sections.push({
      id: "opportunity",
      title: "Commercial Landscape",
      items: [...new Set(opportunity)],
    });
  }

  return sections;
}

export function mapTimelineToTabItems(
  events: ProviderIntelligenceTimelineEvent[],
): Array<{
  id: string;
  title: string;
  detail: string | null;
  whenLabel: string;
  href: string;
  sourceLabel: string;
}> {
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    detail: event.detail,
    whenLabel: event.whenLabel,
    href: event.href,
    sourceLabel: event.sourceLabel,
  }));
}
