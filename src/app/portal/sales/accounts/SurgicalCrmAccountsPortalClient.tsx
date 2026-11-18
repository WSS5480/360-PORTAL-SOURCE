"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { CrmStatusBadge, crmAccountStatusTone, crmBadgeStyle } from "@/components/sales/crmUi";
import NewOrganizationModal from "@/components/sales/NewOrganizationModal";
import { DirectoryViewModeToggle } from "@/components/sales/DirectoryViewModeToggle";
import { ScMobileListHeaderRow } from "@/components/sales/ScMobileListHeaderRow";
import { PortalEmptyState } from "@/components/sales/PortalEmptyState";
import {
  ORGANIZATION_VIEW_MODE_STORAGE_KEY,
  readDirectoryViewModeFromStorage,
  writeDirectoryViewModeToStorage,
  type DirectoryViewMode,
} from "@/lib/surgical-sales/directoryViewMode";
import { orgAccountsListMobileCss } from "./orgAccountsListMobileCss";
import { organizationsOperationsCss } from "./organizationsOperationsCss";
import { OrganizationsOperationsGrid } from "./OrganizationsOperationsGrid";
import { OrganizationsOperationsMobileRow } from "./OrganizationsOperationsMobileRow";
import { surgicalCasesListMobileCss } from "../cases/surgicalCasesListMobileCss";
import SalesCrmConfirmModal from "@/components/sales/SalesCrmConfirmModal";
import { SalesCommandPage, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import {
  formatSurgicalAccountStatus,
  formatSurgicalAccountType,
  SURGICAL_ACCOUNT_STATUSES,
  SURGICAL_ACCOUNT_TYPES,
} from "@/lib/surgical-sales/labels";
import { attentionPriority, type OrgAttentionItem } from "@/lib/surgical-sales/organizationDirectoryAttention";
import {
  isOrganizationBillingIncomplete,
  organizationBillingCityState,
  organizationBillingDetailsMessage,
} from "@/lib/surgical-sales/organizationBillingDetails";

type AccountRow = {
  id: string;
  name: string | null;
  surgical_crm_type?: string | null;
  surgical_crm_status?: string | null;
  surgical_crm_billing_city?: string | null;
  surgical_crm_billing_state?: string | null;
  surgical_crm_billing_postal_code?: string | null;
  surgical_crm_billing_address?: string | null;
  contact_count?: number;
  surgeon_count?: number;
  doctor_contact_count?: number;
  last_case_date?: string | null;
  last_activity_at?: string | null;
  last_contact_created_at?: string | null;
  last_case_created_at?: string | null;
  recent_pulse_at?: string | null;
  next_upcoming_case?: {
    case_date: string;
    procedure_type?: string | null;
    product_name?: string | null;
  } | null;
  upcoming_case_count?: number;
  upcoming_pipeline_revenue?: number;
  attention_items?: OrgAttentionItem[];
  surgical_crm_created_by?: string | null;
  surgical_crm_archived_at?: string | null;
};

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function formatPipeline(n: number | null | undefined) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v) || v <= 0) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function cityState(a: AccountRow) {
  return organizationBillingCityState(a);
}

function billingIncomplete(a: AccountRow) {
  return isOrganizationBillingIncomplete(a);
}

function staleActivity(iso: string | null | undefined, days: number) {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > days * 86400000;
}

/** Natural language for "Last activity …" (e.g. "3 days ago"). */
function formatActivityAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const day = 86400000;
  const days = Math.floor(diff / day);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (days < 60) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "1 month ago" : `${months} months ago`;
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

