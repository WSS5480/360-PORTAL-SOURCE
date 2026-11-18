"use client";

import Link from "next/link";
import type { ProviderOpsQuickAction } from "@/lib/surgical-sales/providerDirectoryOperations";

function OpsActionIcon({ id }: { id: ProviderOpsQuickAction["id"] }) {
  switch (id) {
    case "open":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <path d="M15 3h6v6M10 14 21 3" />
        </svg>
      );
    case "intel":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "engagement":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "case":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    default:
      return null;
  }
}

export function ProvidersOperationsRowActions({
  actions,
  className,
}: {
  actions: ProviderOpsQuickAction[];
  className?: string;
}) {
  return (
    <div
      className={className ? `providers-ops-row-actions ${className}` : "providers-ops-row-actions"}
      role="group"
      aria-label="Provider row actions"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {actions.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          className={`providers-ops-row-action providers-ops-row-action--${a.id}`}
          aria-label={a.title}
          data-surgical-press
        >
          <OpsActionIcon id={a.id} />
          <span className="providers-ops-action-tip" role="tooltip">
            {a.title}
          </span>
        </Link>
      ))}
    </div>
  );
}
