"use client";

import type React from "react";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";

export type ProvidersListFilterValues = {
  specialty: string;
  organizationId: string;
  territory: string;
  planningStatus: string;
  opportunityLinked: string;
  archive: string;
};

const fieldLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--muted)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: 3,
};

const controlStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 36,
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
  background: "#fff",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--foreground)",
};

export function ProvidersListFilters({
  values,
  specialties,
  territories,
  organizations,
  onChange,
}: {
  values: ProvidersListFilterValues;
  specialties: string[];
  territories: string[];
  organizations: { id: string; name: string }[];
  onChange: (patch: Partial<ProvidersListFilterValues>) => void;
}) {
  return (
    <div className="sc-mobile-list-filters" aria-label="Provider filters">
      <div className="sc-mobile-list-filters-grid">
        <label className="sc-mobile-list-filter-field">
          <span style={fieldLabel}>Specialty</span>
          <select value={values.specialty} onChange={(e) => onChange({ specialty: e.target.value })} style={controlStyle}>
            <option value="">All specialties</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="sc-mobile-list-filter-field sc-mobile-list-filter-field--wide">
          <span style={fieldLabel}>Organization</span>
          <select value={values.organizationId} onChange={(e) => onChange({ organizationId: e.target.value })} style={controlStyle}>
            <option value="">All organizations</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sc-mobile-list-filter-field">
          <span style={fieldLabel}>Territory</span>
          <select value={values.territory} onChange={(e) => onChange({ territory: e.target.value })} style={controlStyle}>
            <option value="">All territories</option>
            {territories.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="sc-mobile-list-filter-field">
          <span style={fieldLabel}>Planning</span>
          <select value={values.planningStatus} onChange={(e) => onChange({ planningStatus: e.target.value })} style={controlStyle}>
            <option value="">Any status</option>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="complete">Complete</option>
            <option value="needs_update">Needs update</option>
          </select>
        </label>
        <label className="sc-mobile-list-filter-field">
          <span style={fieldLabel}>{OPPORTUNITY_UI.providerDirectoryFilterLabel}</span>
          <select value={values.opportunityLinked} onChange={(e) => onChange({ opportunityLinked: e.target.value })} style={controlStyle}>
            <option value="">Any</option>
            <option value="yes">Linked</option>
            <option value="no">Not linked</option>
          </select>
        </label>
        <label className="sc-mobile-list-filter-field">
          <span style={fieldLabel}>Archive</span>
          <select value={values.archive} onChange={(e) => onChange({ archive: e.target.value })} style={controlStyle}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>
    </div>
  );
}
