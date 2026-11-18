"use client";

import { DirectoryViewModeToggle } from "@/components/sales/DirectoryViewModeToggle";
import type { ProviderViewMode } from "@/lib/surgical-sales/providerDirectoryOperations";

const PROVIDER_DIRECTORY_VIEW_MODES = [
  {
    id: "operations" as const,
    label: "Execution Queue",
    title: "Execution queue — daily work management and next actions",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
  },
  {
    id: "mission" as const,
    label: "Mission Board",
    title: "Mission board — pipeline visibility and stage progression",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="3" width="5" height="18" rx="1" />
        <rect x="10" y="3" width="5" height="18" rx="1" />
        <rect x="17" y="3" width="4" height="18" rx="1" />
      </svg>
    ),
  },
];

/** Provider directory view toggle — Execution Queue (primary) and Mission Board (pipeline). */
export function ProviderViewModeToggle({
  value,
  onChange,
  className,
  "aria-label": ariaLabel = "Provider list view",
}: {
  value: ProviderViewMode;
  onChange: (mode: ProviderViewMode) => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <DirectoryViewModeToggle
      value={value}
      onChange={onChange}
      className={className}
      panelIdPrefix="provider-view"
      aria-label={ariaLabel}
      modes={PROVIDER_DIRECTORY_VIEW_MODES}
    />
  );
}
