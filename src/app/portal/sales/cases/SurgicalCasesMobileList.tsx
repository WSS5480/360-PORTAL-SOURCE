"use client";

import Link from "next/link";
import { DirectoryViewModeToggle } from "@/components/sales/DirectoryViewModeToggle";
import { ScMobileListHeaderRow } from "@/components/sales/ScMobileListHeaderRow";
import React from "react";
import {
  CASE_VIEW_MODE_STORAGE_KEY,
  readDirectoryViewModeFromStorage,
  writeDirectoryViewModeToStorage,
  type DirectoryViewMode,
} from "@/lib/surgical-sales/directoryViewMode";
import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import { casesListCss } from "./casesListCss";
import { casesOperationsCss } from "./casesOperationsCss";
import { caseIdentityCss } from "@/components/sales/caseIdentityCss";
import { SurgicalCasesListGrid } from "./SurgicalCasesListGrid";
import { SurgicalCasesMissionBoard } from "./SurgicalCasesMissionBoard";
import { SurgicalCasesMobileCaseRow } from "./SurgicalCasesMobileCaseRow";
import {
  countCasesNeedingAttention,
  filterCasesBySearchQuery,
  sortCasesForExecutionList,
} from "./surgicalCasesListMobileHelpers";
import {
  SurgicalCasesListFilters,
  type SurgicalCasesListFilterValues,
} from "./SurgicalCasesListFilters";

const CASE_DIRECTORY_VIEW_MODES = [
  {
    id: "operations" as const,
    label: "List",
    title: "Field execution list — what needs your attention",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
  },
  {
    id: "mission" as const,
    label: "Board",
    title: "Optional board grouped by case status",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="4" width="5" height="16" rx="1" />
        <rect x="10" y="4" width="5" height="10" rx="1" />
        <rect x="17" y="4" width="5" height="14" rx="1" />
      </svg>
    ),
  },
];

