"use client";

import Link from "next/link";
import React from "react";
import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import { buildCaseAccessSummary } from "@/lib/surgical-sales/buildCaseAccessSummary";
import {
  caseRowFieldContext,
  hasActiveScheduledFieldWork,
} from "@/lib/surgical-sales/backgroundIntelligenceSections";
import { OBSERVATION_ACCESS_SUMMARY_LEAD } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { observationCaseAccessHistoryCss } from "./observationCaseAccessHistoryCss";

const PRODUCT_SUPPORT_ACCESS_LEAD =
  "Scheduler, credentialing, and vendor pathway details for reference — not primary case workflow unless actively blocking.";

function AccessLine({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <li className="case-obs-access-history-line">
      <span className="case-obs-access-history-label">{label}</span>
      <span className="case-obs-access-history-value">{value}</span>
    </li>
  );
}

export function CaseAccessSummarySection({
  caseId,
  caseRow,
  providerContact,
  engagement,
  identity,
  operationalContext,
  variant,
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  engagement?: Record<string, unknown> | null;
  identity?: CaseIdentity;
  operationalContext?: CaseOperationalContextView | null;
  variant: "observation" | "product_support";
}) {
  const fieldContext = caseRowFieldContext(caseRow);
  const blocksScheduledCase = hasActiveScheduledFieldWork(fieldContext);

  const summaryItems = React.useMemo(
    () =>
      buildCaseAccessSummary({
        variant,
        caseRow,
        providerContact,
        dateLabel: identity?.dateLineWithTime ?? identity?.dateLine ?? null,
        operationalContext,
      }),
    [caseRow, identity?.dateLine, identity?.dateLineWithTime, operationalContext, providerContact, variant],
  );

  const engagementId = String(engagement?.id ?? "").trim();
  const engagementTitle = String(engagement?.title ?? "").trim() || "Linked observation request";
  const engagementHref = engagementId ? `/portal/sales/engagements/${engagementId}` : null;
  const lead = variant === "observation" ? OBSERVATION_ACCESS_SUMMARY_LEAD : PRODUCT_SUPPORT_ACCESS_LEAD;
  const planHref =
    variant === "observation" ? `/portal/sales/cases/${caseId}#case-workspace` : `/portal/sales/cases/${caseId}?tab=overview`;

  return (
    <details className="case-obs-access-history" open={blocksScheduledCase ? undefined : false}>
      <style dangerouslySetInnerHTML={{ __html: observationCaseAccessHistoryCss }} />
      <summary className="case-obs-access-history-summary">
        <span className="case-obs-access-history-summary-title">Access Summary</span>
        <span className="case-obs-access-history-summary-note">
          {blocksScheduledCase ? "Review before case day" : "Reference only"}
        </span>
      </summary>

      <div className="case-obs-access-history-body">
        <p className="case-obs-access-history-lead">{lead}</p>

        {variant === "observation" && engagementHref ? (
          <section className="case-obs-access-history-block" aria-label="Related observation request">
            <h3 className="case-obs-access-history-block-title">Related observation request</h3>
            <Link href={engagementHref} className="case-obs-access-history-link">
              {engagementTitle}
            </Link>
          </section>
        ) : null}

        <section className="case-obs-access-history-block" aria-label="Access summary">
          <ul className="case-obs-access-history-list">
            {summaryItems.map((item) => (
              <AccessLine key={`${item.label}-${item.value}`} label={item.label} value={item.value} />
            ))}
          </ul>
        </section>

        <Link href={planHref} className="case-obs-access-history-plan-link">
          {variant === "observation" ? "Edit access & scheduling" : "Update access details"}
        </Link>
      </div>
    </details>
  );
}

/** @deprecated Use CaseAccessSummarySection */
export const ObservationCaseAccessHistory = CaseAccessSummarySection;