function formatWeekdayFromYmd(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

function buildUpcomingTeaser(next: { case_date: string; procedure_type?: string | null; product_name?: string | null }): string {
  const day = formatWeekdayFromYmd(next.case_date);
  const proc = (next.procedure_type || "").toLowerCase();
  const prod = (next.product_name || "").toLowerCase();
  const robotic = proc.includes("robot") || prod.includes("robot");
  if (robotic) return `Upcoming robotic case · ${day}`;
  if (next.product_name?.trim()) {
    const raw = next.product_name.trim();
    const short = raw.length > 26 ? `${raw.slice(0, 24)}…` : raw;
    return `Upcoming case · ${day} · ${short}`;
  }
  if (next.procedure_type?.trim()) {
    const raw = next.procedure_type.trim();
    const short = raw.length > 22 ? `${raw.slice(0, 20)}…` : raw;
    return `Upcoming ${short} · ${day}`;
  }
  return `Upcoming case · ${day}`;
}

function OrgCardActivityRail({ a, casesHref }: { a: AccountRow; casesHref: string }) {
  const doctors = a.doctor_contact_count ?? a.surgeon_count ?? 0;
  const nu = a.next_upcoming_case;
  const upcomingLine = nu ? buildUpcomingTeaser(nu) : null;

  const lc = a.last_contact_created_at || null;
  const lk = a.last_case_created_at || null;
  const pulse = a.recent_pulse_at || null;

  const metaParts: string[] = [];
  if (lc) metaParts.push(`Contact added ${formatActivityAgo(lc)}`);
  if (lk) metaParts.push(`Case created ${formatActivityAgo(lk)}`);
  if (pulse) metaParts.push(`Last activity ${formatActivityAgo(pulse)}`);

  const metaLine = metaParts.length > 0 ? metaParts.join(" · ") : null;
  const surgeonLine = doctors > 0 ? `${doctors} active ${plural(doctors, "surgeon", "surgeons")}` : null;

  if (!upcomingLine && !metaLine && !surgeonLine) return null;

  const tip = [lc && `Contact added: ${lc}`, lk && `Case created: ${lk}`, pulse && `Recent pulse: ${pulse}`].filter(Boolean).join("\n");

  return (
    <div className="org-card-live" aria-label="Organization activity" title={tip || undefined}>
      {upcomingLine ? (
        <Link href={casesHref} className="org-card-live-upcoming">
          {upcomingLine}
        </Link>
      ) : null}
      {metaLine ? <div className="org-card-live-meta">{metaLine}</div> : null}
      {surgeonLine ? <div className="org-card-live-surgeons">{surgeonLine}</div> : null}
    </div>
  );
}

const compactPrimary: React.CSSProperties = {
  ...sc.btnPrimary,
  padding: "8px 14px",
  minHeight: 40,
  fontSize: 13,
  borderRadius: 9,
  whiteSpace: "nowrap",
  boxShadow: "0 2px 10px color-mix(in srgb, var(--brand-600) 26%, transparent)",
};

const compactGhost: React.CSSProperties = {
  ...sc.btnGhost,
  padding: "8px 12px",
  minHeight: 40,
  fontSize: 13,
  borderRadius: 9,
};

type SortPreset = { sort: string; dir: "asc" | "desc"; label: string };

const SORT_PRESETS: SortPreset[] = [
  { sort: "name", dir: "asc", label: "Name A–Z" },
  { sort: "name", dir: "desc", label: "Name Z–A" },
  { sort: "activity", dir: "desc", label: "Recent activity" },
  { sort: "activity", dir: "asc", label: "Stale activity" },
  { sort: "contacts", dir: "desc", label: "Most contacts" },
  { sort: "upcoming", dir: "desc", label: "Most upcoming cases" },
  { sort: "pipeline", dir: "desc", label: "Pipeline value" },
];

function sortPresetKey(sort: string, dir: string) {
  return `${sort}:${dir}`;
}

function parseSortPresetKey(k: string): { sort: string; dir: "asc" | "desc" } {
  const [s, d] = k.split(":");
  return { sort: s || "name", dir: d === "desc" ? "desc" : "asc" };
}

function organizationListRowFromCreated(org: Record<string, unknown>): AccountRow {
  return {
    id: String(org.id ?? ""),
    name: (org.name as string) ?? null,
    surgical_crm_type: (org.surgical_crm_type as string) ?? null,
    surgical_crm_status: (org.surgical_crm_status as string) ?? null,
    surgical_crm_billing_city: (org.surgical_crm_billing_city as string) ?? null,
    surgical_crm_billing_state: (org.surgical_crm_billing_state as string) ?? null,
    surgical_crm_billing_postal_code: (org.surgical_crm_billing_postal_code as string) ?? null,
    surgical_crm_billing_address: (org.surgical_crm_billing_address as string) ?? null,
    contact_count: 0,
    surgeon_count: 0,
    doctor_contact_count: 0,
    last_case_date: null,
    last_activity_at: null,
    last_contact_created_at: null,
    last_case_created_at: null,
    recent_pulse_at: null,
    next_upcoming_case: null,
    upcoming_case_count: 0,
    upcoming_pipeline_revenue: 0,
    attention_items: [],
  };
}

type OrgToast = { id: string; message: string; variant: "success" | "error" };

function OrgDirectoryToastStack({ items }: { items: OrgToast[] }) {
  if (!items.length) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10050,
        display: "grid",
        gap: 8,
        maxWidth: "min(440px, calc(100vw - 24px))",
        pointerEvents: "none",
      }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            padding: "12px 18px",
            borderRadius: 14,
            fontWeight: 750,
            fontSize: 14,
            ...(t.variant === "success"
              ? {
                  color: "#f0fdf4",
                  background: "linear-gradient(165deg, color-mix(in srgb, #15803d 92%, #14532d), #166534)",
                  border: "1px solid color-mix(in srgb, #4ade80 45%, transparent)",
                  boxShadow: "0 12px 32px color-mix(in srgb, #000 22%, transparent)",
                }
              : {
                  color: "#fef2f2",
                  background: "linear-gradient(165deg, color-mix(in srgb, var(--danger) 88%, #450a0a), color-mix(in srgb, var(--danger) 70%, #1c1917))",
                  border: "1px solid color-mix(in srgb, var(--danger) 45%, transparent)",
                  boxShadow: "0 12px 32px color-mix(in srgb, #000 22%, transparent)",
                }),
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function SurgicalCrmAccountsPortalClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [rows, setRows] = React.useState<AccountRow[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [createOrgOpen, setCreateOrgOpen] = React.useState(false);
  const [orgToasts, setOrgToasts] = React.useState<OrgToast[]>([]);
  const [viewerId, setViewerId] = React.useState<string | null>(null);
  const [viewerIsAdmin, setViewerIsAdmin] = React.useState(false);
  const [orgConfirm, setOrgConfirm] = React.useState<{ mode: "archive" | "restore"; id: string; name: string } | null>(null);
  const [orgConfirmBusy, setOrgConfirmBusy] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<DirectoryViewMode>("mission");
  const [viewModeReady, setViewModeReady] = React.useState(false);

  React.useEffect(() => {
    setViewMode(readDirectoryViewModeFromStorage(ORGANIZATION_VIEW_MODE_STORAGE_KEY));
    setViewModeReady(true);
  }, []);

  const onViewModeChange = React.useCallback((mode: DirectoryViewMode) => {
    setViewMode(mode);
    writeDirectoryViewModeToStorage(ORGANIZATION_VIEW_MODE_STORAGE_KEY, mode);
  }, []);

  const pushOrgToast = React.useCallback((message: string, variant: "success" | "error") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setOrgToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setOrgToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const q = (sp.get("q") || "").trim();
  const type = (sp.get("type") || "").trim();
  const status = (sp.get("status") || "").trim();
  const directoryScopeRaw = (sp.get("directory_scope") || "active").trim().toLowerCase();
  const directoryScope =
    directoryScopeRaw === "archived" || directoryScopeRaw === "all" ? directoryScopeRaw : "active";
  const sort = (sp.get("sort") || "name").trim();
  const dir = (sp.get("dir") || "asc").trim() === "desc" ? "desc" : "asc";

  React.useEffect(() => {
    if (sp.get("create") !== "1") return;
    setCreateOrgOpen(true);
    const n = new URLSearchParams(sp.toString());
    n.delete("create");
    router.replace(`/portal/sales/accounts?${n.toString()}`, { scroll: false });
  }, [router, sp]);

  const [searchDraft, setSearchDraft] = React.useState(q);
  React.useEffect(() => {
    setSearchDraft(q);
  }, [q]);
  const debouncedSearch = useDebouncedValue(searchDraft, 320);
  React.useEffect(() => {
    const next = debouncedSearch.trim();
    if (next === q) return;
    const n = new URLSearchParams(sp.toString());
    if (next) n.set("q", next);
    else n.delete("q");
    router.replace(`/portal/sales/accounts?${n.toString()}`);
  }, [debouncedSearch, q, router, sp]);

  const setParam = React.useCallback(
    (key: string, value: string | null) => {
      const n = new URLSearchParams(sp.toString());
      if (value === null || value === "") n.delete(key);
      else n.set(key, value);
      router.push(`/portal/sales/accounts?${n.toString()}`);
    },
    [router, sp],
  );

  const setSortPreset = React.useCallback(
    (presetKey: string) => {
      const { sort: s, dir: d } = parseSortPresetKey(presetKey);
      const n = new URLSearchParams(sp.toString());
      n.set("sort", s);
      n.set("dir", d);
      router.push(`/portal/sales/accounts?${n.toString()}`);
    },
    [router, sp],
  );

  const clearFilters = React.useCallback(() => {
    router.push("/portal/sales/accounts");
  }, [router]);

  const load = React.useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const u = new URLSearchParams();
      if (q) u.set("q", q);
      if (type) u.set("type", type);
      if (status) u.set("status", status);
      if (directoryScope !== "active") u.set("directory_scope", directoryScope);
      u.set("sort", sort);
      u.set("dir", dir);
      const res = await fetch(`/api/portal/sales/surgical-accounts?${u.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        organizations?: AccountRow[];
        error?: string;
        viewer_id?: string;
        viewer_is_admin?: boolean;
      };
      if (!json.ok) throw new Error(json.error || "");
      setRows(json.organizations || []);
      if (json.viewer_id) setViewerId(json.viewer_id);
      setViewerIsAdmin(json.viewer_is_admin === true);
    } catch (e: unknown) {
      setErr(userFacingError(e, "We could not load your organizations. Please try again."));
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, [q, type, status, directoryScope, sort, dir]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!menuOpenId) return;
    const onDoc = (e: MouseEvent) => {
      const el = menuRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) setMenuOpenId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpenId(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpenId]);

  const stats = React.useMemo(() => {
    const list = rows || [];
    const total = list.length;
    const active = list.filter((r) => String(r.surgical_crm_status || "").toLowerCase() === "active").length;
    const withUpcoming = list.filter((r) => (r.upcoming_case_count ?? 0) > 0).length;
    const needsFollowUp = list.filter((r) => (r.attention_items?.length ?? 0) > 0).length;
    return { total, active, withUpcoming, needsFollowUp };
  }, [rows]);

  const attentionOrgs = React.useMemo(() => {
    if (!rows?.length) return [];
    return rows
      .filter((r) => (r.attention_items?.length ?? 0) > 0)
      .map((r) => ({ r, p: attentionPriority(r.attention_items ?? []) }))
      .sort((a, b) => b.p - a.p || String(a.r.name ?? "").localeCompare(String(b.r.name ?? "")))
      .map((x) => x.r);
  }, [rows]);

  const filtersActive = Boolean(q || type || status || directoryScope !== "active" || sort !== "name" || dir !== "asc");
  const activeFilterCount = [type, status, directoryScope !== "active", sort !== "name" || dir !== "asc"].filter(Boolean).length;

  const orgArchiveEligible = React.useCallback(
    (a: AccountRow) => {
      if (!viewerId) return false;
      return true;
    },
    [viewerId],
  );
  const sortKeyCurrent = sortPresetKey(sort, dir);
  const sortSelectValue = SORT_PRESETS.some((p) => sortPresetKey(p.sort, p.dir) === sortKeyCurrent)
    ? sortKeyCurrent
    : sortPresetKey("name", "asc");

  const orgCountLabel = busy
    ? "Loading…"
    : rows == null
      ? "Organizations"
      : `${rows.length} organization${rows.length === 1 ? "" : "s"}${stats.needsFollowUp > 0 ? ` · ${stats.needsFollowUp} need attention` : ""}`;

  const statChip = (label: string, value: number, hint?: string) => (
    <div className="org-stat-chip" title={hint}>
      <span className="org-stat-chip-label">{label}</span>
      <span className="org-stat-chip-value">{value}</span>
    </div>
  );

  const rootClassName = [
    "org-cmd-page",
    "sc-native-page",
    "org-directory-root",
    "surgical-cases-mobile-root",
    viewModeReady ? `org-directory-root--${viewMode}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const viewToggle = (
    <DirectoryViewModeToggle
      value={viewMode}
      onChange={onViewModeChange}
      panelIdPrefix="organization-view"
      aria-label="Organization list view"
    />
  );

  return (
    <SalesCommandPage
      title="Organizations"
      subtitle=""
      kicker=""
      density="tight"
      omitBuiltInHeader
      nativeLayout
      actions={null}
    >
      <div className={rootClassName}>
      <style
        dangerouslySetInnerHTML={{
          __html: `${surgicalCasesListMobileCss}\n${orgAccountsListMobileCss}\n${organizationsOperationsCss}`,
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
.org-cmd-page { width: 100%; min-width: 0; margin: 0; display: flex; flex-direction: column; gap: 0; min-height: 0; }
.org-cmd-page.sc-native-page {
  padding-top: 8px;
  background: color-mix(in srgb, var(--surface) 94%, var(--brand-600) 3%);
}
.org-cmd-page.sc-native-page .org-cmd-header {
  padding: 8px 12px 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  margin: 0;
}
.org-cmd-page.sc-native-page .org-filter-bar {
  margin: 0 12px 8px;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--foreground) 4%, transparent);
}
.org-cmd-page.sc-native-page .org-card-grid {
  gap: 12px;
  padding: 0 12px 12px;
}
.org-cmd-page.sc-native-page .org-account-card {
  border-radius: 14px;
}
.org-cmd-header { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 10px 20px; margin: 0; }
.org-cmd-title { margin: 0; font-size: clamp(20px, 3.2vw, 23px); font-weight: 850; letter-spacing: -0.038em; line-height: 1.1; color: var(--foreground); }
.org-cmd-sub { margin: 4px 0 0; font-size: 12px; line-height: 1.42; color: var(--muted); font-weight: 500; max-width: 42rem; }
.org-cmd-header-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: flex-end; }
.org-stat-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 8px; }
.org-stat-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  background: color-mix(in srgb, var(--surface-2) 70%, transparent);
  min-width: 0;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}
.org-stat-chip:hover {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  box-shadow: 0 1px 4px color-mix(in srgb, var(--foreground) 5%, transparent);
}
.org-stat-chip:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-600) 18%, transparent);
}
.org-stat-chip-label {
  font-size: 10px;
  font-weight: 800;
  color: var(--muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.org-stat-chip-value {
  font-size: 13px;
  font-weight: 850;
  color: var(--foreground);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.org-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--surface) 92%, var(--brand-600) 5%);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--foreground) 4%, transparent);
}
.org-filter-search {
  flex: 3 1 200px;
  min-width: min(100%, 160px);
  min-height: 40px;
  box-sizing: border-box;
  padding: 8px 12px;
  border-radius: 9px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 16px;
  font-weight: 500;
  background: var(--surface);
  color: var(--foreground);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.org-filter-select {
  flex: 1 1 108px;
  min-width: 0;
  max-width: 220px;
  min-height: 40px;
  box-sizing: border-box;
  /* Extra right padding so the native dropdown arrow does not overlap label text (e.g. “Directory · Active”). */
  padding: 8px 32px 8px 10px;
  border-radius: 9px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 13px;
  font-weight: 600;
  background: var(--surface);
  color: var(--foreground);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.org-filter-search:hover,
.org-filter-select:hover {
  border-color: color-mix(in srgb, var(--brand-600) 32%, var(--border));
}
.org-filter-search:focus-visible,
.org-filter-select:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--brand-600) 45%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-600) 16%, transparent);
}
.org-filter-end {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 8px;
  margin-left: auto;
}
.org-filter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.15s ease, border-color 0.15s ease, filter 0.12s ease;
}
.org-filter-btn--ghost {
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--surface-2) 82%, var(--brand-600) 4%);
  color: var(--foreground);
}
.org-filter-btn--ghost:hover {
  border-color: color-mix(in srgb, var(--brand-600) 30%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}
.org-filter-btn--primary {
  border: 1px solid color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 32%, var(--brand-600));
  background: linear-gradient(165deg, color-mix(in srgb, var(--brand-600) 88%, white) 0%, var(--brand-600) 55%, color-mix(in srgb, var(--brand-700) 88%, var(--brand-600)) 100%);
  color: white;
  font-weight: 750;
  padding: 0 14px;
  text-decoration: none;
  box-shadow: 0 2px 10px color-mix(in srgb, var(--brand-600) 28%, transparent);
}
.org-filter-btn--primary:hover {
  filter: brightness(1.04);
  border-color: color-mix(in srgb, var(--crm-cyan-bright) 40%, var(--brand-600));
}
.org-filter-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-600) 22%, transparent);
}
@media (min-width: 640px) {
  .org-filter-search { font-size: 13px; }
}
@media (max-width: 520px) {
  .org-filter-end { flex: 1 1 100%; margin-left: 0; justify-content: stretch; }
  .org-filter-end .org-filter-btn--primary { flex: 1; justify-content: center; }
}
.org-card-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  align-items: start;
}
@media (max-width: 640px) {
  .org-toolbar-new { display: none; }
}
.org-account-card {
  position: relative;
  border-radius: 11px;
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--brand-600) 3.5%, transparent), transparent 70px),
    var(--crm-surface-elevated, var(--surface));
  box-shadow: 0 1px 8px color-mix(in srgb, var(--foreground) 4.5%, transparent);
  padding: 12px 12px 10px;
  min-width: 0;
  transition: transform 0.2s ease, box-shadow 0.22s ease, border-color 0.2s ease;
  cursor: default;
  overflow: hidden;
}
.org-account-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 75%, var(--brand-600)), transparent 72%);
  opacity: 0.45;
}
.org-account-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 10px 28px color-mix(in srgb, var(--brand-600) 9%, transparent),
    0 2px 10px color-mix(in srgb, var(--foreground) 5%, transparent);
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
}
.org-account-card:focus-within {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--brand-600) 14%, transparent),
    0 8px 24px color-mix(in srgb, var(--brand-600) 8%, transparent);
}
.org-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.org-card-head-main { min-width: 0; flex: 1 1 auto; display: flex; align-items: flex-start; gap: 8px; }
.org-card-actions {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
@media (max-width: 400px) {
  .org-card-actions { flex-basis: 100%; justify-content: flex-start; margin-top: 2px; }
}
.org-card-title-link {
  font-weight: 800;
  font-size: 14px;
  letter-spacing: -0.03em;
  line-height: 1.25;
  color: var(--foreground);
  text-decoration: none;
  overflow-wrap: break-word;
  word-break: normal;
}
.org-card-title-link:hover { color: var(--brand-700); text-decoration: underline; text-underline-offset: 2px; }
.org-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 99px;
  background: linear-gradient(145deg, var(--crm-cyan-bright, #22d3ee), var(--brand-600));
  box-shadow: 0 0 8px color-mix(in srgb, var(--crm-cyan-bright) 45%, transparent);
  animation: org-pulse 2.4s ease-in-out infinite;
}
@keyframes org-pulse {
  0%, 100% { opacity: 0.85; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.12); }
}
.org-loc-line {
  font-size: 10.5px;
  line-height: 1.4;
  color: var(--muted);
  font-weight: 550;
  margin: 0 0 6px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.org-health-row { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin-bottom: 6px; }
.org-intel-block {
  font-size: 11px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
  font-weight: 500;
  margin: 0;
  word-break: break-word;
  font-variant-numeric: tabular-nums;
}
.org-intel-hint {
  font-size: 10px;
  line-height: 1.38;
  color: var(--muted);
  font-weight: 600;
  margin: 5px 0 0;
}
.org-metric-rail {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin: 8px 0 0;
}
.org-metric-tile {
  min-width: 0;
  padding: 7px 8px;
  border-radius: 9px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--surface-2) 72%, transparent);
}
.org-metric-value {
  display: block;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.15;
  color: var(--foreground);
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.org-metric-label {
  display: block;
  margin-top: 2px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}
.org-card-live {
  margin: 0 0 6px;
  padding: 7px 9px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--brand-600) 4.5%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 5.5%, var(--border));
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.org-card-live-upcoming {
  font-size: 11px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 42%, var(--foreground));
  text-decoration: none;
  line-height: 1.35;
}
.org-card-live-upcoming:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
  color: var(--brand-700);
}
.org-card-live-meta {
  font-size: 10px;
  color: var(--muted);
  font-weight: 600;
  line-height: 1.38;
  letter-spacing: 0.01em;
}
.org-card-live-surgeons {
  font-size: 10px;
  font-weight: 650;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
  letter-spacing: 0.01em;
}
.org-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 9%, var(--border));
  background: color-mix(in srgb, var(--surface-2) 80%, var(--brand-600) 3%);
  font-size: 12px;
  font-weight: 750;
  color: var(--foreground);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
  touch-action: manipulation;
}
.org-action-btn:hover {
  border-color: color-mix(in srgb, var(--brand-600) 38%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 9%, var(--surface));
}
.org-action-btn:active { transform: scale(0.98); }
.org-action-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-600) 22%, transparent);
}
.org-action-btn--primary {
  border-color: color-mix(in srgb, var(--brand-600) 42%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 14%, var(--surface));
  color: var(--brand-800, var(--brand-700));
}
.org-action-btn--icon {
  padding: 6px 10px;
  min-width: 44px;
  min-height: 44px;
  font-size: 15px;
  line-height: 1;
  letter-spacing: 0.02em;
}
.org-menu-pop {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 3px;
  min-width: 176px;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--crm-card-edge);
  background: var(--crm-surface-elevated, var(--surface));
  box-shadow: 0 10px 28px color-mix(in srgb, var(--foreground) 11%, transparent);
  z-index: 40;
}
.org-menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 9px;
  border-radius: 7px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 650;
  color: var(--foreground);
  cursor: pointer;
}
.org-menu-item:hover { background: color-mix(in srgb, var(--foreground) 5%, var(--surface)); }
.org-menu-item:focus-visible {
  outline: none;
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
}

