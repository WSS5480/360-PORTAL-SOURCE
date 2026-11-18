"use client";



import Link from "next/link";

import React from "react";

import {
  buildCaptureIntelligenceOpenContext,
  useCaptureIntelligence,
} from "@/components/sales/captureIntelligence/CaptureIntelligenceHost";

import { buildEngagementRecordView } from "@/lib/surgical-sales/engagements/buildEngagementRecordView";

import { buildProviderOverviewHref } from "@/lib/surgical-sales/engagements/engagementCreateWizard";

import { ENGAGEMENT_CANCEL_ENGAGEMENT_LABEL } from "@/lib/surgical-sales/engagements/engagementUiLabels";

import {
  finalizeMissionBoardIntroCallDebriefAfterCapture,
  markMissionBoardIntroCallCompleteWithoutDictation,
} from "@/lib/surgical-sales/missionBoardIntroCallDictateComplete";

import { engagementDetailHubCss } from "./engagementDetailHubCss";

import { StartEngagementButton } from "@/components/sales/StartEngagementButton";

import { EngagementArchiveControl } from "./EngagementArchiveControl";

import { EngagementEditControl } from "./EngagementEditControl";
import { userFacingError } from "@/lib/errors/userFacingError";



function SummaryRow({

  label,

  value,

  empty = "—",

  fullWidth = false,

  valueClassName = "",

}: {

  label: string;

  value: string | null | undefined;

  empty?: string;

  fullWidth?: boolean;

  valueClassName?: string;

}) {

  const display = value?.trim() ? value : empty;

  const muted = !value?.trim();

  return (

    <div className={`edh-command-row${fullWidth ? " edh-command-row--full" : ""}`}>

      <dt>{label}</dt>

      <dd className={[muted ? "edh-value--muted" : "", valueClassName].filter(Boolean).join(" ")}>

        {display}

      </dd>

    </div>

  );

}



