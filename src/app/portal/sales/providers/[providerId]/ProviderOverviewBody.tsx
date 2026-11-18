"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProviderOverviewNarrative } from "@/lib/surgical-sales/buildProviderOverviewNarrative";
import { buildProviderOverviewBody } from "@/lib/surgical-sales/buildProviderOverviewBody";
import {
  buildProviderOverviewMissionStatus,
  hasActiveProviderOverviewEngagement,
} from "@/lib/surgical-sales/buildProviderOverviewMissionStatus";
import { resolveObservationStatusFromContact } from "@/lib/surgical-sales/observationStatus";
import { buildProviderOverviewHref } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { SALES_PATHWAY_STAGE_OBJECTIVES } from "@/lib/surgical-sales/salesPathwayCanonical";
import type { ObservationStatusChoice } from "@/lib/surgical-sales/observationStatus";
import { ObservationApprovalModal } from "./ObservationApprovalModal";
import { PathwayStageUnlockHintModal } from "./PathwayStageUnlockHintModal";
import { ProviderOverviewPathwayTracker } from "./ProviderOverviewPathwayTracker";
import { MissionBoardDebriefStatusModal } from "../MissionBoardDebriefStatusModal";
import { buildProviderOverviewPathwayDebriefProviderRow } from "@/lib/surgical-sales/providerOverviewPathwayDebriefProvider";
import { ProviderOverviewMissionCard } from "./ProviderOverviewMissionCard";
import { ProviderOverviewActivityHistory } from "./ProviderOverviewActivityHistory";
import { ProviderOverviewWhatMattersSummary } from "./ProviderOverviewWhatMattersSummary";
import {
  ProviderOperationalStatusRail,
  buildNewProviderStatusRailCopy,
} from "./ProviderOperationalStatusRail";
import type { ProviderProfilePayload } from "./providerProfileTypes";
import type { ProviderDebriefNarrativeContext } from "@/lib/surgical-sales/engagements/loadLatestProviderDebriefNarrative";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  appendProviderDiscoveryMappingParams,
  discoverySignalIdForDbKey,
} from "@/lib/surgical-sales/providerDiscoveryMappingNavigation";
import {
  resolveProviderOverviewWorkflowCta,
  type ProviderOverviewWorkflowCtaAction,
} from "@/lib/surgical-sales/providerOverviewWorkflowCta";
import { buildProviderObservationCaseHref } from "@/lib/surgical-sales/providerDirectoryLinks";
import { ProviderOverviewFocusedActionHost } from "./ProviderOverviewFocusedActionHost";
import { ProviderOverviewFollowUpItems } from "./ProviderOverviewFollowUpItems";
import {
  resolveOverviewFocusedModal,
  type ProviderOverviewFocusedModal,
} from "@/lib/surgical-sales/providerOverviewFocusedActionRouting";
import type { ProviderOverviewExecutionAction } from "@/lib/surgical-sales/buildProviderOverviewExecutionCtas";
import { activateMissionBoardOutcomesTracking } from "@/lib/surgical-sales/missionBoardCommitmentOutcomesClient";
import { isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";
import { userFacingError } from "@/lib/errors/userFacingError";

type ObservationApprovalSaveErrorPayload = {
  error?: string | { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
} | null;

function extractObservationApprovalSaveError(payload: ObservationApprovalSaveErrorPayload): string {
  const fallback = "Could not save observation approval.";
  if (!payload?.error) return fallback;
  if (typeof payload.error === "string") return payload.error;
  const formError = payload.error.formErrors?.[0];
  if (formError) return formError;
  const fieldError = Object.values(payload.error.fieldErrors ?? {})[0]?.[0];
  if (fieldError) return fieldError;
  return fallback;
}

export function ProviderOverviewBody({
  narrative,
  contact,
  providerId,
  displayName,
  specialty,
  intelligenceHref,
  briefingHref,
  newEngagementHref,
  activityHref: _activityHref,
  timeline: _timeline,
  engagements,
  opportunities,
  cases,
  planning,
  organizationName,
  organizationId: _organizationId,
  organizationLinks: _organizationLinks = [],
  organizationBaseline,
  relatedContacts = [],
  onOpenIntelligence: _onOpenIntelligence,
  onCaptureRequirementField: _onCaptureRequirementField,
  onManageContacts,
  onRefreshProvider: _onRefreshProvider,
  onProviderUpdated: _onProviderUpdated,
  onEngagementsUpdated,
  debriefNarrativeContext,
  onLogFieldUpdate,
  showStatusRail = false,
  newCaseHref,
  createOpportunityHref,
  noteHref,
  onDismissStatusRail,
  overviewData,
  activityLoading = false,
}: {
  narrative: ProviderOverviewNarrative;
  contact: Record<string, unknown>;
  providerId: string;
  displayName: string;
  specialty?: string | null;
  organizationName?: string | null;
  organizationId?: string | null;
  organizationLinks?: Array<Record<string, unknown>>;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  relatedContacts?: Record<string, unknown>[];
  intelligenceHref: string;
  briefingHref: string;
  newEngagementHref: string;
  activityHref: string;
  timeline?: Array<Record<string, unknown>>;
  engagements?: ProviderProfilePayload["engagements"];
  opportunities?: ProviderProfilePayload["opportunities"];
  cases?: ProviderProfilePayload["cases"];
  planning?: ProviderProfilePayload["planning_completion"];
  onOpenIntelligence?: (sectionId?: ProviderIntelligenceSectionId, dbKey?: string) => void;
  onCaptureRequirementField?: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
  onManageContacts?: () => void;
  onRefreshProvider?: () => void | Promise<void>;
  onProviderUpdated?: (provider: Record<string, unknown>) => void;
  onEngagementsUpdated?: (engagements: ProviderEngagementSummary[]) => void;
  debriefNarrativeContext?: ProviderDebriefNarrativeContext | null;
  onLogFieldUpdate: () => void;
  showStatusRail?: boolean;
  newCaseHref?: string;
  createOpportunityHref?: string;
  noteHref?: string;
  onDismissStatusRail?: () => void;
  overviewData?: ProviderProfilePayload;
  activityLoading?: boolean;
}) {
  const router = useRouter();
  const deepLinkHandledRef = useRef(false);
  const [observationApprovalOpen, setObservationApprovalOpen] = useState(false);
  const [observationApprovalBusy, setObservationApprovalBusy] = useState(false);
  const [observationApprovalError, setObservationApprovalError] = useState<string | null>(null);
  const [observationApprovalPreferSchedule, setObservationApprovalPreferSchedule] = useState(false);
  const [pathwayUnlockHint, setPathwayUnlockHint] = useState<{ title: string; message: string } | null>(null);
  const [debriefStatusOpen, setDebriefStatusOpen] = useState(false);
  const [focusedModal, setFocusedModal] = useState<ProviderOverviewFocusedModal | null>(null);
  const moveToOutcomesBusyRef = useRef(false);

  const openObservationApproval = useCallback((options?: { preferScheduleObservation?: boolean }) => {
    setObservationApprovalError(null);
    setObservationApprovalPreferSchedule(Boolean(options?.preferScheduleObservation));
    setObservationApprovalOpen(true);
  }, []);

  const openDebriefStatus = useCallback(() => {
    setDebriefStatusOpen(true);
  }, []);

  const handleExecuteFocusedAction = useCallback(
    (action: ProviderOverviewExecutionAction) => {
      const modal = resolveOverviewFocusedModal(action);
      if (!modal) return;
      if (modal === "observationApproval") {
        openObservationApproval();
        return;
      }
      if (modal === "debriefStatus") {
        openDebriefStatus();
        return;
      }
      if (modal === "moveToOutcomes") {
        if (moveToOutcomesBusyRef.current) return;
        moveToOutcomesBusyRef.current = true;
        void (async () => {
          try {
            const result = await activateMissionBoardOutcomesTracking(providerId);
            if (result.ok) await _onRefreshProvider?.();
          } finally {
            moveToOutcomesBusyRef.current = false;
          }
        })();
        return;
      }
      setFocusedModal(modal);
    },
    [openDebriefStatus, openObservationApproval, providerId, _onRefreshProvider],
  );

  const openIntelligenceTab = useCallback(
    (signalId?: DiscoveryStructuredSignalId | null) => {
      const href = appendProviderDiscoveryMappingParams(intelligenceHref, { signalId });
      router.push(href);
    },
    [intelligenceHref, router],
  );

  const handleWorkflowCta = useCallback(
    (action: ProviderOverviewWorkflowCtaAction) => {
      switch (action.type) {
        case "open_discovery_mapping":
          openIntelligenceTab(action.signalId ?? null);
          return;
        case "coordinate_observation":
        case "plan_engagement":
        case "external_link":
          if (action.href) router.push(action.href);
          return;
        default:
          return;
      }
    },
    [openIntelligenceTab, router],
  );

  useEffect(() => {
    if (typeof window === "undefined" || deepLinkHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const workflow = params.get("workflow");
    const field = params.get("field");
    if (!workflow) return;

    deepLinkHandledRef.current = true;

    if (workflow === "scheduling_owner") {
      setFocusedModal("scheduler");
    } else if (workflow === "observation_status") {
      openObservationApproval();
    } else if (workflow === "capture_field" && field) {
      openIntelligenceTab(discoverySignalIdForDbKey(field));
    } else {
      const action = resolveProviderOverviewWorkflowCta({
        label: "",
        href: `?tab=overview&workflow=${encodeURIComponent(workflow)}${field ? `&field=${encodeURIComponent(field)}` : ""}`,
        contact,
      });
      handleWorkflowCta(action);
    }

    params.delete("workflow");
    params.delete("field");
    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }, [contact, handleWorkflowCta, openIntelligenceTab, openObservationApproval]);

  const body = useMemo(
    () =>
      buildProviderOverviewBody({
        narrative,
        contact,
        providerId,
        intelligenceHref,
        briefingHref,
        newEngagementHref,
        activityHref: _activityHref,
        engagements,
        opportunities,
        cases,
        planning,
        organizationName,
        organizationBaseline,
        timeline: _timeline,
      }),
    [
      narrative,
      contact,
      providerId,
      intelligenceHref,
      briefingHref,
      newEngagementHref,
      _activityHref,
      engagements,
      opportunities,
      cases,
      planning,
      organizationName,
      organizationBaseline,
      _timeline,
    ],
  );

  const statusRail = showStatusRail ? buildNewProviderStatusRailCopy(engagements) : null;

  const currentGoal =
    body.pathwayStage.stageObjective?.trim() ||
    SALES_PATHWAY_STAGE_OBJECTIVES[body.pathwayStage.stageId] ||
    body.tacticalHero.missionLine;

  const missionStatus = useMemo(
    () =>
      buildProviderOverviewMissionStatus({
        contact,
        providerId,
        planning,
        cases,
        opportunities,
        relationshipStage: String(contact.provider_relationship_stage ?? "early_discovery"),
        engagements,
        workflow: body.workflowAction,
        upcoming: body.upcomingTouch,
        currentGoal,
        nextBestAction: body.nextBestAction,
        hero: body.tacticalHero,
        newEngagementHref,
        completedObservationCount: body.completedObservationCount,
      }),
    [
      contact,
      providerId,
      planning,
      cases,
      opportunities,
      engagements,
      body.workflowAction,
      body.upcomingTouch,
      body.completedObservationCount,
      currentGoal,
      body.nextBestAction,
      body.tacticalHero,
      newEngagementHref,
    ],
  );

  const pathwayGateInput = useMemo(
    () => ({
      contact,
      engagements,
      cases,
    }),
    [contact, engagements, cases],
  );

  const debriefProviderRow = useMemo(
    () =>
      buildProviderOverviewPathwayDebriefProviderRow({
        providerId,
        contact,
        engagements,
        organizationName,
        organizationId: _organizationId,
      }),
    [providerId, contact, engagements, organizationName, _organizationId],
  );

  const observationStatus = useMemo(
    () => resolveObservationStatusFromContact(contact),
    [contact],
  );
  const isSalesCustomer = body.isSalesCustomer || isProviderSalesCustomer(contact);
  const showPathwayTracker = !isSalesCustomer;
  const showFallbackMissionCard =
    !isSalesCustomer && !hasActiveProviderOverviewEngagement(missionStatus);


  const handleSaveObservationApproval = useCallback(
    async (input: {
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
        const payload = (await res.json().catch(() => null)) as ObservationApprovalSaveErrorPayload & {
          ok?: boolean;
          provider?: Record<string, unknown>;
        };
        if (!res.ok || !payload?.ok) {
          const err = extractObservationApprovalSaveError(payload);
          throw new Error(err);
        }
        if (payload.provider) {
          _onProviderUpdated?.(payload.provider);
        } else {
          await _onRefreshProvider?.();
        }
        setObservationApprovalOpen(false);
        if (input.status === "permission_confirmed" && input.nextStep === "schedule_observation") {
          const observationCaseHref = buildProviderObservationCaseHref({
            providerId,
            accountId: String(contact.account_id ?? contact.organization_id ?? ""),
          });
          router.push(observationCaseHref);
        }
      } catch (err) {
        setObservationApprovalError(userFacingError(err, "Could not save observation approval."));
      } finally {
        setObservationApprovalBusy(false);
      }
    },
    [_onRefreshProvider, _onProviderUpdated, contact, providerId, router],
  );

  return (
    <div
      className="pov-body pov-body--command-center mc-workspace mc-workspace--provider-overview"
      data-stage={body.pathwayStage.stageId}
      data-mc-stage={body.pathwayStage.stageId}
      aria-label={PROVIDER_FIELD_OPS_SECTION.missionOverviewAria}
      data-testid="provider-overview-body"
    >
      {showStatusRail && statusRail && newCaseHref && createOpportunityHref && noteHref ? (
        <ProviderOperationalStatusRail
          headline={statusRail.headline}
          detail={statusRail.detail}
          newEngagementHref={newEngagementHref}
          newCaseHref={newCaseHref}
          createOpportunityHref={createOpportunityHref}
          noteHref={noteHref}
          onLogFieldIntel={onLogFieldUpdate}
          onDismiss={onDismissStatusRail}
        />
      ) : null}

      <div className="pov-cc pov-cc--compact" data-testid="pov-main-panel">
        <section
          className="pov-cc-mission-deck pov-overview-pathway"
          aria-label={isSalesCustomer ? "Customer relationship" : PROVIDER_FIELD_OPS_SECTION.pathwayTimeline}
          data-testid={isSalesCustomer ? "pov-customer-banner" : "pov-pathway-timeline"}
        >
          {showPathwayTracker ? (
            <div className="pov-cc-pathway--deck">
              <p className="pov-cc-pathway__kicker">360 Medical Sales Pathway</p>
              <ProviderOverviewPathwayTracker
                timeline={body.pathwayTimeline}
                activeStageId={body.pathwayStage.stageId}
                gateInput={pathwayGateInput}
                onOpenObservationApproval={openObservationApproval}
                onOpenDebriefStatus={openDebriefStatus}
                onShowUnlockHint={setPathwayUnlockHint}
              />
            </div>
          ) : (
            <div className="pov-cc-pathway--deck pov-cc-pathway--customer">
              <p className="pov-cc-pathway__kicker">Relationship</p>
              <h2 className="pov-customer-banner__title">Customer</h2>
              <p className="pov-customer-banner__copy">
                This provider already moved through the sales pathway. Pathway tracking and next-step
                suggestions stay off.
              </p>
            </div>
          )}
        </section>

        {hasActiveProviderOverviewEngagement(missionStatus) ? (
          <ProviderOverviewMissionCard
            missionStatus={missionStatus}
            stageId={body.pathwayStage.stageId}
            contact={contact}
            providerId={providerId}
            newEngagementHref={newEngagementHref}
            noteHref={noteHref ?? _activityHref}
            intelligenceHref={intelligenceHref}
            engagements={engagements}
            cases={cases}
            onOpenObservationApproval={openObservationApproval}
            onExecuteFocusedAction={handleExecuteFocusedAction}
            onEngagementsRefresh={_onRefreshProvider}
            providerOverviewHref={buildProviderOverviewHref(providerId)}
          />
        ) : null}

        {showFallbackMissionCard ? (
          <ProviderOverviewMissionCard
            missionStatus={missionStatus}
            stageId={body.pathwayStage.stageId}
            contact={contact}
            providerId={providerId}
            newEngagementHref={newEngagementHref}
            noteHref={noteHref ?? _activityHref}
            intelligenceHref={intelligenceHref}
            engagements={engagements}
            cases={cases}
            onOpenObservationApproval={openObservationApproval}
            onExecuteFocusedAction={handleExecuteFocusedAction}
            onEngagementsRefresh={_onRefreshProvider}
            providerOverviewHref={buildProviderOverviewHref(providerId)}
          />
        ) : null}

        {overviewData ? (
          <ProviderOverviewWhatMattersSummary
            data={overviewData}
            providerId={providerId}
            newEngagementHref={newEngagementHref}
            intelligenceHref={intelligenceHref}
            createOpportunityHref={createOpportunityHref}
          />
        ) : null}

        <ProviderOverviewActivityHistory
          timeline={_timeline}
          engagements={engagements}
          contact={contact}
          organizationLinks={_organizationLinks}
          activityHref={_activityHref}
          loading={activityLoading}
        />

        <ProviderOverviewFollowUpItems
          providerId={providerId}
          engagements={engagements}
          debriefNarrativeContext={debriefNarrativeContext}
          onEngagementsUpdated={onEngagementsUpdated}
          onProviderUpdated={_onProviderUpdated}
        />

      </div>

      <ObservationApprovalModal
        open={observationApprovalOpen}
        busy={observationApprovalBusy}
        error={observationApprovalError}
        currentStatus={observationStatus}
        preferScheduleObservation={observationApprovalPreferSchedule}
        onClose={() => {
          if (!observationApprovalBusy) setObservationApprovalOpen(false);
        }}
        onSave={handleSaveObservationApproval}
      />

      <PathwayStageUnlockHintModal
        open={Boolean(pathwayUnlockHint)}
        title={pathwayUnlockHint?.title ?? ""}
        message={pathwayUnlockHint?.message ?? ""}
        onClose={() => setPathwayUnlockHint(null)}
      />

      {debriefStatusOpen ? (
        <MissionBoardDebriefStatusModal
          provider={debriefProviderRow}
          onClose={() => setDebriefStatusOpen(false)}
          onLaunched={async () => {
            setDebriefStatusOpen(false);
            await _onRefreshProvider?.();
          }}
          onCompleted={async () => {
            setDebriefStatusOpen(false);
            await _onRefreshProvider?.();
          }}
        />
      ) : null}

      <ProviderOverviewFocusedActionHost
        activeModal={focusedModal}
        contact={contact}
        providerId={providerId}
        providerLabel={displayName}
        organizationId={_organizationId ?? null}
        organizationName={organizationName}
        relatedContacts={relatedContacts}
        engagements={engagements}
        missionStatus={missionStatus}
        providerOverviewHref={buildProviderOverviewHref(providerId)}
        onClose={() => setFocusedModal(null)}
        onRefresh={_onRefreshProvider}
        onProviderUpdated={_onProviderUpdated}
      />

    </div>
  );
}
