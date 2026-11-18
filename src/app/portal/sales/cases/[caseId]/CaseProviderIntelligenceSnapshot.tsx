"use client";

import Link from "next/link";
import type React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import { ProviderPlanningStatusSummary } from "@/components/sales/ProviderPlanningStatusSummary";
import { isProviderPlanningIncomplete } from "@/lib/surgical-sales/providerPlanning";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import { UPDATE_PROVIDER_INTELLIGENCE_ACTION_LABEL } from "@/lib/surgical-sales/providerIntelligencePromote";
import {
  OPEN_PROVIDER_INTELLIGENCE_LABEL,
  providerIntelligenceHref,
} from "@/lib/surgical-sales/preCallPlanFields";
import { caseProviderIntelligenceSnapshotCss } from "./caseProviderIntelligenceSnapshotCss";
import { ProviderIntelligenceInsightCards } from "@/components/sales/ProviderIntelligenceInsightCards";

function formatSnapshotDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function providerDisplayNameFromRow(provider: Record<string, unknown>): string {
  const first = String(provider.first_name ?? "").trim();
  const last = String(provider.last_name ?? "").trim();
  return [first, last].filter(Boolean).join(" ") || String(provider.email ?? "Provider");
}

export function CaseProviderIntelligenceSnapshot({
  intelligence,
  providerContact,
  providerId,
  providerName,
  caseId,
  caseRow,
  hasLinkedProvider,
  onPromote,
  promoteDisabled,
  embedded = false,
}: {
  intelligence: ProviderIntelligenceSnapshot | null;
  providerContact?: Record<string, unknown> | null;
  providerId: string | null;
  providerName: string;
  caseId: string;
  caseRow?: Record<string, unknown>;
  hasLinkedProvider: boolean;
  onPromote?: () => void;
  promoteDisabled?: boolean;
  embedded?: boolean;
}) {
  const resolvedProviderId = providerId || intelligence?.provider_id || null;
  const caseNumber = formatSurgicalCaseNumber(
    String((caseRow as { case_number?: string } | undefined)?.case_number ?? ""),
  );
  const planningHref = resolvedProviderId
    ? providerIntelligenceHref(resolvedProviderId, caseId, caseNumber || undefined)
    : null;
  const planning = intelligence?.planning;
  const showIncompleteAlert = planning ? isProviderPlanningIncomplete(planning.status) : false;

  return (
    <section
      className={`case-provider-intel-snapshot${embedded ? " case-provider-intel-snapshot--embedded" : ""}`}
    >
      <style dangerouslySetInnerHTML={{ __html: caseProviderIntelligenceSnapshotCss }} />

      <header className="case-provider-intel-snapshot-head">
        <div>
          <h3 className="case-provider-intel-snapshot-title">Provider intelligence snapshot</h3>
          <p className="case-provider-intel-snapshot-sub">
            {hasLinkedProvider
              ? `${providerName} — persistent profile intelligence. Planning for this visit lives on the linked engagement.`
              : "Link a provider on this case to view intelligence from their profile."}
          </p>
        </div>
        {hasLinkedProvider && intelligence?.last_updated_at ? (
          <span className="case-provider-intel-snapshot-updated">
            Updated {formatSnapshotDate(intelligence.last_updated_at)}
          </span>
        ) : null}
      </header>

      {!hasLinkedProvider ? (
        <div className="case-provider-intel-snapshot-alert" role="status">
          Link a provider on this case to view provider intelligence.
        </div>
      ) : null}

      {hasLinkedProvider && showIncompleteAlert ? (
        <div className="case-provider-intel-snapshot-alert" role="status">
          Provider intelligence still developing — add profile context before observation when you can.
        </div>
      ) : null}

      {hasLinkedProvider && planning ? (
        <ProviderPlanningStatusSummary planning={planning} compact showSections={false} />
      ) : null}

      {hasLinkedProvider && providerContact ? (
        <ProviderIntelligenceInsightCards contact={providerContact} planning={planning ?? null} />
      ) : null}

      <div className="case-provider-intel-snapshot-actions">
        {planningHref ? (
          <Link href={planningHref} data-surgical-press style={{ ...sc.btnPrimary, textDecoration: "none" }}>
            {OPEN_PROVIDER_INTELLIGENCE_LABEL}
          </Link>
        ) : null}
        {onPromote ? (
          <button
            type="button"
            data-surgical-press
            style={sc.btnSecondary}
            disabled={promoteDisabled || !hasLinkedProvider}
            onClick={onPromote}
          >
            {UPDATE_PROVIDER_INTELLIGENCE_ACTION_LABEL}
          </button>
        ) : null}
      </div>
    </section>
  );
}
