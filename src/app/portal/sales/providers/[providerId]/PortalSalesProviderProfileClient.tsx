"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import ManageSupportContactsModal from "@/components/sales/ManageSupportContactsModal";
import {
  buildCaptureIntelligenceOpenContext,
  useCaptureIntelligence,
} from "@/components/sales/captureIntelligence/CaptureIntelligenceHost";
import { sc } from "@/components/sales/salesCommandUi";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { normalizePlanningSectionId } from "@/lib/surgical-sales/providerPlanningTabSections";
import { ProviderProfileActivityFeed } from "./ProviderProfileActivityFeed";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { buildCreateOpportunityHref } from "@/lib/surgical-sales/providerNextStepLinks";
import { buildCaptureContextFromSearchParams } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { readResponseJson } from "@/lib/utils/readResponseJson";
import { clinicalDiscoverySectionFromPlanning } from "@/lib/surgical-sales/providerPlanningCompletion";
import { ProviderProfilePlanningAccordion } from "./ProviderProfilePlanningAccordion";
import { ProviderTabSectionHeader } from "./ProviderTabSectionHeader";
import { ProviderFieldExecutionMode } from "./ProviderFieldExecutionMode";
import {
  buildQuickSignalCaptureTarget,
  ProviderQuickSignalCaptureDrawer,
  type QuickSignalCaptureTarget,
} from "./ProviderQuickSignalCaptureDrawer";
import {
  appendProviderDiscoveryMappingParams,
  buildProviderDiscoveryMappingHref,
  discoverySignalIdForDbKey,
} from "@/lib/surgical-sales/providerDiscoveryMappingNavigation";
import { providerFieldExecutionCss } from "./providerFieldExecutionCss";
import { useProviderPlanningAutosave } from "./useProviderPlanningAutosave";
import { PROVIDER_ENGAGEMENTS_REFRESH_EVENT } from "@/lib/surgical-sales/engagements/providerEngagementsRefresh";
import { ProviderCompactOppList } from "./ProviderProfileCompactLists";
import { ProviderCasesTab } from "./ProviderCasesTab";
import { ProviderDetailHeader } from "./ProviderDetailHeader";
import { ProviderActionsMenu } from "./ProviderActionsMenu";
import { ProviderMissionMode } from "./ProviderMissionMode";
import { resolveFieldBriefingTouchContext } from "@/lib/surgical-sales/providerFieldBriefingTouch";
import { ProviderOperationalReadinessSummaryBar } from "./ProviderOperationalReadinessSummaryBar";
import { providerMissionModeCss } from "./providerMissionModeCss";
import { providerOperationalIntelligenceCss } from "./providerOperationalIntelligenceCss";
import { providerFieldTimeRiskCss } from "./providerFieldTimeRiskCss";
import {
  buildEngagementPrepareForMeetingHref,
  pickNextUpcomingEngagement,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { ProviderPrimaryActionRow } from "./ProviderPrimaryActionRow";
import { ProviderWhatMattersNow } from "./ProviderWhatMattersNow";
import { ProviderOperationsWorkspace } from "./ProviderOperationsWorkspace";
import { ProviderProfileOverview } from "./ProviderProfileOverview";
import { providerOperationsWorkspaceCss } from "./providerOperationsWorkspaceCss";
import { ProviderProfileEngagements } from "./ProviderProfileEngagements";
import { providerCommandCenterCss } from "./providerCommandCenterCss";
import { providerCommandHeaderCss } from "./providerCommandHeaderCss";
import { ObservationApprovalModal } from "./ObservationApprovalModal";
import { resolveObservationStatusFromContact, type ObservationStatusChoice } from "@/lib/surgical-sales/observationStatus";
import { buildProviderObservationCaseHref } from "@/lib/surgical-sales/providerDirectoryLinks";
import { providerDetailMobileCss } from "./providerDetailMobileCss";
import { ProviderMobileTabNav } from "./ProviderMobileTabNav";
import { providerMobileTabNavCss } from "./providerMobileTabNavCss";
import { providerDetailVisualCss } from "./providerDetailVisualCss";
import { providerOverviewNarrativeCss } from "./providerOverviewNarrativeCss";
import { providerOverviewCommandCenterCss } from "./providerOverviewCommandCenterCss";
import { providerOverviewBodyCss } from "./providerOverviewBodyCss";
import { missionControlCss } from "@/app/portal/sales/missionControl";
import { providerIntelligenceMissionCss } from "./providerIntelligenceMissionCss";
import { providerIntelligencePageCss } from "./providerIntelligencePageCss";
import { providerMissionQuickEditCss } from "./providerMissionQuickEditCss";
import { providerAccountUnderstandingCss } from "./providerAccountUnderstandingCss";
import { providerIntelligenceDashboardCss } from "./providerIntelligenceDashboardCss";
import { providerIntelligenceUiCss } from "./providerIntelligenceUi/providerIntelligenceUiCss";
import { intelligenceItemDetailCss } from "./intelligenceItemDetailCss";
import { providerOperationalReadinessCardCss } from "./providerOperationalReadinessCardCss";
import { providerProfileCss } from "./providerProfileCss";
import { providerTabSectionHeaderCss } from "./providerTabSectionHeaderCss";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  isProviderTabSpecificWorkspace,
  PROVIDER_TABS,
  parseProviderTab,
  type ProviderProfilePayload,
  type ProviderTabId,
} from "./providerProfileTypes";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  PROVIDER_FIELD_OPS_CTA,
  PROVIDER_FIELD_OPS_TAB_LABELS,
  PROVIDER_FIELD_OPS_TAB_SUBTITLES,
} from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import { userFacingError } from "@/lib/errors/userFacingError";

