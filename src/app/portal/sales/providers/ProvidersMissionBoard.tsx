"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ManageSupportContactsModal from "@/components/sales/ManageSupportContactsModal";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import type { ProviderObservationCasePreview } from "@/lib/surgical-sales/providerObservationCaseCollection";
import type { ProviderMissionMetricId } from "@/lib/surgical-sales/providerMissionPortfolio";
import { providerMissionMetricDefinition } from "@/lib/surgical-sales/providerMissionPortfolio";
import {
  groupProvidersByMissionBoardColumn,
  PROVIDER_MISSION_BOARD_COLUMNS,
} from "@/lib/surgical-sales/providerMissionBoard";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import { nextSalesPathwayStage } from "@/lib/surgical-sales/pathway/salesPathwayRules";
import type { MissionBoardCardSecondaryAction } from "@/lib/surgical-sales/deriveMissionBoardCardActions";
import {
  missionBoardDropNeedsServerValidation,
  missionBoardDropTargetPreview,
  providerPathwayGateInput,
  resolveMissionBoardStageDrop,
  resolveProviderCurrentMissionStage,
  type MissionBoardDropBlockerAction,
  type MissionBoardDropResolution,
} from "@/lib/surgical-sales/missionBoardStageDrop";
import {
  resolveObservationStatusFromContact,
  observationStatusGrantsMissionBoardObservationAdvance,
  type ObservationStatusChoice,
} from "@/lib/surgical-sales/observationStatus";
import {
  MissionBoardDropFeedbackModal,
  MissionBoardToast,
} from "./MissionBoardDropFeedbackModal";
import { MissionBoardFastIntroCallModal } from "./MissionBoardFastIntroCallModal";
import { MissionBoardFastDebriefModal } from "./MissionBoardFastDebriefModal";
import { MissionBoardAddCaseModal } from "./MissionBoardAddCaseModal";
import { MissionBoardObservationStatusModal } from "./MissionBoardObservationStatusModal";
import { MissionBoardRescheduleObservationModal } from "./MissionBoardRescheduleObservationModal";
import { MissionBoardObservationQueueModal } from "./MissionBoardObservationQueueModal";
import { MissionBoardObservationDictateCompleteModal } from "./MissionBoardObservationDictateCompleteModal";
import { MissionBoardDebriefLauncherModal } from "./MissionBoardDebriefLauncherModal";
import { MissionBoardDebriefStatusModal } from "./MissionBoardDebriefStatusModal";
import {
  MissionBoardDebriefQuickCompleteModal,
  type MissionBoardDebriefQuickCompleteMode,
} from "./MissionBoardDebriefQuickCompleteModal";
import { MissionBoardEvaluationPathModal } from "./MissionBoardEvaluationPathModal";
import { MissionBoardCommitmentModal } from "./MissionBoardCommitmentModal";
import { MissionBoardOutcomeUpdateModal } from "./MissionBoardOutcomeUpdateModal";
import { MissionBoardProductUseModal } from "./MissionBoardProductUseModal";
import {
  activateMissionBoardOutcomesTracking,
  markMissionBoardEvaluationSuccessful,
} from "@/lib/surgical-sales/missionBoardCommitmentOutcomesClient";
import type { MissionBoardCaseType } from "@/lib/surgical-sales/missionBoardFastObservation";
import { ProvidersMissionBoardCard } from "./ProvidersMissionBoardCard";
import {
  buildCaptureIntelligenceOpenContext,
  useCaptureIntelligence,
} from "@/components/sales/captureIntelligence/CaptureIntelligenceHost";
import { buildProviderMissionBoardCardModel } from "@/lib/surgical-sales/buildProviderMissionBoardCardModel";
import { markMissionBoardObservationComplete } from "@/lib/surgical-sales/missionBoardObservationCaseActions";
import { providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";
import { runMissionBoardDebriefLauncherAction } from "@/lib/surgical-sales/missionBoardDebriefLauncherClient";
import {
  finalizeMissionBoardIntroCallDebriefAfterCapture,
  markMissionBoardIntroCallCompleteWithoutDictation,
  MISSION_BOARD_INTRO_CALL_DICTATE_COMPLETE_SUCCESS_TOAST,
} from "@/lib/surgical-sales/missionBoardIntroCallDictateComplete";
import { beginEngagementCallClient } from "@/lib/surgical-sales/engagements/beginEngagementCallClient";
import { resolveProviderEvaluationEngagementPreview } from "@/lib/surgical-sales/missionBoardEvaluationEngagement";
import { buildEngagementActiveHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import { userFacingError } from "@/lib/errors/userFacingError";

type DropApiResponse = {
  ok?: boolean;
  error?: string;
  resolution?: MissionBoardDropResolution;
};

export function ProvidersMissionBoard({
  providers,
  focusMetric = null,
  onRefresh,
}: {
  providers: ProviderDirectoryRow[];
  focusMetric?: ProviderMissionMetricId | null;
  onRefresh?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const capture = useCaptureIntelligence();
  const [localProviders, setLocalProviders] = React.useState<ProviderDirectoryRow[]>(providers);
  const grouped = React.useMemo(() => groupProvidersByMissionBoardColumn(localProviders), [localProviders]);
  const focusColumnId = focusMetric ? providerMissionMetricDefinition(focusMetric).columnId : null;

  const [draggingProvider, setDraggingProvider] = React.useState<ProviderDirectoryRow | null>(null);
  const [hoverColumnId, setHoverColumnId] = React.useState<SalesPathwayStageId | null>(null);
  const [dropBusy, setDropBusy] = React.useState(false);

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [toastDetail, setToastDetail] = React.useState<string | null>(null);
  const [dropModal, setDropModal] = React.useState<{
    title: string;
    message: string;
    actions: MissionBoardDropBlockerAction[];
    provider: ProviderDirectoryRow;
  } | null>(null);

  const [observationModal, setObservationModal] = React.useState<{
    provider: ProviderDirectoryRow;
  } | null>(null);
  const [observationBusy, setObservationBusy] = React.useState(false);
  const [observationError, setObservationError] = React.useState<string | null>(null);

  const [introCallModal, setIntroCallModal] = React.useState<ProviderDirectoryRow | null>(null);
  const [fastDebriefModal, setFastDebriefModal] = React.useState<ProviderDirectoryRow | null>(null);
  const [addCaseModal, setAddCaseModal] = React.useState<{
    provider: ProviderDirectoryRow;
    initialCaseType?: MissionBoardCaseType | null;
  } | null>(null);
  const [rescheduleModal, setRescheduleModal] = React.useState<{
    provider: ProviderDirectoryRow;
    observation: ProviderObservationCasePreview;
  } | null>(null);
  const [observationQueueModal, setObservationQueueModal] = React.useState<ProviderDirectoryRow | null>(null);
  const [dictateCompleteModal, setDictateCompleteModal] = React.useState<{
    provider: ProviderDirectoryRow;
    observation: ProviderObservationCasePreview;
  } | null>(null);
  const [debriefLauncherModal, setDebriefLauncherModal] = React.useState<{
    provider: ProviderDirectoryRow;
    initialPanel?: "default" | "dictate";
  } | null>(null);
  const [debriefStatusModal, setDebriefStatusModal] = React.useState<ProviderDirectoryRow | null>(null);
  const [debriefQuickCompleteModal, setDebriefQuickCompleteModal] = React.useState<{
    provider: ProviderDirectoryRow;
    engagementId: string;
    mode: MissionBoardDebriefQuickCompleteMode;
  } | null>(null);
  const [evaluationPathModal, setEvaluationPathModal] = React.useState<ProviderDirectoryRow | null>(null);
  const [commitmentModal, setCommitmentModal] = React.useState<ProviderDirectoryRow | null>(null);
  const [outcomeUpdateModal, setOutcomeUpdateModal] = React.useState<ProviderDirectoryRow | null>(null);
  const [productUseModal, setProductUseModal] = React.useState<ProviderDirectoryRow | null>(null);
  const [supportContactsModal, setSupportContactsModal] = React.useState<ProviderDirectoryRow | null>(null);
  const [pathwayActionBusy, setPathwayActionBusy] = React.useState(false);
  const [observationCaseBusy, setObservationCaseBusy] = React.useState(false);
  const [selectedMobileProviderId, setSelectedMobileProviderId] = React.useState<string | null>(null);
  const primaryMobileProvider =
    localProviders.find((provider) => provider.id === selectedMobileProviderId) ?? localProviders[0] ?? null;
  const otherMobileProviders = React.useMemo(
    () => localProviders.filter((provider) => provider.id !== primaryMobileProvider?.id),
    [localProviders, primaryMobileProvider?.id],
  );

  React.useEffect(() => {
    setLocalProviders(providers);
  }, [providers]);

  React.useEffect(() => {
    if (!selectedMobileProviderId) return;
    if (localProviders.some((provider) => provider.id === selectedMobileProviderId)) return;
    setSelectedMobileProviderId(null);
  }, [localProviders, selectedMobileProviderId]);

  React.useEffect(() => {
    if (!focusColumnId) return;
    const column = document.querySelector(`[data-mission-column="${focusColumnId}"]`);
    column?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [focusColumnId, localProviders.length]);

  const moveProviderToStage = React.useCallback((providerId: string, stageId: SalesPathwayStageId) => {
    setLocalProviders((current) =>
      current.map((provider) =>
        provider.id === providerId ? { ...provider, relationship_pathway_stage_id: stageId } : provider,
      ),
    );
  }, []);

  const refreshBoardInBackground = React.useCallback(() => {
    void onRefresh?.();
  }, [onRefresh]);


  const handleDictateCapture = React.useCallback(
    (provider: ProviderDirectoryRow) => {
      const model = buildProviderMissionBoardCardModel(provider);
      capture.open(
        buildCaptureIntelligenceOpenContext("mission_board", {
          providerId: model.providerId,
          providerLabel: model.providerName,
          organizationId: provider.primary_organization_id || provider.organization_id || undefined,
          organizationLabel: provider.primary_organization_name || undefined,
          // Stage Dictate is relationship capture; the dedicated debrief
          // launcher declares "debrief" server-side.
          declaredSourceType: "field_note",
        }),
        {
          onSaved: async (result) => {
            setToastMessage(result?.title ?? "Provider updated");
            setToastDetail(result?.detail ?? null);
            await onRefresh?.();
          },
        },
      );
    },
    [capture, onRefresh],
  );

  const handleMarkObservationComplete = React.useCallback(
    async (provider: ProviderDirectoryRow, caseId: string) => {
      if (observationCaseBusy) return;
      setObservationCaseBusy(true);
      try {
        await markMissionBoardObservationComplete(caseId);
        setToastMessage("Observation marked complete");
        setToastDetail(null);
        await onRefresh?.();
      } catch (err) {
        setToastMessage(userFacingError(err, "Could not mark observation complete."));
        setToastDetail(null);
      } finally {
        setObservationCaseBusy(false);
      }
    },
    [observationCaseBusy, onRefresh],
  );

  const handleDictateCompleteObservation = React.useCallback(
    (
      provider: ProviderDirectoryRow,
      observation: ProviderObservationCasePreview,
    ) => {
      if (!observation.caseId || observationCaseBusy) return;
      setObservationQueueModal(null);
      setDictateCompleteModal({ provider, observation });
    },
    [observationCaseBusy],
  );

  const handleDragEnd = React.useCallback(() => {
    setDraggingProvider(null);
    setHoverColumnId(null);
  }, []);

  const saveObservationApprovalForProvider = React.useCallback(
    async (provider: ProviderDirectoryRow, status: ObservationStatusChoice) => {
      const res = await fetch(
        `/api/portal/sales/providers/${encodeURIComponent(provider.id)}/observation-approval`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            next_step: "finish",
          }),
        },
      );
      const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string };
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not save observation status.");
      }
      return status;
    },
    [],
  );

  const runDropResolution = React.useCallback(
    async (
      provider: ProviderDirectoryRow,
      resolution: MissionBoardDropResolution,
      targetStageId?: SalesPathwayStageId,
    ) => {
      switch (resolution.type) {
        case "noop":
          return;
        case "open_observation_approval": {
          setObservationBusy(true);
          setObservationError(null);
          try {
            await saveObservationApprovalForProvider(provider, "permission_confirmed");
            setToastMessage("Observation permission confirmed");
            setToastDetail(null);
            if (targetStageId) moveProviderToStage(provider.id, targetStageId);
            refreshBoardInBackground();
          } catch (err) {
            setToastMessage(
              userFacingError(err, "Could not confirm observation permission."),
            );
            setToastDetail(null);
          } finally {
            setObservationBusy(false);
          }
          return;
        }
        case "open_debrief_status":
          setDebriefStatusModal(provider);
          return;
        case "open_commitment_modal":
          setCommitmentModal(provider);
          return;
        case "activate_outcomes_tracking": {
          setPathwayActionBusy(true);
          try {
            const result = await activateMissionBoardOutcomesTracking(provider.id);
            if (!result.ok) {
              setToastMessage(result.message);
              return;
            }
            setToastMessage(resolution.message ?? "Provider moved to Outcomes");
            setToastDetail(null);
            if (targetStageId) moveProviderToStage(provider.id, targetStageId);
            refreshBoardInBackground();
          } finally {
            setPathwayActionBusy(false);
          }
          return;
        }
        case "mark_evaluation_successful": {
          setPathwayActionBusy(true);
          try {
            const result = await markMissionBoardEvaluationSuccessful(provider.id);
            if (!result.ok) {
              setToastMessage(result.message);
              return;
            }
            setToastMessage(
              resolution.message ??
                (result.alreadyMarked
                  ? "Evaluation already marked successful — provider moves to Commitment."
                  : "Evaluation marked successful — provider moves to Commitment."),
            );
            setToastDetail(null);
            if (targetStageId) moveProviderToStage(provider.id, targetStageId);
            refreshBoardInBackground();
          } finally {
            setPathwayActionBusy(false);
          }
          return;
        }
        case "refresh":
          if (resolution.message) setToastMessage(resolution.message);
          if (targetStageId) moveProviderToStage(provider.id, targetStageId);
          refreshBoardInBackground();
          return;
        case "blocked":
          setDropModal({
            title: "Cannot advance stage",
            message: resolution.message,
            actions: resolution.actions,
            provider,
          });
          return;
        default:
          return;
      }
    },
    [moveProviderToStage, refreshBoardInBackground, saveObservationApprovalForProvider],
  );

  const moveProviderViaStageDrop = React.useCallback(
    async (provider: ProviderDirectoryRow, targetStageId: SalesPathwayStageId) => {
      if (dropBusy) return;

      const fromStage = resolveProviderCurrentMissionStage(provider);
      if (fromStage === targetStageId) {
        handleDragEnd();
        return;
      }

      const clientResolution = resolveMissionBoardStageDrop(
        fromStage,
        targetStageId,
        providerPathwayGateInput(provider),
      );

      if (
        clientResolution.type === "open_observation_approval" ||
        clientResolution.type === "open_debrief_status" ||
        clientResolution.type === "open_commitment_modal" ||
        clientResolution.type === "activate_outcomes_tracking" ||
        clientResolution.type === "mark_evaluation_successful" ||
        clientResolution.type === "blocked" ||
        clientResolution.type === "noop"
      ) {
        await runDropResolution(provider, clientResolution, targetStageId);
        handleDragEnd();
        return;
      }

      if (clientResolution.type === "refresh" && !missionBoardDropNeedsServerValidation(fromStage, targetStageId)) {
        await runDropResolution(provider, clientResolution, targetStageId);
        handleDragEnd();
        return;
      }

      setDropBusy(true);
      try {
        const res = await fetch(
          `/api/portal/sales/providers/${encodeURIComponent(provider.id)}/mission-board-stage-drop`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target_stage: targetStageId }),
          },
        );
        const payload = (await res.json().catch(() => null)) as DropApiResponse;
        if (!res.ok || !payload?.ok || !payload.resolution) {
          setToastMessage(payload?.error || "Could not validate stage move.");
          return;
        }
        await runDropResolution(provider, payload.resolution, targetStageId);
      } catch {
        setToastMessage("Could not validate stage move.");
      } finally {
        setDropBusy(false);
        handleDragEnd();
      }
    },
    [dropBusy, handleDragEnd, runDropResolution],
  );

  const handleColumnDrop = React.useCallback(
    async (targetStageId: SalesPathwayStageId) => {
      if (!draggingProvider) return;
      await moveProviderViaStageDrop(draggingProvider, targetStageId);
    },
    [draggingProvider, moveProviderViaStageDrop],
  );

  const handleDropModalAction = React.useCallback(
    (action: MissionBoardDropBlockerAction) => {
      if (!dropModal) return;
      const provider = dropModal.provider;

      switch (action.id) {
        case "observation_status":
          setObservationModal({ provider });
          break;
        case "add_observation":
          setAddCaseModal({ provider, initialCaseType: "observation" });
          break;
        case "create_debrief":
          setDebriefLauncherModal({ provider, initialPanel: "default" });
          break;
        case "debrief_status":
          setDebriefStatusModal(provider);
          break;
        case "create_evaluation":
          setEvaluationPathModal(provider);
          break;
        case "log_commitment":
          setCommitmentModal(provider);
          break;
        default:
          break;
      }
      setDropModal(null);
    },
    [dropModal],
  );

  const handleOpenDebriefLauncher = React.useCallback(
    (provider: ProviderDirectoryRow, options?: { initialPanel?: "default" | "dictate" }) => {
      setDebriefLauncherModal({ provider, initialPanel: options?.initialPanel ?? "default" });
    },
    [],
  );

  const handleOpenDebriefStatus = React.useCallback((provider: ProviderDirectoryRow) => {
    setDebriefStatusModal(provider);
  }, []);

  const handleDebriefQuickComplete = React.useCallback(
    (
      provider: ProviderDirectoryRow,
      engagementId: string,
      mode: MissionBoardDebriefQuickCompleteMode,
    ) => {
      setDebriefQuickCompleteModal({ provider, engagementId, mode });
    },
    [],
  );

  const handleStartDebrief = React.useCallback(
    async (provider: ProviderDirectoryRow) => {
      if (pathwayActionBusy) return;
      setPathwayActionBusy(true);
      try {
        const result = await runMissionBoardDebriefLauncherAction(provider.id, "start");
        if (!result.ok) {
          setToastMessage(result.message);
          setToastDetail(null);
          return;
        }
        setToastMessage("Debrief started.");
        setToastDetail(null);
        await onRefresh?.();
        router.push(result.href);
      } finally {
        setPathwayActionBusy(false);
      }
    },
    [onRefresh, pathwayActionBusy, router],
  );

  const handleStartIntroCall = React.useCallback(
    async (provider: ProviderDirectoryRow) => {
      const engagementId = provider.upcoming_engagement?.id;
      if (!engagementId || pathwayActionBusy) return;
      setPathwayActionBusy(true);
      try {
        const result = await beginEngagementCallClient(engagementId);
        if (!result.ok) {
          setToastMessage(result.message);
          setToastDetail(null);
          return;
        }
        setToastMessage("Intro call started.");
        setToastDetail(null);
        await onRefresh?.();
        router.push(buildEngagementActiveHref(engagementId));
      } finally {
        setPathwayActionBusy(false);
      }
    },
    [onRefresh, pathwayActionBusy, router],
  );

  const handleIntroDictateComplete = React.useCallback(
    async (
      provider: ProviderDirectoryRow,
      engagementId: string,
    ) => {
      if (pathwayActionBusy) return;
      setPathwayActionBusy(true);
      try {
        const model = buildProviderMissionBoardCardModel(provider);
        capture.open(
          buildCaptureIntelligenceOpenContext("mission_board", {
            providerId: model.providerId,
            providerLabel: model.providerName,
            organizationId: provider.primary_organization_id || provider.organization_id || undefined,
            organizationLabel: provider.primary_organization_name || undefined,
            engagementId,
            engagementType: "intro_call",
            engagementTypeLabel: "Intro Call",
            scopeLocked: true,
            declaredSourceType: "debrief",
            composeTitle: "Dictate & Complete",
            composeSubtitle:
              "Capture intro call notes, review suggested intelligence, or quick capture — then mark the call complete.",
            reviewSaveCta: "Finish Intro Call",
          }),
          {
            onSaved: async (result) => {
              try {
                await finalizeMissionBoardIntroCallDebriefAfterCapture({
                  providerId: model.providerId,
                  engagementId,
                  narrative: result?.sourceText,
                });
              } catch (err) {
                setToastMessage(
                  userFacingError(err, "Could not finalize intro call debrief."),
                );
                setToastDetail(null);
                await onRefresh?.();
                return;
              }
              setToastMessage(result?.title ?? MISSION_BOARD_INTRO_CALL_DICTATE_COMPLETE_SUCCESS_TOAST);
              setToastDetail(result?.detail ?? null);
              await onRefresh?.();
            },
          },
        );
      } finally {
        setPathwayActionBusy(false);
      }
    },
    [capture, onRefresh, pathwayActionBusy],
  );

  const handleIntroJustComplete = React.useCallback(
    async (provider: ProviderDirectoryRow, engagementId: string) => {
      if (pathwayActionBusy) return;
      setPathwayActionBusy(true);
      try {
        await markMissionBoardIntroCallCompleteWithoutDictation({
          providerId: provider.id,
          engagementId,
        });
        setToastMessage("Intro call completed.");
        setToastDetail(null);
        await onRefresh?.();
      } catch (err) {
        setToastMessage(userFacingError(err, "Could not complete intro call."));
        setToastDetail(null);
      } finally {
        setPathwayActionBusy(false);
      }
    },
    [onRefresh, pathwayActionBusy],
  );

  const handleStartEvaluation = React.useCallback(
    async (provider: ProviderDirectoryRow) => {
      const engagementId = resolveProviderEvaluationEngagementPreview(provider)?.id;
      if (!engagementId || pathwayActionBusy) return;
      setPathwayActionBusy(true);
      try {
        const result = await beginEngagementCallClient(engagementId);
        if (!result.ok) {
          setToastMessage(result.message);
          setToastDetail(null);
          return;
        }
        setToastMessage("Evaluation started.");
        setToastDetail(null);
        await onRefresh?.();
        router.push(buildEngagementActiveHref(engagementId));
      } finally {
        setPathwayActionBusy(false);
      }
    },
    [onRefresh, pathwayActionBusy, router],
  );

  const handleOpenEvaluationPathModal = React.useCallback((provider: ProviderDirectoryRow) => {
    setEvaluationPathModal(provider);
  }, []);

  const handleOpenCommitmentModal = React.useCallback((provider: ProviderDirectoryRow) => {
    setCommitmentModal(provider);
  }, []);

  const handleMarkEvaluationSuccessful = React.useCallback(
    async (provider: ProviderDirectoryRow) => {
      if (pathwayActionBusy) return;
      setPathwayActionBusy(true);
      try {
        const result = await markMissionBoardEvaluationSuccessful(provider.id);
        if (!result.ok) {
          setToastMessage(result.message);
          return;
        }
        setToastMessage(
          result.alreadyMarked
            ? "Evaluation already marked successful — provider moves to Commitment."
            : "Evaluation marked successful — provider moves to Commitment.",
        );
        setToastDetail(null);
        await onRefresh?.();
      } finally {
        setPathwayActionBusy(false);
      }
    },
    [pathwayActionBusy, onRefresh],
  );

  const handleMoveToOutcomes = React.useCallback(
    async (provider: ProviderDirectoryRow) => {
      if (pathwayActionBusy) return;
      setPathwayActionBusy(true);
      try {
        const result = await activateMissionBoardOutcomesTracking(provider.id);
        if (!result.ok) {
          setToastMessage(result.message);
          return;
        }
        setToastMessage("Provider moved to Outcomes");
        setToastDetail(null);
        await onRefresh?.();
      } finally {
        setPathwayActionBusy(false);
      }
    },
    [pathwayActionBusy, onRefresh],
  );

  const runSecondaryMissionAction = React.useCallback(
    (provider: ProviderDirectoryRow, action: MissionBoardCardSecondaryAction) => {
      if (observationCaseBusy || pathwayActionBusy) return;

      if (action.kind === "link" && action.href) {
        router.push(action.href);
        return;
      }

      if (action.kind === "capture" || action.id === "dictate") {
        handleDictateCapture(provider);
        return;
      }

      if (action.id === "observation_status") {
        setObservationModal({ provider });
        return;
      }
      if (action.id === "debrief_status") {
        setDebriefStatusModal(provider);
        return;
      }
      if (action.id === "choose_evaluation_path") {
        setEvaluationPathModal(provider);
        return;
      }
      if (action.id === "mark_evaluation_successful") {
        void handleMarkEvaluationSuccessful(provider);
        return;
      }
      if (action.id === "confirm_product_commitment") {
        setCommitmentModal(provider);
        return;
      }
      if (action.id === "log_product_use") {
        setProductUseModal(provider);
        return;
      }
      if (action.id === "log_outcome_update") {
        setOutcomeUpdateModal(provider);
        return;
      }

      if (action.id === "intro_dictate_complete" && action.engagementId) {
        void handleIntroDictateComplete(provider, action.engagementId);
        return;
      }

      if (action.id === "intro_just_complete" && action.engagementId) {
        void handleIntroJustComplete(provider, action.engagementId);
        return;
      }

      if (action.id === "debrief_dictate_complete" && action.engagementId) {
        setDebriefQuickCompleteModal({
          provider,
          engagementId: action.engagementId,
          mode: "dictate_complete",
        });
        return;
      }

      if (action.id === "debrief_just_complete" && action.engagementId) {
        setDebriefQuickCompleteModal({
          provider,
          engagementId: action.engagementId,
          mode: "just_complete",
        });
        return;
      }

      const observationCase = buildProviderMissionBoardCardModel(provider).nextScheduledObservation;
      if (!observationCase) return;
      if (action.id === "mark_complete" && action.caseId) {
        void handleMarkObservationComplete(provider, action.caseId);
        return;
      }
      if (action.id === "dictate_complete" && action.caseId) {
        handleDictateCompleteObservation(provider, observationCase);
        return;
      }
      if (action.id === "reschedule" && action.caseId) {
        setRescheduleModal({ provider, observation: observationCase });
      }
    },
    [
      handleDictateCapture,
      handleDictateCompleteObservation,
      handleIntroDictateComplete,
      handleIntroJustComplete,
      handleMarkEvaluationSuccessful,
      handleMarkObservationComplete,
      observationCaseBusy,
      pathwayActionBusy,
      router,
    ],
  );

  const runPrimaryMissionAction = React.useCallback(
    (provider: ProviderDirectoryRow) => {
      if (observationCaseBusy || pathwayActionBusy) return;
      const model = buildProviderMissionBoardCardModel(provider);
      const primary = model.primaryCta;

      switch (primary.kind) {
        case "fast_intro_call":
          setIntroCallModal(provider);
          return;
        case "fast_observation":
          setAddCaseModal({ provider, initialCaseType: "observation" });
          return;
        case "view_observation_queue":
          setObservationQueueModal(provider);
          return;
        case "debrief_launcher":
          setDebriefLauncherModal({
            provider,
            initialPanel: primary.debriefLauncherPanel ?? "default",
          });
          return;
        case "fast_debrief":
          setFastDebriefModal(provider);
          return;
        case "debrief_start":
          void handleStartDebrief(provider);
          return;
        case "intro_start":
          void handleStartIntroCall(provider);
          return;
        case "evaluation_start":
          void handleStartEvaluation(provider);
          return;
        case "debrief_status":
        case "debrief_advance_pathway":
          setDebriefStatusModal(provider);
          return;
        case "evaluation_path_modal":
          setEvaluationPathModal(provider);
          return;
        case "commitment_modal":
          setCommitmentModal(provider);
          return;
        case "move_to_outcomes":
          void handleMoveToOutcomes(provider);
          return;
        case "outcome_update_modal":
          setOutcomeUpdateModal(provider);
          return;
        case "product_use_modal":
          setProductUseModal(provider);
          return;
        case "link":
        case "open_next_observation":
        default:
          router.push(primary.href);
      }
    },
    [
      handleMoveToOutcomes,
      handleStartDebrief,
      handleStartEvaluation,
      handleStartIntroCall,
      observationCaseBusy,
      pathwayActionBusy,
      router,
    ],
  );

  const handleSaveObservationApproval = React.useCallback(
    async (status: ObservationStatusChoice) => {
      if (!observationModal) return;
      const { provider } = observationModal;
      setObservationBusy(true);
      setObservationError(null);
      try {
        await saveObservationApprovalForProvider(provider, status);
        setObservationModal(null);

        if (observationStatusGrantsMissionBoardObservationAdvance(status)) {
          setToastMessage("Observation permission confirmed");
          setToastDetail(null);
        } else {
          setToastMessage("Observation status updated");
          setToastDetail(null);
        }
        await onRefresh?.();
      } catch (err) {
        setObservationError(userFacingError(err, "Could not save observation status."));
      } finally {
        setObservationBusy(false);
      }
    },
    [observationModal, onRefresh, saveObservationApprovalForProvider],
  );

  const columnDropPreview = React.useCallback(
    (columnId: SalesPathwayStageId) => {
      if (!draggingProvider) {
        return { state: "neutral" as const, hint: null };
      }
      return missionBoardDropTargetPreview(
        resolveProviderCurrentMissionStage(draggingProvider),
        columnId,
        draggingProvider,
      );
    },
    [draggingProvider],
  );

  const renderMobileStageStepper = (currentStageId: SalesPathwayStageId) => {
    const currentIndex = PROVIDER_MISSION_BOARD_COLUMNS.findIndex((column) => column.id === currentStageId);
    return (
      <nav className="provider-mission-board-mobile-stepper" aria-label="Mission Board stage progress">
        {PROVIDER_MISSION_BOARD_COLUMNS.map((column, index) => {
          const active = column.id === currentStageId;
          const complete = currentIndex >= 0 && index < currentIndex;
          return (
            <span
              key={column.id}
              className={`provider-mission-board-mobile-step${
                active ? " provider-mission-board-mobile-step--active" : ""
              }${complete ? " provider-mission-board-mobile-step--complete" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <span className="provider-mission-board-mobile-step-label">{column.label}</span>
              <span className="provider-mission-board-mobile-step-dot" aria-hidden />
            </span>
          );
        })}
      </nav>
    );
  };

  const renderMobileProviderAvatar = (providerName: string) => {
    const initials = providerName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
    return <span className="provider-mission-board-mobile-avatar">{initials || "P"}</span>;
  };

  const buildMobileEditProviderHref = (provider: ProviderDirectoryRow) => {
    const organizationId = String(
      provider.primary_organization_id || provider.organization_id || provider.account_id || "",
    ).trim();
    return organizationId
      ? `/portal/sales/accounts/${encodeURIComponent(organizationId)}?focus_contact=${encodeURIComponent(provider.id)}`
      : `/portal/sales/contacts/${encodeURIComponent(provider.id)}`;
  };

  const renderMobilePrimaryProvider = (provider: ProviderDirectoryRow) => {
    const model = buildProviderMissionBoardCardModel(provider);
    const nextStage = nextSalesPathwayStage(model.pathwayStageId);
    const nextStageLabel = PROVIDER_MISSION_BOARD_COLUMNS.find((column) => column.id === nextStage)?.label;
    const moreActions = model.nextCaseActions;

    return (
      <article
        className="provider-mission-board-mobile-primary-card"
        data-pathway-stage={model.pathwayStageId}
        data-testid="mission-board-mobile-primary-card"
      >
        <header className="provider-mission-board-mobile-primary-head">
          {renderMobileProviderAvatar(model.providerName)}
          <Link href={model.detailHref} className="provider-mission-board-mobile-primary-title">
            <strong>{model.providerName}</strong>
            <span>{model.organization}</span>
          </Link>
          <details className="provider-mission-board-mobile-card-menu">
            <summary aria-label={`${model.providerName} actions`}>•••</summary>
            <div className="provider-mission-board-mobile-card-menu-list" role="menu">
              <Link href={model.detailHref} role="menuitem">
                View Profile
              </Link>
              <button type="button" role="menuitem" onClick={() => setSupportContactsModal(provider)}>
                Add Support Contact
              </button>
              <Link href={buildMobileEditProviderHref(provider)} role="menuitem">
                Edit Provider
              </Link>
            </div>
          </details>
        </header>

        <p className="provider-mission-board-mobile-meta">
          Stage: <strong>{model.stageLabel}</strong>
          <span aria-hidden>·</span>
          Last interaction: <strong>{model.lastTouch}</strong>
        </p>

        <div className="provider-mission-board-mobile-status-card">
          <span className="provider-mission-board-mobile-status-icon" aria-hidden>
            ◎
          </span>
          <div>
            <span>Access / Status</span>
            <strong>{model.progressLabel}</strong>
          </div>
        </div>

        <button
          type="button"
          className="provider-mission-board-mobile-next-action"
          disabled={observationCaseBusy || pathwayActionBusy}
          onClick={() => runPrimaryMissionAction(provider)}
        >
          <span>Next Action</span>
          <strong>{model.primaryCta.label}</strong>
          <small>{model.primaryCta.kind === "link" ? "Open the prepared workflow." : model.progressLabel}</small>
        </button>

        <div className="provider-mission-board-mobile-quick-actions">
          {model.secondaryActions.map((action, index) => {
            if (action.kind === "link" && action.href) {
              return (
                <Link
                  key={`${action.id}-${action.href}-${index}`}
                  href={action.href}
                  className="provider-mission-board-mobile-quick-action"
                >
                  {action.label}
                </Link>
              );
            }

            return (
              <button
                key={`${action.id}-${action.caseId ?? action.engagementId ?? index}`}
                type="button"
                data-testid={action.id === "dictate" ? "mission-board-mobile-field-note" : undefined}
                disabled={observationCaseBusy || pathwayActionBusy}
                onClick={() => runSecondaryMissionAction(provider, action)}
              >
                {action.label}
              </button>
            );
          })}
          <Link
            href={`/portal/sales/providers/${encodeURIComponent(provider.id)}`}
            className="provider-mission-board-mobile-quick-action"
          >
            Open
          </Link>
          <button
            type="button"
            className="provider-mission-board-mobile-quick-action"
            data-testid="mission-board-mobile-add-case"
            disabled={observationCaseBusy || pathwayActionBusy}
            onClick={() =>
              setAddCaseModal({
                provider,
                initialCaseType: null,
              })
            }
          >
            Add Case
          </button>
        </div>

        {nextStage && nextStageLabel ? (
          <button
            type="button"
            className="provider-mission-board-mobile-move"
            data-testid="mission-board-mobile-stage-move"
            disabled={dropBusy || observationCaseBusy || pathwayActionBusy}
            onClick={() => void moveProviderViaStageDrop(provider, nextStage)}
          >
            Move to {nextStageLabel}
            <span aria-hidden>›</span>
          </button>
        ) : null}

        {moreActions.length > 0 ? (
          <details className="provider-mission-board-mobile-more">
            <summary>Observation Actions</summary>
            <div className="provider-mission-board-mobile-more-menu">
              {moreActions.map((action, index) => (
                <button
                  key={`${action.id}-${action.caseId ?? action.engagementId ?? index}`}
                  type="button"
                  disabled={observationCaseBusy || pathwayActionBusy}
                  onClick={() => runSecondaryMissionAction(provider, action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </details>
        ) : null}
      </article>
    );
  };

  const renderMobileCompactRow = (provider: ProviderDirectoryRow) => {
    const model = buildProviderMissionBoardCardModel(provider);
    return (
      <li className="provider-mission-board-mobile-row" key={provider.id}>
        <button
          type="button"
          className="provider-mission-board-mobile-row-switch"
          onClick={() => setSelectedMobileProviderId(provider.id)}
          aria-label={`Show ${model.providerName} mission card`}
        >
          {renderMobileProviderAvatar(model.providerName)}
          <span className="provider-mission-board-mobile-row-main">
            <strong>{model.providerName}</strong>
            <span>{model.organization}</span>
            <small>
              {model.stageLabel} · {model.progressLabel}
            </small>
          </span>
          <span className="provider-mission-board-mobile-row-switch-label">View Card</span>
        </button>
        <button
          type="button"
          className="provider-mission-board-mobile-row-action"
          disabled={observationCaseBusy || pathwayActionBusy}
          onClick={() => runPrimaryMissionAction(provider)}
        >
          {model.primaryCta.label}
          <span aria-hidden>›</span>
        </button>
      </li>
    );
  };

  return (
    <>
      {primaryMobileProvider ? (
        <section
          className="provider-mission-board-mobile"
          data-testid="mission-board-mobile-layout"
          aria-label="Mobile provider mission board"
        >
          {renderMobileStageStepper(buildProviderMissionBoardCardModel(primaryMobileProvider).pathwayStageId)}
          {renderMobilePrimaryProvider(primaryMobileProvider)}
          {otherMobileProviders.length > 0 ? (
            <section className="provider-mission-board-mobile-other" aria-label="Other providers">
              <header>
                <h2>Other Providers ({otherMobileProviders.length})</h2>
                <span>Sort: Next Action</span>
              </header>
              <ul>{otherMobileProviders.map(renderMobileCompactRow)}</ul>
            </section>
          ) : null}
        </section>
      ) : null}

      <div
        className={`mission-board provider-mission-board${
          draggingProvider ? " provider-mission-board--drag-active" : ""
        }`}
        data-testid="mission-board-desktop-kanban"
        role="tabpanel"
        aria-label="Provider mission board"
        aria-labelledby="provider-view-tab-mission"
        id="provider-view-panel-mission"
      >
        <p className="provider-mission-board-kicker">
          Field execution — drag forward to advance when pathway gates are met
        </p>
        <div className="mission-board-columns">
          {PROVIDER_MISSION_BOARD_COLUMNS.map((column) => {
            const columnProviders = grouped.get(column.id) ?? [];
            const focused = focusColumnId === column.id;
            const dropPreview = columnDropPreview(column.id);
            const dropState = dropPreview.state;
            const showHint = Boolean(draggingProvider && dropPreview.hint && dropState !== "neutral");
            const isHovered = hoverColumnId === column.id;

            return (
              <section
                key={column.id}
                className={`mission-board-column provider-mission-board-column${
                  focused ? " provider-mission-board-column--focused" : ""
                } provider-mission-board-column--drop-${dropState}${
                  isHovered && dropState !== "neutral" ? " provider-mission-board-column--drop-hover" : ""
                }`}
                data-mission-column={column.id}
                data-drop-state={dropState}
                aria-label={`${column.label}, ${columnProviders.length} providers`}
                onDragEnter={() => {
                  if (draggingProvider) setHoverColumnId(column.id);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setHoverColumnId((cur) => (cur === column.id ? null : cur));
                }}
                onDragOver={(e) => {
                  if (!draggingProvider) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = dropState === "invalid" ? "none" : "move";
                  if (hoverColumnId !== column.id) setHoverColumnId(column.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleColumnDrop(column.id);
                }}
              >
                <header className="mission-board-column-header">
                  <div className="mission-board-column-header-main">
                    <h2 className="mission-board-column-title" title={column.objective}>
                      {column.label}
                    </h2>
                    <p className="mission-board-column-objective">{column.objective}</p>
                  </div>
                  <span className="mission-board-column-count" aria-label={`${columnProviders.length} providers`}>
                    {columnProviders.length}
                  </span>
                </header>
                {showHint ? (
                  <p
                    className={`provider-mission-board-column-drop-hint provider-mission-board-column-drop-hint--${dropState}`}
                    role="status"
                  >
                    {dropPreview.hint}
                  </p>
                ) : null}
                <ul className="mission-board-column-cards">
                  {columnProviders.length === 0 ? (
                    <li className="provider-mission-board-column-empty">Clear runway — no providers in this stage</li>
                  ) : (
                    columnProviders.map((p) => (
                      <ProvidersMissionBoardCard
                        key={p.id}
                        provider={p}
                        dragging={draggingProvider?.id === p.id}
                        onDragStart={setDraggingProvider}
                        onDragEnd={handleDragEnd}
                        onOpenObservationStatus={(row) => setObservationModal({ provider: row })}
                        onFastIntroCall={(row) => setIntroCallModal(row)}
                        onFastDebrief={(row) => setFastDebriefModal(row)}
                        onStartDebrief={(row) => void handleStartDebrief(row)}
                        onStartIntroCall={(row) => void handleStartIntroCall(row)}
                        onIntroDictateComplete={(row, engagementId) =>
                          void handleIntroDictateComplete(row, engagementId)
                        }
                        onIntroJustComplete={(row, engagementId) =>
                          void handleIntroJustComplete(row, engagementId)
                        }
                        onStartEvaluation={(row) => void handleStartEvaluation(row)}
                        onAddCase={(row, options) =>
                          setAddCaseModal({ provider: row, initialCaseType: options?.initialCaseType ?? null })
                        }
                        onDictateCapture={handleDictateCapture}
                        onMarkObservationComplete={(row, caseId) => void handleMarkObservationComplete(row, caseId)}
                        onRescheduleObservation={(row, observationCase) =>
                          setRescheduleModal({ provider: row, observation: observationCase })
                        }
                        onDictateCompleteObservation={handleDictateCompleteObservation}
                        onViewObservationQueue={(row) => setObservationQueueModal(row)}
                        onOpenDebriefLauncher={handleOpenDebriefLauncher}
                        onOpenDebriefStatus={handleOpenDebriefStatus}
                        onDebriefQuickComplete={handleDebriefQuickComplete}
                        onOpenEvaluationPathModal={handleOpenEvaluationPathModal}
                        onOpenCommitmentModal={handleOpenCommitmentModal}
                        onMoveToOutcomes={handleMoveToOutcomes}
                        onMarkEvaluationSuccessful={handleMarkEvaluationSuccessful}
                        onOpenOutcomeUpdateModal={(row) => setOutcomeUpdateModal(row)}
                        onOpenProductUseModal={(row) => setProductUseModal(row)}
                        observationActionBusy={observationCaseBusy || pathwayActionBusy}
                      />
                    ))
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      {introCallModal ? (
        <MissionBoardFastIntroCallModal
          provider={introCallModal}
          onClose={() => setIntroCallModal(null)}
          onCreate={async () => {
            setIntroCallModal(null);
            setToastMessage("Intro call scheduled.");
            setToastDetail(null);
            await onRefresh?.();
          }}
        />
      ) : null}

      {fastDebriefModal ? (
        <MissionBoardFastDebriefModal
          provider={fastDebriefModal}
          onClose={() => setFastDebriefModal(null)}
          onCreate={async () => {
            setFastDebriefModal(null);
            setToastMessage("Debrief scheduled.");
            setToastDetail(null);
            await onRefresh?.();
          }}
        />
      ) : null}

      {addCaseModal ? (
        <MissionBoardAddCaseModal
          provider={addCaseModal.provider}
          initialCaseType={addCaseModal.initialCaseType ?? null}
          onClose={() => setAddCaseModal(null)}
          onSave={async () => {
            setAddCaseModal(null);
            setToastMessage("Case added");
            setToastDetail(null);
            await onRefresh?.();
          }}
        />
      ) : null}

      {rescheduleModal ? (
        <MissionBoardRescheduleObservationModal
          observation={rescheduleModal.observation}
          busy={observationCaseBusy}
          onClose={() => setRescheduleModal(null)}
          onSave={async () => {
            setRescheduleModal(null);
            setToastMessage("Observation rescheduled");
            setToastDetail(null);
            await onRefresh?.();
          }}
        />
      ) : null}

      {observationQueueModal ? (
        (() => {
          const model = buildProviderMissionBoardCardModel(observationQueueModal);
          return model.observationCases.scheduledCases.length > 0 ? (
            <MissionBoardObservationQueueModal
              providerName={providerDisplayName(observationQueueModal)}
              cases={model.observationCases.scheduledCases}
              busy={observationCaseBusy}
              onClose={() => setObservationQueueModal(null)}
              onMarkComplete={(caseId) => void handleMarkObservationComplete(observationQueueModal, caseId)}
              onDictateComplete={(observationCase) =>
                handleDictateCompleteObservation(observationQueueModal, observationCase)
              }
              onReschedule={(observationCase) =>
                setRescheduleModal({ provider: observationQueueModal, observation: observationCase })
              }
            />
          ) : null;
        })()
      ) : null}

      {dictateCompleteModal ? (
        <MissionBoardObservationDictateCompleteModal
          providerName={providerDisplayName(dictateCompleteModal.provider)}
          observation={dictateCompleteModal.observation}
          busy={observationCaseBusy}
          onClose={() => {
            if (!observationCaseBusy) setDictateCompleteModal(null);
          }}
          onCompleted={async (result) => {
            setObservationCaseBusy(true);
            try {
              setDictateCompleteModal(null);
              setToastMessage(result.title);
              setToastDetail(result.detail ?? null);
              await onRefresh?.();
            } finally {
              setObservationCaseBusy(false);
            }
          }}
        />
      ) : null}

      {debriefLauncherModal ? (
        <MissionBoardDebriefLauncherModal
          provider={debriefLauncherModal.provider}
          initialPanel={debriefLauncherModal.initialPanel ?? "default"}
          onClose={() => setDebriefLauncherModal(null)}
          onLaunched={async () => {
            setDebriefLauncherModal(null);
            await onRefresh?.();
          }}
          onCompleted={async () => {
            setDebriefLauncherModal(null);
            setToastMessage("Debrief completed.");
            setToastDetail(null);
            await onRefresh?.();
          }}
        />
      ) : null}

      {debriefQuickCompleteModal ? (
        <MissionBoardDebriefQuickCompleteModal
          provider={debriefQuickCompleteModal.provider}
          engagementId={debriefQuickCompleteModal.engagementId}
          mode={debriefQuickCompleteModal.mode}
          busy={pathwayActionBusy}
          onClose={() => setDebriefQuickCompleteModal(null)}
          onCompleted={async (message) => {
            setDebriefQuickCompleteModal(null);
            setToastMessage(message ?? "Debrief completed.");
            setToastDetail(null);
            await onRefresh?.();
          }}
        />
      ) : null}

      {debriefStatusModal ? (
        <MissionBoardDebriefStatusModal
          provider={debriefStatusModal}
          onClose={() => setDebriefStatusModal(null)}
          onScheduleDebrief={() => {
            const row = debriefStatusModal;
            setDebriefStatusModal(null);
            setFastDebriefModal(row);
          }}
          onLaunched={async () => {
            setDebriefStatusModal(null);
            await onRefresh?.();
          }}
          onCompleted={async () => {
            setDebriefStatusModal(null);
            setToastMessage("Debrief completed.");
            setToastDetail(null);
            await onRefresh?.();
          }}
        />
      ) : null}

      {evaluationPathModal ? (
        <MissionBoardEvaluationPathModal
          provider={evaluationPathModal}
          onClose={() => setEvaluationPathModal(null)}
          onSaved={async (detail) => {
            setEvaluationPathModal(null);
            setToastMessage("Evaluation path saved");
            setToastDetail(detail ?? null);
            await onRefresh?.();
          }}
        />
      ) : null}

      {commitmentModal ? (
        <MissionBoardCommitmentModal
          provider={commitmentModal}
          busy={pathwayActionBusy}
          onClose={() => setCommitmentModal(null)}
          onSaved={async () => {
            setCommitmentModal(null);
            setToastMessage("Product commitment confirmed");
            setToastDetail(null);
            await onRefresh?.();
          }}
        />
      ) : null}

      {outcomeUpdateModal ? (
        <MissionBoardOutcomeUpdateModal
          provider={outcomeUpdateModal}
          busy={pathwayActionBusy}
          onClose={() => setOutcomeUpdateModal(null)}
          onSaved={async () => {
            setOutcomeUpdateModal(null);
            setToastMessage("Outcome update logged");
            setToastDetail(null);
            await onRefresh?.();
          }}
        />
      ) : null}

      {productUseModal ? (
        <MissionBoardProductUseModal
          provider={productUseModal}
          busy={pathwayActionBusy}
          onClose={() => setProductUseModal(null)}
          onSaved={async () => {
            setProductUseModal(null);
            setToastMessage("Product use logged");
            setToastDetail(null);
            await onRefresh?.();
          }}
        />
      ) : null}

      {supportContactsModal ? (
        <ManageSupportContactsModal
          doctorId={supportContactsModal.id}
          contextOrganizationId={
            supportContactsModal.primary_organization_id ||
            supportContactsModal.organization_id ||
            supportContactsModal.account_id ||
            null
          }
          preferredRelationshipType="scheduler"
          dialogTitle="Add support contact"
          onClose={() => setSupportContactsModal(null)}
          onChanged={() => {
            refreshBoardInBackground();
          }}
          onRelationshipCreated={() => {
            refreshBoardInBackground();
          }}
          onSupportContactCreatedAndLinked={() => {
            refreshBoardInBackground();
          }}
        />
      ) : null}

      {observationModal ? (
        <MissionBoardObservationStatusModal
          open
          busy={observationBusy}
          error={observationError}
          currentStatus={resolveObservationStatusFromContact(
            observationModal.provider as Record<string, unknown>,
          )}
          onClose={() => {
            if (!observationBusy) setObservationModal(null);
          }}
          onSave={handleSaveObservationApproval}
        />
      ) : null}

      <MissionBoardDropFeedbackModal
        open={Boolean(dropModal)}
        title={dropModal?.title ?? ""}
        message={dropModal?.message ?? ""}
        actions={dropModal?.actions ?? [{ id: "cancel", label: "Cancel" }]}
        busy={dropBusy}
        onAction={handleDropModalAction}
        onClose={() => setDropModal(null)}
      />

      {toastMessage ? (
        <MissionBoardToast
          message={toastMessage}
          detail={toastDetail}
          onDismiss={() => {
            setToastMessage(null);
            setToastDetail(null);
          }}
        />
      ) : null}
    </>
  );
}
