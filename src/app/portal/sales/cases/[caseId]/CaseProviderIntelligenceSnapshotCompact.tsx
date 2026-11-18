"use client";

import Link from "next/link";
import { ProviderPlanningStatusSummary } from "@/components/sales/ProviderPlanningStatusSummary";
import { sc } from "@/components/sales/salesCommandUi";
import { isProviderPlanningIncomplete } from "@/lib/surgical-sales/providerPlanning";
import {
  OPEN_PROVIDER_PROFILE_LABEL,
  providerIntelligenceHref,
} from "@/lib/surgical-sales/preCallPlanFields";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { caseProviderIntelligenceSnapshotCss } from "./caseProviderIntelligenceSnapshotCss";
import { ProviderIntelligenceInsightCards } from "@/components/sales/ProviderIntelligenceInsightCards";

export function CaseProviderIntelligenceSnapshotCompact({
  intelligence,
  providerContact,
  providerId,
  providerName,
  caseId,
  hasLinkedProvider,
}: {
  intelligence: ProviderIntelligenceSnapshot | null;
  providerContact?: Record<string, unknown> | null;
  providerId: string | null;
  providerName: string;
  caseId: string;
  hasLinkedProvider: boolean;
}) {
  const resolvedProviderId = providerId || intelligence?.provider_id || null;
  const profileHref = resolvedProviderId ? providerIntelligenceHref(resolvedProviderId, caseId) : null;
  const planning = intelligence?.planning ?? null;
  const showIncompleteAlert = planning ? isProviderPlanningIncomplete(planning.status) : false;

  return (
    <section className="case-provider-intel-snapshot case-provider-intel-snapshot--compact">
      <style dangerouslySetInnerHTML={{ __html: caseProviderIntelligenceSnapshotCss }} />
      <header className="case-provider-intel-snapshot-head">
        <div>
          <h3 className="case-provider-intel-snapshot-title">Provider intelligence</h3>
          <p className="case-provider-intel-snapshot-sub">
            {hasLinkedProvider
              ? `Context from ${providerName} — edit on the provider profile. Engagement strategy is above case workflow.`
              : "Link a provider on this case to view profile intelligence."}
          </p>
        </div>
      </header>

      {!hasLinkedProvider ? (
        <div className="case-provider-intel-snapshot-alert" role="status">
          Link a provider to view intelligence while planning this case.
        </div>
      ) : null}

      {hasLinkedProvider && showIncompleteAlert ? (
        <div className="case-provider-intel-snapshot-alert" role="status">
          Provider intelligence still developing — add context when you can to sharpen case support.
        </div>
      ) : null}

      {hasLinkedProvider && planning ? (
        <ProviderPlanningStatusSummary planning={planning} compact showSections={false} />
      ) : null}

      {hasLinkedProvider && providerContact ? (
        <ProviderIntelligenceInsightCards contact={providerContact} planning={planning} maxCards={4} />
      ) : null}

      {profileHref ? (
        <div className="case-provider-intel-snapshot-actions">
          <Link href={profileHref} data-surgical-press style={{ ...sc.btnPrimary, textDecoration: "none", width: "100%" }}>
            {OPEN_PROVIDER_PROFILE_LABEL}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