function useProviderDetailMobile() {
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return mobile;
}

const ADMIN_READONLY_PROVIDER_CSS = `
.provider-profile-root--admin-readonly .provider-primary-action-row,
.provider-profile-root--admin-readonly .provider-actions-menu,
.provider-profile-root--admin-readonly .pct-head-action,
.provider-profile-root--admin-readonly .pct-empty-cta,
.provider-profile-root--admin-readonly .pet-head-action,
.provider-profile-root--admin-readonly .provider-mission-quick-edit,
.provider-profile-root--admin-readonly .pi-accordion-footer,
.provider-profile-root--admin-readonly .pov-nba-card { display: none !important; }
.provider-profile-root--admin-readonly textarea,
.provider-profile-root--admin-readonly input:not([type="checkbox"]):not([type="radio"]),
.provider-profile-root--admin-readonly select { pointer-events: none; }
.provider-profile-root--admin-readonly .pov-execution-actions,
.provider-profile-root--admin-readonly .pov-cc-cta,
.provider-profile-root--admin-readonly .provider-overview-link-row,
.provider-profile-root--admin-readonly .pib-intel-from-case-banner { display: none !important; }
.provider-profile-admin-readonly-banner {
  margin: 0 0 12px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-050) 70%, var(--surface));
  color: var(--brand-800);
  font-size: 12px;
  font-weight: 800;
}
`;