export function SurgicalCasesMobileList({
  cases,
  loading,
  err,
  activeFilterCount,
  listFilters,
  onOpenFilters,
  onQuickAdd,
}: {
  cases: EnrichedSurgicalCaseListItem[] | null;
  loading: boolean;
  err: string | null;
  activeFilterCount: number;
  listFilters: {
    values: SurgicalCasesListFilterValues;
    accounts: { id: string; name?: string | null }[];
    providers: Parameters<typeof SurgicalCasesListFilters>[0]["providers"];
    providersLoading?: boolean;
    onChange: (patch: Partial<SurgicalCasesListFilterValues>) => void;
  };
  onOpenFilters: () => void;
  onQuickAdd: () => void;
  onCasePatched: (caseId: string, patch: Partial<EnrichedSurgicalCaseListItem>) => void;
  onReload: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const [sortNewestFirst, setSortNewestFirst] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<DirectoryViewMode>("operations");
  const [viewModeReady, setViewModeReady] = React.useState(false);

  React.useEffect(() => {
    setViewMode(readDirectoryViewModeFromStorage(CASE_VIEW_MODE_STORAGE_KEY, "operations"));
    setViewModeReady(true);
  }, []);

  const onViewModeChange = React.useCallback((mode: DirectoryViewMode) => {
    setViewMode(mode);
    writeDirectoryViewModeToStorage(CASE_VIEW_MODE_STORAGE_KEY, mode);
  }, []);

  const visibleCases = React.useMemo(() => {
    const base = cases ?? [];
    const searched = filterCasesBySearchQuery(base, search);
    return [...searched].sort((a, b) => sortCasesForExecutionList(a, b, sortNewestFirst));
  }, [cases, search, sortNewestFirst]);

  const attentionCount = React.useMemo(() => countCasesNeedingAttention(visibleCases), [visibleCases]);

  const rootClassName = [
    "surgical-cases-mobile-root",
    "cases-directory-root",
    viewModeReady ? `cases-directory-root--${viewMode}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const viewToggle = (
    <DirectoryViewModeToggle
      value={viewMode}
      onChange={onViewModeChange}
      panelIdPrefix="case-view"
      aria-label="Case list view"
      modes={CASE_DIRECTORY_VIEW_MODES}
    />
  );

  const countLabel = loading
    ? "Loading…"
    : viewMode === "mission"
      ? `${attentionCount} need action · ${visibleCases.length} shown`
      : `${visibleCases.length} cases${attentionCount > 0 ? ` · ${attentionCount} need action` : ""}`;

  return (
    <div className={rootClassName}>
      <style dangerouslySetInnerHTML={{ __html: `${casesOperationsCss}\n${casesListCss}\n${caseIdentityCss}` }} />
      <div className="sc-mobile-list-sticky-shell">
        <header className="sc-mobile-list-header">
          <ScMobileListHeaderRow
            title="Surgical Cases"
            countLabel={countLabel}
            actions={
              <button
                type="button"
                className="sc-mobile-list-icon-btn"
                aria-label="Quick add case"
                title="Quick add case"
                onClick={onQuickAdd}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            }
          />
        </header>

        <div className="sc-mobile-list-sticky-tools sc-mobile-list-sticky-tools--compact">
          <div className="sc-mobile-list-search-row">
            <label className="sc-mobile-list-search-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3-3" />
              </svg>
              <input
                type="search"
                className="sc-mobile-list-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search provider, facility, case…"
                aria-label="Search cases"
              />
            </label>
            <div className="cases-directory-toolbar-toggle-desktop">{viewToggle}</div>
            <button
              type="button"
              className="sc-mobile-list-tool-btn"
              aria-label="Filters"
              title={
                activeFilterCount > 0
                  ? `More filters (${activeFilterCount} active) — status, product, procedure, record scope`
                  : "More filters — status, product, procedure, record scope"
              }
              aria-pressed={activeFilterCount > 0}
              onClick={onOpenFilters}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              {activeFilterCount > 0 ? <span className="sc-mobile-list-tool-badge" aria-hidden /> : null}
            </button>
            <button
              type="button"
              className="sc-mobile-list-tool-btn"
              aria-label={sortNewestFirst ? "Sort oldest first" : "Sort newest first"}
              title={
                sortNewestFirst
                  ? "Case date: latest first. Click to show earliest dates first."
                  : "Case date: earliest first. Click to show latest dates first."
              }
              aria-pressed={sortNewestFirst}
              onClick={() => setSortNewestFirst((v) => !v)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M7 4v16M7 16l-3-3M7 16l3-3M17 8V4M17 8l-3-3M17 8l3-3M17 20v-4M17 16l-3 3M17 16l3 3" />
              </svg>
            </button>
          </div>
          <SurgicalCasesListFilters
            values={listFilters.values}
            accounts={listFilters.accounts}
            providers={listFilters.providers}
            providersLoading={listFilters.providersLoading}
            onChange={listFilters.onChange}
          />
          <div className="cases-directory-toolbar-row--view">{viewToggle}</div>
        </div>
      </div>

      <div className="sc-mobile-list-body">
        {err ? (
          <div className="sc-mobile-list-empty" role="alert">
            <div className="sc-mobile-list-empty-title">Could not load cases</div>
            <p className="sc-mobile-list-empty-copy">{err}</p>
          </div>
        ) : loading || cases === null ? (
          <p className="sc-mobile-list-loading">Loading your cases…</p>
        ) : visibleCases.length === 0 ? (
          <div className="sc-mobile-list-empty">
            <div className="sc-mobile-list-empty-title">No surgical cases yet.</div>
            <p className="sc-mobile-list-empty-copy">
              {search.trim() || activeFilterCount > 0
                ? "Try another filter or widen your search."
                : "Create a case to start coordinating in the field."}
            </p>
            <Link href="/portal/sales/cases/new" className="sc-mobile-list-empty-cta" data-surgical-press>
              Create Case
            </Link>
          </div>
        ) : viewMode === "operations" ? (
          <>
            <SurgicalCasesListGrid cases={visibleCases} />
            <ul className="cases-list-mobile-list" aria-label="Surgical cases list">
              {visibleCases.map((c) => (
                <SurgicalCasesMobileCaseRow key={c.id} c={c} />
              ))}
            </ul>
          </>
        ) : (
          <div id="case-view-panel-mission" role="tabpanel" aria-labelledby="case-view-tab-mission">
            <SurgicalCasesMissionBoard cases={visibleCases} sortNewestFirst={sortNewestFirst} />
          </div>
        )}
      </div>

      <Link href="/portal/sales/cases/new" className="sc-mobile-list-fab" aria-label="New case" data-surgical-press>
        +
      </Link>
    </div>
  );
}
