import { buildCaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import {
  buildCaseIdentityFromListItem,
  formatCaseIdentityPageTitle,
} from "@/lib/surgical-sales/buildCaseIdentity";
import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import type {
  DirectoryReadinessGap,
  DirectoryReadinessSummary,
  TacticalActionChip,
} from "@/lib/surgical-sales/operationsDirectorySignals";
import { buildReadinessHeadline, openReadinessGaps } from "@/lib/surgical-sales/operationsDirectorySignals";

export type CaseOpsStatus = "blocked" | "active" | "advancing";

function hasValue(raw: string | null | undefined): boolean {
  return Boolean(String(raw ?? "").trim());
}

export function deriveCaseOpsStatus(c: EnrichedSurgicalCaseListItem): CaseOpsStatus {
  const view = buildCaseOperationalContextView({ caseRow: c, surgeonContact: null });
  if (c.surgeon_missing_support || c.missing_po || c.missing_invoice) return "blocked";
  if (view.readinessState === "strong" || (c.sales_rep_display && hasValue(c.case_support_coverage))) {
    return "advancing";
  }
  if (view.readinessState === "early") return "blocked";
  return "active";
}

export function caseDisplayTitle(c: EnrichedSurgicalCaseListItem): string {
  return formatCaseIdentityPageTitle(buildCaseIdentityFromListItem(c));
}

export function caseProcedureLine(c: EnrichedSurgicalCaseListItem): string {
  const proc = String(c.procedure_type || "").trim();
  const product = String(c.product_name || "").trim();
  if (proc && product) return `${proc} · ${product}`;
  return proc || product || "Procedure not set";
}

export function caseScheduleLine(c: EnrichedSurgicalCaseListItem): string {
  if (!c.case_date) return "Date not set";
  const time = String(c.case_time || "").trim().slice(0, 5);
  return time ? `${c.case_date} · ${time}` : c.case_date;
}

export function buildCaseDirectoryReadinessGaps(c: EnrichedSurgicalCaseListItem): DirectoryReadinessGap[] {
  const gaps: DirectoryReadinessGap[] = [];
  const view = buildCaseOperationalContextView({ caseRow: c, surgeonContact: null });

  const dim = (id: string) => view.dimensions.find((d) => d.id === id);

  const support = dim("support_coverage");
  if (support?.status === "strong" || support?.status === "validated") {
    gaps.push({ id: "support", label: "Support assigned", tone: "ok" });
  } else if (c.surgeon_missing_support) {
    gaps.push({ id: "support_gap", label: "Coverage gap — assign support", tone: "warn" });
  } else {
    gaps.push({ id: "support_open", label: "Support not confirmed", tone: "gap" });
  }

  const trays = dim("trays_ready");
  if (trays?.status === "strong" || trays?.status === "validated") {
    gaps.push({ id: "trays", label: "Trays confirmed", tone: "ok" });
  } else if (hasValue(c.case_trays_sterilization_status)) {
    gaps.push({ id: "trays_prog", label: "Tray status needs confirmation", tone: "gap" });
  } else {
    gaps.push({ id: "trays_open", label: "Trays not confirmed", tone: "warn" });
  }

  if (c.sales_rep_display) {
    gaps.push({ id: "rep", label: "Rep assigned", tone: "ok" });
  } else {
    gaps.push({ id: "rep_open", label: "Rep not assigned", tone: "gap" });
  }

  const implants = dim("implants_on_site");
  if (implants?.status === "strong" || hasValue(c.case_implants_on_site)) {
    gaps.push({ id: "product", label: "Product on site confirmed", tone: "ok" });
  } else {
    gaps.push({ id: "product_open", label: "Product readiness unknown", tone: "gap" });
  }

  if (hasValue(c.case_operational_risks)) {
    gaps.push({ id: "risk", label: "Logistical consideration on file", tone: "warn" });
  }

  if (c.missing_po) gaps.push({ id: "po", label: "PO missing", tone: "warn" });
  if (c.missing_invoice) gaps.push({ id: "inv", label: "Invoice missing", tone: "warn" });

  const rank = { warn: 0, gap: 1, ok: 2 };
  return [...gaps]
    .sort((a, b) => rank[a.tone] - rank[b.tone])
    .filter((g, i, arr) => arr.findIndex((x) => x.id === g.id) === i)
    .slice(0, 6);
}

export function buildCaseDirectoryReadinessSummary(c: EnrichedSurgicalCaseListItem): DirectoryReadinessSummary {
  const gaps = buildCaseDirectoryReadinessGaps(c);
  const open = openReadinessGaps(gaps);
  const view = buildCaseOperationalContextView({ caseRow: c, surgeonContact: null });
  const readyPercent =
    view.dimensionTotal > 0 ? Math.round((view.readyCount / view.dimensionTotal) * 100) : 0;
  const { headline, subline } = buildReadinessHeadline(gaps, {
    readyHeadline: "Case-day readiness · Ready to execute",
    contextLabel: "Case-day readiness",
    contextPercent: readyPercent,
  });
  return { headline, subline, gaps, openGapCount: open.length };
}

/** @deprecated Use buildCaseDirectoryReadinessGaps */
export function buildCaseDirectoryOperationalSignals(c: EnrichedSurgicalCaseListItem): DirectoryReadinessGap[] {
  return buildCaseDirectoryReadinessGaps(c);
}

export function deriveCaseTacticalActions(c: EnrichedSurgicalCaseListItem): TacticalActionChip[] {
  const detailHref = `/portal/sales/cases/${encodeURIComponent(c.id)}`;
  const actions: TacticalActionChip[] = [
    { id: "open", label: "Open", href: detailHref, emphasis: true },
    { id: "logistics", label: "Logistics", href: `${detailHref}?focus=operational` },
  ];

  if (c.missing_po) {
    actions.push({ id: "po", label: "PO", href: `${detailHref}?upload=purchase_order` });
  }
  if (c.missing_invoice) {
    actions.push({ id: "invoice", label: "Invoice", href: `${detailHref}?upload=invoice` });
  }
  if (!hasValue(c.case_support_coverage)) {
    actions.push({ id: "support", label: "Support", href: `${detailHref}?focus=operational` });
  }

  return actions.slice(0, 5);
}
