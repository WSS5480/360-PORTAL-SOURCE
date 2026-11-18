/**
 * Provider Intelligence tab — field evidence reference (not mission control).
 */

import { buildProviderIntelligenceTabView } from "@/lib/surgical-sales/buildProviderIntelligenceTabView";
import type { ProviderIntelligenceTimelineItem } from "@/lib/surgical-sales/buildProviderIntelligenceTabView";
import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import { resolveClinicalReferenceSignalGroups } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToProviderIntelligenceClinicalReads";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderFieldIntelligenceModel,
  PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN,
  type ProviderFieldIntelligenceLine,
  type ProviderFieldIntelligenceModel,
} from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import { buildProviderOverviewFieldBriefing } from "@/lib/surgical-sales/buildProviderOverviewFieldBriefing";
import { resolveNormalizedObservationPermission } from "@/lib/surgical-sales/observationPermissionModel";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { buildProviderOpenQuestions } from "@/lib/surgical-sales/buildProviderOpenQuestions";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { isGenericClinicalFactText } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { contactDisplayName, formatSurgicalContactRole } from "@/lib/surgical-sales/labels";
import { formatSupportContactRecord } from "@/lib/surgical-sales/optionalIntelligenceCategories";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { resolveIntelligenceReferencePageLead } from "@/lib/surgical-sales/providerOverviewSparsePresentation";

import { REP_INTELLIGENCE_VOCAB } from "@/lib/surgical-sales/intelligenceCapture/repIntelligenceVocabulary";

export const INTELLIGENCE_REFERENCE_COPY = {
  pageTitle: "Field evidence brief",
  pageLead: "What we know, what we're still exploring, who matters, and where it came from.",
  accessPermission: "Access & permission",
  clinicalSignals: "Clinical focus",
  relationships: REP_INTELLIGENCE_VOCAB.relationships,
  openQuestions: REP_INTELLIGENCE_VOCAB.stillExploring,
  evidenceTimeline: "Evidence timeline",
  emptySection: REP_INTELLIGENCE_VOCAB.noCapturedYet,
  emptyOpenQuestions: REP_INTELLIGENCE_VOCAB.nothingToExplore,
  emptyTimeline: "No source-linked activity yet.",
} as const;

export type IntelligenceReferenceFact = {
  id: string;
  label: string;
  value: string;
};

export type IntelligenceReferenceListGroup = {
  id: string;
  label: string;
  items: string[];
};

export type IntelligenceReferenceRelationship = {
  id: string;
  role: string;
  name: string;
  detail: string | null;
  posture: "confirmed" | "referenced" | "learning";
};

export type IntelligenceReferenceOpenQuestion = {
  id: string;
  text: string;
};

export type ProviderIntelligenceReferenceView = {
  providerName: string;
  pageTitle: string;
  pageLead: string;
  hasFieldEvidence: boolean;
  accessPermission: IntelligenceReferenceFact[];
  clinicalSignals: IntelligenceReferenceListGroup[];
  relationships: IntelligenceReferenceRelationship[];
  openQuestions: IntelligenceReferenceOpenQuestion[];
  evidenceTimeline: ProviderIntelligenceTimelineItem[];
};

const PLACEHOLDER_RE =
  /^(still learning|not established|not yet observed|unknown|n\/a|—|-)$/i;

function hasMeaningfulValue(value: string | null | undefined): boolean {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return false;
  if (trimmed === PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN) return false;
  if (PLACEHOLDER_RE.test(trimmed)) return false;
  if (/^still being learned/i.test(trimmed)) return false;
  return true;
}

function pushFact(
  rows: IntelligenceReferenceFact[],
  seen: Set<string>,
  id: string,
  label: string,
  value: string | null | undefined,
  options?: { allowPlaceholder?: boolean },
) {
  if (!options?.allowPlaceholder && !hasMeaningfulValue(value)) return;
  const line = scanLine(String(value ?? "").trim(), 160) || PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN;
  const key = `${label}:${line}`.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  rows.push({ id, label, value: line });
}

function linePosture(line: ProviderFieldIntelligenceLine): IntelligenceReferenceRelationship["posture"] | null {
  if (line.captureState === "empty") return null;
  if (line.isConfirmed || line.captureState === "verified") return "confirmed";
  if (line.captureState === "referenced") return "referenced";
  return "learning";
}

function postureLabel(posture: IntelligenceReferenceRelationship["posture"]): string {
  if (posture === "confirmed") return "On file";
  if (posture === "referenced") return "Referenced in field";
  return "Partial detail";
}

function pushRelationship(
  rows: IntelligenceReferenceRelationship[],
  seen: Set<string>,
  input: Omit<IntelligenceReferenceRelationship, "detail"> & { detail?: string | null },
) {
  const name = input.name.trim() || "Referenced in field";
  const key = `${input.role}:${name}`.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  rows.push({
    id: input.id,
    role: input.role,
    name,
    detail: input.detail?.trim() || postureLabel(input.posture),
    posture: input.posture,
  });
}

