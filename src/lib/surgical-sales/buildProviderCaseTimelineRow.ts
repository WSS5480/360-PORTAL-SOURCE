import {
  buildCaseIdentity,
  formatCaseIdentityDate,
} from "@/lib/surgical-sales/buildCaseIdentity";
import { buildObservationOverviewBrief } from "@/lib/surgical-sales/buildObservationOverviewBrief";
import { formatRepFacingDisplayText } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import {
  formatSurgicalCaseStatus,
  formatSurgicalCaseType,
  isSurgicalObservationCase,
} from "@/lib/surgical-sales/labels";
import { observationQuickFindingsFromCaseRow } from "@/lib/surgical-sales/observationQuickFindings";
import { productSupportCaseOutcomeLabel } from "@/lib/surgical-sales/productSupportCaseOutcome";

export type ProviderCaseTimelineRow = {
  caseId: string;
  detailHref: string;
  caseTypeLabel: string;
  procedureLabel: string;
  dateLine: string;
  statusLabel: string;
  productsLabel: string | null;
  outcomeLines: string[];
  openQuestionsCount: number | null;
};

const MAX_OUTCOME_LINES = 2;

function humanizeOutcomeLine(raw: unknown): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  return formatRepFacingDisplayText(text) ?? text;
}

function splitOutcomeLines(raw: unknown, max = MAX_OUTCOME_LINES): string[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];

  return text
    .split(/\n+/)
    .flatMap((chunk) => chunk.split(/\s*•\s*/))
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .map(humanizeOutcomeLine)
    .filter(Boolean)
    .slice(0, max);
}

function pushUniqueOutcome(lines: string[], seen: Set<string>, raw: unknown): void {
  if (lines.length >= MAX_OUTCOME_LINES) return;
  const line = humanizeOutcomeLine(raw);
  if (!line || line.length > 140) return;
  const key = line.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  lines.push(line);
}

function formatProductFitOutcome(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const normalized = value.toLowerCase();
  if (normalized === "possible" || normalized === "strong") return "Product fit signal identified";
  if (["unknown", "weak", "yes", "no", "none"].includes(normalized)) return null;
  if (/\bacsis\b/i.test(value) || /\bfit\b/i.test(value)) return value;
  if (value.length > 12 && /\s/.test(value)) return value;
  return null;
}

function buildObservationOutcomeLines(caseRow: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const line of splitOutcomeLines(caseRow.debrief_key_findings)) {
    pushUniqueOutcome(lines, seen, line);
  }
  for (const line of splitOutcomeLines(caseRow.live_observation_clinical_pain_points)) {
    pushUniqueOutcome(lines, seen, line);
  }

  const productFit = formatProductFitOutcome(caseRow.live_observation_product_fit);
  if (productFit) pushUniqueOutcome(lines, seen, productFit);

  const findings = observationQuickFindingsFromCaseRow(caseRow);
  pushUniqueOutcome(lines, seen, findings.key_finding_note);
  pushUniqueOutcome(lines, seen, caseRow.live_observation_workflow);

  if (lines.length === 0) {
    const brief = buildObservationOverviewBrief({ caseRow });
    for (const objective of brief.objectives) {
      pushUniqueOutcome(lines, seen, objective);
    }
  }

  if (lines.length === 0) {
    pushUniqueOutcome(lines, seen, caseRow.observation_goal);
  }

  if (lines.length === 0) {
    lines.push("Learning in progress");
  }

  return lines.slice(0, MAX_OUTCOME_LINES);
}

function buildProductSupportOutcomeLines(caseRow: Record<string, unknown>): string[] {
  const recorded = productSupportCaseOutcomeLabel(String(caseRow.case_support_outcome ?? ""));
  if (recorded) return [recorded];

  const debriefLines = splitOutcomeLines(caseRow.debrief_key_findings);
  if (debriefLines.length > 0) return debriefLines;

  const notes = humanizeOutcomeLine(caseRow.notes);
  if (notes) return [notes];

  const status = String(caseRow.status ?? "").trim().toLowerCase();
  if (status === "completed" || status === "invoiced" || status === "closed") {
    return ["Outcome not recorded"];
  }

  return ["Coverage outcome pending"];
}

function resolveProductsLabel(caseRow: Record<string, unknown>): string | null {
  const productName = String(caseRow.product_name ?? "").trim();
  if (productName) return productName;

  const fit = String(caseRow.live_observation_product_fit ?? "").trim();
  if (fit && fit.length > 12 && /\s/.test(fit)) return fit;

  const interest = String(caseRow.observation_quick_finding_product_interest ?? "").trim();
  if (interest === "Mentioned" || interest === "Strong") return "Product interest noted";

  return null;
}

function resolveStatusLabel(caseRow: Record<string, unknown>): string {
  if (isSurgicalObservationCase(caseRow.case_type)) {
    if (String(caseRow.observation_access_pathway ?? "").trim()) return "Observation approved";
    return formatSurgicalCaseStatus(String(caseRow.status ?? ""));
  }

  return formatSurgicalCaseStatus(String(caseRow.status ?? ""));
}

export function buildProviderCaseTimelineRow(caseRow: Record<string, unknown>): ProviderCaseTimelineRow {
  const caseId = String(caseRow.id ?? "");
  const { dateLine } = formatCaseIdentityDate(
    caseRow.case_date as string | null | undefined,
    caseRow.case_time as string | null | undefined,
  );
  const observation = isSurgicalObservationCase(caseRow.case_type);
  const identity = buildCaseIdentity(caseRow);

  return {
    caseId,
    detailHref: `/portal/sales/cases/${encodeURIComponent(caseId)}`,
    caseTypeLabel: formatSurgicalCaseType(String(caseRow.case_type ?? "")),
    procedureLabel: String(caseRow.procedure_type ?? "").trim() || "Procedure pending",
    dateLine,
    statusLabel: resolveStatusLabel(caseRow),
    productsLabel: resolveProductsLabel(caseRow),
    outcomeLines: observation ? buildObservationOutcomeLines(caseRow) : buildProductSupportOutcomeLines(caseRow),
    openQuestionsCount: observation ? identity.openQuestionsCount ?? 0 : null,
  };
}
