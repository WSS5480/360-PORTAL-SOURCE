"use client";

import type React from "react";
import { ScMobileListHeaderRow } from "@/components/sales/ScMobileListHeaderRow";

type Segment = {
  id: string;
  label: string;
  title?: string;
  active: boolean;
  onClick: () => void;
};

export function SalesCommandNativeListShell({
  title,
  countLabel,
  headerActions,
  searchRow,
  segments,
  children,
  footer,
}: {
  title: string;
  countLabel?: string;
  headerActions?: React.ReactNode;
  searchRow?: React.ReactNode;
  segments?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="sc-native-page surgical-cases-mobile-root">
      <div className="sc-mobile-list-sticky-shell">
        <header className="sc-mobile-list-header">
          <ScMobileListHeaderRow title={title} countLabel={countLabel} actions={headerActions} />
        </header>
        {searchRow ? <div className="sc-mobile-list-sticky-tools">{searchRow}</div> : null}
        {segments}
      </div>
      <div className="sc-mobile-list-body">{children}</div>
      {footer}
    </div>
  );
}

export function SalesCommandNativeSegments({
  segments,
  "aria-label": ariaLabel = "Filters",
}: {
  segments: Segment[];
  "aria-label"?: string;
}) {
  return (
    <div className="sc-mobile-list-segments-track">
      <div className="sc-mobile-list-segments" role="tablist" aria-label={ariaLabel}>
        {segments.map((seg) => (
          <button
            key={seg.id}
            type="button"
            role="tab"
            aria-selected={seg.active}
            title={seg.title ?? seg.label}
            className="sc-mobile-list-segment"
            onClick={seg.onClick}
          >
            {seg.label}
          </button>
        ))}
      </div>
    </div>
  );
}
