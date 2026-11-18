import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import { formatSurgicalCaseStatus } from "@/lib/surgical-sales/labels";
import type { ProductSupportOverviewProductLine } from "@/lib/surgical-sales/buildProductSupportOverviewBrief";

export type ProductSupportContactRow = {
  id: string;
  label: string;
  value: string;
};

export type ProductSupportOverviewSections = {
  caseSummary: {
    headline: string;
    supporting: string;
    statusLabel: string;
  };
  productsPlanned: ProductSupportOverviewProductLine[];
  coverageObjectives: string[];
  risks: string[];
  contacts: ProductSupportContactRow[];
};

function pushUnique(target: string[], seen: Set<string>, value: string): void {
  const trimmed = value.trim();
  if (!trimmed) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  target.push(trimmed);
}

export function buildProductSupportCaseOverviewSections(input: {
  caseRow: Record<string, unknown>;
  procedureType?: string | null;
  supportType: string;
  products: ProductSupportOverviewProductLine[];
  operationalContext?: CaseOperationalContextView | null;
  providerName?: string | null;
  facilityName?: string | null;
}): ProductSupportOverviewSections {
  const context = input.operationalContext ?? null;
  const coverageObjectives: string[] = [];
  const objectiveSeen = new Set<string>();

  const mission = String(input.caseRow.observation_goal ?? input.caseRow.observation_mission ?? "").trim();
  if (mission) pushUnique(coverageObjectives, objectiveSeen, mission);

  const productNeeds = String(input.caseRow.case_product_needs ?? "").trim();
  if (productNeeds) pushUnique(coverageObjectives, objectiveSeen, productNeeds);

  for (const dimension of context?.dimensions ?? []) {
    if (dimension.id === "case_risks") continue;
    if (dimension.status === "early") {
      pushUnique(coverageObjectives, objectiveSeen, `${dimension.label}: ${dimension.line}`);
    } else if (dimension.status === "strong" || dimension.status === "validated") {
      pushUnique(coverageObjectives, objectiveSeen, `${dimension.label} confirmed`);
    }
  }

  for (const item of context?.caseDay.items ?? []) {
    if (item.value) pushUnique(coverageObjectives, objectiveSeen, `${item.label}: ${item.value}`);
  }

  if (coverageObjectives.length === 0) {
    pushUnique(coverageObjectives, objectiveSeen, "Confirm product coverage and case-day logistics");
  }

  const risks: string[] = [];
  const riskSeen = new Set<string>();
  const operationalRisks = String(input.caseRow.case_operational_risks ?? "").trim();
  if (operationalRisks) {
    operationalRisks
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => pushUnique(risks, riskSeen, line));
  }

  const riskDimension = context?.dimensions.find((dimension) => dimension.id === "case_risks");
  if (riskDimension && riskDimension.status !== "strong" && riskDimension.status !== "validated") {
    pushUnique(risks, riskSeen, riskDimension.line);
  }
  if (context?.priorCaseIssues) {
    pushUnique(risks, riskSeen, context.priorCaseIssues);
  }

  const contacts: ProductSupportContactRow[] = [];
  const provider = String(input.providerName ?? "").trim();
  if (provider) contacts.push({ id: "provider", label: "Provider", value: provider });

  const scheduler = String(input.caseRow.observation_access_scheduling_owner ?? "").trim();
  if (scheduler) contacts.push({ id: "scheduler", label: "Scheduler", value: scheduler });

  const facility = String(input.facilityName ?? "").trim();
  if (facility) contacts.push({ id: "facility", label: "Facility", value: facility });

  for (const item of context?.facility.items ?? []) {
    if (/contact|coordinator|scheduler|spd|rep/i.test(item.label) && item.value) {
      contacts.push({ id: `facility-${item.id}`, label: item.label, value: item.value });
    }
  }

  const procedure = input.procedureType?.trim() || "Procedure not set";
  const supportType = input.supportType.trim() || "Field product support";

  return {
    caseSummary: {
      headline: `${procedure} — ${supportType}`,
      supporting: context?.readinessSummary?.trim() || "Confirm products, coverage, and case-day logistics before execution.",
      statusLabel: formatSurgicalCaseStatus(input.caseRow.status),
    },
    productsPlanned: input.products,
    coverageObjectives,
    risks,
    contacts,
  };
}
