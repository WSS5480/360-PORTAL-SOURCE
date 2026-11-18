"use client";

import React from "react";
import type { SalesCalendarFilters } from "@/lib/surgical-sales/calendar/salesCalendarTypes";

function FilterFields({
  filters,
  onChange,
}: {
  filters: SalesCalendarFilters;
  onChange: (next: SalesCalendarFilters) => void;
}) {
  const toggle = (key: keyof Pick<
    SalesCalendarFilters,
    "engagements" | "observations" | "cases" | "followUps" | "timeOff" | "prepNeeded" | "debriefsNeeded"
  >) => {
    onChange({ ...filters, [key]: !filters[key] });
  };

  return (
    <>
      <label className="sales-cal-filter-toggle">
        <input type="checkbox" checked={filters.engagements} onChange={() => toggle("engagements")} />
        Engagements
      </label>
      <label className="sales-cal-filter-toggle">
        <input type="checkbox" checked={filters.observations} onChange={() => toggle("observations")} />
        Observations
      </label>
      <label className="sales-cal-filter-toggle">
        <input type="checkbox" checked={filters.cases} onChange={() => toggle("cases")} />
        Cases
      </label>
      <label className="sales-cal-filter-toggle">
        <input type="checkbox" checked={filters.followUps} onChange={() => toggle("followUps")} />
        Follow-ups
      </label>
      <label className="sales-cal-filter-toggle">
        <input type="checkbox" checked={filters.timeOff} onChange={() => toggle("timeOff")} />
        Time off
      </label>
      <label className="sales-cal-filter-toggle">
        <input type="checkbox" checked={filters.prepNeeded} onChange={() => toggle("prepNeeded")} />
        Prep needed
      </label>
      <label className="sales-cal-filter-toggle">
        <input type="checkbox" checked={filters.debriefsNeeded} onChange={() => toggle("debriefsNeeded")} />
        Debrief needed
      </label>
      <input
        className="sales-cal-filter-input"
        placeholder="Product focus"
        value={filters.productFocus}
        onChange={(e) => onChange({ ...filters, productFocus: e.target.value })}
      />
      <input
        className="sales-cal-filter-input"
        placeholder="Provider"
        value={filters.provider}
        onChange={(e) => onChange({ ...filters, provider: e.target.value })}
      />
      <input
        className="sales-cal-filter-input"
        placeholder="Organization"
        value={filters.organization}
        onChange={(e) => onChange({ ...filters, organization: e.target.value })}
      />
      <input
        className="sales-cal-filter-input"
        placeholder="Status"
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
      />
    </>
  );
}

export function SalesCalendarFiltersBar({
  filters,
  onChange,
}: {
  filters: SalesCalendarFilters;
  onChange: (next: SalesCalendarFilters) => void;
}) {
  return (
    <div className="sales-cal-filters sales-cal-filters--desktop">
      <FilterFields filters={filters} onChange={onChange} />
    </div>
  );
}

export function SalesCalendarFiltersSheet({
  open,
  filters,
  onChange,
  onClose,
}: {
  open: boolean;
  filters: SalesCalendarFilters;
  onChange: (next: SalesCalendarFilters) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="sales-cal-filter-sheet"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sales-cal-filter-sheet-panel" role="dialog" aria-modal="true" aria-label="Calendar filters">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: 16 }}>Filters</strong>
          <button type="button" className="sales-cal-btn" onClick={onClose}>
            Done
          </button>
        </div>
        <div className="sales-cal-filters" style={{ border: 0, padding: 0 }}>
          <FilterFields filters={filters} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}
