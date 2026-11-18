"use client";

import type React from "react";
import { contactDisplayName } from "@/lib/surgical-sales/labels";

export type SurgicalCasesListFilterValues = {
  fromDate: string;
  toDate: string;
  accountId: string;
  surgeonContactId: string;
};

type ContactOption = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  account_id?: string | null;
  organization_id?: string | null;
};

function contactLabel(c: ContactOption) {
  return contactDisplayName(c as Parameters<typeof contactDisplayName>[0]);
}

export function SurgicalCasesListFilters({
  values,
  accounts,
  providers,
  providersLoading,
  onChange,
}: {
  values: SurgicalCasesListFilterValues;
  accounts: { id: string; name?: string | null }[];
  providers: ContactOption[];
  providersLoading?: boolean;
  onChange: (patch: Partial<SurgicalCasesListFilterValues>) => void;
}) {
  const filteredProviders = values.accountId
    ? providers.filter((p) => {
        const org = values.accountId;
        return String(p.account_id || "") === org || String(p.organization_id || "") === org;
      })
    : providers;

  const controlStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 44,
    padding: "8px 10px",
    borderRadius: 7,
    border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
    background: "#fff",
    // 16px keeps iOS from zooming the viewport when the control gains focus.
    fontSize: 16,
    fontWeight: 600,
    color: "var(--foreground)",
  };

  return (
    <div className="sc-mobile-list-filters sc-mobile-list-filters--compact" aria-label="Case list filters">
      <div className="sc-mobile-list-filters-grid">
        <label className="sc-mobile-list-filter-field">
          <span className="sc-mobile-list-filter-sr">From date</span>
          <input
            type="date"
            value={values.fromDate}
            onChange={(e) => onChange({ fromDate: e.target.value })}
            style={controlStyle}
            title="Show cases on or after this date"
            aria-label="From date"
          />
        </label>
        <label className="sc-mobile-list-filter-field">
          <span className="sc-mobile-list-filter-sr">To date</span>
          <input
            type="date"
            value={values.toDate}
            onChange={(e) => onChange({ toDate: e.target.value })}
            style={controlStyle}
            title="Show cases on or before this date"
            aria-label="To date"
          />
        </label>
        <label className="sc-mobile-list-filter-field">
          <span className="sc-mobile-list-filter-sr">Organization</span>
          <select
            value={values.accountId}
            onChange={(e) => {
              const next = e.target.value;
              const patch: Partial<SurgicalCasesListFilterValues> = { accountId: next };
              if (values.surgeonContactId && next) {
                const stillValid = providers.some(
                  (p) =>
                    p.id === values.surgeonContactId &&
                    (String(p.account_id || "") === next || String(p.organization_id || "") === next),
                );
                if (!stillValid) patch.surgeonContactId = "";
              }
              onChange(patch);
            }}
            style={controlStyle}
            title="Filter by hospital or practice"
            aria-label="Organization"
          >
            <option value="">All organizations</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name?.trim() || "Unnamed organization"}
              </option>
            ))}
          </select>
        </label>
        <label className="sc-mobile-list-filter-field">
          <span className="sc-mobile-list-filter-sr">Provider</span>
          <select
            value={values.surgeonContactId}
            onChange={(e) => onChange({ surgeonContactId: e.target.value })}
            style={controlStyle}
            title="Filter by surgeon or clinician on the case"
            aria-label="Provider"
            disabled={providersLoading}
          >
            <option value="">{providersLoading ? "Loading providers…" : "All providers"}</option>
            {filteredProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {contactLabel(p)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
