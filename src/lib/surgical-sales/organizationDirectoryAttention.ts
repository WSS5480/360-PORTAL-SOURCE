/** Client-safe types + pure builder for organization “needs attention” signals (portal directory). */

export type AttentionItemCode =
  | "no_doctor"
  | "stale_activity"
  | "cases_missing_po"
  | "cases_missing_invoice"
  | "upcoming_surgery_7d";

export type OrgAttentionSeverity = "high" | "medium" | "low";

export type OrgAttentionItem = {
  code: AttentionItemCode;
  label: string;
  severity: OrgAttentionSeverity;
  ctaHref: string;
  ctaLabel: string;
};

export type OrgAttentionInput = {
  accountId: string;
  doctorCount: number;
  contactCount: number;
  lastActivityAt: string | null;
  casesMissingPo: number;
  casesMissingInvoice: number;
  upcomingWithin7d: number;
};

const STALE_ACTIVITY_DAYS = 45;

function activityStale(iso: string | null | undefined): boolean {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > STALE_ACTIVITY_DAYS * 86400000;
}

function severityRank(s: OrgAttentionSeverity): number {
  if (s === "high") return 3;
  if (s === "medium") return 2;
  return 1;
}

/** Highest severity rank for sorting organizations in the attention queue. */
export function attentionPriority(items: OrgAttentionItem[]): number {
  if (!items.length) return 0;
  return Math.max(...items.map((i) => severityRank(i.severity)));
}

export function buildOrganizationAttentionItems(input: OrgAttentionInput): OrgAttentionItem[] {
  const { accountId } = input;
  const base = `/portal/sales/accounts/${encodeURIComponent(accountId)}`;
  const out: OrgAttentionItem[] = [];

  if (input.doctorCount === 0) {
    out.push({
      code: "no_doctor",
      label: "No surgeon or PA on file",
      severity: "high",
      ctaHref: `${base}?tab=contacts&new_contact=1`,
      ctaLabel: "Add clinician",
    });
  }

  if (input.contactCount > 0 && activityStale(input.lastActivityAt)) {
    out.push({
      code: "stale_activity",
      label: `No activity in ${STALE_ACTIVITY_DAYS}+ days`,
      severity: "medium",
      ctaHref: base,
      ctaLabel: "Open account",
    });
  }

  if (input.casesMissingPo > 0) {
    out.push({
      code: "cases_missing_po",
      label: input.casesMissingPo === 1 ? "Case missing PO" : `${input.casesMissingPo} cases missing PO`,
      severity: "medium",
      ctaHref: `${base}?tab=cases&att=missing_po`,
      ctaLabel: "Review cases",
    });
  }

  if (input.casesMissingInvoice > 0) {
    out.push({
      code: "cases_missing_invoice",
      label: input.casesMissingInvoice === 1 ? "Case missing invoice" : `${input.casesMissingInvoice} cases missing invoice`,
      severity: "medium",
      ctaHref: `${base}?tab=cases&att=missing_invoice`,
      ctaLabel: "Review cases",
    });
  }

  if (input.upcomingWithin7d > 0) {
    out.push({
      code: "upcoming_surgery_7d",
      label:
        input.upcomingWithin7d === 1 ? "Surgery in the next 7 days" : `${input.upcomingWithin7d} surgeries in the next 7 days`,
      severity: "high",
      ctaHref: `${base}?tab=cases`,
      ctaLabel: "View schedule",
    });
  }

  out.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  return out;
}