function buildAccessPermission(
  model: ProviderFieldIntelligenceModel,
  contact: Record<string, unknown>,
  engagements?: ProviderEngagementSummary[],
): IntelligenceReferenceFact[] {
  const rows: IntelligenceReferenceFact[] = [];
  const seen = new Set<string>();

  const permission = resolveNormalizedObservationPermission({ contact, engagements });
  pushFact(
    rows,
    seen,
    "observation-permission",
    "Observation permission",
    permission.label,
    { allowPlaceholder: true },
  );
  pushFact(
    rows,
    seen,
    "approval-status",
    "Approval detail",
    permission.approvalDetailLabel,
    { allowPlaceholder: true },
  );

  if (model.scheduler.captureState !== "empty") {
    pushFact(rows, seen, "scheduling-contact", "Scheduling contact", model.scheduler.displayValue);
  }

  if (model.credentialing.captureState !== "empty") {
    pushFact(rows, seen, "credentialing", "Credentialing / access notes", model.credentialing.displayValue);
  }

  const accessPath = String(contact.provider_observation_access_path ?? "").trim();
  if (fieldHasIntelligenceSignal("provider_observation_access_path", accessPath)) {
    const chip = formatIntelligenceCaptureSummaryChip("provider_observation_access_path", accessPath);
    pushFact(rows, seen, "access-path", "Facility access notes", chip || accessPath);
  }

  if (model.facilityNotes.captureState !== "empty") {
    pushFact(rows, seen, "facility-notes", "Facility notes", model.facilityNotes.displayValue);
  }

  return rows;
}

function buildClinicalSignals(
  model: ProviderFieldIntelligenceModel,
  contact: Record<string, unknown>,
): IntelligenceReferenceListGroup[] {
  const groups: IntelligenceReferenceListGroup[] = [];
  const usefulClinicalItem = (item: string) => {
    const trimmed = item.trim();
    return (
      trimmed.length > 0 &&
      !isGenericClinicalFactText(trimmed) &&
      !/\bgeneral\s+volume\b/i.test(trimmed)
    );
  };

  const procedureItems = [
    ...model.clinical.procedures,
    ...(model.procedureInterests.isConfirmed && model.procedureInterests.primaryLine.trim()
      ? [model.procedureInterests.primaryLine.trim()]
      : []),
  ].filter((item, index, arr) => usefulClinicalItem(item) && arr.indexOf(item) === index);

  if (procedureItems.length > 0) {
    groups.push({ id: "procedure-focus", label: "Procedure focus", items: procedureItems.slice(0, 6) });
  }

  const trendItems = model.clinical.trends.filter(
    (item, index, arr) => usefulClinicalItem(item) && arr.indexOf(item) === index,
  );
  if (trendItems.length > 0) {
    groups.push({
      id: "volume-trends",
      label: "Volume trends",
      items: trendItems.slice(0, 4),
    });
  }

  const painPoints = [
    ...model.clinical.frustrations,
    ...model.clinical.workflowObservations.filter((line) =>
      /\b(friction|pain|slow|delay|frustrat|turnover|setup|challenge|struggle|tight|pooled|fluid|suction|instrument|reach)\b/i.test(line),
    ),
  ].filter((item, index, arr) => usefulClinicalItem(item) && arr.indexOf(item) === index);

  if (painPoints.length > 0) {
    groups.push({
      id: "clinical-pain",
      label: "Clinical pain points",
      items: painPoints.slice(0, 5),
    });
  }

  const productFit: string[] = [];
  for (const interest of model.clinical.productInterests) {
    if (fieldHasIntelligenceSignal("provider_product_interests", interest)) {
      productFit.push(`Product interest: ${interest}`);
    }
  }
  for (const dbKey of [
    "provider_product_interests",
    "provider_dissatisfaction_areas",
    "provider_product_gaps",
    "provider_competitive_products",
    "provider_current_vendors",
    "provider_evaluation_openness",
  ] as const) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;
    const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
    if (chip) productFit.push(chip);
  }

  if (productFit.length > 0) {
    groups.push({ id: "product-fit", label: "Product fit signals", items: productFit.slice(0, 5) });
  }

  if (model.clinical.preferences.length > 0) {
    groups.push({
      id: "clinical-preferences",
      label: "Technique preferences",
      items: model.clinical.preferences.slice(0, 4),
    });
  }

  return groups;
}

