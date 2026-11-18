"use client";

import Link from "next/link";
import { ScMobileListHeaderRow } from "@/components/sales/ScMobileListHeaderRow";
import { ProviderViewModeToggle } from "@/components/sales/ProviderViewModeToggle";
import React from "react";
import { SalesCommandPage, sc } from "@/components/sales/salesCommandUi";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  buildProviderMissionPortfolioSummary,
  filterProvidersByMissionMetric,
  providerMissionMetricDefinition,
  readProviderViewModeFromStorage,
  writeProviderViewModeToStorage,
  type ProviderMissionMetricId,
  type ProviderViewMode,
} from "@/lib/surgical-sales/providerDirectoryOperations";
import { ProvidersListFilters, type ProvidersListFilterValues } from "./ProvidersListFilters";
import { ProvidersMissionBoard } from "./ProvidersMissionBoard";
import { ProvidersMissionCommandCenter } from "./ProvidersMissionCommandCenter";
import { providersMissionBoardCss } from "./providersMissionBoardCss";
import { ProvidersOperationsGrid } from "./ProvidersOperationsGrid";
import { ProvidersOperationsMobileRow } from "./ProvidersOperationsMobileRow";
import { providersListMobileCss } from "./providersListMobileCss";
import { providersOperationsCss } from "./providersOperationsCss";
import { surgicalCasesListMobileCss } from "../cases/surgicalCasesListMobileCss";
import { userFacingError } from "@/lib/errors/userFacingError";

type ProvidersApiJson = {
  ok?: boolean;
  error?: string;
  providers?: ProviderDirectoryRow[];
  filter_options?: { specialties?: string[]; territories?: string[] };
};

const DEFAULT_FILTERS: ProvidersListFilterValues = {
  specialty: "",
  organizationId: "",
  territory: "",
  planningStatus: "",
  opportunityLinked: "",
  archive: "active",
};

