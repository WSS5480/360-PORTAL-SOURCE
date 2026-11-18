import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import {
  buildObservationAccessSummary,
  type ObservationAccessSummaryItem,
} from "@/lib/surgical-sales/observationBriefingScope";

export type CaseAccessSummaryItem = ObservationAccessSummaryItem;

function formatCredentialingLabel(value: string): string {
  const key = value.trim().toLowerCase();
  const labels: Record<string, string> = {
    unknown: "Unknown",
    not_required: "Not required",
    required_not_started: "Required — not started",
    in_progress: "In progress",
    verified: "Verified",
  };
  return labels[key] ?? value;
}

/** Administrative access reference for product support cases — not primary workflow. */
export function buildProductSupportAccessSummary(input: {
  caseRow: Record<string, unknown>;
  operationalContext?: CaseOperationalContextView | null;
}): CaseAccessSummaryItem[] {
  const items: CaseAccessSummaryItem[] = [];
  const scheduler = String(input.caseRow.observation_access_scheduling_owner ?? "").trim();
  if (scheduler) {
    items.push({ label: "Scheduler", value: scheduler });
  }

  const pathway = String(input.caseRow.observation_access_pathway ?? "").trim();
  if (pathway) {
    items.push({ label: "Access pathway", value: pathway });
  }

  const cred = String(input.caseRow.observation_access_credentialing ?? "").trim();
  if (cred) {
    items.push({ label: "Credentialing", value: formatCredentialingLabel(cred) });
  }

  const facilityAccess = input.operationalContext?.facility.items.find((item) =>
    /credential|vendor access|or access|access rule/i.test(item.label),
  );
  if (facilityAccess?.value) {
    items.push({ label: facilityAccess.label, value: facilityAccess.value });
  }

  if (items.length === 0) {
    items.push({ label: "Access reference", value: "No access details captured yet" });
  }

  return items;
}

export function buildCaseAccessSummary(input: {
  variant: "observation" | "product_support";
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  dateLabel?: string | null;
  operationalContext?: CaseOperationalContextView | null;
}): CaseAccessSummaryItem[] {
  if (input.variant === "product_support") {
    return buildProductSupportAccessSummary({
      caseRow: input.caseRow,
      operationalContext: input.operationalContext,
    });
  }

  return buildObservationAccessSummary({
    caseRow: input.caseRow,
    providerContact: input.providerContact,
    dateLabel: input.dateLabel,
  });
}