export default function PortalSalesProviderProfileClient({
  providerId,
  readOnly = false,
  apiBase,
  backHref = "/portal/sales/providers",
  backLabel = "← Providers",
}: {
  providerId: string;
  readOnly?: boolean;
  apiBase?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const captureIntelligence = useCaptureIntelligence();
  const isMobile = useProviderDetailMobile();
  const tab = parseProviderTab(searchParams.get("tab"), searchParams.get("note"));
  const noteFocus = (searchParams.get("note") || "").trim() === "1";
  const initialPlanningSection = normalizePlanningSectionId(searchParams.get("planning_section"));
  const [loading, setLoading] = React.useState(true);
  const [deployCaptureTarget, setDeployCaptureTarget] = React.useState<QuickSignalCaptureTarget | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<ProviderProfilePayload | null>(null);
  const [planAutosaveError, setPlanAutosaveError] = React.useState<string | null>(null);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [savingCrmStatus, setSavingCrmStatus] = React.useState(false);
  const [observationApprovalOpen, setObservationApprovalOpen] = React.useState(false);
  const [observationApprovalBusy, setObservationApprovalBusy] = React.useState(false);
  const [observationApprovalError, setObservationApprovalError] = React.useState<string | null>(null);

  const [engagementsLoading, setEngagementsLoading] = React.useState(false);
  const [activityLoading, setActivityLoading] = React.useState(false);
  const engagementsLoadedRef = React.useRef(false);
  const activityLoadedRef = React.useRef(false);

  const mergeProviderUpdate = React.useCallback((provider: Record<string, unknown>) => {
    setData((prev) =>
      prev?.provider
        ? {
            ...prev,
            provider: {
              ...prev.provider,
              ...provider,
              clinical_discovery_answers: prev.provider.clinical_discovery_answers,
            },
          }
        : prev,
    );
  }, []);

  const mergeEngagementsUpdate = React.useCallback((engagements: ProviderEngagementSummary[]) => {
    setData((prev) => (prev ? { ...prev, engagements } : prev));
  }, []);

  const profileApiBase =
    apiBase ?? `/api/portal/sales/providers/${encodeURIComponent(providerId)}`;

  const load = React.useCallback(
    async (opts?: { defer?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const qs = opts?.defer ? `?defer=${encodeURIComponent(opts.defer)}` : "";
        const res = await fetch(`${profileApiBase}${qs}`, {
          cache: "no-store",
        });
        const j = await readResponseJson<ProviderProfilePayload>(res);
        if (!res.ok || !j.ok || !j.provider) throw new Error(j.error || "");
        const p = j.provider;
        setData((prev) => ({
          ...j,
          engagements: j.engagements ?? prev?.engagements,
          activity_timeline: j.activity_timeline ?? prev?.activity_timeline,
          provider: p ? { ...p, clinical_discovery_answers: j.clinical_discovery_answers ?? [] } : p,
        }));
        if (j.engagements) engagementsLoadedRef.current = true;
        if (j.activity_timeline) activityLoadedRef.current = true;
      } catch (e: unknown) {
        setError(userFacingError(e, "We could not load this provider. Please try again."));
      } finally {
        setLoading(false);
      }
    },
    [profileApiBase],
  );

  const loadEngagements = React.useCallback(async () => {
    if (engagementsLoadedRef.current) return;
    setEngagementsLoading(true);
    try {
      const res = await fetch(`${profileApiBase}/engagements`, {
        cache: "no-store",
      });
      const j = await readResponseJson<ProviderProfilePayload>(res);
      if (!res.ok || !j.ok) throw new Error(j.error || "");
      engagementsLoadedRef.current = true;
      setData((prev) => (prev ? { ...prev, engagements: j.engagements ?? [] } : prev));
    } catch (e: unknown) {
      setError(userFacingError(e, "We could not load engagements. Please try again."));
    } finally {
      setEngagementsLoading(false);
    }
  }, [profileApiBase]);

  const loadActivity = React.useCallback(async () => {
    if (activityLoadedRef.current) return;
    setActivityLoading(true);
    try {
      const res = await fetch(
        `${profileApiBase}?defer=${encodeURIComponent("engagements")}`,
        { cache: "no-store" },
      );
      const j = await readResponseJson<ProviderProfilePayload>(res);
      if (!res.ok || !j.ok) throw new Error(j.error || "");
      activityLoadedRef.current = true;
      setData((prev) =>
        prev
          ? {
              ...prev,
              activity_timeline: j.activity_timeline ?? prev.activity_timeline,
              cases: j.cases ?? prev.cases,
            }
          : prev,
      );
    } catch (e: unknown) {
      setError(userFacingError(e, "We could not load recent activity. Please try again."));
    } finally {
      setActivityLoading(false);
    }
  }, [profileApiBase]);

  React.useEffect(() => {
    engagementsLoadedRef.current = false;
    activityLoadedRef.current = false;
    void load({ defer: "activity" });
  }, [load]);

  React.useEffect(() => {
    if (tab === "engagements" && !loading) void loadEngagements();
  }, [tab, loading, loadEngagements]);

  React.useEffect(() => {
    if (!loading && data && !engagementsLoadedRef.current) void loadEngagements();
  }, [loading, data, loadEngagements]);

  React.useEffect(() => {
    if ((tab === "activity" || tab === "overview" || tab === "intelligence") && !loading) void loadActivity();
  }, [tab, loading, loadActivity]);

  React.useEffect(() => {
    if (readOnly) return;
    const onEngagementsRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ providerId: string }>).detail;
      if (detail?.providerId !== providerId) return;
      engagementsLoadedRef.current = false;
      void loadEngagements();
      void load();
    };
    window.addEventListener(PROVIDER_ENGAGEMENTS_REFRESH_EVENT, onEngagementsRefresh);
    return () => window.removeEventListener(PROVIDER_ENGAGEMENTS_REFRESH_EVENT, onEngagementsRefresh);
  }, [readOnly, providerId, loadEngagements, load]);

  const pageBase = readOnly
    ? `/admin/sales/providers/${encodeURIComponent(providerId)}`
    : `/portal/sales/providers/${encodeURIComponent(providerId)}`;

  const providerRow = data?.provider ?? null;

  const planningCaptureContext = React.useMemo(
    () => buildCaptureContextFromSearchParams(searchParams),
    [searchParams],
  );

  const {
    planDraft,
    setPlanDraft,
    saving: savingPlanning,
    lastSavedAt: planningLastSavedAt,
    savePlanning,
  } = useProviderPlanningAutosave({
    providerId,
    provider: providerRow,
    enabled: Boolean(providerRow) && !readOnly,
    captureContext: planningCaptureContext,
    onSaved: (j) => {
      setData((prev) =>
        prev
          ? {
              ...prev,
              provider: j.provider
                ? {
                    ...prev.provider,
                    ...j.provider,
                    clinical_discovery_answers: j.clinical_discovery_answers ?? prev.clinical_discovery_answers,
                  }
                : prev.provider,
              clinical_discovery_answers: j.clinical_discovery_answers ?? prev.clinical_discovery_answers,
              planning_completion: j.planning_completion ?? prev.planning_completion,
            }
          : prev,
      );
    },
    onError: setPlanAutosaveError,
  });

  React.useEffect(() => {
    if ((searchParams.get("manage") || "").trim() === "1") setManageOpen(true);
  }, [searchParams]);

  function setTab(next: ProviderTabId) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", next);
    if (next !== "activity") p.delete("note");
    router.replace(`${pageBase}?${p.toString()}`);
  }

  const openIntelligenceSection = React.useCallback(
    (sectionId: string) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("tab", "intelligence");
      p.set("planning_section", sectionId);
      p.delete("note");
      router.replace(`${pageBase}?${p.toString()}`);
    },
    [pageBase, router, searchParams],
  );

  const patchCrmStatus = React.useCallback(
    async (crm_status: string) => {
      if (readOnly) return;
      setSavingCrmStatus(true);
      try {
        const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ crm_status }),
        });
        const j = await readResponseJson<{ ok?: boolean; error?: string }>(res);
        if (!res.ok || !j.ok) throw new Error(typeof j.error === "string" ? j.error : "Could not update status.");
        await load();
      } catch (e: unknown) {
        setError(userFacingError(e, "Could not update status."));
      } finally {
        setSavingCrmStatus(false);
      }
    },
    [load, providerId, readOnly],
  );

  const patchSalesTrack = React.useCallback(
    async (track: "sales_pathway" | "customer") => {
      if (readOnly) return;
      setSavingCrmStatus(true);
      try {
        const body =
          track === "customer"
            ? { relationship_stage: "established_customer", crm_status: "active" }
            : { relationship_stage: "early_discovery" };
        const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(providerId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await readResponseJson<{ ok?: boolean; error?: string }>(res);
        if (!res.ok || !j.ok) throw new Error(typeof j.error === "string" ? j.error : "Could not update provider type.");
        await load();
      } catch (e: unknown) {
        setError(userFacingError(e, "Could not update provider type."));
      } finally {
        setSavingCrmStatus(false);
      }
    },
    [load, providerId, readOnly],
  );

  function handleDeployCapture(sectionId: ProviderIntelligenceSectionId, dbKey?: string) {
    if (readOnly) {
      openIntelligenceSection(sectionId);
      return;
    }
    if (!providerRow) {
      openIntelligenceSection(sectionId);
      return;
    }
    const target = buildQuickSignalCaptureTarget(
      sectionId,
      dbKey,
      providerRow,
      data?.planning_completion,
    );
    if (target) {
      setDeployCaptureTarget(target);
      return;
    }
    openIntelligenceSection(sectionId);
  }

  const briefingPrimaryOrg = data?.primary_organization;
  const briefingProvider = data?.provider;
  const briefingAccountId = String(
    briefingPrimaryOrg?.id ||
      briefingProvider?.organization_id ||
      briefingProvider?.account_id ||
      "",
  );

  const fieldBriefingTouchContext = React.useMemo(
    () =>
      resolveFieldBriefingTouchContext({
        engagements: data?.engagements ?? [],
        engagementIdParam: searchParams.get("engagement_id"),
        touchParam: searchParams.get("touch"),
        providerId,
        organizationId: briefingAccountId || null,
        facilityName: briefingPrimaryOrg?.name ?? null,
      }),
    [data?.engagements, searchParams, providerId, briefingAccountId, briefingPrimaryOrg?.name],
  );

  const fieldBriefingActiveTouch =
    fieldBriefingTouchContext.status === "ready" ? fieldBriefingTouchContext.touch : null;

  if (loading) {
    return (
      <div className="provider-profile-root provider-workspace-page">
        {/* Top padding keeps the message clear of the floating mobile menu button. */}
        <p role="status" style={{ color: "var(--muted)", padding: "68px 16px 16px", fontSize: 13 }}>
          Loading provider…
        </p>
      </div>
    );
  }

  if (error || !data?.provider) {
    return (
      <div className="provider-profile-root provider-workspace-page">
        <Link href={backHref} className="provider-profile-back">
          {backLabel}
        </Link>
        <p style={{ ...sc.alertError, margin: 12 }}>{error || "This provider is no longer available."}</p>
      </div>
    );
  }

  const provider = data.provider;
  const name = contactDisplayName(provider as Parameters<typeof contactDisplayName>[0]);
  const planning = data.planning_completion;
  const primaryOrg = data.primary_organization;
  const accountId = String(primaryOrg?.id || provider.organization_id || provider.account_id || "");
  const newCaseHref = accountId
    ? `/portal/sales/cases/new?account_id=${encodeURIComponent(accountId)}&surgeon_contact_id=${encodeURIComponent(providerId)}`
    : `/portal/sales/cases/new?surgeon_contact_id=${encodeURIComponent(providerId)}`;
  const newEngagementHref = (() => {
    const p = new URLSearchParams({ provider_id: providerId });
    if (accountId) p.set("organization_id", accountId);
    return `/portal/sales/engagements/new?${p.toString()}`;
  })();
  const noteHref = `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=activity&note=1`;
  const captureProviderCtx = buildCaptureIntelligenceOpenContext("provider", {
    providerId,
    providerLabel: name,
    organizationId: accountId || undefined,
    organizationLabel: primaryOrg?.name ?? undefined,
  });
  const captureProviderFieldNoteCtx = buildCaptureIntelligenceOpenContext("mission_board", {
    providerId,
    providerLabel: name,
    organizationId: accountId || undefined,
    organizationLabel: primaryOrg?.name ?? undefined,
    declaredSourceType: "field_note",
  });
  const openCaptureProviderIntelligence = () => {
    if (readOnly) return;
    captureIntelligence.open(captureProviderCtx, { onSaved: () => void load() });
  };
  const openProviderFieldNoteCapture = () => {
    if (readOnly) return;
    captureIntelligence.open(captureProviderFieldNoteCtx, { onSaved: () => void load() });
  };
  const relationshipStage = String(provider.provider_relationship_stage || "early_discovery");
  const fromCaseId = (searchParams.get("from_case") || "").trim();
  const fromCaseHref = fromCaseId
    ? `/portal/sales/cases/${encodeURIComponent(fromCaseId)}?tab=workflow`
    : null;
  const createOpportunityHref = buildCreateOpportunityHref({ accountId, providerId });
  const intelligenceHref = `${pageBase}?tab=intelligence`;
  const editProviderHref = accountId
    ? `/portal/sales/accounts/${encodeURIComponent(accountId)}?focus_contact=${encodeURIComponent(providerId)}`
    : `/portal/sales/contacts/${encodeURIComponent(providerId)}`;
  const providerArchived = Boolean(String(provider.archived_at ?? "").trim());
  const hiddenFromProviders = Boolean(String(provider.hidden_from_provider_directory_at ?? "").trim());
  const isCommandCenter = tab === "overview";
  const isOperationsWorkspace = tab === "operations";
  const isMissionMode = tab === "briefing";
  const isFieldExecution = tab === "deploy";
  const isOperationalIntelligenceTab = tab === "intelligence";
  const isTabSpecificWorkspace = isProviderTabSpecificWorkspace(tab);
  /** Mission overview + mission mode/deploy own their summaries; workspace tabs stay clean. */
  const showProviderLevelSummaryChrome =
    !isMissionMode &&
    !isFieldExecution &&
    !isCommandCenter &&
    !isOperationsWorkspace &&
    !isOperationalIntelligenceTab &&
    !isTabSpecificWorkspace;
  const upcomingEngagement = pickNextUpcomingEngagement(data?.engagements ?? []);
  const prepareEngagementHref = upcomingEngagement
    ? buildEngagementPrepareForMeetingHref(upcomingEngagement.id)
    : null;

  const providerActionsMenu = readOnly ? null : (
    <ProviderActionsMenu
      providerId={providerId}
      contact={provider}
      engagements={data.engagements}
      cases={data.cases}
      activityTimeline={data.activity_timeline}
      clinicalDiscoveryAnswers={data.clinical_discovery_answers}
      editHref={editProviderHref}
      archived={providerArchived}
      hiddenFromProviders={hiddenFromProviders}
      onProviderUpdated={() => load()}
      onProviderRemoved={() => router.push("/portal/sales/providers")}
    />
  );

  return (
    <div
      className={`provider-profile-root provider-workspace-page${readOnly ? " provider-profile-root--admin-readonly" : ""}${isMobile ? " provider-profile-root--mobile" : ""}${tab === "intelligence" ? " provider-profile-root--intelligence-tab" : ""}${tab === "cases" ? " provider-profile-root--cases-tab" : ""}${tab === "engagements" ? " provider-profile-root--engagements-tab" : ""}${isMissionMode ? " provider-profile-root--mission-mode" : ""}${isFieldExecution ? " provider-profile-root--field-execution" : ""}${isCommandCenter ? " provider-profile-root--command-center" : ""}${isOperationsWorkspace ? " provider-profile-root--operations" : ""}`}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `${missionControlCss}\n${providerProfileCss}\n${providerTabSectionHeaderCss}\n${providerCommandCenterCss}\n${providerCommandHeaderCss}\n${providerDetailVisualCss}\n${providerOverviewNarrativeCss}\n${providerOverviewCommandCenterCss}\n${providerOverviewBodyCss}\n${providerMissionQuickEditCss}\n${providerAccountUnderstandingCss}\n${providerOperationalIntelligenceCss}\n${providerIntelligenceMissionCss}\n${providerIntelligencePageCss}\n${intelligenceItemDetailCss}\n${providerOperationsWorkspaceCss}\n${providerOperationalReadinessCardCss}\n${providerDetailMobileCss}\n${providerMobileTabNavCss}\n${providerMissionModeCss}\n${providerFieldTimeRiskCss}\n${providerFieldExecutionCss}${readOnly ? `\n${ADMIN_READONLY_PROVIDER_CSS}` : ""}`,
        }}
      />

      <div
        className={`provider-profile-sticky${tab === "intelligence" && !isMobile ? " provider-profile-sticky--intelligence" : ""}`}
      >
        <div className="provider-profile-mobile-chrome">
          {readOnly ? (
            <div className="provider-profile-admin-readonly-banner" role="status">
              Read-only admin view — same Sales Command layout reps see. Editing is disabled.
            </div>
          ) : null}
          <header
            className="provider-profile-header provider-profile-header--mission"
          >
            <Link href={backHref} className="provider-profile-back">
              {backLabel}
            </Link>
            <ProviderDetailHeader
              data={data}
              providerId={providerId}
              displayName={name}
              accountId={accountId}
              newEngagementHref={readOnly ? undefined : newEngagementHref}
              compact={isMobile}
              engagementsLoading={engagementsLoading}
              suppressActivityLine={isCommandCenter || isOperationalIntelligenceTab}
              actionsSlot={providerActionsMenu}
              onOpenObservationApproval={
                readOnly
                  ? undefined
                  : () => {
                      setObservationApprovalError(null);
                      setObservationApprovalOpen(true);
                    }
              }
              onSalesTrackChange={readOnly ? undefined : (track) => void patchSalesTrack(track)}
              salesTrackSaving={savingCrmStatus}
            />
            {showProviderLevelSummaryChrome && !readOnly ? (
              <ProviderOperationalReadinessSummaryBar
                data={data}
                providerId={providerId}
                showFieldTimeRisk={false}
                onOpenIntelligence={(sectionId) =>
                  sectionId ? openIntelligenceSection(sectionId) : setTab("intelligence")
                }
              />
            ) : null}
            {showProviderLevelSummaryChrome && !readOnly ? (
              <ProviderWhatMattersNow
                data={data}
                providerId={providerId}
                newEngagementHref={newEngagementHref}
                intelligenceHref={intelligenceHref}
                createOpportunityHref={createOpportunityHref}
                showNextAction={!isMobile}
              />
            ) : null}
            {showProviderLevelSummaryChrome && !readOnly ? (
              <ProviderPrimaryActionRow
                newEngagementHref={newEngagementHref}
                newCaseHref={newCaseHref}
                createOpportunityHref={createOpportunityHref}
                noteHref={noteHref}
                onCaptureIntelligence={openCaptureProviderIntelligence}
              />
            ) : null}
          </header>

        </div>

        {isMobile ? (
          <ProviderMobileTabNav activeTab={tab} onSelect={setTab} />
        ) : (
          <nav className="provider-profile-tabs" aria-label="Provider sections">
            {PROVIDER_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`provider-profile-tab${tab === t.id ? " provider-profile-tab--active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </div>

      <main className="provider-profile-body">
        {tab === "deploy" ? (
          <ProviderFieldExecutionMode
            contact={provider}
            planning={planning}
            relationshipStage={relationshipStage}
            engagements={data.engagements}
            opportunities={data.opportunities}
            cases={data.cases}
            relatedContacts={data.related_contacts}
            newEngagementHref={newEngagementHref}
            prepareEngagementHref={prepareEngagementHref}
            intelligenceHref={intelligenceHref}
            onCapture={handleDeployCapture}
            onManageContacts={() => setManageOpen(true)}
          />
        ) : null}

        {tab === "briefing" ? (
          <ProviderMissionMode
            data={data}
            providerId={providerId}
            intelligenceHref={intelligenceHref}
            newEngagementHref={newEngagementHref}
            activeTouch={fieldBriefingActiveTouch}
            onLogFieldUpdate={openCaptureProviderIntelligence}
            onStartDictation={openCaptureProviderIntelligence}
            showTouchPicker
          />
        ) : null}

        {tab === "operations" ? (
          <ProviderOperationsWorkspace
            data={data}
            providerId={providerId}
            newEngagementHref={newEngagementHref}
            newCaseHref={newCaseHref}
            noteHref={noteHref}
            intelligenceHref={intelligenceHref}
            createOpportunityHref={createOpportunityHref}
            onOpenIntelligence={(sectionId, dbKey) => {
              if (sectionId) handleDeployCapture(sectionId, dbKey);
              else setTab("intelligence");
            }}
            onCaptureRequirementField={(sectionId, dbKey) => handleDeployCapture(sectionId, dbKey)}
            onLogFieldUpdate={openCaptureProviderIntelligence}
            onManageContacts={() => setManageOpen(true)}
            onRefreshProvider={load}
          />
        ) : null}

        {tab === "overview" ? (
          <ProviderProfileOverview
            data={data}
            providerId={providerId}
            newEngagementHref={newEngagementHref}
            newCaseHref={newCaseHref}
            noteHref={noteHref}
            intelligenceHref={intelligenceHref}
            createOpportunityHref={createOpportunityHref}
            onCrmStatusChange={(status) => void patchCrmStatus(status)}
            savingCrmStatus={savingCrmStatus}
            activityLoading={activityLoading}
            engagementsLoading={engagementsLoading}
            onOpenIntelligence={() => {
              router.push(appendProviderDiscoveryMappingParams(intelligenceHref));
            }}
            onCaptureRequirementField={(_sectionId, dbKey) => {
              const signalId = discoverySignalIdForDbKey(dbKey);
              router.push(
                buildProviderDiscoveryMappingHref({
                  providerId,
                  signalId: signalId ?? undefined,
                }),
              );
            }}
            onManageContacts={() => setManageOpen(true)}
            onRefreshProvider={load}
            onProviderUpdated={mergeProviderUpdate}
            onEngagementsUpdated={mergeEngagementsUpdate}
            debriefNarrativeContext={data.debrief_narrative_context ?? null}
            onLogFieldUpdate={openProviderFieldNoteCapture}
          />
        ) : null}

        {tab === "intelligence" ? (
          <>
            {fromCaseHref ? (
              <div className="pib-intel-from-case-banner" role="status">
                From{" "}
                <Link href={fromCaseHref} className="pov-cc-summary__link">
                  observation case
                </Link>
                — updates apply to all cases for this provider.
              </div>
            ) : null}
            <ProviderProfilePlanningAccordion
              providerId={providerId}
              accountId={accountId || null}
              organizationName={data.primary_organization?.name ?? null}
              organizationBaseline={data.organization_intelligence_baseline ?? null}
              relatedContacts={data.related_contacts ?? []}
              provider={provider}
              planning={planning}
              specialty={data.specialty}
              relationshipStage={String(provider.provider_relationship_stage ?? "")}
              engagements={data.engagements}
              opportunities={data.opportunities}
              cases={data.cases}
              suppressProgressBar={Boolean(planning)}
              planDraft={planDraft}
              setPlanDraft={setPlanDraft}
              saving={savingPlanning}
              lastSavedAt={planningLastSavedAt}
              autosaveError={planAutosaveError}
              onSaveDraft={async () => {
                setPlanAutosaveError(null);
                await savePlanning();
              }}
              onClinicalDiscoverySaved={(j) => {
                setData((prev) =>
                  prev
                    ? {
                        ...prev,
                        provider: j.provider
                          ? {
                              ...prev.provider,
                              ...j.provider,
                              clinical_discovery_answers:
                                j.clinical_discovery_answers ?? prev.clinical_discovery_answers,
                            }
                          : prev.provider,
                        clinical_discovery_answers:
                          j.clinical_discovery_answers ?? prev.clinical_discovery_answers,
                        planning_completion: j.planning_completion ?? prev.planning_completion,
                      }
                    : prev,
                );
              }}
              initialOpenSection={initialPlanningSection}
              onLogUpdate={openCaptureProviderIntelligence}
              onRefreshProvider={load}
              activityTimeline={data.activity_timeline}
              clinicalDiscoveryAnswers={data.clinical_discovery_answers}
              universalFactsReadModel={data.universal_facts_read_model ?? null}
              providerAiSummary={data.provider_ai_summary ?? null}
              debriefNarrativeContext={data.debrief_narrative_context ?? null}
            />
          </>
        ) : null}

        {tab === "engagements" ? (
          <ProviderProfileEngagements
            engagements={data.engagements || []}
            newEngagementHref={newEngagementHref}
            providerId={providerId}
            loading={engagementsLoading}
          />
        ) : null}

        {tab === "cases" ? (
          <ProviderCasesTab cases={data.cases || []} addCaseHref={newCaseHref} />
        ) : null}

        {tab === "opportunities" ? (
          <section className="provider-tab-workspace">
            <ProviderTabSectionHeader
              subtitle={`${(data.opportunities || []).length} evaluations`}
              action={{ label: OPPORTUNITY_UI.createButtonShort, href: createOpportunityHref }}
            />
            <ProviderCompactOppList opps={data.opportunities || []} empty={OPPORTUNITY_UI.emptyLinked} />
            <Link href={createOpportunityHref} className="provider-overview-link-row" style={sc.linkBrand}>
              {OPPORTUNITY_UI.browseAll}
            </Link>
          </section>
        ) : null}

        {tab === "activity" ? (
          <div className="provider-tab-workspace">
            <ProviderTabSectionHeader
              title={PROVIDER_FIELD_OPS_TAB_LABELS.activity}
              subtitle={PROVIDER_FIELD_OPS_TAB_SUBTITLES.activity}
              action={
                readOnly
                  ? undefined
                  : {
                      label: PROVIDER_FIELD_OPS_CTA.addFieldNote,
                      onClick: openProviderFieldNoteCapture,
                    }
              }
            />
            <ProviderProfileActivityFeed
              providerId={providerId}
              provider={provider}
              timeline={data.activity_timeline || []}
              onReload={() => void load()}
              noteFocus={noteFocus}
            />
          </div>
        ) : null}
      </main>

      {!readOnly ? (
        <>
      <ProviderQuickSignalCaptureDrawer
        open={Boolean(deployCaptureTarget)}
        target={deployCaptureTarget}
        contact={provider}
        providerId={providerId}
        organizationId={accountId || null}
        organizationName={primaryOrg?.name ?? null}
        relatedContacts={data.related_contacts ?? []}
        relationshipStage={relationshipStage}
        engagements={data.engagements ?? []}
        planning={planning}
        planDraft={planDraft}
        setPlanDraft={setPlanDraft}
        saving={savingPlanning}
        saveError={planAutosaveError}
        onSave={async () => {
          setPlanAutosaveError(null);
          await savePlanning();
        }}
        onProviderUpdated={() => void load()}
        onClose={() => setDeployCaptureTarget(null)}
      />

      <ObservationApprovalModal
        open={observationApprovalOpen}
        busy={observationApprovalBusy}
        error={observationApprovalError}
        currentStatus={resolveObservationStatusFromContact(provider)}
        preferScheduleObservation={false}
        onClose={() => {
          if (!observationApprovalBusy) setObservationApprovalOpen(false);
        }}
        onSave={async (input: {
          status: ObservationStatusChoice;
          approvedBy: string;
          approvalNote: string;
          nextStep: "schedule_observation" | "finish";
        }) => {
          setObservationApprovalBusy(true);
          setObservationApprovalError(null);
          try {
            const res = await fetch(
              `/api/portal/sales/providers/${encodeURIComponent(providerId)}/observation-approval`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: input.status,
                  approved_by: input.approvedBy.trim() || null,
                  approval_note: input.approvalNote.trim() || null,
                  next_step: input.nextStep,
                }),
              },
            );
            const payload = (await res.json().catch(() => null)) as {
              ok?: boolean;
              error?: string;
              provider?: Record<string, unknown>;
            };
            if (!res.ok || !payload?.ok) {
              throw new Error(payload?.error || "Could not save observation approval.");
            }
            if (payload.provider) {
              setData((prev) =>
                prev?.provider
                  ? { ...prev, provider: { ...prev.provider, ...payload.provider } }
                  : prev,
              );
            } else {
              await load();
            }
            setObservationApprovalOpen(false);
            if (input.status === "permission_confirmed" && input.nextStep === "schedule_observation") {
              router.push(
                buildProviderObservationCaseHref({
                  providerId,
                  accountId: accountId || null,
                }),
              );
            }
          } catch (err) {
            setObservationApprovalError(
              userFacingError(err, "Could not save observation approval."),
            );
          } finally {
            setObservationApprovalBusy(false);
          }
        }}
      />

      {manageOpen ? (
        <ManageSupportContactsModal
          doctorId={providerId}
          contextOrganizationId={accountId || null}
          preferredRelationshipType="scheduler"
          dialogTitle="Add support contact"
          onClose={() => setManageOpen(false)}
          onChanged={() => void load()}
          onSupportContactCreatedAndLinked={() => void load()}
        />
      ) : null}
        </>
      ) : null}
    </div>
  );
}
