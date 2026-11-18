import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import {
  buildProductSupportOverviewBrief,
  type ProductSupportOverviewProductLine,
} from "@/lib/surgical-sales/buildProductSupportOverviewBrief";
import {
  productSupportCaseOutcomeLabel,
  parseProductSupportCaseOutcome,
} from "@/lib/surgical-sales/productSupportCaseOutcome";

export type ProductSupportContactRow = {
  id: string;
  label: string;
  value: string;
};

export type ProductSupportCaseDetailSections = {
  contacts: ProductSupportContactRow[];
  outcomeLabel: string | null;
  nextStep: string | null;
  followUpNeeded: boolean;
};

function readBool(caseRow: Record<string, unknown>, key: string): boolean {
  const value = caseRow[key];
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
}

function buildContacts(input: {
  caseRow: Record<string, unknown>;
  operationalContext?: CaseOperationalContextView | null;
  providerName?: string | null;
  facilityName?: string | null;
}): ProductSupportContactRow[] {
  const contacts: ProductSupportContactRow[] = [];
  const provider = String(input.providerName ?? "").trim();
  if (provider) contacts.push({ id: "provider", label: "Provider", value: provider });

  const scheduler = String(input.caseRow.observation_access_scheduling_owner ?? "").trim();
  if (scheduler) contacts.push({ id: "scheduler", label: "Scheduler", value: scheduler });

  const facility = String(input.facilityName ?? "").trim();
  if (facility) contacts.push({ id: "organization", label: "Organization", value: facility });

  for (const item of input.operationalContext?.facility.items ?? []) {
    if (/contact|coordinator|scheduler|spd|rep/i.test(item.label) && item.value) {
      contacts.push({ id: `facility-${item.id}`, label: item.label, value: item.value });
    }
  }

  return contacts;
}

export function buildProductSupportCaseDetailSections(input: {
  caseRow: Record<string, unknown>;
  procedureType?: string | null;
  supportType: string;
  products: ProductSupportOverviewProductLine[];
  operationalContext?: CaseOperationalContextView | null;
  providerName?: string | null;
  facilityName?: string | null;
}): ProductSupportCaseDetailSections {
  const brief = buildProductSupportOverviewBrief({
    caseRow: input.caseRow,
    procedureType: input.procedureType,
    supportType: input.supportType,
    products: input.products,
    operationalContext: input.operationalContext ?? null,
  });

  const suggestedAction = String(input.caseRow.debrief_suggested_next_action ?? "").trim();
  const nextStep = suggestedAction || brief.followUps[0] || null;
  const outcome = parseProductSupportCaseOutcome(input.caseRow.case_support_outcome as string | null | undefined);

  return {
    contacts: buildContacts(input),
    outcomeLabel: productSupportCaseOutcomeLabel(outcome),
    nextStep,
    followUpNeeded: readBool(input.caseRow, "follow_up_needed"),
  };
}
