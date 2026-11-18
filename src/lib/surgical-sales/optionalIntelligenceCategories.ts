/**
 * Optional intelligence — useful field knowledge that never gates pathway, alerts, or scoring.
 */

import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { formatSurgicalContactRole, contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  parseProviderIntelligenceFieldMetadata,
  type IntelligenceCaptureContext,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";

import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";

export const OPTIONAL_INTELLIGENCE_SECTION_TITLE = BRIEF.supplementaryBriefing;

export const OPTIONAL_INTELLIGENCE_SECTION_LEAD = BRIEF.supplementaryBriefingLead;

export const OPTIONAL_INTELLIGENCE_CAPTURE_CONTEXT: IntelligenceCaptureContext = {
  source_type: "profile",
  source_label: BRIEF.supplementaryBriefing,
};

export type OptionalIntelligenceCategoryId =
  | "procedure_interests"
  | "product_interests"
  | "competitor_products"
  | "staff_contacts"
  | "champion_candidates"
  | "facility_notes"
  | "workflow_notes"
  | "personal_notes";

export type OptionalIntelligenceCaptureMode = "text" | "support_contact";

export type OptionalIntelligenceCategory = {
  id: OptionalIntelligenceCategoryId;
  label: string;
  helper: string;
  primaryDbKey: string;
  dbKeys: readonly string[];
  captureMode?: OptionalIntelligenceCaptureMode;
  /** CRM intelligence column instead of planning (e.g. personality_notes). */
  intelligenceKey?: "personality_notes" | "access_notes";
};

export const OPTIONAL_INTELLIGENCE_CATEGORIES: OptionalIntelligenceCategory[] = [
  {
    id: "procedure_interests",
    label: "Procedure interests",
    helper: "Procedures they focus on, want observed, or discuss most often.",
    primaryDbKey: "provider_procedure_focus",
    dbKeys: [
      "provider_procedure_focus",
      "provider_ideal_observation_cases",
      "provider_technique_preferences",
      "provider_case_volume_estimate",
    ],
  },
  {
    id: "product_interests",
    label: "Product interests",
    helper: "Products, trays, or lines they are curious about or evaluating.",
    primaryDbKey: "provider_current_vendors",
    dbKeys: ["provider_current_vendors", "provider_evaluation_openness", "provider_preference_card_signals"],
  },
  {
    id: "competitor_products",
    label: "Competitor products",
    helper: "Competitive systems or vendors entrenched in their workflow.",
    primaryDbKey: "provider_competitive_products",
    dbKeys: ["provider_competitive_products"],
  },
  {
    id: "staff_contacts",
    label: BRIEF.keyRelationships,
    helper: "Schedulers, office staff, OR coordinators, and facility contacts tied to this provider.",
    primaryDbKey: "provider_or_team_dynamics",
    dbKeys: [],
    captureMode: "support_contact",
  },
  {
    id: "champion_candidates",
    label: BRIEF.influencePaths,
    helper: "Internal advocates, decision makers, and influence paths in the account.",
    primaryDbKey: "provider_champion_potential",
    dbKeys: ["provider_champion_potential", "provider_decision_maker_status", "influence_level"],
  },
  {
    id: "facility_notes",
    label: BRIEF.facilityContext,
    helper: "Facility logistics, parking, check-in, or site context — not access workflow.",
    primaryDbKey: "provider_facility_access_notes",
    dbKeys: ["provider_facility_access_notes", "access_notes"],
  },
  {
    id: "workflow_notes",
    label: BRIEF.progressDrivers,
    helper: "OR workflow, case-day patterns, preference cards, or technique detail.",
    primaryDbKey: "provider_observation_best_days_case_types",
    dbKeys: [
      "provider_observation_best_days_case_types",
      "provider_preference_card_signals",
      "provider_technique_detail",
      "observation_history",
    ],
  },
  {
    id: "personal_notes",
    label: "Personal notes",
    helper: "Communication style, rapport, or anything helpful for future touches.",
    primaryDbKey: "personality_notes",
    dbKeys: ["personality_notes", "provider_communication_style"],
    intelligenceKey: "personality_notes",
  },
];

export const OPTIONAL_INTELLIGENCE_CATEGORY_BY_ID = Object.fromEntries(
  OPTIONAL_INTELLIGENCE_CATEGORIES.map((category) => [category.id, category]),
) as Record<OptionalIntelligenceCategoryId, OptionalIntelligenceCategory>;

export const OPTIONAL_INTELLIGENCE_ALL_DB_KEYS = new Set(
  OPTIONAL_INTELLIGENCE_CATEGORIES.flatMap((category) => category.dbKeys),
);

export function optionalIntelligenceCategoryForDbKey(
  dbKey: string,
): OptionalIntelligenceCategory | null {
  return (
    OPTIONAL_INTELLIGENCE_CATEGORIES.find(
      (category) => category.primaryDbKey === dbKey || category.dbKeys.includes(dbKey),
    ) ?? null
  );
}

export function isOptionalIntelligenceDbKey(dbKey: string | null | undefined): boolean {
  if (!dbKey) return false;
  return OPTIONAL_INTELLIGENCE_ALL_DB_KEYS.has(dbKey);
}

export function isOptionalIntelligenceFieldOnFile(
  dbKey: string,
  contact: Record<string, unknown>,
): boolean {
  const meta = parseProviderIntelligenceFieldMetadata(contact.provider_intelligence_field_metadata)?.[dbKey];
  const sourceLabel = String(meta?.source_label ?? "").trim().toLowerCase();
  if (sourceLabel === "optional intelligence") return true;
  if (meta?.discovery_stance === "not_relevant" && isOptionalIntelligenceDbKey(dbKey)) {
    return fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined);
  }
  return false;
}

