/**
 * Provider overview — account notes before field deployment.
 * Three expandable areas: workflow, relationship, observation readiness.
 */

import {
  buildProviderOverviewDiscoveryAreas,
  type ProviderDiscoveryKnownItem,
  type ProviderDiscoveryUnknownItem,
} from "@/lib/surgical-sales/buildProviderOverviewDiscoveryAreas";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  formatIntelligenceCaptureSummaryChip,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  isIntelligenceSectionVisibleForCommercialStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  PROVIDER_OVERVIEW_ACCOUNT_NOTE_SECTIONS,
  PROVIDER_OVERVIEW_NOTES_LABELS,
} from "@/lib/surgical-sales/providerOverviewVocabulary";

export type ProviderOverviewAccountNotesSectionId =
  | "workflow_insights"
  | "relationship_insights"
  | "observation_readiness";

export type ProviderOverviewAccountNotesSection = {
  id: ProviderOverviewAccountNotesSectionId;
  title: string;
  /** One-line scan for collapsed header */
  scanMeta: string;
  summary: string;
  operationalNotes: string[];
  latestDiscoveries: string[];
  outstandingUnknowns: string[];
};

const FIELD_LABEL_BY_KEY = new Map(PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label]));

const NOTE_FIELD_KEYS = new Set([
  "provider_workflow_pain_points",
  "provider_technique_detail",
  "provider_first_observation_questions",
  "provider_or_team_dynamics",
  "provider_support_expectations",
  "provider_follow_up_approach",
]);

const SECTION_CONFIG: {
  id: ProviderOverviewAccountNotesSectionId;
  title: string;
  intelligenceSections: ProviderIntelligenceSectionId[];
}[] = [
  {
    id: "workflow_insights",
    title: PROVIDER_OVERVIEW_ACCOUNT_NOTE_SECTIONS.workflow,
    intelligenceSections: ["clinical_workflow", "or_environment"],
  },
  {
    id: "relationship_insights",
    title: PROVIDER_OVERVIEW_ACCOUNT_NOTE_SECTIONS.relationship,
    intelligenceSections: ["relationship_intelligence"],
  },
  {
    id: "observation_readiness",
    title: PROVIDER_OVERVIEW_ACCOUNT_NOTE_SECTIONS.observation,
    intelligenceSections: ["observation_readiness"],
  },
];

function dbKeysForIntelligenceSections(sectionIds: ProviderIntelligenceSectionId[]): string[] {
  const keys: string[] = [];
  for (const sectionId of sectionIds) {
    keys.push(...(PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? []));
  }
  return keys;
}

function mergeKnown(
  sectionIds: ProviderIntelligenceSectionId[],
  areas: ReturnType<typeof buildProviderOverviewDiscoveryAreas>,
): ProviderDiscoveryKnownItem[] {
  const out: ProviderDiscoveryKnownItem[] = [];
  const seen = new Set<string>();
  for (const area of areas) {
    if (!sectionIds.includes(area.areaId)) continue;
    for (const item of area.known) {
      if (seen.has(item.dbKey)) continue;
      seen.add(item.dbKey);
      out.push(item);
    }
  }
  return out;
}

function mergeUnknown(
  sectionIds: ProviderIntelligenceSectionId[],
  areas: ReturnType<typeof buildProviderOverviewDiscoveryAreas>,
): ProviderDiscoveryUnknownItem[] {
  const out: ProviderDiscoveryUnknownItem[] = [];
  const seen = new Set<string>();
  for (const area of areas) {
    if (!sectionIds.includes(area.areaId)) continue;
    for (const item of area.unknown) {
      if (seen.has(item.dbKey)) continue;
      seen.add(item.dbKey);
      out.push(item);
    }
  }
  return out;
}

function buildScanMeta(known: ProviderDiscoveryKnownItem[], unknown: ProviderDiscoveryUnknownItem[]): string {
  if (known.length === 0 && unknown.length === 0) return "Empty";
  const parts: string[] = [];
  if (known.length > 0) parts.push(`${known.length} on file`);
  if (unknown.length > 0) parts.push(`${unknown.length} open`);
  return parts.join(" · ");
}

function buildSummary(
  known: ProviderDiscoveryKnownItem[],
  unknown: ProviderDiscoveryUnknownItem[],
  emptyLabel: string,
): string {
  if (known.length === 0 && unknown.length === 0) {
    return emptyLabel;
  }
  if (known.length >= 2) {
    const lead = `Picked up ${known[0].label.toLowerCase()} and ${known[1].label.toLowerCase()}.`;
    if (unknown.length === 0) return scanLine(lead, 120);
    return scanLine(
      `${lead} ${unknown.length} point${unknown.length === 1 ? "" : "s"} still open before the visit.`,
      120,
    );
  }
  if (known.length === 1) {
    const lead = `Picked up ${known[0].label.toLowerCase()}.`;
    if (unknown.length === 0) return scanLine(lead, 120);
    return scanLine(
      `${lead} ${unknown.length} open point${unknown.length === 1 ? "" : "s"} before you deploy.`,
      120,
    );
  }
  return scanLine(
    `${unknown.length} open point${unknown.length === 1 ? "" : "s"} — confirm before you book field time.`,
    120,
  );
}

