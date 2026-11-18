"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ManageSupportContactsModal from "@/components/sales/ManageSupportContactsModal";
import type { ProviderOverviewFocusedModal } from "@/lib/surgical-sales/providerOverviewFocusedActionRouting";
import type { ProviderOverviewMissionStatusModel } from "@/lib/surgical-sales/buildProviderOverviewMissionStatus";
import { resolveSuggestedSchedulerCandidate } from "@/lib/surgical-sales/candidateContactIntelligence";
import { buildProviderOverviewPathwayDebriefProviderRow } from "@/lib/surgical-sales/providerOverviewPathwayDebriefProvider";
import { buildProviderObservationCaseHref } from "@/lib/surgical-sales/providerDirectoryLinks";
import { resolveObservationStatusFromContact, type ObservationStatusChoice } from "@/lib/surgical-sales/observationStatus";
import { CredentialingStatusDrawer } from "./CredentialingStatusDrawer";
import { SchedulingOwnerSupportContactDrawer } from "./SchedulingOwnerSupportContactDrawer";
import { ProviderOverviewLogInteractionDrawer } from "./ProviderOverviewLogInteractionDrawer";
import { ProviderOverviewQuickEngagementDrawer } from "./ProviderOverviewQuickEngagementDrawer";
import { ObservationApprovalModal } from "./ObservationApprovalModal";
import { MissionBoardEvaluationPathModal } from "../MissionBoardEvaluationPathModal";
import { MissionBoardCommitmentModal } from "../MissionBoardCommitmentModal";
import { MissionBoardOutcomeUpdateModal } from "../MissionBoardOutcomeUpdateModal";
import { MissionBoardProductUseModal } from "../MissionBoardProductUseModal";
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
  return fieldError ?? fallback;
}