export function EngagementRecordPanel({

  engagementId,

  engagement,

  saving,

  onReload,

  onError,

  onSavingChange,

  provider,

  organization,

}: {

  engagementId: string;

  engagement: Record<string, unknown>;

  planProgress?: { filled: number; total: number };

  prepareHref?: string;

  saving?: boolean;

  onReload?: () => Promise<void>;

  onError?: (message: string | null) => void;

  onSavingChange?: (v: boolean) => void;

  compact?: boolean;

  provider?: { id?: string; display_name?: string } | null;

  organization?: { id?: string; name?: string } | null;

  linkedCaseId?: string | null;

  caseNumber?: string | null;

  linkedOpportunity?: unknown;

  opportunityLinkOptions?: { id: string; label: string }[];

  onLinkOpportunity?: (opportunityId: string) => Promise<void>;

  onUnlinkOpportunity?: () => Promise<void>;

}) {

  const capture = useCaptureIntelligence();

  const record = React.useMemo(

    () => buildEngagementRecordView({ engagementId, engagement }),

    [engagement, engagementId],

  );



  const providerId =

    (provider?.id ? String(provider.id) : null) ||

    (engagement.provider_id ? String(engagement.provider_id) : null);

  const providerName = provider?.display_name ? String(provider.display_name) : "—";

  const organizationName = organization?.name ? String(organization.name) : "—";

  const archived = Boolean(String(engagement.archived_at ?? "").trim());

  const providerHref = providerId ? buildProviderOverviewHref(providerId) : null;

  const redirectAfterDeleteHref = providerHref ?? "/portal/sales/engagements";

  const detailActions = archived ? [] : record.detailActions;

  const isActiveEngagement = record.detailPhase === "active";

  const statusLower = String(engagement.status ?? "").trim().toLowerCase();

  const prepValueClass =

    record.detailPreparationLabel.toLowerCase() === "ready"

      ? "edh-value--prep-ready"

      : "edh-value--prep-not_started";



  const editControl =

    providerId && !archived ? (

      <EngagementEditControl

        engagementId={engagementId}

        engagement={engagement}

        providerId={providerId}

        disabled={saving}

        archived={archived}

        variant="secondary"

        className="engagement-record-action engagement-record-action--secondary engagement-edit-trigger"

        onSaved={onReload}

        onError={onError}

        onSavingChange={onSavingChange}

      />

    ) : null;

  const handleIntroDictateComplete = React.useCallback(() => {
    if (!providerId || saving) return;

    capture.open(
      buildCaptureIntelligenceOpenContext("mission_board", {
        providerId,
        providerLabel: providerName !== "—" ? providerName : undefined,
        organizationId: organization?.id ? String(organization.id) : undefined,
        organizationLabel: organizationName !== "—" ? organizationName : undefined,
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
              providerId,
              engagementId,
              narrative: result?.sourceText,
            });
            await onReload?.();
          } catch (err) {
            onError?.(userFacingError(err, "Could not finalize intro call."));
          }
        },
      },
    );
  }, [capture, engagementId, onError, onReload, organization, organizationName, providerId, providerName, saving]);

  const handleIntroMarkComplete = React.useCallback(async () => {
    if (!providerId || saving) return;

    onSavingChange?.(true);
    onError?.(null);
    try {
      await markMissionBoardIntroCallCompleteWithoutDictation({
        providerId,
        engagementId,
      });
      await onReload?.();
    } catch (err) {
      onError?.(userFacingError(err, "Could not mark intro call complete."));
    } finally {
      onSavingChange?.(false);
    }
  }, [engagementId, onError, onReload, onSavingChange, providerId, saving]);



  return (

    <>

      <style dangerouslySetInnerHTML={{ __html: engagementDetailHubCss }} />

      <div className={`edh${isActiveEngagement ? " edh--active" : ""}`}>

        <header className={`edh-header${isActiveEngagement ? " edh-header--active" : ""}`}>

          <div className="edh-header-main">

            <h1 className="edh-provider">

              {providerHref ? (

                <Link href={providerHref} className="edh-provider-link">

                  {providerName}

                </Link>

              ) : (

                providerName

              )}

            </h1>

            <p className="edh-organization">{organizationName}</p>

            <p className="edh-type">{record.typeLabel}</p>

          </div>

          <span className={`edh-badge edh-badge--${record.statusBadgeVariant}`}>{record.statusLabel}</span>

        </header>



        <section className="edh-command" aria-label="Engagement summary">

          <dl className="edh-command-grid">

            <SummaryRow label="Date" value={record.dateLabel} empty="Not scheduled" />

            <SummaryRow label="Time" value={record.timeLabel} empty="Not set" />

            <SummaryRow label="Location" value={record.locationLabel} empty="Not set" fullWidth />

            <SummaryRow

              label="Goal"

              value={record.objectiveLabel}

              fullWidth

              valueClassName="edh-value--goal"

            />

            {record.showPreparationStatus ? (

              <SummaryRow

                label="Preparation"

                value={record.detailPreparationLabel}

                valueClassName={prepValueClass}

              />

            ) : null}

            {record.showCompletedSummary && record.completedSummary ? (

              <>

                <SummaryRow label="Outcome" value={record.completedSummary.outcome} empty="Not recorded" />

                <SummaryRow

                  label="Completed"

                  value={record.completedSummary.completionDateLabel}

                  empty="Not recorded"

                />

                <SummaryRow

                  label="Summary"

                  value={record.completedSummary.summary}

                  empty="No summary yet"

                  fullWidth

                  valueClassName="edh-value--multiline"

                />

                <SummaryRow

                  label="Follow-up"

                  value={record.completedSummary.nextStep}

                  empty="Not set"

                  fullWidth

                />

              </>

            ) : null}

          </dl>



          {detailActions.length > 0 ? (

            <div className="edh-actions" role="group" aria-label="Engagement actions">

              {detailActions.map((action) => {

                if (action.kind === "edit") {

                  return editControl ? <React.Fragment key={action.id}>{editControl}</React.Fragment> : null;

                }

                const className = `engagement-record-action engagement-record-action--${action.variant === "primary" ? "primary" : "secondary"}`;

                if (action.kind === "start") {

                  return (

                    <StartEngagementButton

                      key={action.id}

                      engagementId={engagementId}

                      className={className}

                      disabled={saving}

                      onError={(message) => onError?.(message)}

                    />

                  );

                }

                if (action.kind === "intro_quick_complete") {

                  return (

                    <button

                      key={action.id}

                      type="button"

                      className={className}

                      disabled={saving || !providerId}

                      onClick={
                        action.id === "intro_dictate_complete"
                          ? handleIntroDictateComplete
                          : () => void handleIntroMarkComplete()
                      }

                    >

                      {action.label}

                    </button>

                  );

                }

                return (

                  <Link key={action.id} href={action.href} className={className}>

                    {action.label}

                  </Link>

                );

              })}

            </div>

          ) : null}

        </section>



        {!archived ? (

          <footer className="edh-footer">

            <EngagementArchiveControl

              engagementId={engagementId}

              archived={archived}

              redirectHref={redirectAfterDeleteHref}

              disabled={saving}

              className="edh-delete"

              triggerLabel={

                statusLower === "in_progress"

                  ? ENGAGEMENT_CANCEL_ENGAGEMENT_LABEL

                  : undefined

              }

              onError={onError}

              onBusyChange={onSavingChange}

            />

          </footer>

        ) : null}

      </div>

    </>

  );

}