.org-attn-section { margin: 0; }
.org-attn-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 12px;
  margin-bottom: 6px;
}
.org-attn-title {
  margin: 0;
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
}
.org-attn-meta { font-size: 11px; font-weight: 650; color: var(--muted); }
.org-attn-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 2px 6px;
  margin: 0 -2px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
@media (min-width: 900px) {
  .org-attn-strip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(236px, 1fr));
    overflow-x: visible;
    scroll-snap-type: none;
    margin: 0;
    padding-bottom: 0;
  }
}
.org-attn-card {
  flex: 0 0 min(100%, 310px);
  scroll-snap-align: start;
  min-width: 0;
  border-radius: 11px;
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  border-left-width: 3px;
  border-left-style: solid;
  background: color-mix(in srgb, var(--surface) 94%, var(--brand-600) 3%);
  padding: 9px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 1px 6px color-mix(in srgb, var(--foreground) 3.5%, transparent);
  transition: transform 0.18s ease, box-shadow 0.2s ease, border-color 0.18s ease;
}
.org-attn-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--brand-600) 8%, transparent);
}
.org-attn-card:focus-within {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-600) 12%, transparent);
}
.org-attn-card--high { border-left-color: color-mix(in srgb, var(--danger) 75%, var(--border)); }
.org-attn-card--med { border-left-color: color-mix(in srgb, var(--warning) 80%, var(--border)); }
.org-attn-card--low { border-left-color: color-mix(in srgb, var(--muted) 55%, var(--border)); }
.org-attn-card-title {
  font-size: 13px;
  font-weight: 850;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: var(--foreground);
  text-decoration: none;
  overflow-wrap: break-word;
  word-break: normal;
}
.org-attn-card-title:hover { color: var(--brand-700); text-decoration: underline; text-underline-offset: 2px; }
.org-attn-bullets {
  margin: 0;
  padding: 0 0 0 16px;
  font-size: 10.5px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 85%, var(--muted));
  font-weight: 550;
}
.org-attn-bullets li { margin: 0 0 3px; }
.org-attn-bullets li.org-attn-li--high { color: color-mix(in srgb, var(--danger) 55%, var(--foreground)); font-weight: 650; }
.org-attn-bullets li.org-attn-li--medium { color: color-mix(in srgb, var(--warning) 50%, var(--foreground)); font-weight: 620; }
.org-attn-bullets li.org-attn-li--low { color: var(--muted); }
.org-attn-cta-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: auto; padding-top: 1px; }
.org-attn-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 5px 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  font-size: 12px;
  font-weight: 750;
  color: var(--brand-800, var(--brand-700));
  text-decoration: none;
  touch-action: manipulation;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.org-attn-cta:hover {
  border-color: color-mix(in srgb, var(--brand-600) 50%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 14%, var(--surface));
}
.org-attn-cta:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-600) 22%, transparent);
}
.org-attn-cta--ghost {
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--surface-2) 75%, transparent);
  color: var(--foreground);
  font-weight: 650;
}
`,
        }}
      />

        <div className="sc-mobile-list-sticky-shell org-directory-mobile-only">
          <header className="sc-mobile-list-header">
            <ScMobileListHeaderRow
              title="Organizations"
              countLabel={orgCountLabel}
              actions={
                <button
                  type="button"
                  className="sc-mobile-list-icon-btn org-directory-add-btn"
                  aria-label="New organization"
                  title="New organization"
                  onClick={() => setCreateOrgOpen(true)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              }
            />
          </header>

          <div className="sc-mobile-list-sticky-tools org-directory-tools">
            <div className="sc-mobile-list-search-row">
              <label className="sc-mobile-list-search-wrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3-3" />
                </svg>
                <input
                  type="search"
                  className="sc-mobile-list-search"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Search organizations…"
                  aria-label="Search organizations"
                  autoComplete="off"
                />
              </label>
              <div className="org-directory-toolbar-toggle-desktop">{viewToggle}</div>
              <button
                type="button"
                className="sc-mobile-list-tool-btn"
                aria-label={filtersOpen ? "Hide filters" : "Show filters"}
                title={activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : "Type, status, directory, sort"}
                aria-expanded={filtersOpen}
                aria-pressed={filtersOpen || activeFilterCount > 0}
                onClick={() => setFiltersOpen((o) => !o)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                {activeFilterCount > 0 && !filtersOpen ? <span className="sc-mobile-list-tool-badge" aria-hidden /> : null}
              </button>
            </div>

            <div className="org-directory-toolbar-row--view">{viewToggle}</div>

            {filtersOpen ? (
              <div className="org-directory-filters">
                <label>
                  Type
                  <select aria-label="Filter by type" value={type} onChange={(e) => setParam("type", e.target.value || null)}>
                    <option value="">All types</option>
                    {SURGICAL_ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {formatSurgicalAccountType(t)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select aria-label="Filter by status" value={status} onChange={(e) => setParam("status", e.target.value || null)}>
                    <option value="">All statuses</option>
                    {SURGICAL_ACCOUNT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {formatSurgicalAccountStatus(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Directory
                  <select
                    aria-label="Organization directory scope"
                    value={directoryScope}
                    onChange={(e) => setParam("directory_scope", e.target.value === "active" ? null : e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                    <option value="all">All</option>
                  </select>
                </label>
                <label>
                  Sort
                  <select aria-label="Sort organizations" value={sortSelectValue} onChange={(e) => setSortPreset(e.target.value)}>
                    {SORT_PRESETS.map((p) => (
                      <option key={sortPresetKey(p.sort, p.dir)} value={sortPresetKey(p.sort, p.dir)}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
                {filtersActive ? (
                  <div className="org-directory-filters-actions">
                    <button type="button" className="org-directory-clear-filters" onClick={clearFilters}>
                      Clear all filters
                    </button>
                  </div>
                ) : null}
              </div>
            ) : activeFilterCount > 0 ? (
              <div className="sc-mobile-filter-chips" aria-label="Active filters">
                {type ? <span className="sc-mobile-filter-chip">{formatSurgicalAccountType(type)}</span> : null}
                {status ? <span className="sc-mobile-filter-chip">{formatSurgicalAccountStatus(status)}</span> : null}
                {directoryScope !== "active" ? (
                  <span className="sc-mobile-filter-chip">
                    {directoryScope === "archived" ? "Archived" : "All records"}
                  </span>
                ) : null}
                {sort !== "name" || dir !== "asc" ? (
                  <span className="sc-mobile-filter-chip">
                    {SORT_PRESETS.find((p) => sortPresetKey(p.sort, p.dir) === sortSelectValue)?.label ?? "Sorted"}
                  </span>
                ) : null}
                <button type="button" className="org-directory-clear-filters" onClick={clearFilters}>
                  Clear
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <header className="org-cmd-header org-directory-desktop-only">
          <div className="org-cmd-header-body" style={{ minWidth: 0, flex: "1 1 220px" }}>
            <h1 className="org-cmd-title">Organizations</h1>
            <p className="org-cmd-sub">Command view of surgical accounts—pipeline, roster health, and next actions in one scan.</p>
            {rows && rows.length > 0 ? (
              <div className="org-stat-row" aria-label="Organization summary">
                {statChip("Total", stats.total, "Organizations in your directory")}
                {statChip("Active", stats.active, "Status: active")}
                {statChip("Upcoming", stats.withUpcoming, "Organizations with at least one upcoming case")}
                {stats.needsFollowUp > 0
                  ? statChip("Follow-up", stats.needsFollowUp, "Accounts with at least one open follow-up signal")
                  : null}
              </div>
            ) : null}
          </div>
          <div className="org-cmd-header-actions">
            {viewToggle}
            <Link href="/portal/sales" style={{ ...compactGhost, textDecoration: "none" }}>
              Sales home
            </Link>
            <button type="button" style={{ ...compactPrimary, border: "none", font: "inherit", cursor: "pointer" }} onClick={() => setCreateOrgOpen(true)}>
              + New Organization
            </button>
          </div>
        </header>

        <div className="org-filter-bar org-directory-desktop-only">
          <input
            className="org-filter-search"
            aria-label="Search organizations"
            placeholder="Search organizations…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            autoComplete="off"
          />
          <select className="org-filter-select" aria-label="Filter by type" value={type} onChange={(e) => setParam("type", e.target.value || null)}>
            <option value="">Type · All</option>
            {SURGICAL_ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatSurgicalAccountType(t)}
              </option>
            ))}
          </select>
          <select className="org-filter-select" aria-label="Filter by status" value={status} onChange={(e) => setParam("status", e.target.value || null)}>
            <option value="">Status · All</option>
            {SURGICAL_ACCOUNT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {formatSurgicalAccountStatus(s)}
              </option>
            ))}
          </select>
          <select
            className="org-filter-select"
            aria-label="Organization directory scope"
            value={directoryScope}
            onChange={(e) => setParam("directory_scope", e.target.value === "active" ? null : e.target.value)}
          >
            <option value="active">Directory · Active</option>
            <option value="archived">Directory · Archived</option>
            <option value="all">Directory · All</option>
          </select>
          <select className="org-filter-select" aria-label="Sort organizations" value={sortSelectValue} onChange={(e) => setSortPreset(e.target.value)}>
            {SORT_PRESETS.map((p) => (
              <option key={sortPresetKey(p.sort, p.dir)} value={sortPresetKey(p.sort, p.dir)}>
                Sort · {p.label}
              </option>
            ))}
          </select>
          <div className="org-filter-end">
            {filtersActive ? (
              <button type="button" className="org-filter-btn org-filter-btn--ghost" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
            <button
              type="button"
              className="org-filter-btn org-filter-btn--primary org-toolbar-new"
              onClick={() => setCreateOrgOpen(true)}
            >
              + New
            </button>
          </div>
        </div>

        <div className="org-directory-list-body sc-mobile-list-body">
        {err ? <div style={{ ...sc.alertError, padding: "10px 12px", fontSize: 13, margin: "8px 12px 0" }}>{err}</div> : null}

        {busy && !rows ? (
          <div style={{ padding: "14px 12px", textAlign: "center", color: "var(--muted)", fontWeight: 700, fontSize: 13 }}>Loading organizations…</div>
        ) : null}

        {!busy && viewMode === "mission" && attentionOrgs.length > 0 ? <NeedsAttentionStrip orgs={attentionOrgs} /> : null}

        {!busy && rows && rows.length === 0 ? (
          <PortalEmptyState
            title={filtersActive ? "No organizations match" : "No organizations in directory"}
            description={
              filtersActive
                ? "Try clearing filters or widening your search."
                : "Create an organization to start tracking contacts, cases, and pipeline for a site."
            }
            actions={[
              { href: "/portal/sales", label: "Sales home", variant: "primary" },
              { href: "/portal/sales/cases", label: "Surgical cases", variant: "secondary" },
            ]}
            footer={
              filtersActive ? (
                <button type="button" onClick={clearFilters} style={{ ...compactGhost, marginTop: 8 }}>
                  Clear all filters
                </button>
              ) : (
                <button type="button" onClick={() => setCreateOrgOpen(true)} style={{ ...compactPrimary, marginTop: 10, border: "none", font: "inherit", cursor: "pointer" }}>
                  + New Organization
                </button>
              )
            }
          />
        ) : null}

        {!busy && rows && rows.length > 0 && viewMode === "mission" ? (
          <>
            <h2 className="org-all-section-title org-directory-mobile-only">All organizations</h2>
            <div className="org-card-grid" id="organization-view-panel-mission" role="tabpanel" aria-labelledby="organization-view-tab-mission">
            {rows.map((a) => (
              <OrgAccountCard
                key={a.id}
                a={a}
                menuOpenId={menuOpenId}
                setMenuOpenId={setMenuOpenId}
                menuContainerRef={menuRef}
                directoryScope={directoryScope}
                orgArchiveEligible={orgArchiveEligible}
                onArchiveOrRestoreRequest={(mode, row) => {
                  setOrgConfirm({ mode, id: row.id, name: row.name || "Organization" });
                }}
              />
            ))}
            </div>
          </>
        ) : null}

        {!busy && rows && rows.length > 0 && viewMode === "operations" ? (
          <>
            <OrganizationsOperationsGrid organizations={rows} />
            <ul className="ops-queue-mobile-list" aria-label="Organizations operations queue">
              {rows.map((a) => (
                <OrganizationsOperationsMobileRow key={a.id} org={a} />
              ))}
            </ul>
          </>
        ) : null}
        </div>

        <NewOrganizationModal
          open={createOrgOpen}
          onClose={() => setCreateOrgOpen(false)}
          onCreated={(org) => {
            const row = organizationListRowFromCreated(org);
            const st = String(row.surgical_crm_status || "").toLowerCase();
            if (st === "inactive") {
              pushOrgToast(
                "Organization created. Inactive organizations stay out of this list until status is Active or Prospect.",
                "success",
              );
            } else {
              pushOrgToast("Organization created.", "success");
              setRows((prev) => {
                const base = prev ?? [];
                const without = base.filter((r) => r.id !== row.id);
                return [row, ...without];
              });
            }
            void load();
            router.refresh();
          }}
        />
        <OrgDirectoryToastStack items={orgToasts} />

        <SalesCrmConfirmModal
          open={orgConfirm != null}
          title={orgConfirm?.mode === "restore" ? "Restore organization?" : "Archive organization?"}
          message={
            orgConfirm?.mode === "restore"
              ? `Restore “${orgConfirm?.name}”? It will appear again in the active directory and sales views that filter to active organizations.`
              : `Archive “${orgConfirm?.name}”? It will be hidden from active views, but linked contacts and cases stay intact. You can restore it from Directory · Archived.`
          }
          confirmLabel={orgConfirm?.mode === "restore" ? "Restore" : "Archive"}
          danger={orgConfirm?.mode !== "restore"}
          busy={orgConfirmBusy}
          onClose={() => !orgConfirmBusy && setOrgConfirm(null)}
          onConfirm={async () => {
            if (!orgConfirm) return;
            setOrgConfirmBusy(true);
            try {
              const res = await fetch(`/api/portal/sales/surgical-accounts/${encodeURIComponent(orgConfirm.id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orgConfirm.mode === "restore" ? { restore: true } : { archive: true }),
              });
              const json = (await res.json()) as { ok?: boolean; error?: string };
              if (!json.ok) throw new Error(json.error || "");
              pushOrgToast(orgConfirm.mode === "restore" ? "Organization restored." : "Organization archived.", "success");
              setOrgConfirm(null);
              await load();
              router.refresh();
            } catch (e: unknown) {
              pushOrgToast(userFacingError(e, "Could not update organization."), "error");
            } finally {
              setOrgConfirmBusy(false);
            }
          }}
        />
      </div>
    </SalesCommandPage>
  );
}

