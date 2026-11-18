"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buildProviderOverviewNarrative } from "@/lib/surgical-sales/buildProviderOverviewNarrative";
import { buildCreateOpportunityHref } from "@/lib/surgical-sales/providerNextStepLinks";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { ProviderOverviewBody } from "./ProviderOverviewBody";
import { ProviderOperationalIntelligence } from "./ProviderOperationalIntelligence";
import { ProviderOperationalReadinessSummaryBar } from "./ProviderOperationalReadinessSummaryBar";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import type { ProviderProfilePayload } from "./providerProfileTypes";

export function ProviderOperationsWorkspace({
  data,
  providerId,
  newEngagementHref,
  newCaseHref,
  noteHref,
  intelligenceHref,
  createOpportunityHref: createOpportunityHrefProp,
  onOpenIntelligence,
  onCaptureRequirementField,
  onLogFieldUpdate,
  onManageContacts,
  onRefreshProvider,
}: {
  data: ProviderProfilePayload;
  providerId: string;
  newEngagementHref: string;
  newCaseHref: string;
  noteHref: string;
  intelligenceHref: string;
  createOpportunityHref?: string;
  onOpenIntelligence: (sectionId?: ProviderIntelligenceSectionId, dbKey?: string) => void;
  onCaptureRequirementField?: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
  onLogFieldUpdate: () => void;
  onManageContacts: () => void;
  onRefreshProvider?: () => void | Promise<void>;
}) {
  const p = data.provider!;
  const displayName = contactDisplayName(p);
  const accountId = String(data.primary_organization?.id || p.organization_id || p.account_id || "");
  const createOpportunityHref =
    createOpportunityHrefProp ??
    buildCreateOpportunityHref({
      accountId,
      providerId,
    });

  const narrative = useMemo(
    () =>
      buildProviderOverviewNarrative({
        providerId,
        contact: p,
        relationshipStage: String(p.provider_relationship_stage || "early_discovery"),
        planning: data.planning_completion,
        engagements: data.engagements || [],
        cases: data.cases,
        opportunities: data.opportunities,
        activity_timeline: data.activity_timeline,
        newEngagementHref,
        newCaseHref,
        intelligenceHref,
        createOpportunityHref,
      }),
    [
      providerId,
      p,
      data.planning_completion,
      data.engagements,
      data.cases,
      data.opportunities,
      data.activity_timeline,
      newEngagementHref,
      newCaseHref,
      intelligenceHref,
      createOpportunityHref,
    ],
  );

  const activityHref = `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=activity`;
  const briefingHref = `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=briefing`;
  const relatedCount = data.related_contacts?.length ?? 0;

  return (
    <div className="provider-ops-workspace" aria-label="Provider operations workspace">
      <ProviderOperationalReadinessSummaryBar
        data={data}
        providerId={providerId}
        showFieldTimeRisk
        onOpenIntelligence={(sectionId) =>
          sectionId ? onOpenIntelligence(sectionId as ProviderIntelligenceSectionId) : onOpenIntelligence()
        }
      />

      <div className="provider-ops-workspace__quick">
        <Link href={briefingHref} className="provider-ops-workspace__quick-link" data-surgical-press>
          Briefing
        </Link>
        <Link href={intelligenceHref} className="provider-ops-workspace__quick-link" data-surgical-press>
          Intelligence
        </Link>
        <Link href={newEngagementHref} className="provider-ops-workspace__quick-link" data-surgical-press>
          Schedule
        </Link>
        <button type="button" className="provider-ops-workspace__quick-link" onClick={onManageContacts}>
          Support contacts{relatedCount > 0 ? ` (${relatedCount})` : ""}
        </button>
      </div>

      <ProviderOverviewBody
        narrative={narrative}
        contact={p}
        providerId={providerId}
        displayName={displayName}
        specialty={data.specialty ?? null}
        organizationName={data.primary_organization?.name ?? null}
        organizationLinks={data.organization_links ?? []}
        organizationBaseline={data.organization_intelligence_baseline ?? null}
        intelligenceHref={intelligenceHref}
        briefingHref={briefingHref}
        newEngagementHref={newEngagementHref}
        activityHref={activityHref}
        timeline={data.activity_timeline}
        engagements={data.engagements}
        opportunities={data.opportunities}
        cases={data.cases}
        planning={data.planning_completion}
        onOpenIntelligence={onOpenIntelligence}
        onCaptureRequirementField={onCaptureRequirementField}
        onLogFieldUpdate={onLogFieldUpdate}
        newCaseHref={newCaseHref}
        createOpportunityHref={createOpportunityHref}
        noteHref={noteHref}
      />

      <section className="provider-ops-workspace__intel" aria-labelledby="provider-ops-intel-title">
        <div className="provider-ops-workspace__intel-head">
          <h2 id="provider-ops-intel-title" className="provider-ops-workspace__intel-title">
            {PROVIDER_FIELD_OPS_SECTION.observationReadiness} &amp; blockers
          </h2>
          <Link href={`${intelligenceHref}&planning_section=observation_readiness`} className="provider-ops-workspace__intel-link">
            Full intelligence →
          </Link>
        </div>
        <ProviderOperationalIntelligence
          contact={p}
          planning={data.planning_completion}
          relationshipStage={String(p.provider_relationship_stage || "")}
          engagements={data.engagements}
          opportunities={data.opportunities}
          cases={data.cases}
          providerId={providerId}
          organizationId={accountId || null}
          organizationName={data.primary_organization?.name ?? null}
          relatedContacts={data.related_contacts ?? []}
          providerAiSummary={data.provider_ai_summary ?? null}
          onLogUpdate={onLogFieldUpdate}
          onProfileRefresh={onRefreshProvider}
          onProviderUpdated={async () => {
            await onRefreshProvider?.();
          }}
        />
      </section>
    </div>
  );
}
