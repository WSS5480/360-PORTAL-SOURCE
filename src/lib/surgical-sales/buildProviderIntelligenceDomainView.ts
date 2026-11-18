/**
 * Intelligence domains — locked / building / validated states with traceable evidence only.
 */

import type {
  DiscoveryIntelligenceGroup,
  DiscoveryIntelligenceSignalRow,
} from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { buildDiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { discoveryDomainPrimaryCtaLabel } from "@/lib/surgical-sales/discoveryIntelligenceBriefingPresentation";
import { DISCOVERY_FIELD_STATUS } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { discoverySignalFieldFocusLine } from "@/lib/surgical-sales/discoveryIntelligenceNarrative";
import {
  resolveEvidenceCaptureCounts,
} from "@/lib/surgical-sales/fieldIntelligenceMetricPolicy";
import { formatRepIntelligenceFieldValue } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { DiscoveryIntelligenceGroupId } from "@/lib/surgical-sales/discoveryIntelligenceProgress";
import {
  isTraceableIntelligenceFieldEvidence,
  parseIntelligenceDomainFieldMetadata,
  resolveIntelligenceDomainTraceSource,
  traceableEvidenceQuote,
  type IntelligenceDomainTraceSource,
} from "@/lib/surgical-sales/providerIntelligenceDomainEvidence";
import {
  buildProviderIntelligenceTimeline,
  timelineEventsForDomain,
  timelineEventIsVerifiedFinding,
  type ProviderIntelligenceTimelineEvent,
} from "@/lib/surgical-sales/buildProviderIntelligenceTimeline";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";

export type IntelligenceDomainStateId = "locked" | "building" | "validated";

export type IntelligenceDomainFact = {
  id: string;
  label: string;
  value: string;
  source: IntelligenceDomainTraceSource;
};

export type IntelligenceDomainObservation = {
  id: string;
  quote: string;
  sourceLabel: string;
  source: IntelligenceDomainTraceSource;
};

export type IntelligenceDomainCardView = {
  id: DiscoveryIntelligenceGroupId;
  title: string;
  purpose: string;
  stateId: IntelligenceDomainStateId;
  knownFacts: IntelligenceDomainFact[];
  unknowns: string[];
  learningObjective: string | null;
  confirmedFindings: IntelligenceDomainFact[];
  supportingObservations: IntelligenceDomainObservation[];
  recommendedAction: string | null;
};

export type ProviderIntelligenceDomainView = {
  domains: IntelligenceDomainCardView[];
};

const F = DISCOVERY_FIELD_STATUS;
const LOCKED_MESSAGE = "Not enough information";

function trimmedFieldRaw(raw: unknown): string {
  return String(raw ?? "").trim();
}

function rowDbKeys(row: DiscoveryIntelligenceSignalRow): string[] {
  return row.dbKeys?.length ? row.dbKeys : [row.primaryDbKey];
}

function rowHasTraceableEvidence(
  row: DiscoveryIntelligenceSignalRow,
  contact: Record<string, unknown>,
  fieldMeta: ReturnType<typeof parseIntelligenceDomainFieldMetadata>,
): boolean {
  if (row.evidenceSnippet && row.evidenceSourceLabel) return true;

  for (const dbKey of rowDbKeys(row)) {
    if (isTraceableIntelligenceFieldEvidence({ dbKey, contact, fieldMeta })) return true;
  }

  return false;
}

function rowTraceableDbKey(
  row: DiscoveryIntelligenceSignalRow,
  contact: Record<string, unknown>,
  fieldMeta: ReturnType<typeof parseIntelligenceDomainFieldMetadata>,
): string {
  for (const dbKey of rowDbKeys(row)) {
    if (isTraceableIntelligenceFieldEvidence({ dbKey, contact, fieldMeta })) return dbKey;
  }
  return row.primaryDbKey;
}

function rowDisplayValue(
  row: DiscoveryIntelligenceSignalRow,
  contact: Record<string, unknown>,
  fieldMeta: ReturnType<typeof parseIntelligenceDomainFieldMetadata>,
): string | null {
  if (row.evidenceSnippet) return row.evidenceSnippet;

  const dbKey = rowTraceableDbKey(row, contact, fieldMeta);
  const raw = trimmedFieldRaw(contact[dbKey]);
  if (!raw || !fieldHasIntelligenceSignal(dbKey, raw)) return null;
  const formatted = formatRepIntelligenceFieldValue(dbKey, raw);
  return formatted?.trim() || null;
}

function rowTraceSource(
  row: DiscoveryIntelligenceSignalRow,
  contact: Record<string, unknown>,
  fieldMeta: ReturnType<typeof parseIntelligenceDomainFieldMetadata>,
): IntelligenceDomainTraceSource | null {
  const dbKey = rowTraceableDbKey(row, contact, fieldMeta);
  const metaSource = resolveIntelligenceDomainTraceSource(fieldMeta[dbKey]);
  if (metaSource) return metaSource;

  if (row.evidenceSourceLabel) {
    const label = row.evidenceSourceLabel.trim();
    if (/debrief/i.test(label)) return { kind: "debrief", label };
    if (/observation|case/i.test(label)) return { kind: "observation", label };
    if (/intro|engagement|call/i.test(label)) return { kind: "engagement", label };
    return { kind: "note", label };
  }

  return null;
}

function buildDomainFact(
  row: DiscoveryIntelligenceSignalRow,
  contact: Record<string, unknown>,
  fieldMeta: ReturnType<typeof parseIntelligenceDomainFieldMetadata>,
): IntelligenceDomainFact | null {
  if (!rowHasTraceableEvidence(row, contact, fieldMeta)) return null;
  const value = rowDisplayValue(row, contact, fieldMeta);
  const source = rowTraceSource(row, contact, fieldMeta);
  if (!value || !source) return null;
  return {
    id: row.id,
    label: row.label,
    value,
    source,
  };
}

function resolveDomainState(input: {
  group: DiscoveryIntelligenceGroup;
  contact: Record<string, unknown>;
  fieldMeta: ReturnType<typeof parseIntelligenceDomainFieldMetadata>;
  timelineEvents: ProviderIntelligenceTimelineEvent[];
}): IntelligenceDomainStateId {
  const domainTimeline = timelineEventsForDomain(input.timelineEvents, input.group.id);
  if (domainTimeline.length === 0) {
    const traceableRows = input.group.rows.filter((row) =>
      rowHasTraceableEvidence(row, input.contact, input.fieldMeta),
    );
    if (traceableRows.length === 0) return "locked";
  }

  const counts = resolveEvidenceCaptureCounts(
    input.group.rows.map((row) => ({ statusLabel: row.statusLabel })),
  );

  const traceableValidated = input.group.rows.filter(
    (row) =>
      (row.statusLabel === F.validated || row.statusLabel === F.notApplicable) &&
      rowHasTraceableEvidence(row, input.contact, input.fieldMeta),
  );

  if (
    traceableValidated.length > 0 &&
    counts.open === 0 &&
    counts.learning === 0
  ) {
    return "validated";
  }

  return "building";
}

function buildLearningObjective(
  group: DiscoveryIntelligenceGroup,
  contact: Record<string, unknown>,
  fieldMeta: ReturnType<typeof parseIntelligenceDomainFieldMetadata>,
): string | null {
  const unresolved = [...group.rows]
    .filter((row) => row.statusLabel !== F.validated && row.statusLabel !== F.notApplicable)
    .sort((a, b) => a.priority - b.priority);

  for (const row of unresolved) {
    if (rowHasTraceableEvidence(row, contact, fieldMeta)) continue;
    if (!row.signalId) continue;
    return (
      discoverySignalFieldFocusLine(row.signalId, row.statusLabel) ??
      `Learn ${row.label.toLowerCase()}`
    );
  }

  for (const row of unresolved) {
    if (!row.signalId) continue;
    return (
      discoverySignalFieldFocusLine(row.signalId, row.statusLabel) ??
      `Confirm ${row.label.toLowerCase()}`
    );
  }

  return null;
}

function buildSupportingObservations(
  group: DiscoveryIntelligenceGroup,
  contact: Record<string, unknown>,
  fieldMeta: ReturnType<typeof parseIntelligenceDomainFieldMetadata>,
): IntelligenceDomainObservation[] {
  const observations: IntelligenceDomainObservation[] = [];

  for (const row of group.rows) {
    const traced = traceableEvidenceQuote(rowDbKeys(row), fieldMeta);
    if (traced) {
      observations.push({
        id: `${row.id}-quote`,
        quote: traced.quote,
        sourceLabel: traced.source.label,
        source: traced.source,
      });
      continue;
    }

    if (row.evidenceSnippet && row.evidenceSourceLabel) {
      const source = rowTraceSource(row, contact, fieldMeta);
      if (!source) continue;
      observations.push({
        id: `${row.id}-snippet`,
        quote: row.evidenceSnippet,
        sourceLabel: row.evidenceSourceLabel,
        source,
      });
    }
  }

  const unique = new Map<string, IntelligenceDomainObservation>();
  for (const item of observations) {
    unique.set(`${item.quote}|${item.sourceLabel}`, item);
  }
  return [...unique.values()];
}

function timelineFactFromEvent(event: ProviderIntelligenceTimelineEvent): IntelligenceDomainFact {
  return {
    id: event.id,
    label: event.title,
    value: event.detail ?? event.sourceLabel,
    source: {
      kind:
        event.sourceKind === "debrief"
          ? "debrief"
          : event.sourceKind === "case"
            ? "observation"
            : event.sourceKind === "engagement"
              ? "engagement"
              : "note",
      label: event.sourceLabel,
    },
  };
}

function buildDomainCard(
  group: DiscoveryIntelligenceGroup,
  contact: Record<string, unknown>,
  fieldMeta: ReturnType<typeof parseIntelligenceDomainFieldMetadata>,
  timelineEvents: ProviderIntelligenceTimelineEvent[],
): IntelligenceDomainCardView {
  const domainTimeline = timelineEventsForDomain(timelineEvents, group.id);
  const stateId = resolveDomainState({ group, contact, fieldMeta, timelineEvents });

  const knownFacts: IntelligenceDomainFact[] = [];
  const unknowns: string[] = [];
  const confirmedFindings: IntelligenceDomainFact[] = [];

  if (stateId === "building") {
    for (const event of domainTimeline) {
      if (event.detail) knownFacts.push(timelineFactFromEvent(event));
    }
    for (const row of group.rows) {
      if (knownFacts.some((fact) => fact.id.includes(row.id))) continue;
      if (row.statusLabel === F.validated || row.statusLabel === F.notApplicable) continue;
      if (!rowHasTraceableEvidence(row, contact, fieldMeta)) {
        unknowns.push(row.label);
      }
    }
  }

  if (stateId === "validated") {
    for (const event of domainTimeline) {
      if (!event.detail) continue;
      if (timelineEventIsVerifiedFinding(event)) {
        confirmedFindings.push(timelineFactFromEvent(event));
      }
    }
  }

  const supportingObservations =
    stateId === "validated"
      ? domainTimeline
          .filter((event) => event.detail)
          .map((event) => ({
            id: event.id,
            quote: event.detail as string,
            sourceLabel: event.sourceLabel,
            source: {
              kind:
                event.sourceKind === "debrief"
                  ? ("debrief" as const)
                  : event.sourceKind === "case"
                    ? ("observation" as const)
                    : event.sourceKind === "engagement"
                      ? ("engagement" as const)
                      : ("note" as const),
              label: event.sourceLabel,
            },
          }))
      : [];

  const learningObjective =
    stateId === "building" ? buildLearningObjective(group, contact, fieldMeta) : null;

  const recommendedAction =
    stateId === "validated"
      ? discoveryDomainPrimaryCtaLabel(group.id)
      : null;

  return {
    id: group.id,
    title: group.title,
    purpose: group.purpose,
    stateId,
    knownFacts,
    unknowns: [...new Set(unknowns)],
    learningObjective,
    confirmedFindings,
    supportingObservations,
    recommendedAction,
  };
}

export function buildProviderIntelligenceDomainView(input: {
  contact: Record<string, unknown>;
  providerId: string;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  activityTimeline?: Array<Record<string, unknown>>;
}): ProviderIntelligenceDomainView {
  const groupsView = buildDiscoveryIntelligenceGroupsView(input);
  const fieldMeta = parseIntelligenceDomainFieldMetadata(input.contact);
  const timelineEvents = buildProviderIntelligenceTimeline({
    providerId: input.providerId,
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
    activityTimeline: input.activityTimeline,
  }).events;

  return {
    domains: groupsView.groups.map((group) =>
      buildDomainCard(group, input.contact, fieldMeta, timelineEvents),
    ),
  };
}

export { LOCKED_MESSAGE as INTELLIGENCE_DOMAIN_LOCKED_MESSAGE };