function buildRelationships(
  model: ProviderFieldIntelligenceModel,
  contact: Record<string, unknown>,
  relatedContacts?: Array<Record<string, unknown>>,
): IntelligenceReferenceRelationship[] {
  if (!model.hasFieldEvidence) return [];

  const rows: IntelligenceReferenceRelationship[] = [];
  const seen = new Set<string>();

  const schedulerPosture = linePosture(model.scheduler);
  if (schedulerPosture) {
    pushRelationship(rows, seen, {
      id: "scheduler",
      role: "Scheduler",
      name: model.scheduler.primaryLine.trim() || "Scheduling contact",
      detail: model.scheduler.secondaryLine,
      posture: schedulerPosture,
    });
  }

  const coordinatorRaw = String(contact.provider_observation_coordinator_contact ?? "").trim();
  if (fieldHasIntelligenceSignal("provider_observation_coordinator_contact", coordinatorRaw)) {
    const posture: IntelligenceReferenceRelationship["posture"] =
      model.scheduler.isConfirmed && model.scheduler.captureState === "verified"
        ? "confirmed"
        : model.scheduler.captureState === "referenced"
          ? "referenced"
          : "learning";
    pushRelationship(rows, seen, {
      id: "or-coordinator",
      role: "OR coordinator",
      name: coordinatorRaw.split(/[—–-]/)[0]?.trim() || coordinatorRaw,
      detail: coordinatorRaw,
      posture,
    });
  }

  for (const related of relatedContacts ?? []) {
    const roleRaw = String(related.role ?? related.title ?? related.relationship_type ?? "").toLowerCase();
    const roleLabel = formatSurgicalContactRole(String(related.role ?? related.title ?? "")) || "Key contact";
    const isOffice =
      roleRaw.includes("office") ||
      roleRaw.includes("practice manager") ||
      roleRaw.includes("office_manager");
    const isCoordinator = roleRaw.includes("coordinator") && !roleRaw.includes("schedul");
    if (!isOffice && !isCoordinator) continue;

    const formatted = formatSupportContactRecord(related);
    if (!formatted.trim()) continue;

    pushRelationship(rows, seen, {
      id: `related-${String(related.id ?? roleLabel)}`,
      role: isOffice ? "Office manager" : "OR coordinator",
      name: contactDisplayName(related),
      detail: formatted,
      posture: "confirmed",
    });
  }

  const championPosture = linePosture(model.champion);
  if (championPosture) {
    pushRelationship(rows, seen, {
      id: "champion",
      role: "Champion / influencer",
      name: model.champion.primaryLine.trim() || "Champion candidate",
      detail: model.champion.secondaryLine,
      posture: championPosture,
    });
  }

  if (model.supportContacts.captureState !== "empty") {
    pushRelationship(rows, seen, {
      id: "support-contacts",
      role: "Other key contacts",
      name: model.supportContacts.primaryLine.trim() || "Support contacts",
      detail: model.supportContacts.secondaryLine,
      posture: model.supportContacts.isConfirmed ? "confirmed" : "referenced",
    });
  }

  return rows.slice(0, 10);
}

export function buildEvidenceBasedOpenQuestions(
  contact: Record<string, unknown>,
  model: ProviderFieldIntelligenceModel,
  planning?: ProviderPlanningCompletion | null,
): IntelligenceReferenceOpenQuestion[] {
  return buildProviderOpenQuestions({
    contact,
    planning,
    model,
  });
}

export function buildProviderIntelligenceReferenceView(input: {
  contact: Record<string, unknown>;
  providerId: string;
  planning?: ProviderPlanningCompletion | null;
  organizationName?: string | null;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  activityTimeline?: Array<Record<string, unknown>>;
  relatedContacts?: Array<Record<string, unknown>>;
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): ProviderIntelligenceReferenceView {
  const contact = input.contact ?? {};
  const model = buildProviderFieldIntelligenceModel({
    contact,
    relatedContacts: input.relatedContacts,
    engagements: input.engagements,
    cases: input.cases,
    activityTimeline: input.activityTimeline,
    clinicalDiscoveryAnswers: input.clinicalDiscoveryAnswers,
  });

  const tabView = buildProviderIntelligenceTabView({
    contact,
    providerId: input.providerId,
    planning: input.planning,
    organizationName: input.organizationName,
    engagements: input.engagements,
    cases: input.cases,
    activityTimeline: input.activityTimeline,
    clinicalDiscoveryAnswers: input.clinicalDiscoveryAnswers,
  });

  const hasFieldEvidence = model.hasFieldEvidence;

  return {
    providerName: contactDisplayName(contact),
    pageTitle: INTELLIGENCE_REFERENCE_COPY.pageTitle,
    pageLead: resolveIntelligenceReferencePageLead(hasFieldEvidence),
    hasFieldEvidence,
    accessPermission: buildAccessPermission(model, contact, input.engagements),
    clinicalSignals: resolveClinicalReferenceSignalGroups({
      providerRuns: input.universalFactsReadModel?.providerRuns,
      contact,
      crmFallback: () => buildClinicalSignals(model, contact),
    }),
    relationships: buildRelationships(model, contact, input.relatedContacts),
    openQuestions: model.hasFieldEvidence
      ? buildEvidenceBasedOpenQuestions(contact, model, input.planning)
      : [],
    evidenceTimeline: tabView.timeline.slice(0, 12),
  };
}
