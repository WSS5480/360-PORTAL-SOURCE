/**
 * Case operational context — facility + provider intelligence inherited into case prep.
 */

import {
  CASE_INTELLIGENCE_LOGISTICS_FIELD_DEFS,
  type CaseIntelligenceFieldDef,
} from "@/lib/surgical-sales/caseIntelligenceFields";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import {
  ORGANIZATION_INTELLIGENCE_FIELD_DEFS,
  type OrganizationIntelligenceFieldDef,
} from "@/lib/surgical-sales/organizationIntelligenceFields";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { formatIntelligenceCaptureDisplay } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { formatRepFacingDisplayText } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import { synthesizeOperationalInsight } from "@/lib/surgical-sales/discoveryOperationalSynthesis";
import {
  operationalVisibilityStateLabel,
  type OperationalVisibilityState,
} from "@/lib/surgical-sales/operationalVisibilityVocabulary";

export type CaseReadinessDimensionId =
  | "implants_on_site"
  | "trays_ready"
  | "support_coverage"
  | "facility_logistics"
  | "provider_preferences"
  | "case_risks";

export type CaseContextLine = {
  id: string;
  label: string;
  value: string;
  scope: "facility" | "provider" | "case";
  /** Facility lines pulled from org baseline or peer consensus. */
  inherited?: boolean;
};

export type CaseReadinessDimension = {
  id: CaseReadinessDimensionId;
  label: string;
  status: OperationalVisibilityState;
  statusLabel: string;
  line: string;
  scope: "facility" | "provider" | "case";
};

export type CaseOperationalContextView = {
  readinessState: OperationalVisibilityState;
  readinessLabel: string;
  readinessSummary: string;
  readyCount: number;
  dimensionTotal: number;
  dimensions: CaseReadinessDimension[];
  facility: {
    title: string;
    inheritanceLine: string;
    items: CaseContextLine[];
  };
  provider: {
    title: string;
    items: CaseContextLine[];
  };
  caseDay: {
    title: string;
    items: CaseContextLine[];
  };
  priorCaseIssues: string | null;
};

const FACILITY_CONTEXT_FIELDS: OrganizationIntelligenceFieldDef[] =
  ORGANIZATION_INTELLIGENCE_FIELD_DEFS.filter((f) =>
    [
      "spd_tray_behavior",
      "vendor_credentialing",
      "or_access_rules",
      "facility_logistics",
      "room_turnover",
      "support_norms",
    ].includes(f.category),
  );

const PROVIDER_CONTEXT_KEYS: Array<{ dbKey: string; label: string }> = [
  { dbKey: "provider_procedure_focus", label: "Procedure focus" },
  { dbKey: "provider_technique_preferences", label: "Surgical approach" },
  { dbKey: "provider_technique_detail", label: "Technique detail" },
  { dbKey: "provider_support_expectations", label: "In-room support expectations" },
  { dbKey: "provider_workflow_pain_points", label: "Workflow friction" },
  { dbKey: "provider_preference_card_signals", label: "Preference card signals" },
  { dbKey: "provider_competitive_products", label: "Competitive footprint" },
];

function looksLikeRawMachineToken(text: string): boolean {
  return /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/i.test(text.trim());
}

function displayValue(dbKey: string, raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const formatted =
    formatRepFacingDisplayText(text, dbKey) ??
    formatIntelligenceCaptureDisplay(dbKey, text) ??
    synthesizeOperationalInsight(dbKey, text);
  const t = formatted?.trim();
  if (!t || looksLikeRawMachineToken(t)) return null;
  return t;
}

function lineFromField(
  dbKey: string,
  label: string,
  contact: Record<string, unknown>,
  scope: CaseContextLine["scope"],
  baseline?: OrganizationIntelligenceBaseline | null,
): CaseContextLine | null {
  const onProvider = displayValue(dbKey, contact[dbKey]);
  const baselineField = baseline?.fields?.[dbKey];
  const inherited = Boolean(baselineField && !onProvider);
  const value = onProvider ?? baselineField?.displayLine ?? null;
  if (!value) return null;
  return {
    id: dbKey,
    label,
    value,
    scope,
    inherited: inherited || undefined,
  };
}

function readinessFromSignal(hasSignal: boolean, hasInherited: boolean): OperationalVisibilityState {
  if (hasSignal) return "strong";
  if (hasInherited) return "developing";
  return "early";
}

function buildDimension(
  id: CaseReadinessDimensionId,
  label: string,
  scope: CaseReadinessDimension["scope"],
  line: string,
  status: OperationalVisibilityState,
): CaseReadinessDimension {
  return {
    id,
    label,
    status,
    statusLabel: operationalVisibilityStateLabel(status),
    line,
    scope,
  };
}

function logisticsLine(caseRow: Record<string, unknown>, field: CaseIntelligenceFieldDef): string {
  const v = displayValue(field.dbKey, caseRow[field.dbKey]);
  return v ?? "Still open for this case";
}

