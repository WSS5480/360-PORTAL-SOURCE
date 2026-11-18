"use client";

import type React from "react";
import Link from "next/link";
import { formatSurgicalCaseStatus, formatSurgicalCaseType } from "@/lib/surgical-sales/labels";
import { caseOverviewMobileCss } from "./caseOverviewMobileCss";

type CaseRowIconKind =
  | "org"
  | "surgeon"
  | "datetime"
  | "procedure"
  | "caseType"
  | "support"
  | "products"
  | "opportunity"
  | "owner"
  | "status";

function CaseRowIcon({ kind }: { kind: CaseRowIconKind }) {
  const stroke = "currentColor";
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "org") {
    return (
      <svg {...common} aria-hidden>
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
      </svg>
    );
  }
  if (kind === "surgeon") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 21v-1a5 5 0 0 1 10 0v1" />
      </svg>
    );
  }
  if (kind === "datetime") {
    return (
      <svg {...common} aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </svg>
    );
  }
  if (kind === "procedure") {
    return (
      <svg {...common} aria-hidden>
        <path d="M12 3v18M8 7h8M8 17h8" />
      </svg>
    );
  }
  if (kind === "caseType") {
    return (
      <svg {...common} aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M9 9h6M9 13h6M9 17h4" />
      </svg>
    );
  }
  if (kind === "support") {
    return (
      <svg {...common} aria-hidden>
        <path d="M12 3l8 4v6c0 4.4-3.6 8-8 8s-8-3.6-8-8V7l8-4z" />
        <path d="M12 11v4M12 8h.01" />
      </svg>
    );
  }
  if (kind === "products") {
    return (
      <svg {...common} aria-hidden>
        <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
        <path d="M12 3v18M3.5 8.5l8.5 5 8.5-5" />
      </svg>
    );
  }
  if (kind === "opportunity") {
    return (
      <svg {...common} aria-hidden>
        <path d="M12 2v20M17 7H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  }
  if (kind === "owner") {
    return (
      <svg {...common} aria-hidden>
        <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
        <circle cx="12" cy="8" r="3" />
        <path d="M20 8v6M23 11h-6" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l2.5 2.5L16 9" />
    </svg>
  );
}

function OverviewMetaRow({
  icon,
  label,
  value,
  muted,
}: {
  icon: CaseRowIconKind;
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="case-mobile-overview-row">
      <div className="case-mobile-overview-icon">
        <CaseRowIcon kind={icon} />
      </div>
      <div className="case-mobile-overview-label">{label}</div>
      <div className={`case-mobile-overview-value${muted ? " case-mobile-overview-value--muted" : ""}`}>{value}</div>
    </div>
  );
}

const REVENUE_REMINDER = "Expected revenue is blank or zero.";

export function CaseDetailMobileOverview({
  accountId,
  accountName,
  surgeonDisplay,
  hasSurgeon,
  caseDate,
  caseTime,
  procedureType,
  caseType,
  supportType,
  productsLabel,
  hasProducts,
  linkedOpportunityHref,
  ownerName,
  status,
  showRevenueReminder,
  workflowProgress,
}: {
  accountId?: string;
  accountName?: string | null;
  surgeonDisplay: string;
  hasSurgeon: boolean;
  caseDate: string;
  caseTime: string;
  procedureType?: string | null;
  caseType?: string | null;
  supportType: string;
  productsLabel: string;
  hasProducts: boolean;
  linkedOpportunityHref: string | null;
  ownerName?: string | null;
  status: string;
  showRevenueReminder?: boolean;
  workflowProgress?: React.ReactNode;
}) {
  return (
    <div className="case-mobile-only case-mobile-overview-panel">
      <style dangerouslySetInnerHTML={{ __html: caseOverviewMobileCss }} />
      <div className="case-mobile-overview-meta">
        <OverviewMetaRow
          icon="org"
          label="Organization"
          value={
            accountName && accountId ? (
              <Link href={`/portal/sales/accounts/${encodeURIComponent(accountId)}`} data-surgical-press>
                {accountName}
              </Link>
            ) : (
              "Not recorded"
            )
          }
          muted={!accountName}
        />
        <OverviewMetaRow icon="surgeon" label="Surgeon" value={surgeonDisplay} muted={!hasSurgeon} />
        <OverviewMetaRow icon="datetime" label="Date & Time" value={`${caseDate} · ${caseTime}`} />
        <OverviewMetaRow icon="procedure" label="Procedure" value={procedureType || "Not recorded"} muted={!procedureType} />
        <OverviewMetaRow
          icon="caseType"
          label="Case Type"
          value={caseType ? formatSurgicalCaseType(caseType) : "Not recorded"}
          muted={!caseType}
        />
        <OverviewMetaRow icon="support" label="Support Type" value={supportType} />
        <OverviewMetaRow icon="products" label="Products" value={productsLabel} muted={!hasProducts} />
        <OverviewMetaRow
          icon="opportunity"
          label="Related opportunity"
          value={
            linkedOpportunityHref ? (
              <Link href={linkedOpportunityHref} data-surgical-press>
                View evaluation
              </Link>
            ) : (
              "Not linked"
            )
          }
          muted={!linkedOpportunityHref}
        />
        <OverviewMetaRow icon="owner" label="Owner" value={ownerName || "Not assigned"} muted={!ownerName} />
        <OverviewMetaRow icon="status" label="Status" value={formatSurgicalCaseStatus(status)} />
      </div>
      {showRevenueReminder ? (
        <p className="case-mobile-overview-reminder" role="status">
          {REVENUE_REMINDER}
        </p>
      ) : null}
      {workflowProgress}
    </div>
  );
}
