"use client";

import { useMemo } from "react";
import { buildProviderOverviewNarrative } from "@/lib/surgical-sales/buildProviderOverviewNarrative";
import { buildCreateOpportunityHref } from "@/lib/surgical-sales/providerNextStepLinks";
import { ProviderOverviewBody } from "./ProviderOverviewBody";
import type { ProviderProfilePayload } from "./providerProfileTypes";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderDebriefNarrativeContext } from "@/lib/surgical-sales/engagements/loadLatestProviderDebriefNarrative";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

export function ProviderProfileOverview({
  data,
  providerId,
  newEngagementHref,
  newCaseHref,
  noteHref,
  intelligenceHref,
  createOpportunityHref: createOpportunityHrefProp,
  onCrmStatusChange,
  savingCrmStatus,
  activityLoading,
  engagementsLoading,
  onOpenIntelligence,
  onCaptureRequirementField,
  onManageContacts,
  onRefreshProvider,
  onProviderUpdated,
  onEngagementsUpdated,
  onLogFieldUpdate,
  showStatusRail = false,
  onDismissStatusRail,
  debriefNarrativeContext,
}: {
  data: ProviderProfilePayload;
  providerId: string;
  newEngagementHref: string;
  newCaseHref: string;
  noteHref: string;
  intelligenceHref: string;
  createOpportunityHref?: string;
  onCrmStatusChange: (status: string) => void;
  savingCrmStatus?: boolean;
  activityLoading?: boolean;
  engagementsLoading?: boolean;
  onOpenIntelligence: (sectionId?: ProviderIntelligenceSectionId, dbKey?: string) => void;
  onCaptureRequirementField?: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
  onManageContacts?: () => void;
  onRefreshProvider?: () => void | Promise<void>;
  onProviderUpdated?: (provider: Record<string, unknown>) => void;
  onEngagementsUpdated?: (engagements: ProviderEngagementSummary[]) => void;
  debriefNarrativeContext?: ProviderDebriefNarrativeContext | null;
  onLogFieldUpdate: () => void;
  showStatusRail?: boolean;
  onDismissStatusRail?: () => void;
}) {
  const p = data.provider!;
  const displayName =
    [String(p.first_name ?? ""), String(p.last_name ?? "")]
      .filter(Boolean)
      .join(" ")
      .trim() || "Provider";
  const accountId = String(
    data.primary_organization?.id || p.organization_id || p.account_id || "",
  );
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

  return (
    <ProviderOverviewBody
      narrative={narrative}
      contact={p}
      providerId={providerId}
      displayName={displayName}
      specialty={data.specialty ?? null}
      organizationName={data.primary_organization?.name ?? null}
      organizationId={accountId || null}
      organizationLinks={data.organization_links ?? []}
      organizationBaseline={data.organization_intelligence_baseline ?? null}
      relatedContacts={data.related_contacts ?? []}
      intelligenceHref={intelligenceHref}
      briefingHref={briefingHref}
      newEngagementHref={newEngagementHref}
      activityHref={activityHref}
      timeline={data.activity_timeline}
      engagements={data.engagements}
      opportunities={data.opportunities}
      cases={data.cases}
      planning={data.planning_completion}
      onManageContacts={onManageContacts}
      onRefreshProvider={onRefreshProvider}
      onProviderUpdated={onProviderUpdated}
      onEngagementsUpdated={onEngagementsUpdated}
      debriefNarrativeContext={debriefNarrativeContext}
      onLogFieldUpdate={onLogFieldUpdate}
      showStatusRail={showStatusRail}
      newCaseHref={newCaseHref}
      createOpportunityHref={createOpportunityHref}
      noteHref={noteHref}
      onDismissStatusRail={onDismissStatusRail}
      overviewData={data}
      activityLoading={activityLoading}
    />
  );
}
