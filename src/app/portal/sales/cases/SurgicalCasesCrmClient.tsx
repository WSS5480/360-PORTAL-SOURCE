"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { caseStatusBadgeStyle, crmBadgeStyle, crmSectionShellStyle } from "@/components/sales/crmUi";
import { PortalEmptyState } from "@/components/sales/PortalEmptyState";
import { QuickAddSurgicalCasePanel } from "@/components/sales/QuickAddSurgicalCasePanel";
import { SalesCommandPage, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import { SurgicalProductFamilyProductLine } from "@/components/sales/SurgicalProductFamilyMark";
import {
  formatSurgicalCaseStatus,
  formatSurgicalCaseType,
  isSurgicalObservationCase,
  SURGICAL_CASE_STATUSES,
} from "@/lib/surgical-sales/labels";
import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import { surgicalProductFamilyLeftBorderColor, surgicalProductFamilyStripeGradient } from "@/lib/surgical-sales/productFamilyVisual";
import { SurgicalBillingReadinessDot } from "@/components/sales/SurgicalBillingReadiness";
import SalesCrmConfirmModal from "@/components/sales/SalesCrmConfirmModal";
import { SurgicalCasesMobileList } from "./SurgicalCasesMobileList";
import type { SurgicalCasesListFilterValues } from "./SurgicalCasesListFilters";
import { surgicalCasesListMobileCss } from "./surgicalCasesListMobileCss";
import {
  surgicalCaseRequiresBillingWorkflow,
  type BillingReadinessLevel,
} from "@/lib/surgical-sales/billingReadiness";
import { caseRecordNeedsAction } from "@/lib/surgical-sales/salesExecutionNeedsAction";

function listBillingLevel(c: EnrichedSurgicalCaseListItem): BillingReadinessLevel {
  return c.billing_readiness ?? "partial";
}

type QueueDetailJson = {
  ok?: boolean;
  case?: Record<string, unknown>;
  account?: { id: string; name?: string | null } | null;
  surgeon?: Record<string, unknown> | null;
  product?: { id?: string; name?: string | null } | null;
  sales_rep?: { user_id: string; display_name: string } | null;
  lines?: Array<{ id: string; expected_quantity?: number | null; actual_quantity?: number | null; product_name?: string | null; sku_code?: string | null }>;
  activities?: Array<{ id: string; activity_type: string; body: string; created_at: string; actor_display_name?: string }>;
  documents?: Array<{ id: string; document_type: string; file_name: string; created_at: string; uploader_display_name?: string }>;
  billing?: {
    po_uploaded: boolean;
    invoice_uploaded: boolean;
    quantities_confirmed: boolean;
    readiness: BillingReadinessLevel;
    score: number;
    billing_reviewed_at: string | null;
    billing_admin_notes: string | null;
  };
  error?: string;
};

function caseRequiresBillingWorkflow(c: EnrichedSurgicalCaseListItem): boolean {
  if (c.requires_billing_workflow === false) return false;
  if (c.requires_billing_workflow === true) return true;
  return surgicalCaseRequiresBillingWorkflow({
    caseType: c.case_type,
    productId: c.product_id,
    productLineCount: 0,
  });
}

/** Kanban columns (excludes cancelled — shown in a separate strip below). */
const KANBAN_BOARD_STATUSES = [
  "draft",
  "scheduled",
  "rescheduled",
  "confirmed",
  "completed",
  "docs_needed",
  "billing_review",
  "invoiced",
  "closed",
] as const;

const DONE_CASE_STATUSES = new Set(["completed", "invoiced", "closed"]);

function surgicalCasePatchErrorMessage(j: { error?: unknown }): string {
  return typeof j.error === "string" ? j.error : "Could not update the case.";
}

function surgicalCasePatchFromResponse(
  j: { case?: unknown },
  caseId: string,
  fallback: Partial<EnrichedSurgicalCaseListItem>
): Partial<EnrichedSurgicalCaseListItem> {
  const row = j.case as Record<string, unknown> | undefined;
  if (!row || String(row.id ?? "") !== caseId) return fallback;
  const patch: Partial<EnrichedSurgicalCaseListItem> = { ...fallback };
  if (row.status !== undefined) patch.status = String(row.status);
  if (row.case_type !== undefined) patch.case_type = row.case_type as string | null;
  if (row.archived_at !== undefined) patch.archived_at = row.archived_at as string | null;
  return patch;
}

function SurgicalCaseTypeBadge({ caseType }: { caseType?: string | null }) {
  const s = String(caseType || "").trim().toLowerCase();
  if (!s) return null;
  const style =
    s === "observation"
      ? {
          ...crmBadgeStyle("brand", true),
          background: "color-mix(in srgb, #7c3aed 14%, var(--surface))",
          color: "#5b21b6",
          border: "1px solid color-mix(in srgb, #7c3aed 24%, var(--border))",
        }
      : s === "evaluation"
        ? crmBadgeStyle("info", true)
        : s === "conversion"
          ? crmBadgeStyle("warning", true)
          : s === "training"
            ? {
                ...crmBadgeStyle("info", true),
                background: "color-mix(in srgb, #0ea5e9 11%, var(--surface))",
              }
            : crmBadgeStyle("neutral", true);
  return <span style={style}>{formatSurgicalCaseType(caseType)}</span>;
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Default list window: past cases still in play + upcoming pipeline. */
function defaultCasesDateRange(): { from: string; to: string } {
  const t = utcToday();
  return { from: addDaysIso(t, -180), to: addDaysIso(t, 365) };
}

function addDaysIso(isoYmd: string, delta: number): string {
  const [y, m, d] = isoYmd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + delta));
  return dt.toISOString().slice(0, 10);
}

function normalizeCaseListScope(raw: string | null | undefined): "active" | "archived" | "all" {
  const t = String(raw || "active")
    .trim()
    .toLowerCase();
  if (t === "archived" || t === "all") return t;
  return "active";
}