function NeedsAttentionStrip({ orgs }: { orgs: AccountRow[] }) {
  return (
    <section className="org-attn-section" aria-labelledby="org-attn-heading">
      <div className="org-attn-head">
        <h2 id="org-attn-heading" className="org-attn-title">
          Needs attention
        </h2>
        <span className="org-attn-meta org-attn-meta--desktop">
          {orgs.length} account{orgs.length !== 1 ? "s" : ""} · prioritized by urgency
        </span>
        <span className="org-attn-meta org-attn-meta--mobile">{orgs.length} account{orgs.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="org-attn-strip" role="list">
        {orgs.map((org) => (
          <NeedsAttentionCard key={org.id} org={org} />
        ))}
      </div>
    </section>
  );
}

function NeedsAttentionCard({ org }: { org: AccountRow }) {
  const items = org.attention_items ?? [];
  const pri = attentionPriority(items);
  const sevClass = pri >= 3 ? "org-attn-card--high" : pri >= 2 ? "org-attn-card--med" : "org-attn-card--low";
  const primary = items[0];
  const secondary = items[1];
  const openHref = `/portal/sales/accounts/${encodeURIComponent(org.id)}`;
  const orgName = org.name || "Untitled organization";

  return (
    <article className={`org-attn-card ${sevClass}`} role="listitem">
      <div className="org-attn-card-desktop">
        <Link href={openHref} className="org-attn-card-title">
          {orgName}
        </Link>
        <ul className="org-attn-bullets">
          {items.slice(0, 2).map((it) => (
            <li key={it.code} className={`org-attn-li--${it.severity}`}>
              {it.label}
            </li>
          ))}
          {items.length > 2 ? <li className="org-attn-li--low">+{items.length - 2} more</li> : null}
        </ul>
        <div className="org-attn-cta-row">
          {primary ? (
            <Link href={primary.ctaHref} className="org-attn-cta">
              {primary.ctaLabel}
            </Link>
          ) : null}
          {secondary && secondary.ctaHref !== primary?.ctaHref ? (
            <Link href={secondary.ctaHref} className="org-attn-cta org-attn-cta--ghost">
              {secondary.ctaLabel}
            </Link>
          ) : null}
          <Link href={openHref} className="org-attn-cta org-attn-cta--ghost">
            Open account
          </Link>
        </div>
      </div>

      <div className="org-attn-card-mobile">
        <div className="org-attn-mobile-name">{orgName}</div>
        {primary ? <p className="org-attn-mobile-reason">{primary.label}</p> : null}
        <div className="org-attn-mobile-actions">
          {primary ? (
            <Link href={primary.ctaHref} className="org-attn-cta org-attn-cta--primary">
              {primary.ctaLabel}
            </Link>
          ) : null}
          <Link href={openHref} className="org-attn-cta org-attn-cta--ghost">
            Open
          </Link>
        </div>
      </div>
    </article>
  );
}

function accountHealthPills(args: {
  contacts: number;
  surgeons: number;
  upcoming: number;
  activityIso: string | null;
  statusLower: string;
  billingGap: boolean;
  atRisk: boolean;
}): { key: string; label: string; tone: "info" | "warning" | "success" | "danger" | "muted" | "brand" }[] {
  const { contacts, surgeons, upcoming, activityIso, statusLower, billingGap, atRisk } = args;
  const needsAttention = contacts === 0 || surgeons === 0 || billingGap || atRisk;
  const quietAccount = staleActivity(activityIso, 60);
  const noActivity = !needsAttention && contacts > 0 && quietAccount && upcoming === 0;
  const growing =
    !needsAttention &&
    (upcoming > 0 || (!staleActivity(activityIso, 28) && contacts > 0 && Boolean(activityIso)));
  const showActive = !needsAttention && !noActivity && !growing && statusLower === "active";

  const out: { key: string; label: string; tone: "info" | "warning" | "success" | "danger" | "muted" | "brand" }[] = [];
  if (needsAttention) out.push({ key: "na", label: "Needs attention", tone: "warning" });
  else if (noActivity) out.push({ key: "na2", label: "No activity", tone: "muted" });
  else if (growing) out.push({ key: "gr", label: "Growing", tone: "success" });
  else if (showActive) out.push({ key: "ac", label: "Active", tone: "info" });

  if (needsAttention && upcoming > 0) {
    out.push({ key: "up", label: `${upcoming} upcoming`, tone: "info" });
  }
  return out.slice(0, 2);
}

function buildIntelSummary(contacts: number, upcoming: number, pipeline: string): string {
  const chunks: string[] = [];
  chunks.push(`${contacts} ${plural(contacts, "contact", "contacts")}`);
  if (upcoming > 0) {
    const casePhrase = `${upcoming} ${plural(upcoming, "upcoming case", "upcoming cases")}`;
    chunks.push(pipeline ? `${casePhrase} · ${pipeline} expected` : casePhrase);
  }
  return chunks.join(" · ");
}

function OrgMetricRail({
  contacts,
  surgeons,
  upcoming,
  pipeline,
}: {
  contacts: number;
  surgeons: number;
  upcoming: number;
  pipeline: string;
}) {
  const metrics = [
    { label: "Contacts", value: String(contacts) },
    { label: "Clinicians", value: String(surgeons) },
    { label: "Upcoming", value: String(upcoming) },
    { label: "Pipeline", value: pipeline || "—" },
  ];

  return (
    <div className="org-metric-rail" aria-label="Organization metrics">
      {metrics.map((metric) => (
        <div key={metric.label} className="org-metric-tile">
          <span className="org-metric-value" title={metric.value}>
            {metric.value}
          </span>
          <span className="org-metric-label">{metric.label}</span>
        </div>
      ))}
    </div>
  );
}

function billingContactHint(billingGap: boolean, contacts: number): string | null {
  if (!billingGap) return null;
  return organizationBillingDetailsMessage({ contactCount: contacts, hasBillingContact: false });
}

function OrgCardOverflowMenu({
  open,
  menuContainerRef,
  addContact,
  addSurgeon,
  newCase,
  openHref,
  noCases,
  showArchive,
  showRestore,
  onArchiveOrRestoreRequest,
  onClose,
}: {
  open: boolean;
  menuContainerRef: React.RefObject<HTMLDivElement | null>;
  addContact: string;
  addSurgeon: string;
  newCase: string;
  openHref: string;
  noCases: boolean;
  showArchive: boolean;
  showRestore: boolean;
  onArchiveOrRestoreRequest: (mode: "archive" | "restore") => void;
  onClose: () => void;
}) {
  return (
    <div style={{ position: "relative" }} ref={open ? menuContainerRef : null}>
      <button
        type="button"
        className="org-action-btn org-action-btn--icon"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="More actions"
        onClick={onClose}
      >
        ⋯
      </button>
      {open ? (
        <div className="org-menu-pop" role="menu">
          <Link href={addContact} className="org-menu-item" role="menuitem" style={{ textDecoration: "none" }} onClick={onClose}>
            Add contact…
          </Link>
          <Link href={addSurgeon} className="org-menu-item" role="menuitem" style={{ textDecoration: "none" }} onClick={onClose}>
            Add surgeon…
          </Link>
          {noCases ? (
            <Link href={newCase} className="org-menu-item" role="menuitem" style={{ textDecoration: "none" }} onClick={onClose}>
              Create first case…
            </Link>
          ) : null}
          {showArchive ? (
            <button type="button" className="org-menu-item" role="menuitem" onClick={() => { onClose(); onArchiveOrRestoreRequest("archive"); }}>
              Archive organization…
            </button>
          ) : null}
          {showRestore ? (
            <button type="button" className="org-menu-item" role="menuitem" onClick={() => { onClose(); onArchiveOrRestoreRequest("restore"); }}>
              Restore organization…
            </button>
          ) : null}
          <button
            type="button"
            className="org-menu-item"
            role="menuitem"
            onClick={() => {
              onClose();
              window.open(openHref, "_blank", "noopener,noreferrer");
            }}
          >
            Open in new tab
          </button>
          <button
            type="button"
            className="org-menu-item"
            role="menuitem"
            onClick={() => {
              onClose();
              void navigator.clipboard.writeText(`${window.location.origin}${openHref}`);
            }}
          >
            Copy organization link
          </button>
        </div>
      ) : null}
    </div>
  );
}

function OrgAccountCard({
  a,
  menuOpenId,
  setMenuOpenId,
  menuContainerRef,
  directoryScope,
  orgArchiveEligible,
  onArchiveOrRestoreRequest,
}: {
  a: AccountRow;
  menuOpenId: string | null;
  setMenuOpenId: (id: string | null) => void;
  menuContainerRef: React.RefObject<HTMLDivElement | null>;
  directoryScope: string;
  orgArchiveEligible: (row: AccountRow) => boolean;
  onArchiveOrRestoreRequest: (mode: "archive" | "restore", row: AccountRow) => void;
}) {
  const contacts = a.contact_count ?? 0;
  const surgeons = a.doctor_contact_count ?? a.surgeon_count ?? 0;
  const upcoming = a.upcoming_case_count ?? 0;
  const pipeline = formatPipeline(a.upcoming_pipeline_revenue);
  const loc = cityState(a);
  const activityIso = a.last_activity_at || null;
  const statusLower = String(a.surgical_crm_status || "").toLowerCase();
  const billingGap = billingIncomplete(a);
  const noSurgeons = surgeons === 0;
  const noCases = !a.last_case_date && upcoming === 0;
  const quietAccount = staleActivity(activityIso, 60);
  const atRisk = statusLower === "prospect" && quietAccount && upcoming === 0;

  const healthPills = accountHealthPills({
    contacts,
    surgeons,
    upcoming,
    activityIso,
    statusLower,
    billingGap,
    atRisk,
  });

  const intelLine = buildIntelSummary(contacts, upcoming, pipeline);
  const billingHint = billingContactHint(billingGap, contacts);

  const open = `/portal/sales/accounts/${a.id}`;
  const casesTab = `${open}?tab=cases`;
  const newCase = `/portal/sales/cases/new?account_id=${encodeURIComponent(a.id)}`;
  const addContact = `${open}?tab=contacts&new_contact=1`;
  const addSurgeon = `${open}?tab=contacts&new_contact=1&role=surgeon`;

  const menuOpen = menuOpenId === a.id;
  const isArchived = Boolean(a.surgical_crm_archived_at);
  const showArchive = orgArchiveEligible(a) && !isArchived && directoryScope !== "archived";
  const showRestore = orgArchiveEligible(a) && isArchived && directoryScope === "archived";
  const attentionReason = a.attention_items?.[0]?.label ?? null;
  const orgName = a.name || "Untitled organization";
  const toggleMenu = () => setMenuOpenId(menuOpen ? null : a.id);
  const requestArchive = (mode: "archive" | "restore") => onArchiveOrRestoreRequest(mode, a);

  return (
    <article className="org-account-card">
      <div className="org-card-mobile-only">
        <div className="org-card-mobile-body">
          <div className="org-card-mobile-text">
            <Link href={open} className="org-card-mobile-name">
              {orgName}
            </Link>
            {loc ? <div className="org-card-mobile-meta">{loc}</div> : null}
            <div className="org-card-mobile-meta">{intelLine}</div>
            {attentionReason ? (
              <span className="org-card-mobile-chip" title={attentionReason}>
                {attentionReason}
              </span>
            ) : null}
          </div>
          <div className="org-card-mobile-actions">
            <Link href={open} className="org-action-btn org-action-btn--primary">
              Open
            </Link>
            <OrgCardOverflowMenu
              open={menuOpen}
              menuContainerRef={menuContainerRef}
              addContact={addContact}
              addSurgeon={addSurgeon}
              newCase={newCase}
              openHref={open}
              noCases={noCases}
              showArchive={showArchive}
              showRestore={showRestore}
              onArchiveOrRestoreRequest={requestArchive}
              onClose={toggleMenu}
            />
          </div>
        </div>
      </div>

      <div className="org-card-desktop-only">
      <div className="org-card-head">
        <div className="org-card-head-main">
          <Link href={open} className="org-card-title-link">
            {a.name || "Untitled organization"}
          </Link>
          {upcoming > 0 ? <span className="org-pulse-dot" title="Upcoming cases on the calendar" aria-hidden /> : null}
        </div>
        <div className="org-card-actions">
          <Link href={open} className="org-action-btn org-action-btn--primary">
            Open
          </Link>
          <Link href={newCase} className="org-action-btn" onClick={(e) => e.stopPropagation()}>
            Add case
          </Link>
          <OrgCardOverflowMenu
            open={menuOpen}
            menuContainerRef={menuContainerRef}
            addContact={addContact}
            addSurgeon={addSurgeon}
            newCase={newCase}
            openHref={open}
            noCases={noCases}
            showArchive={showArchive}
            showRestore={showRestore}
            onArchiveOrRestoreRequest={requestArchive}
            onClose={toggleMenu}
          />
        </div>
      </div>

      <div className="org-loc-line">
        <span style={loc ? undefined : { color: "color-mix(in srgb, var(--muted) 88%, var(--warning))" }}>{loc || "Location not set"}</span>
        <span aria-hidden style={{ opacity: 0.45 }}>
          ·
        </span>
        <CrmStatusBadge tone={crmAccountStatusTone(a.surgical_crm_status)} compact>
          {formatSurgicalAccountStatus(a.surgical_crm_status)}
        </CrmStatusBadge>
        <CrmStatusBadge tone="brand" compact>
          {formatSurgicalAccountType(a.surgical_crm_type)}
        </CrmStatusBadge>
      </div>

      {healthPills.length > 0 ? (
        <div className="org-health-row" aria-label="Account health">
          {healthPills.map((h) => (
            <span key={h.key} style={crmBadgeStyle(h.tone, true)}>
              {h.label}
            </span>
          ))}
        </div>
      ) : null}

      <OrgCardActivityRail a={a} casesHref={casesTab} />

      <OrgMetricRail contacts={contacts} surgeons={surgeons} upcoming={upcoming} pipeline={pipeline} />

      {billingHint ? <p className="org-intel-hint">{billingHint}</p> : null}

      {(noSurgeons || noCases || contacts === 0) && (
        <div className="org-card-quick-links" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {contacts === 0 ? (
            <Link href={addContact} style={{ fontSize: 11, fontWeight: 750, color: "var(--brand-700)", textDecoration: "none" }}>
              + Add contact
            </Link>
          ) : null}
          {noSurgeons ? (
            <Link href={addSurgeon} style={{ fontSize: 11, fontWeight: 750, color: "var(--brand-700)", textDecoration: "none" }}>
              + Add surgeon
            </Link>
          ) : null}
          {noCases ? (
            <Link href={newCase} style={{ fontSize: 11, fontWeight: 750, color: "var(--brand-700)", textDecoration: "none" }}>
              + First case
            </Link>
          ) : null}
        </div>
      )}
      </div>
    </article>
  );
}