export function buildCaseOperationalContextView(input: {
  caseRow: Record<string, unknown>;
  surgeonContact?: Record<string, unknown> | null;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  organizationName?: string | null;
}): CaseOperationalContextView {
  const contact = input.surgeonContact ?? {};
  const caseRow = input.caseRow;
  const baseline = input.organizationBaseline ?? null;
  const orgName = baseline?.organizationName?.trim() || input.organizationName?.trim() || "this facility";

  const facilityItems: CaseContextLine[] = [];
  for (const def of FACILITY_CONTEXT_FIELDS) {
    const line = lineFromField(def.dbKey, def.label, contact, "facility", baseline);
    if (line) facilityItems.push(line);
  }

  const providerItems: CaseContextLine[] = [];
  for (const spec of PROVIDER_CONTEXT_KEYS) {
    const line = lineFromField(spec.dbKey, spec.label, contact, "provider");
    if (line) providerItems.push(line);
  }

  const caseDayItems: CaseContextLine[] = [];
  for (const def of CASE_INTELLIGENCE_LOGISTICS_FIELD_DEFS) {
    const v = displayValue(def.dbKey, caseRow[def.dbKey]);
    caseDayItems.push({
      id: def.dbKey,
      label: def.label,
      value: v ?? "Still open for this case",
      scope: "case",
    });
  }

  const priorDebrief = displayValue("debrief_key_findings", caseRow.debrief_key_findings);
  const priorNotes = String(caseRow.notes ?? "").trim();
  const priorCaseIssues =
    priorDebrief ??
    (priorNotes.length > 12 && /issue|risk|problem|delay|short/i.test(priorNotes)
      ? priorNotes.slice(0, 200)
      : null);

  const implantsSignal = fieldHasIntelligenceSignal(
    "case_implants_on_site",
    caseRow.case_implants_on_site as string,
  );
  const traysSignal = fieldHasIntelligenceSignal(
    "case_trays_sterilization_status",
    caseRow.case_trays_sterilization_status as string,
  );
  const supportSignal = fieldHasIntelligenceSignal(
    "case_support_coverage",
    caseRow.case_support_coverage as string,
  );
  const facilityLogisticsInherited = facilityItems.some(
    (i) => i.inherited && /logistics|turnover|spd|tray/i.test(i.label),
  );
  const facilityLogisticsOnFile = facilityItems.some((i) => /logistics|turnover|spd|tray/i.test(i.label));
  const providerPrefsOnFile = providerItems.length > 0;
  const risksSignal = fieldHasIntelligenceSignal(
    "case_operational_risks",
    caseRow.case_operational_risks as string,
  );

  const dimensions: CaseReadinessDimension[] = [
    buildDimension(
      "implants_on_site",
      "Implants on site",
      "case",
      logisticsLine(caseRow, CASE_INTELLIGENCE_LOGISTICS_FIELD_DEFS[0]!),
      readinessFromSignal(implantsSignal, false),
    ),
    buildDimension(
      "trays_ready",
      "Trays ready",
      "case",
      logisticsLine(caseRow, CASE_INTELLIGENCE_LOGISTICS_FIELD_DEFS[1]!),
      readinessFromSignal(traysSignal, false),
    ),
    buildDimension(
      "support_coverage",
      "Rep / support coverage",
      "case",
      logisticsLine(caseRow, CASE_INTELLIGENCE_LOGISTICS_FIELD_DEFS[3]!),
      readinessFromSignal(supportSignal, false),
    ),
    buildDimension(
      "facility_logistics",
      "Facility logistics",
      "facility",
      facilityItems.find((i) => /logistics|turnover|spd|tray/i.test(i.label))?.value ??
        "Confirm SPD, room, and vendor access before case day",
      readinessFromSignal(facilityLogisticsOnFile && !facilityLogisticsInherited, facilityLogisticsInherited),
    ),
    buildDimension(
      "provider_preferences",
      "Provider preferences",
      "provider",
      providerItems[0]?.value ?? "Confirm surgeon approach and support expectations",
      readinessFromSignal(providerPrefsOnFile, false),
    ),
    buildDimension(
      "case_risks",
      "Case-specific risks",
      "case",
      displayValue("case_operational_risks", caseRow.case_operational_risks) ??
        (priorCaseIssues ? `Prior signal: ${priorCaseIssues}` : "Note case-day risks when known"),
      risksSignal ? "strong" : priorCaseIssues ? "developing" : "early",
    ),
  ];

  const readyCount = dimensions.filter((d) => d.status === "strong" || d.status === "validated").length;
  const developingCount = dimensions.filter((d) => d.status === "developing").length;

  let readinessState: OperationalVisibilityState = "early";
  if (readyCount >= 5) readinessState = "strong";
  else if (readyCount >= 3 || developingCount >= 2) readinessState = "developing";

  const readinessSummary =
    readinessState === "strong"
      ? "Case day context is strong enough to execute — confirm logistics on arrival."
      : readinessState === "developing"
        ? "Inherited facility and provider context is forming — close open case-day items before OR."
        : "Build case-day logistics using facility and surgeon intelligence already on file.";

  return {
    readinessState,
    readinessLabel: operationalVisibilityStateLabel(readinessState),
    readinessSummary,
    readyCount,
    dimensionTotal: dimensions.length,
    dimensions,
    facility: {
      title: "Facility context",
      inheritanceLine: `Inherited from ${orgName} — shared across surgeons at this site`,
      items: facilityItems,
    },
    provider: {
      title: "Provider context",
      items: providerItems,
    },
    caseDay: {
      title: "This case",
      items: caseDayItems,
    },
    priorCaseIssues,
  };
}

/** Compact label for case list rows (logistics fields only). */
export type CaseOperationalLogisticsFields = {
  case_implants_on_site?: string | null;
  case_trays_sterilization_status?: string | null;
  case_support_coverage?: string | null;
  case_operational_risks?: string | null;
};

export function caseListOperationalPrepHint(caseRow: CaseOperationalLogisticsFields): string | null {
  const view = buildCaseOperationalContextView({ caseRow, surgeonContact: null });
  if (view.readinessState === "strong") return "Case prep · Strong";
  if (view.readyCount >= 2) return `Case prep · ${view.readyCount}/${view.dimensionTotal} ready`;
  if (view.readyCount > 0) return `Case prep · ${view.readyCount} confirmed`;
  return "Case prep · Add logistics";
}