export function ProviderOverviewFocusedActionHost({
  activeModal,
  contact,
  providerId,
  providerLabel,
  organizationId,
  organizationName,
  relatedContacts,
  engagements,
  onClose,
  onRefresh,
  onProviderUpdated,
}: {
  activeModal: ProviderOverviewFocusedModal | null;
  contact: Record<string, unknown>;
  providerId: string;
  providerLabel: string;
  organizationId: string | null;
  organizationName?: string | null;
  relatedContacts: Record<string, unknown>[];
  engagements?: import("@/lib/surgical-sales/engagements/providerEngagementSummary").ProviderEngagementSummary[];
  missionStatus?: ProviderOverviewMissionStatusModel;
  providerOverviewHref?: string;
  onClose: () => void;
  onRefresh?: () => void | Promise<void>;
  onProviderUpdated?: (provider: Record<string, unknown>) => void | Promise<void>;
}) {
  const router = useRouter();
  const [contactPool, setContactPool] = React.useState<Record<string, unknown>[]>([]);
  const [observationApprovalBusy, setObservationApprovalBusy] = React.useState(false);
  const [observationApprovalError, setObservationApprovalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/portal/sales/surgical-contacts?include_archived=0&contact_kind=support", {
          cache: "no-store",
        });
        const j = (await res.json()) as { contacts?: Record<string, unknown>[] };
        if (!cancelled && res.ok && Array.isArray(j.contacts)) {
          setContactPool(j.contacts);
        }
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaved = React.useCallback(
    async (provider?: Record<string, unknown>) => {
      if (provider) {
        await onProviderUpdated?.(provider);
      } else if (onRefresh) {
        await onRefresh();
      }
      onClose();
    },
    [onClose, onProviderUpdated, onRefresh],
  );

  const schedulerPrefill = React.useMemo(() => {
    return resolveSuggestedSchedulerCandidate(contact)?.contact_name ?? null;
  }, [contact]);

  // Same minimal directory row the debrief status modal uses — keeps Mission Board
  // modals working from the provider page without a duplicate data path.
  const missionBoardProviderRow = React.useMemo(
    () =>
      buildProviderOverviewPathwayDebriefProviderRow({
        providerId,
        contact,
        engagements,
        organizationName,
        organizationId,
      }),
    [providerId, contact, engagements, organizationName, organizationId],
  );

  const handleMissionBoardModalSaved = React.useCallback(async () => {
    await onRefresh?.();
    onClose();
  }, [onClose, onRefresh]);

  const observationStatus = React.useMemo(
    () => resolveObservationStatusFromContact(contact),
    [contact],
  );

  const handleSaveObservationApproval = React.useCallback(
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
          throw new Error(extractObservationApprovalSaveError(payload));
        }
        if (payload.provider) {
          await onProviderUpdated?.(payload.provider);
        } else {
          await onRefresh?.();
        }
        onClose();
        if (input.status === "permission_confirmed" && input.nextStep === "schedule_observation") {
          router.push(
            buildProviderObservationCaseHref({
              providerId,
              accountId: organizationId,
            }),
          );
        }
      } catch (err) {
        setObservationApprovalError(userFacingError(err, "Could not save observation approval."));
      } finally {
        setObservationApprovalBusy(false);
      }
    },
    [onClose, onProviderUpdated, onRefresh, organizationId, providerId, router],
  );

  return (
    <>
      <ObservationApprovalModal
        open={activeModal === "observationApproval"}
        busy={observationApprovalBusy}
        error={observationApprovalError}
        currentStatus={observationStatus}
        onClose={() => {
          if (!observationApprovalBusy) {
            setObservationApprovalError(null);
            onClose();
          }
        }}
        onSave={handleSaveObservationApproval}
      />

      <SchedulingOwnerSupportContactDrawer
        open={activeModal === "scheduler"}
        providerId={providerId}
        providerLabel={providerLabel}
        organizationId={organizationId}
        organizationName={organizationName}
        relatedContacts={relatedContacts}
        contactPool={contactPool}
        providerContact={contact}
        title="Add scheduler"
        prefillContactName={schedulerPrefill}
        launchOrigin="provider"
        onClose={onClose}
        onSaved={handleSaved}
      />

      <CredentialingStatusDrawer
        open={activeModal === "credentialing"}
        providerId={providerId}
        contact={contact}
        onClose={onClose}
        onSaved={handleSaved}
      />

      <ProviderOverviewLogInteractionDrawer
        open={activeModal === "logInteraction"}
        providerId={providerId}
        contact={contact}
        onClose={onClose}
        onSaved={handleSaved}
      />

      {organizationId ? (
        <ProviderOverviewQuickEngagementDrawer
          open={activeModal === "followUp"}
          engagementType="follow_up"
          providerId={providerId}
          organizationId={organizationId}
          providerLabel={providerLabel}
          organizationLabel={organizationName?.trim() || "Organization"}
          onClose={onClose}
          onCreated={handleSaved}
        />
      ) : null}

      {activeModal === "evaluationPath" ? (
        <MissionBoardEvaluationPathModal
          provider={missionBoardProviderRow}
          onClose={onClose}
          onSaved={handleMissionBoardModalSaved}
        />
      ) : null}

      {activeModal === "commitment" ? (
        <MissionBoardCommitmentModal
          provider={missionBoardProviderRow}
          onClose={onClose}
          onSaved={handleMissionBoardModalSaved}
        />
      ) : null}

      {activeModal === "outcomeUpdate" ? (
        <MissionBoardOutcomeUpdateModal
          provider={missionBoardProviderRow}
          onClose={onClose}
          onSaved={handleMissionBoardModalSaved}
        />
      ) : null}

      {activeModal === "productUse" ? (
        <MissionBoardProductUseModal
          provider={missionBoardProviderRow}
          onClose={onClose}
          onSaved={handleMissionBoardModalSaved}
        />
      ) : null}

      {activeModal === "supportContacts" ? (
        <ManageSupportContactsModal
          doctorId={providerId}
          contextOrganizationId={organizationId}
          dialogTitle="Add support contact"
          onClose={onClose}
          onChanged={async () => {
            await onRefresh?.();
          }}
          onSupportContactCreatedAndLinked={async () => {
            await onRefresh?.();
          }}
        />
      ) : null}
    </>
  );
}