export type OptionalIntelligenceOverviewItem = {
  id: OptionalIntelligenceCategoryId;
  label: string;
  summary: string;
};

export type ProviderOverviewOptionalIntelligenceRow = {
  id: OptionalIntelligenceCategoryId;
  label: string;
  value: string;
  captured: boolean;
};

export type ProviderOverviewOptionalIntelligenceView = {
  hasData: boolean;
  capturedCount: number;
  rows: ProviderOverviewOptionalIntelligenceRow[];
};

function humanizeOptionalValue(value: string): string {
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function readCategoryValue(
  category: OptionalIntelligenceCategory,
  contact: Record<string, unknown>,
): string | null {
  if (category.captureMode === "support_contact") {
    return null;
  }
  if (category.intelligenceKey) {
    const raw = String(contact[category.intelligenceKey] ?? "").trim();
    if (!raw || raw.toLowerCase() === "unknown") return null;
    return humanizeOptionalValue(raw);
  }

  for (const dbKey of category.dbKeys) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (!raw || raw.toLowerCase() === "unknown") continue;
    if (fieldHasIntelligenceSignal(dbKey, raw)) {
      return humanizeOptionalValue(formatIntelligenceCaptureSummaryChip(dbKey, raw) || raw);
    }
    return humanizeOptionalValue(formatIntelligenceCaptureSummaryChip(dbKey, raw) || raw);
  }
  return null;
}

/** Provider overview — optional rows captured on file only. */
export function buildProviderOverviewOptionalIntelligenceView(input: {
  contact: Record<string, unknown>;
  relatedContacts?: Array<Record<string, unknown>>;
}): ProviderOverviewOptionalIntelligenceView {
  const rows: ProviderOverviewOptionalIntelligenceRow[] = buildOptionalIntelligenceOverviewItems(
    input,
  ).map((item) => ({
    id: item.id,
    label: item.label,
    value: item.summary,
    captured: true,
  }));

  return {
    hasData: rows.length > 0,
    capturedCount: rows.length,
    rows,
  };
}

export function readOptionalIntelligenceCategorySummary(
  category: OptionalIntelligenceCategory,
  contact: Record<string, unknown>,
): string | null {
  return readCategoryValue(category, contact);
}

export function isOptionalIntelligenceSupportContactCategory(
  categoryId: OptionalIntelligenceCategoryId,
): boolean {
  return OPTIONAL_INTELLIGENCE_CATEGORY_BY_ID[categoryId]?.captureMode === "support_contact";
}

export function formatSupportContactRecord(row: Record<string, unknown>): string {
  const name = contactDisplayName(row as Parameters<typeof contactDisplayName>[0]);
  const role =
    String(row.title ?? "").trim() ||
    formatSurgicalContactRole(String(row.role_type ?? "other"));
  const phone = String(row.phone ?? row.mobile_phone ?? "").trim();
  const email = String(row.email ?? "").trim();
  const parts = [name];
  if (role && role.toLowerCase() !== "other") parts.push(role);
  if (phone) parts.push(phone);
  if (email) parts.push(email);
  return parts.join(" · ");
}

function formatRelatedSupportContacts(
  relatedContacts: Array<Record<string, unknown>> | undefined,
): string | null {
  if (!relatedContacts?.length) return null;
  const lines = relatedContacts
    .map((row) => formatSupportContactRecord(row))
    .filter((line) => line.trim());
  return lines.length ? lines.join("; ") : null;
}

function mergeSupportContactSummaries(...parts: Array<string | null | undefined>): string | null {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    for (const line of String(part ?? "")
      .split(/\s*;\s*/)
      .map((segment) => segment.trim())
      .filter(Boolean)) {
      const key = line.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(line);
    }
  }
  return merged.length ? merged.join("; ") : null;
}

export function buildOptionalIntelligenceOverviewItems(input: {
  contact: Record<string, unknown>;
  relatedContacts?: Array<Record<string, unknown>>;
}): OptionalIntelligenceOverviewItem[] {
  const items: OptionalIntelligenceOverviewItem[] = [];
  const relatedSupport = formatRelatedSupportContacts(input.relatedContacts);

  for (const category of OPTIONAL_INTELLIGENCE_CATEGORIES) {
    let summary = readOptionalIntelligenceCategorySummary(category, input.contact);
    if (category.id === "staff_contacts") {
      summary = mergeSupportContactSummaries(summary, relatedSupport);
    }
    if (!summary) continue;
    items.push({
      id: category.id,
      label: category.label,
      summary,
    });
  }
  return items;
}

export function resolveOptionalIntelligenceInitialValue(
  categoryId: OptionalIntelligenceCategoryId,
  contact: Record<string, unknown>,
): string {
  const category = OPTIONAL_INTELLIGENCE_CATEGORY_BY_ID[categoryId];
  if (!category) return "";
  return readOptionalIntelligenceCategorySummary(category, contact) ?? "";
}