function endOfUtcWeekSunday(isoYmd: string): string {
  const [y, m, d] = isoYmd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const dow = dt.getUTCDay();
  const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
  return addDaysIso(isoYmd, daysUntilSunday);
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T12:00:00Z").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtTime(t: string | null | undefined) {
  if (!t) return "";
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function fmtDateShort(d: string | null | undefined) {
  if (!d) return "No date";
  return new Date(d + "T12:00:00Z").toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

function revenueLabel(c: EnrichedSurgicalCaseListItem): string {
  const amount = Number(c.expected_revenue ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Est: —";
  return `Est: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount)}`;
}

function isDoneCase(c: EnrichedSurgicalCaseListItem): boolean {
  return DONE_CASE_STATUSES.has(String(c.status).toLowerCase());
}

function displayCaseStatus(c: EnrichedSurgicalCaseListItem): string {
  const status = String(c.status ?? "").trim().toLowerCase();
  if (status === "draft" && c.case_date) return "scheduled";
  return status;
}

function needsObservationNotesCase(c: EnrichedSurgicalCaseListItem): boolean {
  if (!isSurgicalObservationCase(c.case_type)) return false;
  const goal = String(c.observation_goal ?? "").trim();
  const notes = String(c.notes ?? "").trim();
  return !goal && !notes;
}

function caseHealthIndicators(c: EnrichedSurgicalCaseListItem): Array<{ label: string; tone: "danger" | "warning" | "muted" }> {
  const items: Array<{ label: string; tone: "danger" | "warning" | "muted" }> = [];
  if (c.missing_po) items.push({ label: "Outstanding PO", tone: "danger" });
  if (c.missing_invoice) items.push({ label: "Outstanding invoice", tone: "danger" });
  if (!c.surgeon_contact_id) items.push({ label: "No surgeon", tone: "warning" });
  if (needsObservationNotesCase(c)) items.push({ label: "Observation notes still developing", tone: "warning" });
  if (Boolean(c.follow_up_needed)) items.push({ label: "Follow-up needed", tone: "muted" });
  return items;
}

function poBadgeLabel(c: EnrichedSurgicalCaseListItem): { label: string; tone: "success" | "danger" | "muted" } {
  if (!caseRequiresBillingWorkflow(c)) return { label: "PO n/a", tone: "muted" };
  return c.has_purchase_order ? { label: "PO ready", tone: "success" } : { label: "PO needed", tone: "danger" };
}

function invoiceBadgeLabel(c: EnrichedSurgicalCaseListItem): { label: string; tone: "success" | "danger" | "muted" } {
  if (!caseRequiresBillingWorkflow(c)) return { label: "Invoice n/a", tone: "muted" };
  return c.has_invoice ? { label: "Invoice ready", tone: "success" } : { label: "Invoice needed", tone: "danger" };
}

function sortByCaseDateAsc(a: EnrichedSurgicalCaseListItem, b: EnrichedSurgicalCaseListItem) {
  const ad = a.case_date || "";
  const bd = b.case_date || "";
  if (ad !== bd) return ad < bd ? -1 : ad > bd ? 1 : 0;
  const at = a.case_time ? String(a.case_time) : "";
  const bt = b.case_time ? String(b.case_time) : "";
  return at.localeCompare(bt);
}

function needsAttentionCase(c: EnrichedSurgicalCaseListItem): boolean {
  return caseRecordNeedsAction(c);
}

function markCaseCompleteConfirmMessage(c: EnrichedSurgicalCaseListItem): string {
  const label = [c.case_number ? `Case ${c.case_number}` : null, c.account_name || null].filter(Boolean).join(" · ");
  const head = label || "This case";
  return `${head} will be marked completed. You can still add notes and files afterward.`;
}

function IconMissingPo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="11" x2="12" y2="15" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function IconMissingInvoice() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="14" y2="17" />
    </svg>
  );
}

function IconDragHandle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

/** Compact queue layout tuned for field reps on tablet + mobile. */
const mobileCaseListCss = `
.case-toolbar {
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  align-items:center;
  justify-content:space-between;
}
.case-toolbar-main,
.case-toolbar-filters,
.case-toolbar-summary {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  align-items:center;
}
.case-toolbar-chip {
  border:1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background:color-mix(in srgb, var(--foreground) 3%, var(--surface));
  color:var(--foreground);
  border-radius:999px;
  padding:8px 12px;
  font-size:12px;
  font-weight:800;
  min-height:40px;
}
.case-toolbar-field {
  display:grid;
  gap:4px;
  font-size:11px;
  font-weight:800;
  color:var(--muted);
}
.case-toolbar-field > input,
.case-toolbar-field > select {
  min-height:38px;
  font-size:12px !important;
  padding:8px 10px !important;
}
.case-inline-filter-desktop {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  align-items:end;
}
.case-filter-drawer-backdrop {
  position:fixed;
  inset:0;
  background:color-mix(in srgb, var(--foreground) 32%, transparent);
  z-index:65;
  display:grid;
  justify-items:end;
}
.case-filter-drawer {
  width:min(420px, 100vw);
  height:100%;
  background:var(--surface);
  border-left:1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  box-shadow:-16px 0 48px color-mix(in srgb, var(--foreground) 12%, transparent);
  padding:18px 16px max(22px, env(safe-area-inset-bottom, 0px));
  overflow:auto;
  display:grid;
  gap:14px;
}
.case-filter-drawer-grid {
  display:grid;
  gap:12px;
}
.case-filter-drawer-actions {
  display:flex;
  flex-wrap:wrap;
  gap:10px;
}
.case-filter-drawer-actions > button {
  flex:1 1 140px;
  min-height:44px;
  justify-content:center;
}
.case-queue-list {
  display:grid;
  gap:8px;
}
.case-queue-header {
  display:grid;
  grid-template-columns:minmax(0, 1fr) auto;
  gap:10px;
  align-items:center;
  padding:0 14px 2px;
  color:var(--muted);
  font-size:10px;
  font-weight:900;
  letter-spacing:0.07em;
  text-transform:uppercase;
}
.case-queue-header-main {
  display:grid;
  grid-template-columns:minmax(72px, 110px) minmax(0, 1.6fr) minmax(0, 1fr) minmax(72px, auto);
  gap:12px;
  align-items:center;
}
.case-queue-header-main span:last-child {
  text-align:right;
}
.case-queue-header-actions {
  width:98px;
  text-align:right;
}
.case-queue-row {
  border-radius:14px;
  border:1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  background:var(--crm-surface-elevated);
  box-shadow:var(--crm-card-shadow);
  overflow:hidden;
}
.case-queue-row[data-open="true"] {
  border-color:color-mix(in srgb, var(--brand-600) 26%, var(--border));
  box-shadow:0 10px 32px color-mix(in srgb, var(--foreground) 8%, transparent);
}
.case-queue-row-button {
  width:100%;
  border:none;
  background:none;
  text-align:left;
  display:grid;
  grid-template-columns:minmax(72px, 110px) minmax(0, 1.6fr) minmax(0, 1fr) minmax(72px, auto);
  gap:12px;
  align-items:center;
  cursor:pointer;
  padding:0;
  font:inherit;
  color:inherit;
}
.case-queue-row-button:focus-visible,
.case-kebab > summary:focus-visible {
  outline:2px solid color-mix(in srgb, var(--brand-600) 40%, transparent);
  outline-offset:2px;
}
.case-queue-row-top {
  display:grid;
  grid-template-columns:minmax(0, 1fr) auto;
  gap:10px;
  align-items:start;
  padding:12px 14px;
}
.case-queue-date {
  display:grid;
  gap:3px;
}
.case-queue-date strong {
  font-size:15px;
  line-height:1.1;
}
.case-queue-primary {
  min-width:0;
  display:grid;
  gap:4px;
}
.case-queue-primary-title {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  align-items:center;
}
.case-queue-primary-title strong {
  font-size:14px;
  line-height:1.2;
}
.case-queue-secondary {
  display:grid;
  gap:6px;
  min-width:0;
}
.case-queue-chip-row,
.case-queue-health-row {
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  align-items:center;
}
.case-queue-revenue {
  display:grid;
  gap:4px;
  justify-items:end;
  min-width:80px;
}
.case-queue-row-actions {
  display:flex;
  align-items:center;
  gap:8px;
  justify-content:flex-end;
}
.case-kebab {
  position:relative;
}
.case-kebab > summary {
  list-style:none;
  width:40px;
  height:40px;
  display:grid;
  place-items:center;
  border-radius:999px;
  border:1px solid color-mix(in srgb, var(--foreground) 9%, var(--border));
  background:color-mix(in srgb, var(--foreground) 2%, var(--surface));
  cursor:pointer;
}
.case-kebab > summary::-webkit-details-marker { display:none; }
.case-kebab-menu {
  position:absolute;
  right:0;
  top:calc(100% + 6px);
  min-width:190px;
  display:grid;
  gap:4px;
  padding:8px;
  border-radius:12px;
  border:1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background:var(--surface);
  box-shadow:0 16px 40px color-mix(in srgb, var(--foreground) 16%, transparent);
  z-index:20;
}
.case-kebab-menu > a,
.case-kebab-menu > button {
  min-height:40px;
  justify-content:flex-start !important;
  width:100%;
}
.case-expand-panel {
  border-top:1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  padding:14px;
  background:linear-gradient(180deg, color-mix(in srgb, var(--foreground) 1%, var(--surface)) 0%, color-mix(in srgb, var(--brand-600) 3%, var(--surface)) 100%);
  display:grid;
  gap:12px;
}
.case-expand-grid {
  display:grid;
  grid-template-columns:minmax(0, 1.3fr) minmax(0, 1fr);
  gap:12px;
}
.case-expand-card {
  border:1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  border-radius:12px;
  background:var(--surface);
  padding:12px;
  display:grid;
  gap:8px;
}
.case-expand-list {
  display:grid;
  gap:8px;
}
.case-expand-sticky-actions {
  position:sticky;
  bottom:8px;
  display:flex;
  gap:8px;
  overflow:auto;
  padding:8px;
  border-radius:14px;
  border:1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background:color-mix(in srgb, var(--surface) 92%, transparent);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
}
.case-expand-sticky-actions > a,
.case-expand-sticky-actions > button {
  white-space:nowrap;
  min-height:42px;
}
.case-mobile-summary {
  display:none;
}
@media (max-width: 980px) {
  .case-inline-filter-desktop {
    display:none;
  }
}
@media (max-width: 860px) {
  .case-queue-header {
    display:none;
  }
  .case-queue-row-button {
    grid-template-columns:1fr;
    align-items:start;
  }
  .case-queue-date,
  .case-queue-revenue,
  .case-queue-secondary {
    display:none;
  }
  .case-mobile-summary {
    display:grid;
    gap:6px;
  }
  .case-expand-grid {
    grid-template-columns:1fr;
  }
}
@media (max-width: 640px) {
  .case-list-desktop-only .case-toolbar {
    align-items:stretch;
  }
  .case-list-desktop-only .case-toolbar-main,
  .case-list-desktop-only .case-toolbar-filters,
  .case-list-desktop-only .case-toolbar-summary {
    width:100%;
  }
  .case-list-desktop-only .case-toolbar-main > *,
  .case-list-desktop-only .case-toolbar-filters > * {
    flex:1 1 0;
    justify-content:center;
  }
  .case-filter-drawer {
    width:100vw;
    border-left:none;
    border-top:1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
    align-self:end;
    height:min(88vh, 760px);
    border-top-left-radius:18px;
    border-top-right-radius:18px;
  }
  .case-filter-drawer-backdrop {
    justify-items:stretch;
    align-items:end;
  }
}
`;

export default function SurgicalCasesCrmClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const boardView = sp.get("view") === "board";
  const spFromDate = (sp.get("from_date") || "").trim();
  const spToDate = (sp.get("to_date") || "").trim();
  const spStatus = (sp.get("status") || "").trim();
  const spAccountId = (sp.get("account_id") || "").trim();
  const spSurgeonContactId = (sp.get("surgeon_contact_id") || "").trim();
  const spProductId = (sp.get("product_id") || "").trim();
  const spProcedure = (sp.get("procedure") || "").trim();
  const spCaseScope = normalizeCaseListScope(sp.get("case_scope"));
  const spGap = (sp.get("gap") || "").trim().toLowerCase();

  const [cases, setCases] = React.useState<EnrichedSurgicalCaseListItem[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [reloadTick, setReloadTick] = React.useState(0);
  const hasLoadedCasesRef = React.useRef(false);

  const [fromDate, setFromDate] = React.useState(spFromDate);
  const [toDate, setToDate] = React.useState(spToDate);
  const [status, setStatus] = React.useState(spStatus);
  const [accountId, setAccountId] = React.useState(spAccountId);
  const [surgeonContactId, setSurgeonContactId] = React.useState(spSurgeonContactId);
  const [productId, setProductId] = React.useState(spProductId);
  const [procedure, setProcedure] = React.useState(spProcedure);
  const [caseScope, setCaseScope] = React.useState<"active" | "archived" | "all">(spCaseScope);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);

  const [accounts, setAccounts] = React.useState<{ id: string; name?: string | null }[]>([]);
  const [providers, setProviders] = React.useState<
    {
      id: string;
      first_name?: string | null;
      last_name?: string | null;
      title?: string | null;
      account_id?: string | null;
      organization_id?: string | null;
    }[]
  >([]);
  const [providersLoading, setProvidersLoading] = React.useState(true);
  const [products, setProducts] = React.useState<{ id: string; name: string }[]>([]);

  const appliedDefaultRange = React.useRef(false);

  const setParam = (updates: Record<string, string | null>) => {
    const n = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") n.delete(k);
      else n.set(k, v);
    }
    router.push(`/portal/sales/cases?${n.toString()}`);
  };

  React.useEffect(() => {
    if (appliedDefaultRange.current) return;
    const hasFrom = (sp.get("from_date") || "").trim();
    const hasTo = (sp.get("to_date") || "").trim();
    if (hasFrom || hasTo) {
      appliedDefaultRange.current = true;
      return;
    }
    appliedDefaultRange.current = true;
    const { from: f, to } = defaultCasesDateRange();
    const n = new URLSearchParams(sp.toString());
    n.set("from_date", f);
    n.set("to_date", to);
    router.replace(`/portal/sales/cases?${n.toString()}`);
  }, [router, sp]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const u = new URLSearchParams();
        if (fromDate) u.set("from_date", fromDate);
        if (toDate) u.set("to_date", toDate);
        if (status) u.set("status", status);
        if (accountId) u.set("account_id", accountId);
        if (surgeonContactId) u.set("surgeon_contact_id", surgeonContactId);
        if (productId) u.set("product_id", productId);
        if (procedure) u.set("procedure", procedure);
        if (caseScope !== "active") u.set("case_scope", caseScope);
        const initialLoad = !hasLoadedCasesRef.current;
        if (initialLoad) {
          setLoading(true);
          setErr(null);
        }
        const res = await fetch(`/api/portal/sales/surgical-cases?${u.toString()}`, { cache: "no-store" });
        const j = (await res.json()) as { ok?: boolean; cases?: EnrichedSurgicalCaseListItem[]; error?: string };
        if (cancelled) return;
        if (!j.ok) throw new Error(j.error || "");
        setCases(j.cases || []);
        hasLoadedCasesRef.current = true;
      } catch (e: unknown) {
        if (!cancelled) setErr(userFacingError(e, "We could not load your cases. Please try again."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate, status, accountId, surgeonContactId, productId, procedure, caseScope, reloadTick]);

  React.useEffect(() => {
    setFromDate(spFromDate);
    setToDate(spToDate);
    setStatus(spStatus);
    setAccountId(spAccountId);
    setSurgeonContactId(spSurgeonContactId);
    setProductId(spProductId);
    setProcedure(spProcedure);
    setCaseScope(spCaseScope);
  }, [spAccountId, spCaseScope, spFromDate, spProcedure, spProductId, spStatus, spSurgeonContactId, spToDate]);

  React.useEffect(() => {
    void (async () => {
      try {
        const [aRes, pRes] = await Promise.all([
          fetch("/api/portal/sales/surgical-accounts", { cache: "no-store" }),
          fetch("/api/portal/sales/surgical-catalog/products", { cache: "no-store" }),
        ]);
        const aJson = (await aRes.json()) as { organizations?: { id: string; name?: string | null }[] };
        const pJson = (await pRes.json()) as { products?: { id: string; name: string }[] };
        setAccounts(aJson.organizations || []);
        setProducts(pJson.products || []);
      } catch {
        setAccounts([]);
        setProducts([]);
      }
    })();
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setProvidersLoading(true);
      try {
        const u = new URLSearchParams({ contact_kind: "clinician" });
        const res = await fetch(`/api/portal/sales/surgical-contacts?${u.toString()}`, { cache: "no-store" });
        const j = (await res.json()) as {
          contacts?: Array<{
            id: string;
            first_name?: string | null;
            last_name?: string | null;
            title?: string | null;
            account_id?: string | null;
            organization_id?: string | null;
          }>;
        };
        if (!cancelled) setProviders(j.contacts || []);
      } catch {
        if (!cancelled) setProviders([]);
      } finally {
        if (!cancelled) setProvidersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBase = React.useMemo(() => cases || [], [cases]);
  const gapFilter = spGap;
  const archivedCases = React.useMemo(() => filteredBase.filter((c) => Boolean(c.archived_at)).sort(sortByCaseDateAsc), [filteredBase]);
  const bucketCasesRaw = filteredBase.filter((c) => !c.archived_at);
  const bucketCases = React.useMemo(() => {
    if (!gapFilter) return bucketCasesRaw;
    return bucketCasesRaw.filter((c) => {
      if (gapFilter === "missing_po") return Boolean(c.missing_po);
      if (gapFilter === "missing_invoice") return Boolean(c.missing_invoice);
      if (gapFilter === "attention") return needsAttentionCase(c);
      if (gapFilter === "no_surgeon") {
        const st = String(c.status).toLowerCase();
        return !c.surgeon_contact_id && !["cancelled", "closed"].includes(st);
      }
      if (gapFilter === "missing_support") {
        return Boolean((c as { surgeon_missing_support?: boolean }).surgeon_missing_support);
      }
      return true;
    });
  }, [bucketCasesRaw, gapFilter]);
  const boardCases = bucketCases;
  const today = utcToday();
  const weekEnd = endOfUtcWeekSunday(today);

  const attentionCases = React.useMemo(() => {
    const byId = new Map<string, EnrichedSurgicalCaseListItem>();
    for (const c of bucketCases) {
      if (!needsAttentionCase(c)) continue;
      byId.set(c.id, c);
    }
    return [...byId.values()].sort(sortByCaseDateAsc);
  }, [bucketCases]);

  const attentionCaseIds = React.useMemo(() => new Set(attentionCases.map((c) => c.id)), [attentionCases]);
  const nonAttentionCases = React.useMemo(
    () => bucketCases.filter((c) => !attentionCaseIds.has(c.id)),
    [attentionCaseIds, bucketCases]
  );
  const completedCases = React.useMemo(
    () => nonAttentionCases.filter((c) => isDoneCase(c)).sort(sortByCaseDateAsc),
    [nonAttentionCases]
  );
  const cancelledCases = React.useMemo(
    () => nonAttentionCases.filter((c) => String(c.status).toLowerCase() === "cancelled").sort(sortByCaseDateAsc),
    [nonAttentionCases]
  );
  const queueReadyCases = React.useMemo(
    () =>
      nonAttentionCases.filter(
        (c) => !isDoneCase(c) && String(c.status).toLowerCase() !== "cancelled"
      ),
    [nonAttentionCases]
  );
  const todayCases = React.useMemo(
    () => queueReadyCases.filter((c) => c.case_date === today).sort(sortByCaseDateAsc),
    [queueReadyCases, today]
  );
  const thisWeekCases = React.useMemo(
    () =>
      queueReadyCases
        .filter((c) => {
          if (!c.case_date) return false;
          return c.case_date > today && c.case_date <= weekEnd;
        })
        .sort(sortByCaseDateAsc),
    [queueReadyCases, today, weekEnd]
  );
  const upcomingCases = React.useMemo(
    () =>
      queueReadyCases
        .filter((c) => {
          if (!c.case_date) return false;
          return c.case_date > weekEnd;
        })
        .sort(sortByCaseDateAsc),
    [queueReadyCases, weekEnd]
  );
  const unscheduledCases = React.useMemo(
    () => queueReadyCases.filter((c) => !c.case_date).sort(sortByCaseDateAsc),
    [queueReadyCases]
  );
  const earlierCases = React.useMemo(
    () =>
      queueReadyCases
        .filter((c) => Boolean(c.case_date) && String(c.case_date) < today)
        .sort(sortByCaseDateAsc),
    [queueReadyCases, today]
  );
  const displayedCaseIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const group of [
      attentionCases,
      todayCases,
      thisWeekCases,
      upcomingCases,
      earlierCases,
      unscheduledCases,
      completedCases,
      archivedCases,
      cancelledCases,
    ]) {
      for (const c of group) ids.add(c.id);
    }
    return ids;
  }, [
    attentionCases,
    todayCases,
    thisWeekCases,
    upcomingCases,
    earlierCases,
    unscheduledCases,
    completedCases,
    archivedCases,
    cancelledCases,
  ]);
  const otherCases = React.useMemo(
    () => filteredBase.filter((c) => !displayedCaseIds.has(c.id)).sort(sortByCaseDateAsc),
    [displayedCaseIds, filteredBase]
  );
  const activeFilterCount = [status, productId, procedure, caseScope !== "active" ? caseScope : "", gapFilter].filter(
    Boolean
  ).length;

  const handleListFilterChange = (patch: Partial<SurgicalCasesListFilterValues>) => {
    const nextFrom = patch.fromDate ?? fromDate;
    const nextTo = patch.toDate ?? toDate;
    const nextAccount = patch.accountId ?? accountId;
    const nextSurgeon = patch.surgeonContactId ?? surgeonContactId;
    if (patch.fromDate !== undefined) setFromDate(patch.fromDate);
    if (patch.toDate !== undefined) setToDate(patch.toDate);
    if (patch.accountId !== undefined) setAccountId(patch.accountId);
    if (patch.surgeonContactId !== undefined) setSurgeonContactId(patch.surgeonContactId);
    setParam({
      view: boardView ? "board" : null,
      from_date: nextFrom || null,
      to_date: nextTo || null,
      account_id: nextAccount || null,
      surgeon_contact_id: nextSurgeon || null,
    });
  };

  const applyFilters = () => {
    setParam({
      view: boardView ? "board" : null,
      from_date: fromDate || null,
      to_date: toDate || null,
      status: status || null,
      account_id: accountId || null,
      surgeon_contact_id: surgeonContactId || null,
      product_id: productId || null,
      procedure: procedure || null,
      case_scope: caseScope === "active" ? null : caseScope,
    });
  };

  const setGapParam = (next: string | null) => {
    setParam({
      view: boardView ? "board" : null,
      gap: next,
    });
  };

  const resetFilters = () => {
    const { from: f, to } = defaultCasesDateRange();
    setFromDate(f);
    setToDate(to);
    setStatus("");
    setAccountId("");
    setSurgeonContactId("");
    setProductId("");
    setProcedure("");
    setCaseScope("active");
    setParam({
      view: boardView ? "board" : null,
      from_date: f,
      to_date: to,
      status: null,
      account_id: null,
      surgeon_contact_id: null,
      product_id: null,
      procedure: null,
      case_scope: null,
      gap: null,
    });
  };

  const bumpReload = () => setReloadTick((x) => x + 1);

  const patchCaseInList = React.useCallback((caseId: string, patch: Partial<EnrichedSurgicalCaseListItem>) => {
    setCases((prev) => (prev ? prev.map((row) => (row.id === caseId ? { ...row, ...patch } : row)) : prev));
  }, []);

  return (
    <SalesCommandPage
      title="Cases"
      subtitle="Your day at a glance — open, update, and clear operational items without digging through spreadsheets."
      omitBuiltInHeader
      density="dense"
    >
      <style dangerouslySetInnerHTML={{ __html: mobileCaseListCss }} />
      <div className="surgical-cases-crm-page" style={{ display: "grid", gap: 0 }}>
        <SurgicalCasesMobileList
          cases={cases}
          loading={loading}
          err={err}
          activeFilterCount={activeFilterCount}
          listFilters={{
            values: { fromDate, toDate, accountId, surgeonContactId },
            accounts,
            providers,
            providersLoading,
            onChange: handleListFilterChange,
          }}
          onOpenFilters={() => setFiltersOpen(true)}
          onQuickAdd={() => setQuickAddOpen(true)}
          onCasePatched={patchCaseInList}
          onReload={bumpReload}
        />
      </div>
      {filtersOpen ? (
        <div
          className="case-filter-drawer-backdrop"
          role="presentation"
          onClick={() => setFiltersOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setFiltersOpen(false);
          }}
        >
          <aside
            className="case-filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="More case filters"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>More filters</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Status, product, procedure, and which records to include.
              </div>
            </div>
            <div className="case-filter-drawer-grid">
              <label className="case-toolbar-field">
                <span>Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Any status</option>
                  {SURGICAL_CASE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {formatSurgicalCaseStatus(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="case-toolbar-field">
                <span>Product</span>
                <select value={productId} onChange={(e) => setProductId(e.target.value)}>
                  <option value="">Any product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="case-toolbar-field">
                <span>Procedure</span>
                <input
                  type="text"
                  value={procedure}
                  onChange={(e) => setProcedure(e.target.value)}
                  placeholder="Filter by procedure name"
                />
              </label>
              <label className="case-toolbar-field">
                <span>Records</span>
                <select
                  value={caseScope}
                  onChange={(e) => setCaseScope(e.target.value as "active" | "archived" | "all")}
                >
                  <option value="active">Active cases only</option>
                  <option value="archived">Archived only</option>
                  <option value="all">Active and archived</option>
                </select>
              </label>
            </div>
            <div className="case-filter-drawer-actions">
              <button type="button" style={sc.btnSecondary} onClick={() => setFiltersOpen(false)}>
                Close
              </button>
              <button
                type="button"
                style={sc.btnSecondary}
                onClick={() => {
                  resetFilters();
                  setFiltersOpen(false);
                }}
              >
                Reset all
              </button>
              <button
                type="button"
                style={sc.btnPrimary}
                onClick={() => {
                  applyFilters();
                  setFiltersOpen(false);
                }}
              >
                Apply
              </button>
            </div>
          </aside>
        </div>
      ) : null}
      <QuickAddSurgicalCasePanel open={quickAddOpen} onClose={() => setQuickAddOpen(false)} onCreated={bumpReload} />
    </SalesCommandPage>
  );
}

function CollapsibleGroup({
  title,
  subtitle,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen !== false);
  const panelId = React.useId();
  return (
    <div style={{ borderRadius: 14, border: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))", overflow: "hidden" }}>
      <button
        type="button"
        id={`${panelId}-btn`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 16px",
          border: "none",
          background: open ? "color-mix(in srgb, var(--brand-600) 6%, var(--surface))" : "var(--surface)",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.2s ease, transform 0.12s ease",
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 15 }}>{title}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>{count}</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: "var(--brand-700)" }}>{open ? "▼" : "▶"}</span>
        </div>
      </button>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={`${panelId}-btn`} style={{ padding: "4px 14px 16px" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function CardGrid({
  cases,
  onReload,
  onCasePatched,
  attentionHints,
}: {
  cases: EnrichedSurgicalCaseListItem[];
  onReload: () => void;
  onCasePatched: (caseId: string, patch: Partial<EnrichedSurgicalCaseListItem>) => void;
  attentionHints?: boolean;
}) {
  return (
    <div className="case-queue-list">
      {cases.length > 0 ? (
        <div className="case-queue-header" aria-hidden="true">
          <div className="case-queue-header-main">
            <span>Date</span>
            <span>Provider / Case</span>
            <span>Status / Docs</span>
            <span>Est. / Billing</span>
          </div>
          <span className="case-queue-header-actions">Actions</span>
        </div>
      ) : null}
      {cases.map((c) => (
        <RepCaseCard key={c.id} c={c} onReload={onReload} onCasePatched={onCasePatched} attentionHints={attentionHints} />
      ))}
    </div>
  );
}

function RepCaseCard({
  c,
  onReload,
  onCasePatched,
  attentionHints,
}: {
  c: EnrichedSurgicalCaseListItem;
  onReload: () => void;
  onCasePatched: (caseId: string, patch: Partial<EnrichedSurgicalCaseListItem>) => void;
  attentionHints?: boolean;
}) {
  const [statusBusy, setStatusBusy] = React.useState(false);
  const [statusErr, setStatusErr] = React.useState<string | null>(null);
  const [markCompleteAffirm, setMarkCompleteAffirm] = React.useState(false);
  const [markCompleteConfirmOpen, setMarkCompleteConfirmOpen] = React.useState(false);
  const [markCompleteErr, setMarkCompleteErr] = React.useState<string | null>(null);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = React.useState(false);
  const [archiveErr, setArchiveErr] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(Boolean(attentionHints));
  const [detailBusy, setDetailBusy] = React.useState(false);
  const [detailErr, setDetailErr] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<QueueDetailJson | null>(null);
  const [detailAttempted, setDetailAttempted] = React.useState(false);
  const detailHref = `/portal/sales/cases/${encodeURIComponent(c.id)}`;
  const isArchived = Boolean(c.archived_at);
  const requiresBilling = caseRequiresBillingWorkflow(c);
  const healthIndicators = caseHealthIndicators(c);
  const poBadge = poBadgeLabel(c);
  const invoiceBadge = invoiceBadgeLabel(c);
  const displayStatus = displayCaseStatus(c);

  const patchStatus = async (next: string): Promise<boolean> => {
    if (isArchived) return false;
    if (next.toLowerCase() === String(c.status).toLowerCase()) return false;
    setStatusBusy(true);
    setStatusErr(null);
    setMarkCompleteErr(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(c.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: unknown; warnings?: string[]; case?: unknown };
      if (!res.ok || !j.ok) throw new Error(surgicalCasePatchErrorMessage(j));
      onCasePatched(c.id, surgicalCasePatchFromResponse(j, c.id, { status: next }));
      setDetail((prev) => (prev?.case ? { ...prev, case: { ...prev.case, ...(j.case as Record<string, unknown>) } } : prev));
      onReload();
      if (next.toLowerCase() === "completed") {
        setMarkCompleteAffirm(true);
        window.setTimeout(() => setMarkCompleteAffirm(false), 2200);
      }
      return true;
    } catch (e: unknown) {
      const message = userFacingError(e, "We could not save that update. Please try again.");
      setStatusErr(message);
      setMarkCompleteErr(message);
      return false;
    } finally {
      setStatusBusy(false);
    }
  };

  const patchArchiveState = async (restore: boolean): Promise<boolean> => {
    setStatusBusy(true);
    setArchiveErr(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(c.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(restore ? { restore: true } : { archive: true }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: unknown; case?: unknown };
      if (!res.ok || !j.ok) throw new Error(surgicalCasePatchErrorMessage(j));
      onCasePatched(c.id, surgicalCasePatchFromResponse(j, c.id, { archived_at: restore ? null : new Date().toISOString() }));
      setDetail((prev) => (prev?.case ? { ...prev, case: { ...prev.case, ...(j.case as Record<string, unknown>) } } : prev));
      onReload();
      return true;
    } catch (e: unknown) {
      setArchiveErr(userFacingError(e, "We could not save that update. Please try again."));
      return false;
    } finally {
      setStatusBusy(false);
    }
  };

  const markComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isArchived) return;
    setMarkCompleteErr(null);
    setMarkCompleteConfirmOpen(true);
  };
  const toggleOpen = () => setOpen((prev) => !prev);

  React.useEffect(() => {
    if (!open || detail || detailBusy || detailAttempted) return;
    let cancelled = false;
    setDetailBusy(true);
    setDetailErr(null);
    setDetailAttempted(true);
    void (async () => {
      try {
        const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(c.id)}`, { cache: "no-store" });
        const j = (await res.json()) as QueueDetailJson;
        if (cancelled) return;
        if (!res.ok || !j.ok) throw new Error(j.error || "");
        setDetail(j);
      } catch (e: unknown) {
        if (!cancelled) setDetailErr(userFacingError(e, "Could not load case details."));
      } finally {
        if (!cancelled) setDetailBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [c.id, detail, detailAttempted, detailBusy, open]);

  const detailCase = (detail?.case as Record<string, unknown> | undefined) ?? null;
  const detailNotes = String(detailCase?.notes ?? c.notes ?? "").trim();
  const detailProcedure = String(detailCase?.procedure_type ?? c.procedure_type ?? "").trim();
  const detailTimeline = (detail?.activities || []).slice(0, 4);
  const detailDocs = (detail?.documents || []).slice(0, 4);

  return (
    <div
      className="case-queue-row"
      data-open={open ? "true" : "false"}
      style={{
        ...(attentionHints ? { borderColor: "color-mix(in srgb, #f59e0b 42%, var(--border))" } : undefined),
        ...(surgicalProductFamilyLeftBorderColor(c.product_name)
          ? { borderLeft: `4px solid ${surgicalProductFamilyLeftBorderColor(c.product_name)}` }
          : undefined),
      }}
    >
      <div className="case-queue-row-top">
        <button
          type="button"
          aria-expanded={open}
          className="case-queue-row-button"
          onClick={toggleOpen}
        >
          <div className="case-queue-date">
            <strong>{fmtDateShort(c.case_date)}</strong>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{fmtTime(c.case_time) || "Time TBD"}</span>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 800 }}>{c.case_number}</span>
          </div>
          <div className="case-queue-primary">
            <div className="case-queue-primary-title">
              <strong>{c.surgeon_display || "No surgeon assigned"}</strong>
              <SurgicalCaseTypeBadge caseType={c.case_type} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 750, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.product_name || "No product selected"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.account_name || "Organization pending"}
            </div>
            <div className="case-mobile-summary">
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>
                {fmtDateShort(c.case_date)}{fmtTime(c.case_time) ? ` · ${fmtTime(c.case_time)}` : " · Time TBD"}
              </div>
              <div className="case-queue-chip-row">
                <span style={{ ...caseStatusBadgeStyle(displayStatus), fontSize: 11, padding: "4px 9px" }}>{formatSurgicalCaseStatus(displayStatus)}</span>
                <span style={crmBadgeStyle(poBadge.tone, true)}>{poBadge.label}</span>
                <span style={crmBadgeStyle(invoiceBadge.tone, true)}>{invoiceBadge.label}</span>
              </div>
              <div className="case-queue-health-row">
                {(healthIndicators.length ? healthIndicators : [{ label: "Ready", tone: "muted" as const }]).slice(0, 2).map((item) => (
                  <span key={item.label} style={crmBadgeStyle(item.tone, true)}>
                    {item.tone === "muted" ? "•" : "!"} {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="case-queue-secondary">
            <div className="case-queue-chip-row">
              <span style={{ ...caseStatusBadgeStyle(displayStatus), fontSize: 11, padding: "4px 9px" }}>{formatSurgicalCaseStatus(displayStatus)}</span>
              <span style={crmBadgeStyle(poBadge.tone, true)}>{poBadge.label}</span>
              <span style={crmBadgeStyle(invoiceBadge.tone, true)}>{invoiceBadge.label}</span>
            </div>
            <div className="case-queue-health-row">
              {(healthIndicators.length ? healthIndicators : [{ label: "Ready", tone: "muted" as const }]).slice(0, 3).map((item) => (
                <span key={item.label} style={crmBadgeStyle(item.tone, true)}>
                  {item.tone === "muted" ? "•" : "!"} {item.label}
                </span>
              ))}
            </div>
          </div>
          <div className="case-queue-revenue">
            <span style={{ fontSize: 12, fontWeight: 900 }}>{revenueLabel(c)}</span>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>{listBillingLevel(c)}</span>
          </div>
        </button>

        <div className="case-queue-row-actions" data-card-action>
          <SurgicalBillingReadinessDot level={listBillingLevel(c)} size={9} />
          <details className="case-kebab" onClick={(e) => e.stopPropagation()}>
            <summary aria-label="Case actions">⋯</summary>
            <div className="case-kebab-menu">
              <Link href={detailHref} data-surgical-press style={sc.btnSecondary}>
                View detail
              </Link>
              <Link href={`${detailHref}?openNote=1`} data-surgical-press style={sc.btnSecondary}>
                Add note
              </Link>
              {requiresBilling ? (
                <>
                  <Link href={`${detailHref}?upload=purchase_order`} data-surgical-press style={sc.btnSecondary}>
                    Upload PO
                  </Link>
                  <Link href={`${detailHref}?upload=invoice`} data-surgical-press style={sc.btnSecondary}>
                    Upload invoice
                  </Link>
                  <button type="button" style={sc.btnSecondary} disabled={statusBusy || isArchived} onClick={() => void patchStatus("billing_review")}>
                    Convert to billing
                  </button>
                </>
              ) : null}
              <button type="button" style={sc.btnSecondary} disabled={statusBusy || isArchived} onClick={markComplete}>
                Mark complete
              </button>
              <button type="button" style={sc.btnSecondary} disabled={statusBusy} onClick={() => setArchiveConfirmOpen(true)}>
                {isArchived ? "Restore case" : "Archive case"}
              </button>
            </div>
          </details>
          <button
            type="button"
            style={{ ...sc.btnSecondary, minWidth: 40, minHeight: 40, justifyContent: "center", padding: "0 10px" }}
            onClick={toggleOpen}
            aria-label={open ? "Collapse case" : "Expand case"}
          >
            {open ? "−" : "+"}
          </button>
        </div>
      </div>

      {(statusErr || archiveErr || markCompleteAffirm) ? (
        <div style={{ padding: "0 14px 12px" }}>
          {statusErr ? <div role="alert" style={{ fontSize: 12, color: "var(--danger)", fontWeight: 700 }}>{statusErr}</div> : null}
          {archiveErr ? <div role="alert" style={{ fontSize: 12, color: "var(--danger)", fontWeight: 700 }}>{archiveErr}</div> : null}
          {markCompleteAffirm ? (
            <div
              role="status"
              style={{
                marginTop: 6,
                padding: "7px 10px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                color: "#166534",
                background: "color-mix(in srgb, var(--success) 9%, var(--surface))",
                border: "1px solid color-mix(in srgb, var(--success) 24%, var(--border))",
              }}
            >
              Recorded — nice work closing this case.
            </div>
          ) : null}
        </div>
      ) : null}

      {open ? (
        <div className="case-expand-panel">
          {detailBusy ? <div style={{ fontSize: 13, color: "var(--muted)" }}>Loading inline details…</div> : null}
          {detailErr ? (
            <div role="alert" style={{ ...sc.alertError, margin: 0, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span>{detailErr}</span>
              <button
                type="button"
                style={sc.btnSecondary}
                onClick={() => {
                  setDetailErr(null);
                  setDetailAttempted(false);
                }}
              >
                Retry
              </button>
            </div>
          ) : null}
          {!detailBusy ? (
            <>
              <div className="case-expand-grid">
                <div className="case-expand-card">
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Notes + timeline</div>
                  {detailNotes ? (
                    <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{detailNotes}</div>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>No case notes on file yet.</div>
                  )}
                  {detailTimeline.length > 0 ? (
                    <div className="case-expand-list">
                      {detailTimeline.map((row) => (
                        <div key={row.id} style={{ display: "grid", gap: 2 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, fontWeight: 800 }}>{row.activity_type.replace(/_/g, " ")}</span>
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(row.created_at).toLocaleString()}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>{row.actor_display_name || "Rep"}</div>
                          {row.body ? <div style={{ fontSize: 13, lineHeight: 1.45 }}>{row.body}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>No timeline activity yet.</div>
                  )}
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div className="case-expand-card">
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Logistics</div>
                    <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                      <div><b>Organization:</b> {c.account_name || detail?.account?.name || "—"}</div>
                      <div><b>Surgeon:</b> {c.surgeon_display || "—"}</div>
                      <div><b>Product:</b> {c.product_name || detail?.product?.name || "—"}</div>
                      <div><b>Procedure:</b> {detailProcedure || "—"}</div>
                      <div><b>Rep:</b> {c.sales_rep_display || detail?.sales_rep?.display_name || "—"}</div>
                    </div>
                  </div>
                  <div className="case-expand-card">
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Case intelligence</div>
                    <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                      <div><b>Status:</b> {formatSurgicalCaseStatus(displayStatus)}</div>
                      <div><b>Type:</b> {formatSurgicalCaseType(c.case_type)}</div>
                      <div><b>Related opportunity:</b> {c.related_opportunity_id ? "Connected" : "Not linked"}</div>
                      <div><b>Follow-up:</b> {c.follow_up_needed ? "Needed" : "Not flagged"}</div>
                      <div><b>Observation plan:</b> {c.observation_goal ? "Started" : "Not started"}</div>
                    </div>
                  </div>
                  <div className="case-expand-card">
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Billing + attachments</div>
                    <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                      <div><b>PO:</b> {requiresBilling ? (detail?.billing?.po_uploaded || c.has_purchase_order ? "On file" : "Outstanding") : "Not applicable"}</div>
                      <div><b>Invoice:</b> {requiresBilling ? (detail?.billing?.invoice_uploaded || c.has_invoice ? "On file" : "Outstanding") : "Not applicable"}</div>
                      <div><b>Quantities:</b> {detail?.billing?.quantities_confirmed ? "Confirmed" : requiresBilling ? "Pending" : "Not required"}</div>
                      <div><b>Revenue:</b> {revenueLabel(c)}</div>
                    </div>
                    {detailDocs.length > 0 ? (
                      <div className="case-expand-list">
                        {detailDocs.map((doc) => (
                          <div key={doc.id} style={{ fontSize: 12, lineHeight: 1.45 }}>
                            <b>{doc.document_type.replace(/_/g, " ")}</b> · {doc.file_name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>No attachments yet.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="case-expand-sticky-actions" data-card-action>
                <Link href={detailHref} data-surgical-press style={sc.btnPrimary}>
                  View detail
                </Link>
                <Link href={`${detailHref}?openNote=1`} data-surgical-press style={sc.btnSecondary}>
                  Add note
                </Link>
                {requiresBilling ? (
                  <>
                    <Link href={`${detailHref}?upload=purchase_order`} data-surgical-press style={sc.btnSecondary}>
                      Upload PO
                    </Link>
                    <Link href={`${detailHref}?upload=invoice`} data-surgical-press style={sc.btnSecondary}>
                      Upload invoice
                    </Link>
                    <button type="button" style={sc.btnSecondary} disabled={statusBusy || isArchived} onClick={() => void patchStatus("billing_review")}>
                      Convert to billing
                    </button>
                  </>
                ) : null}
                <button type="button" style={sc.btnSecondary} disabled={statusBusy || isArchived} onClick={markComplete}>
                  Mark complete
                </button>
                <button type="button" style={sc.btnSecondary} disabled={statusBusy} onClick={() => setArchiveConfirmOpen(true)}>
                  {isArchived ? "Restore case" : "Archive case"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      <SalesCrmConfirmModal
        open={markCompleteConfirmOpen}
        title="Mark case completed?"
        message={markCaseCompleteConfirmMessage(c)}
        confirmLabel="Mark completed"
        busy={statusBusy}
        error={markCompleteErr}
        onClose={() => {
          if (!statusBusy) {
            setMarkCompleteConfirmOpen(false);
            setMarkCompleteErr(null);
          }
        }}
        onConfirm={async () => {
          const ok = await patchStatus("completed");
          if (ok) {
            setMarkCompleteConfirmOpen(false);
            setMarkCompleteErr(null);
          }
        }}
      />
      <SalesCrmConfirmModal
        open={archiveConfirmOpen}
        title={isArchived ? "Restore case?" : "Archive case?"}
        message={
          isArchived
            ? "Restore this case to the active operational queue?"
            : "Archive this case? It will move out of the active operational queue but remain available in history."
        }
        confirmLabel={isArchived ? "Restore" : "Archive"}
        busy={statusBusy}
        danger={!isArchived}
        error={archiveErr}
        onClose={() => {
          if (!statusBusy) {
            setArchiveConfirmOpen(false);
            setArchiveErr(null);
          }
        }}
        onConfirm={async () => {
          const ok = await patchArchiveState(isArchived);
          if (ok) {
            setArchiveConfirmOpen(false);
            setArchiveErr(null);
          }
        }}
      />
    </div>
  );
}

function KanbanCaseCard({
  c,
  onCasePatched,
  router,
  draggingCaseId,
  setDraggingCaseId,
  statusBusyId,
  setStatusBusyId,
}: {
  c: EnrichedSurgicalCaseListItem;
  onCasePatched: (caseId: string, patch: Partial<EnrichedSurgicalCaseListItem>) => void;
  router: ReturnType<typeof useRouter>;
  draggingCaseId: string | null;
  setDraggingCaseId: (id: string | null) => void;
  statusBusyId: string | null;
  setStatusBusyId: (id: string | null) => void;
}) {
  const st = displayCaseStatus(c);
  const detailHref = `/portal/sales/cases/${encodeURIComponent(c.id)}`;
  const stripe = surgicalProductFamilyStripeGradient(c.product_name);
  const isDragging = draggingCaseId === c.id;
  const requiresBilling = caseRequiresBillingWorkflow(c);

  const [markCompleteAffirm, setMarkCompleteAffirm] = React.useState(false);
  const [markCompleteConfirmOpen, setMarkCompleteConfirmOpen] = React.useState(false);
  const [markCompleteErr, setMarkCompleteErr] = React.useState<string | null>(null);

  const patchStatus = async (next: string): Promise<boolean> => {
    if (next.toLowerCase() === st) return false;
    setStatusBusyId(c.id);
    setMarkCompleteErr(null);
    try {
      const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(c.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: unknown; case?: unknown };
      if (!res.ok || !j.ok) throw new Error(surgicalCasePatchErrorMessage(j));
      onCasePatched(c.id, surgicalCasePatchFromResponse(j, c.id, { status: next }));
      if (next.toLowerCase() === "completed") {
        setMarkCompleteAffirm(true);
        window.setTimeout(() => setMarkCompleteAffirm(false), 2200);
      }
      return true;
    } catch (e: unknown) {
      const message = userFacingError(e, "Could not update status. Try again.");
      setMarkCompleteErr(message);
      return false;
    } finally {
      setStatusBusyId(null);
    }
  };

  const markCompleted = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMarkCompleteErr(null);
    setMarkCompleteConfirmOpen(true);
  };

  return (
    <div
      style={{
        display: "flex",
        borderRadius: 14,
        border: "1px solid color-mix(in srgb, var(--foreground) 7%, var(--border))",
        background: "var(--surface)",
        boxShadow: isDragging ? "0 12px 28px color-mix(in srgb, var(--foreground) 12%, transparent)" : "0 1px 4px color-mix(in srgb, var(--foreground) 5%, transparent)",
        overflow: "hidden",
        opacity: isDragging ? 0.55 : 1,
        transform: isDragging ? "scale(0.98) rotate(0.5deg)" : "none",
        transition: "opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
      }}
    >
      <div
        title="Drag to another column"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-surgical-case", JSON.stringify({ id: c.id, fromStatus: st }));
          e.dataTransfer.effectAllowed = "move";
          setDraggingCaseId(c.id);
        }}
        onDragEnd={() => setDraggingCaseId(null)}
        style={{
          width: 26,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "grab",
          userSelect: "none",
          WebkitUserSelect: "none",
          background: stripe,
          color: "color-mix(in srgb, white 88%, transparent)",
        }}
      >
        <IconDragHandle />
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: "11px 12px 12px 10px", display: "grid", gap: 8 }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => router.push(detailHref)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(detailHref);
            }
          }}
          style={{ cursor: "pointer", textAlign: "left", border: "none", background: "none", padding: 0, font: "inherit" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.04em" }}>{c.case_number}</span>
              <SurgicalCaseTypeBadge caseType={c.case_type} />
            </div>
            <SurgicalBillingReadinessDot level={listBillingLevel(c)} size={9} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 3, color: "var(--foreground)", lineHeight: 1.25 }}>{c.account_name || "—"}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{c.surgeon_display || "—"}</div>
          <div style={{ marginTop: 2, color: "color-mix(in srgb, var(--foreground) 88%, var(--muted))" }}>
            <SurgicalProductFamilyProductLine
              productName={c.product_name}
              nameStyle={{ fontSize: 12, fontWeight: 650, color: "inherit" }}
            />
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5 }}>{fmtDate(c.case_date)}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            disabled={statusBusyId === c.id}
            onClick={markCompleted}
            title="Mark completed"
            style={{
              ...sc.btnSecondary,
              fontSize: 11,
              padding: "5px 8px",
              border: "1px solid color-mix(in srgb, var(--success) 35%, var(--border))",
              color: "color-mix(in srgb, var(--success) 90%, var(--foreground))",
            }}
          >
            Done
          </button>
          <Link
            href={`${detailHref}?openNote=1`}
            data-surgical-press
            onClick={(e) => e.stopPropagation()}
            style={{ fontSize: 11, fontWeight: 800, color: "var(--brand-700)", textDecoration: "none" }}
          >
            Note
          </Link>
          {requiresBilling ? (
            <>
              <Link
                href={`${detailHref}?upload=purchase_order`}
                data-surgical-press
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: 11, fontWeight: 800, color: "var(--brand-700)", textDecoration: "none" }}
              >
                PO
              </Link>
              <Link
                href={`${detailHref}?upload=invoice`}
                data-surgical-press
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: 11, fontWeight: 800, color: "var(--brand-700)", textDecoration: "none" }}
              >
                Inv
              </Link>
            </>
          ) : null}
        </div>
        {markCompleteAffirm ? (
          <div
            role="status"
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              color: "#166534",
              background: "color-mix(in srgb, var(--success) 9%, var(--surface))",
              border: "1px solid color-mix(in srgb, var(--success) 26%, var(--border))",
            }}
          >
            Recorded — nice work.
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }} aria-label="Document alerts">
            {!requiresBilling && isSurgicalObservationCase(c.case_type) ? (
              <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>No PO/invoice needed</span>
            ) : (
              <>
                {c.missing_po ? (
                  <span style={{ color: "#c2410c", display: "flex", alignItems: "center" }} title="Outstanding purchase order">
                    <IconMissingPo />
                  </span>
                ) : null}
                {c.missing_invoice ? (
                  <span style={{ color: "#b45309", display: "flex", alignItems: "center" }} title="Outstanding invoice">
                    <IconMissingInvoice />
                  </span>
                ) : null}
                {!c.missing_po && !c.missing_invoice ? <span style={{ fontSize: 11, color: "var(--muted)" }}> </span> : null}
              </>
            )}
          </div>
          <label style={{ position: "relative", flex: "1 1 120px", minWidth: 0, margin: 0 }}>
            <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
              Change status
            </span>
            <select
              value={st}
              disabled={statusBusyId === c.id}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => void patchStatus(e.target.value)}
              style={{
                ...sc.input,
                width: "100%",
                fontSize: 11,
                fontWeight: 700,
                padding: "6px 8px",
                borderRadius: 8,
                cursor: "pointer",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
              }}
            >
              {SURGICAL_CASE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {formatSurgicalCaseStatus(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <SalesCrmConfirmModal
        open={markCompleteConfirmOpen}
        title="Mark case completed?"
        message={markCaseCompleteConfirmMessage(c)}
        confirmLabel="Mark completed"
        busy={statusBusyId === c.id}
        error={markCompleteErr}
        onClose={() => {
          if (statusBusyId !== c.id) {
            setMarkCompleteConfirmOpen(false);
            setMarkCompleteErr(null);
          }
        }}
        onConfirm={async () => {
          const ok = await patchStatus("completed");
          if (ok) {
            setMarkCompleteConfirmOpen(false);
            setMarkCompleteErr(null);
          }
        }}
      />
    </div>
  );
}

function PipelineBoard({
  cases,
  onCasePatched,
  onLeaveBoard,
}: {
  cases: EnrichedSurgicalCaseListItem[];
  onCasePatched: (caseId: string, patch: Partial<EnrichedSurgicalCaseListItem>) => void;
  onLeaveBoard: () => void;
}) {
  const router = useRouter();
  const [optimisticStatus, setOptimisticStatus] = React.useState<Record<string, string>>({});
  const [draggingCaseId, setDraggingCaseId] = React.useState<string | null>(null);
  const [dropTargetCol, setDropTargetCol] = React.useState<string | null>(null);
  const [moveErr, setMoveErr] = React.useState<string | null>(null);
  const [statusBusyId, setStatusBusyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setOptimisticStatus((prev) => {
      const pending = Object.keys(prev);
      if (!pending.length) return prev;
      const next = { ...prev };
      let changed = false;
      for (const id of pending) {
        const row = cases.find((c) => c.id === id);
        if (row && String(row.status).toLowerCase() === String(prev[id]).toLowerCase()) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [cases]);

  React.useEffect(() => {
    const clearDrop = () => setDropTargetCol(null);
    window.addEventListener("dragend", clearDrop);
    return () => window.removeEventListener("dragend", clearDrop);
  }, []);

  const mergedCases = React.useMemo(() => {
    return cases.map((c) => {
      const o = optimisticStatus[c.id];
      if (o) return { ...c, status: o };
      return c;
    });
  }, [cases, optimisticStatus]);

  const cancelledCases = React.useMemo(
    () => mergedCases.filter((c) => displayCaseStatus(c) === "cancelled"),
    [mergedCases]
  );

  const byStatus = React.useMemo(() => {
    const m = new Map<string, EnrichedSurgicalCaseListItem[]>();
    for (const s of KANBAN_BOARD_STATUSES) m.set(s, []);
    for (const c of mergedCases) {
      const st = displayCaseStatus(c);
      if (st === "cancelled") continue;
      if (!m.has(st)) continue;
      m.get(st)!.push(c);
    }
    for (const list of m.values()) {
      list.sort(sortByCaseDateAsc);
    }
    return m;
  }, [mergedCases]);

  const applyDrop = async (caseId: string, targetStatus: string) => {
    const row = cases.find((x) => x.id === caseId);
    if (!row) return;
    const cur = String(optimisticStatus[caseId] ?? row.status).toLowerCase();
    if (cur === targetStatus) return;
    setMoveErr(null);
    setOptimisticStatus((prev) => ({ ...prev, [caseId]: targetStatus }));
    try {
      const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: unknown; case?: unknown };
      if (!res.ok || !j.ok) throw new Error(surgicalCasePatchErrorMessage(j));
      onCasePatched(caseId, surgicalCasePatchFromResponse(j, caseId, { status: targetStatus }));
    } catch (e: unknown) {
      setOptimisticStatus((prev) => {
        const next = { ...prev };
        delete next[caseId];
        return next;
      });
      setMoveErr(userFacingError(e, "We could not move that. Please try again."));
    }
  };

  const onColumnDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetCol(col);
  };

  const onColumnDrop = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    setDropTargetCol(null);
    const raw = e.dataTransfer.getData("application/x-surgical-case");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { id?: string; fromStatus?: string };
      if (!parsed.id) return;
      void applyDrop(parsed.id, col);
    } catch {
      /* ignore */
    }
  };

  const columnShell = (col: string, isOver: boolean): React.CSSProperties => ({
    flex: "0 0 min(272px, 88vw)",
    minWidth: "min(272px, 88vw)",
    borderRadius: 16,
    border: `1px solid ${isOver ? "color-mix(in srgb, var(--brand-600) 45%, var(--border))" : "color-mix(in srgb, var(--foreground) 8%, var(--border))"}`,
    background: isOver ? "color-mix(in srgb, var(--brand-600) 9%, var(--surface))" : "color-mix(in srgb, var(--foreground) 2.5%, var(--surface))",
    padding: 12,
    maxHeight: "min(78vh, 820px)",
    overflowY: "auto",
    boxShadow: "0 1px 0 color-mix(in srgb, var(--foreground) 4%, transparent)",
    transition: "background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease",
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {moveErr ? (
        <div role="alert" style={{ ...sc.alertError, fontSize: 14 }}>
          {moveErr}
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 14, color: "var(--muted)", maxWidth: 560, lineHeight: 1.5 }}>
          Drag the grip to move cases between stages, or use the status menu on each card.{" "}
          <button
            type="button"
            onClick={onLeaveBoard}
            style={{ font: "inherit", fontWeight: 800, color: "var(--brand-700)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Command center
          </button>
        </div>
      </div>
      {cases.length === 0 ? (
        <PortalEmptyState
          title="No cases in this view"
          description="Adjust your date range or filters on the list, or create a case to get started on the board."
          actions={[
            { href: "/portal/sales/cases/new", label: "New case", variant: "primary" },
            { href: "/portal/sales/cases", label: "Back to list", variant: "secondary" },
          ]}
        />
      ) : (
        <div
          style={{
            display: "flex",
            gap: 11,
            overflowX: "auto",
            paddingBottom: 10,
            alignItems: "stretch",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {KANBAN_BOARD_STATUSES.map((col) => {
            const list = byStatus.get(col) || [];
            const isOver = dropTargetCol === col;
            return (
              <div
                key={col}
                onDragOver={(e) => onColumnDragOver(e, col)}
                onDrop={(e) => onColumnDrop(e, col)}
                style={columnShell(col, isOver)}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 11 }}>
                  <span style={{ ...caseStatusBadgeStyle(col), fontSize: 11 }}>{formatSurgicalCaseStatus(col)}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)" }}>{list.length}</span>
                </div>
                <div style={{ display: "grid", gap: 9 }}>
                  {list.length === 0 ? (
                    <div
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        borderRadius: 12,
                        border: "1px dashed color-mix(in srgb, var(--foreground) 10%, var(--border))",
                        background: "color-mix(in srgb, var(--foreground) 1%, var(--surface))",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--foreground)", marginBottom: 4 }}>No cases here</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.45 }}>
                        Drag one in from another column or change status on a card.
                      </div>
                    </div>
                  ) : (
                    list.map((c) => (
                      <KanbanCaseCard
                        key={c.id}
                        c={c}
                        onCasePatched={onCasePatched}
                        router={router}
                        draggingCaseId={draggingCaseId}
                        setDraggingCaseId={setDraggingCaseId}
                        statusBusyId={statusBusyId}
                        setStatusBusyId={setStatusBusyId}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {cancelledCases.length > 0 ? (
        <div
          style={{
            borderRadius: 16,
            border: "1px solid color-mix(in srgb, #dc2626 22%, var(--border))",
            background: "color-mix(in srgb, #dc2626 5%, var(--surface))",
            padding: "14px 16px",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, color: "#b91c1c", marginBottom: 10 }}>Cancelled ({cancelledCases.length})</div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {cancelledCases.map((c) => (
              <div key={c.id} style={{ flex: "0 0 min(240px, 85vw)" }}>
                <KanbanCaseCard
                  c={c}
                  onCasePatched={onCasePatched}
                  router={router}
                  draggingCaseId={draggingCaseId}
                  setDraggingCaseId={setDraggingCaseId}
                  statusBusyId={statusBusyId}
                  setStatusBusyId={setStatusBusyId}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
