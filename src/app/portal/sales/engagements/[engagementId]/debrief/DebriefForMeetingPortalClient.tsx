"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import { userFacingError } from "@/lib/errors/userFacingError";
import {
  buildEngagementDetailHref,
  buildEngagementPrepareForMeetingHref,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import {
  EngagementRepLifecycleStrip,
  engagementRepLifecycleStripCss,
} from "@/components/sales/EngagementRepLifecycleStrip";
import {
  ENGAGEMENT_CONTINUE_DEBRIEF_LABEL,
  ENGAGEMENT_VIEW_DEBRIEF_LABEL,
} from "@/lib/surgical-sales/engagements/engagementUiLabels";
import type { PrepareForMeetingView as PrepareView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import type { IntelligenceCaptureScope } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import { extractRawDebriefFromStoredNotes } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefRawNotes";
import { PrepareTacticalDebriefSheet, type DebriefSheetMode } from "../prepare/PrepareTacticalDebriefSheet";
import { prepareForMeetingMobileCss } from "../prepare/prepareForMeetingMobileCss";
import { PrepareForMeetingToast, usePrepareForMeetingToast } from "../prepare/PrepareForMeetingToast";
import type { TacticalDebriefSaveConfirmation } from "@/lib/surgical-sales/engagements/tacticalDebriefSaveConfirmation";

type PreparePayload = {
  ok?: boolean;
  error?: string;
  prepare?: PrepareView;
};

export default function DebriefForMeetingPortalClient({ engagementId }: { engagementId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = React.useState<PrepareView | null>(null);
  const [busy, setBusy] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [debriefError, setDebriefError] = React.useState<string | null>(null);
  const { toast, showToast } = usePrepareForMeetingToast();
  const skipNextDebriefSaveToastRef = React.useRef(false);

  const engagementDetailHref = buildEngagementDetailHref(engagementId);
  const debriefSheetMode: DebriefSheetMode =
    searchParams.get("mode") === "review" ? "review" : "capture";

  const load = React.useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/open`,
        { method: "POST", cache: "no-store" },
      );
      const j = (await res.json()) as PreparePayload;
      if (!res.ok || !j.ok || !j.prepare) throw new Error(j.error || "");
      setData(j.prepare);
    } catch (e: unknown) {
      setErr(userFacingError(e, "We could not open this debrief. Please try again."));
      setData(null);
    } finally {
      setBusy(false);
    }
  }, [engagementId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!data) return;
    const status = data.upcoming_engagement.status;
    if (status === "in_progress") {
      router.replace(`${buildEngagementDetailHref(engagementId)}/active`);
      return;
    }
    if (status !== "completed" && status !== "cancelled") {
      router.replace(buildEngagementPrepareForMeetingHref(engagementId));
    }
  }, [data, engagementId, router]);

  const captureScope: IntelligenceCaptureScope | null = data?.capture_scope ?? null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: prepareForMeetingMobileCss }} />
      <PrepareForMeetingToast toast={toast} />
      <div className="prepare-for-meeting-page prepare-for-meeting-page--debrief-phase">
        <header className="prepare-for-meeting-header">
          <div className="prepare-for-meeting-header-nav">
            <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
            <Link href={engagementDetailHref} className="prepare-for-meeting-back">
              ← Engagement
            </Link>
          </div>
          <div className="prepare-for-meeting-title-row">
            <div className="prepare-for-meeting-title-block">
              <h1 className="prepare-for-meeting-title">
                {debriefSheetMode === "review" ? ENGAGEMENT_VIEW_DEBRIEF_LABEL : ENGAGEMENT_CONTINUE_DEBRIEF_LABEL}
              </h1>
              <p className="prepare-for-meeting-sub">
                {data?.provider_snapshot.display_name ?? (busy ? "Loading…" : "")}
              </p>
            </div>
          </div>
        </header>

        {!busy && data ? (
          <div style={{ padding: "0 clamp(14px, 4vw, 20px) 12px", maxWidth: 640, margin: "0 auto" }}>
            <EngagementRepLifecycleStrip
              phase={debriefSheetMode === "review" ? "completed" : "debrief_needed"}
              nextActionLabel={
                debriefSheetMode === "review" ? null : ENGAGEMENT_CONTINUE_DEBRIEF_LABEL
              }
              variant="light"
            />
          </div>
        ) : null}

        {debriefError ? (
          <p className="prepare-for-meeting-alert" role="alert">
            {debriefError}
          </p>
        ) : null}
        {err ? (
          <p className="prepare-for-meeting-alert" role="alert">
            {err}
          </p>
        ) : null}

        {data && captureScope ? (
          <PrepareTacticalDebriefSheet
            open
            engagementId={data.engagement_id}
            engagementDetailHref={engagementDetailHref}
            captureScope={captureScope}
            initialNarrative={extractRawDebriefFromStoredNotes(data.outcome.notes)}
            initialMode={debriefSheetMode}
            debriefCompleted={data.outcome.debrief_completed}
            existingNextAction={data.plan_fields.next_action}
            existingDebriefSnapshot={data.debrief_intelligence_snapshot}
            linkedCaseId={data.provider_debrief_briefing.linked_case_id}
            captureHint={data.outcome.capture_hint}
            onClose={(redirectTo) => router.push(redirectTo ?? engagementDetailHref)}
            onSaved={load}
            onError={setDebriefError}
            onIntelligenceApplied={(confirmation: TacticalDebriefSaveConfirmation) => {
              const handoff = confirmation.mappingHandoff;
              if (handoff?.updateCount) {
                skipNextDebriefSaveToastRef.current = true;
                showToast(handoff.toastMessage, "success", handoff.reviewMappingHref
                  ? { label: "Review Findings", href: handoff.reviewMappingHref }
                  : undefined);
              }
            }}
            onSaveSuccess={(message) => {
              if (skipNextDebriefSaveToastRef.current) {
                skipNextDebriefSaveToastRef.current = false;
                return;
              }
              showToast(message, "success");
            }}
          />
        ) : null}
      </div>
    </>
  );
}