export default function PortalSalesProvidersDirectoryClient() {
  const [q, setQ] = React.useState("");
  const [filters, setFilters] = React.useState<ProvidersListFilterValues>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ProviderViewMode>("operations");
  const [viewModeReady, setViewModeReady] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ProviderDirectoryRow[]>([]);
  const [specialties, setSpecialties] = React.useState<string[]>([]);
  const [territories, setTerritories] = React.useState<string[]>([]);
  const [organizations, setOrganizations] = React.useState<{ id: string; name: string }[]>([]);
  const [activeMissionMetric, setActiveMissionMetric] = React.useState<ProviderMissionMetricId | null>(null);

  React.useEffect(() => {
    setActiveMissionMetric(null);
  }, [q, filters]);

  React.useEffect(() => {
    setViewMode(readProviderViewModeFromStorage());
    setViewModeReady(true);
  }, []);

  const onViewModeChange = React.useCallback((mode: ProviderViewMode) => {
    setViewMode(mode);
    writeProviderViewModeToStorage(mode);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/portal/sales/surgical-accounts?directory_scope=active", { cache: "no-store" });
        const j = (await res.json()) as { ok?: boolean; organizations?: { id: string; name?: string | null }[] };
        if (!cancelled && j.ok && Array.isArray(j.organizations)) {
          setOrganizations(
            j.organizations
              .map((a) => ({ id: a.id, name: String(a.name || "Organization").trim() || "Organization" }))
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
        }
      } catch {
        if (!cancelled) setOrganizations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setErr(null);
    const id = window.setTimeout(async () => {
      try {
        const p = new URLSearchParams();
        if (q.trim()) p.set("q", q.trim());
        if (filters.specialty) p.set("specialty", filters.specialty);
        if (filters.organizationId) p.set("organization_id", filters.organizationId);
        if (filters.territory) p.set("territory", filters.territory);
        if (filters.planningStatus) p.set("planning_status", filters.planningStatus);
        if (filters.opportunityLinked) p.set("opportunity_linked", filters.opportunityLinked);
        if (filters.archive) p.set("archive", filters.archive);
        const res = await fetch(`/api/portal/sales/providers?${p.toString()}`, { cache: "no-store" });
        const j = (await res.json()) as ProvidersApiJson;
        if (!j.ok) throw new Error(j.error || "");
        if (!cancelled) {
          setRows(j.providers || []);
          setSpecialties(j.filter_options?.specialties || []);
          setTerritories(j.filter_options?.territories || []);
        }
      } catch (e) {
        if (!cancelled) setErr(userFacingError(e, "We could not load providers. Please try again."));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [q, filters]);

  const refreshProvidersSilently = React.useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      if (filters.specialty) p.set("specialty", filters.specialty);
      if (filters.organizationId) p.set("organization_id", filters.organizationId);
      if (filters.territory) p.set("territory", filters.territory);
      if (filters.planningStatus) p.set("planning_status", filters.planningStatus);
      if (filters.opportunityLinked) p.set("opportunity_linked", filters.opportunityLinked);
      if (filters.archive) p.set("archive", filters.archive);
      const res = await fetch(`/api/portal/sales/providers?${p.toString()}`, { cache: "no-store" });
      const j = (await res.json()) as ProvidersApiJson;
      if (!j.ok) throw new Error(j.error || "");
      setRows(j.providers || []);
      setSpecialties(j.filter_options?.specialties || []);
      setTerritories(j.filter_options?.territories || []);
      setErr(null);
    } catch (e) {
      setErr(userFacingError(e, "We could not load providers. Please try again."));
    }
  }, [filters, q]);

  const activeFilterCount = [
    filters.specialty,
    filters.organizationId,
    filters.territory,
    filters.planningStatus,
    filters.opportunityLinked,
    filters.archive !== "active" ? filters.archive : "",
  ].filter(Boolean).length;

  const missionSummary = React.useMemo(() => buildProviderMissionPortfolioSummary(rows), [rows]);

  const missionMetricFilter = viewMode === "mission" ? activeMissionMetric : null;

  const visibleRows = React.useMemo(
    () => filterProvidersByMissionMetric(rows, missionMetricFilter),
    [rows, missionMetricFilter],
  );

  const activeMetricLabel = missionMetricFilter
    ? providerMissionMetricDefinition(missionMetricFilter).label
    : null;

  const viewSubtitle =
    viewMode === "operations"
      ? "Execution queue — daily work management across your territory."
      : "Mission board — pipeline visibility and stage progression.";

  const providerCountLabel = busy
    ? "Loading…"
    : activeMetricLabel
      ? `${visibleRows.length} in ${activeMetricLabel}`
      : `${rows.length} providers`;

  const rootClassName = [
    "sc-native-page",
    "surgical-cases-mobile-root",
    "providers-directory-root",
    viewModeReady ? `providers-directory-root--${viewMode}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const viewToggle = (
    <ProviderViewModeToggle
      value={viewMode}
      onChange={onViewModeChange}
      className="providers-directory-view-toggle"
    />
  );

  const filterButton = (
    <button
      type="button"
      className="sc-mobile-list-tool-btn"
      aria-label={filtersOpen ? "Hide filters" : "Show filters"}
      title={
        activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : "Specialty, organization, territory, planning"
      }
      aria-expanded={filtersOpen}
      aria-pressed={filtersOpen || activeFilterCount > 0}
      onClick={() => setFiltersOpen((o) => !o)}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 6h16M7 12h10M10 18h4" />
      </svg>
      {activeFilterCount > 0 && !filtersOpen ? <span className="sc-mobile-list-tool-badge" aria-hidden /> : null}
    </button>
  );

  const headerActions = (
    <div className="providers-directory-header-actions">
      <Link href="/portal/sales/contacts?from=providers" className="providers-directory-contacts-link">
        <span className="providers-directory-contacts-link__long">Support contacts</span>
        <span className="providers-directory-contacts-link__short">Contacts</span>
      </Link>
      <Link href="/portal/sales/providers/new" className="providers-directory-add-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add provider
      </Link>
    </div>
  );

  return (
    <SalesCommandPage
      density="dense"
      title="Providers"
      subtitle={viewSubtitle}
      omitBuiltInHeader
      nativeLayout
      actions={null}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `${surgicalCasesListMobileCss}\n${providersListMobileCss}\n${providersOperationsCss}\n${providersMissionBoardCss}`,
        }}
      />
      <div className={rootClassName}>
        <div className="sc-mobile-list-sticky-shell">
          <header className="sc-mobile-list-header">
            <ScMobileListHeaderRow
              title="Providers"
              countLabel={providerCountLabel}
              titleWrapClassName="providers-directory-header-text"
              actions={headerActions}
            />
          </header>

          <div className="sc-mobile-list-sticky-tools providers-directory-tools">
            <div className="providers-directory-toolbar-row providers-directory-toolbar-row--primary">
              <label className="sc-mobile-list-search-wrap providers-directory-toolbar-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3-3" />
                </svg>
                <input
                  type="search"
                  className="sc-mobile-list-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search providers…"
                  aria-label="Search providers"
                />
              </label>
              <div className="providers-directory-toolbar-cluster">
                <div className="providers-directory-toolbar-toggle-desktop">{viewToggle}</div>
                {filterButton}
              </div>
            </div>

            <div className="providers-directory-toolbar-row providers-directory-toolbar-row--view">
              {viewToggle}
            </div>

            {filtersOpen ? (
              <ProvidersListFilters
                values={filters}
                specialties={specialties}
                territories={territories}
                organizations={organizations}
                onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
              />
            ) : activeFilterCount > 0 ? (
              <div className="sc-mobile-filter-chips" aria-label="Active filters">
                {filters.specialty ? <span className="sc-mobile-filter-chip">{filters.specialty}</span> : null}
                {filters.organizationId ? (
                  <span className="sc-mobile-filter-chip">
                    {organizations.find((o) => o.id === filters.organizationId)?.name || "Organization"}
                  </span>
                ) : null}
                {filters.territory ? <span className="sc-mobile-filter-chip">{filters.territory}</span> : null}
                {filters.planningStatus ? <span className="sc-mobile-filter-chip">Planning: {filters.planningStatus}</span> : null}
                {filters.opportunityLinked ? (
                  <span className="sc-mobile-filter-chip">Opportunities: {filters.opportunityLinked}</span>
                ) : null}
                {filters.archive !== "active" ? <span className="sc-mobile-filter-chip">{filters.archive}</span> : null}
                <button
                  type="button"
                  className="providers-directory-clear-filters"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                >
                  Clear
                </button>
              </div>
            ) : activeMetricLabel ? (
              <div className="sc-mobile-filter-chips" aria-label="Active mission filter">
                <span className="sc-mobile-filter-chip">{activeMetricLabel}</span>
                <button
                  type="button"
                  className="providers-directory-clear-filters"
                  onClick={() => setActiveMissionMetric(null)}
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="sc-mobile-list-body">
          {err ? <div style={{ ...sc.alertError, margin: "8px 12px" }}>{err}</div> : null}
          {busy ? <div style={{ padding: "12px", color: "var(--muted)" }}>Loading providers…</div> : null}
          {!busy && !err && rows.length === 0 ? (
            <div className="providers-directory-empty-wrap" role="status">
              <div className="providers-directory-empty">
                <div className="providers-directory-empty__icon" aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3-3" />
                  </svg>
                </div>
                <p className="providers-directory-empty__title">No providers match this view.</p>
                <p className="providers-directory-empty__text">Try adjusting search or filters.</p>
              </div>
            </div>
          ) : null}

          {!busy && rows.length > 0 ? (
            <>
              {viewMode === "mission" ? (
                <ProvidersMissionCommandCenter
                  summary={missionSummary}
                  activeMetric={activeMissionMetric}
                  onMetricSelect={setActiveMissionMetric}
                />
              ) : null}
              {visibleRows.length === 0 ? (
                <div className="providers-directory-empty-wrap" role="status">
                  <div className="providers-directory-empty providers-directory-empty--filtered">
                    <p className="providers-directory-empty__title">
                      No providers in {activeMetricLabel ?? "this mission"}.
                    </p>
                    <p className="providers-directory-empty__text">
                      Try another mission metric or show all providers.
                    </p>
                    <button
                      type="button"
                      className="providers-mission-command-center-clear providers-mission-command-center-clear--inline"
                      onClick={() => setActiveMissionMetric(null)}
                    >
                      Show all providers
                    </button>
                  </div>
                </div>
              ) : viewMode === "mission" ? (
                <ProvidersMissionBoard
                  providers={visibleRows}
                  focusMetric={activeMissionMetric}
                  onRefresh={refreshProvidersSilently}
                />
              ) : (
                <div className="providers-ops-shell">
                  <ProvidersOperationsGrid providers={visibleRows} />
                  <ul
                    className="providers-ops-mobile-list ops-queue-mobile-list"
                    aria-label="Providers sales execution queue"
                  >
                    {visibleRows.map((p) => (
                      <ProvidersOperationsMobileRow key={p.id} provider={p} />
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </SalesCommandPage>
  );
}