function collectOperationalNotes(
  contact: Record<string, unknown>,
  dbKeys: string[],
): string[] {
  const notes: string[] = [];
  for (const dbKey of dbKeys) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;

    const label = FIELD_LABEL_BY_KEY.get(dbKey) ?? dbKey;
    if (NOTE_FIELD_KEYS.has(dbKey) || raw.length > 72) {
      const body = scanLine(raw.replace(/\s+/g, " "), 110);
      notes.push(body.startsWith(label) ? body : `${label}: ${body}`);
    } else {
      const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
      if (chip && chip.length > 18) {
        notes.push(`${label}: ${scanLine(chip, 72)}`);
      }
    }
    if (notes.length >= 3) break;
  }
  return notes;
}

function collectLatestDiscoveries(
  contact: Record<string, unknown>,
  dbKeys: string[],
): string[] {
  const fieldMetadata = parseProviderIntelligenceFieldMetadata(contact);
  const ranked: { at: number; line: string }[] = [];

  for (const dbKey of dbKeys) {
    const raw = contact[dbKey];
    if (!fieldHasIntelligenceSignal(dbKey, String(raw ?? ""))) continue;
    const meta = fieldMetadata[dbKey];
    const iso = meta?.validated_at?.trim() || meta?.confirmed_at?.trim() || meta?.updated_at?.trim();
    if (!iso) continue;
    const at = Date.parse(iso);
    if (Number.isNaN(at)) continue;
    const label = FIELD_LABEL_BY_KEY.get(dbKey) ?? dbKey;
    const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
    ranked.push({
      at,
      line: scanLine(`${label}: ${chip || String(raw).slice(0, 48)}`, 80),
    });
  }

  return ranked
    .sort((a, b) => b.at - a.at)
    .slice(0, 3)
    .map((r) => r.line);
}

function collectOutstandingUnknowns(unknown: ProviderDiscoveryUnknownItem[]): string[] {
  return unknown.slice(0, 3).map((u) => scanLine(u.label, 72));
}

function buildOneSection(
  config: (typeof SECTION_CONFIG)[number],
  contact: Record<string, unknown>,
  commercialStage: ProviderCommercialWorkflowStage,
  areas: ReturnType<typeof buildProviderOverviewDiscoveryAreas>,
): ProviderOverviewAccountNotesSection | null {
  const visibleSections = config.intelligenceSections.filter((s) =>
    isIntelligenceSectionVisibleForCommercialStage(s, commercialStage),
  );
  if (visibleSections.length === 0) return null;

  const known = mergeKnown(visibleSections, areas);
  const unknown = mergeUnknown(visibleSections, areas);
  const dbKeys = dbKeysForIntelligenceSections(visibleSections);

  const emptyLabel =
    config.id === "workflow_insights"
      ? "Procedure mix and OR workflow not documented yet."
      : config.id === "relationship_insights"
        ? "Surgeon relationship and office rhythm not documented yet."
        : "Observation path and scheduling not documented yet.";

  let latestDiscoveries = collectLatestDiscoveries(contact, dbKeys);
  if (latestDiscoveries.length === 0 && known.length > 0) {
    latestDiscoveries = known.slice(0, 3).map((k) => scanLine(k.label, 72));
  }

  return {
    id: config.id,
    title: config.title,
    scanMeta: buildScanMeta(known, unknown),
    summary: buildSummary(known, unknown, emptyLabel),
    operationalNotes: collectOperationalNotes(contact, dbKeys),
    latestDiscoveries,
    outstandingUnknowns: collectOutstandingUnknowns(unknown),
  };
}

export function buildProviderOverviewAccountNotes(input: {
  contact: Record<string, unknown>;
  commercialStage: ProviderCommercialWorkflowStage;
}): ProviderOverviewAccountNotesSection[] {
  const areas = buildProviderOverviewDiscoveryAreas({
    contact: input.contact,
    commercialStage: input.commercialStage,
    maxKnownPerArea: 4,
    maxUnknownPerArea: 4,
  });

  return SECTION_CONFIG.map((config) =>
    buildOneSection(config, input.contact, input.commercialStage, areas),
  ).filter((s): s is ProviderOverviewAccountNotesSection => s !== null);
}
