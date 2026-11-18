"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import { userFacingError } from "@/lib/errors/userFacingError";
import { buildEngagementDebriefHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import { PREPARE_PRE_CALL_PLAN_KICKER } from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import { prepareIntroCallCss } from "./prepareIntroCallCss";
import { preparePlaybookAssistantCss } from "./preparePlaybookAssistantCss";
import { preparePreCallPlanCss } from "./preparePreCallPlanCss";
import { prepareForMeetingMobileCss } from "./prepareForMeetingMobileCss";
import { prepareProviderDebriefCss } from "./prepareProviderDebriefCss";
import { PrepareForMeetingView } from "./PrepareForMeetingView";
import type { PrepareForMeetingView as PrepareView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import { missionControlCss } from "@/app/portal/sales/missionControl";

type PreparePayload = {
  ok?: boolean;
  error?: string;
  prepare?: PrepareView;
  engagement?: Record<string, unknown>;
};

export default function PrepareForMeetingPortalClient({ engagementId }: { engagementId: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<PrepareView | null>(null);
  const [engagement, setEngagement] = React.useState<Record<string, unknown> | null>(null);
  const [planningError, setPlanningError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const engagementDetailHref = `/portal/sales/engagements/${encodeURIComponent(engagementId)}`;

  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/open`,
        { method: "POST", cache: "no-store" },
      );
      const j = (await res.json()) as PreparePayload;
      if (!res.ok || !j.ok || !j.prepare || !j.engagement) {
        throw new Error(j.error || "");
      }
      setData(j.prepare);
      setEngagement(j.engagement);
    } catch (e: unknown) {
      setErr(userFacingError(e, "We could not open this pre-call plan. Please try again."));
      setData(null);
      setEngagement(null);
    } finally {
      if (!opts?.silent) setBusy(false);
    }
  }, [engagementId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!data) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("panel") === "debrief") {
      const mode = params.get("mode");
      router.replace(
        mode === "review"
          ? `${buildEngagementDebriefHref(engagementId)}?mode=review`
          : buildEngagementDebriefHref(engagementId),
      );
    }
  }, [data, engagementId, router]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `${missionControlCss}${preparePreCallPlanCss}${prepareIntroCallCss}${preparePlaybookAssistantCss}${prepareForMeetingMobileCss}${prepareProviderDebriefCss}`,
        }}
      />
      {busy ? (
        <div className="prepare-for-meeting-page">
          <header className="prepare-for-meeting-header">
            <div className="prepare-for-meeting-header-nav">
              <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
              <Link href={engagementDetailHref} className="prepare-for-meeting-back">
                ← Back
              </Link>
            </div>
            <div className="prepare-for-meeting-title-row">
              <div className="prepare-for-meeting-title-block">
                <h1 className="prepare-for-meeting-title">{PREPARE_PRE_CALL_PLAN_KICKER}</h1>
                <p className="prepare-for-meeting-sub">Loading…</p>
              </div>
            </div>
          </header>
        </div>
      ) : err || !data || !engagement ? (
        <div className="prepare-for-meeting-page">
          <header className="prepare-for-meeting-header">
            <div className="prepare-for-meeting-header-nav">
              <PortalMobileMenuButton className="sales-cmd-mobile-menu" />
              <Link href={engagementDetailHref} className="prepare-for-meeting-back">
                ← Back
              </Link>
            </div>
            <div className="prepare-for-meeting-title-row">
              <div className="prepare-for-meeting-title-block">
                <h1 className="prepare-for-meeting-title">{PREPARE_PRE_CALL_PLAN_KICKER}</h1>
              </div>
            </div>
          </header>
          <div className="prepare-for-meeting-body">
            <p className="pfm-precall-alert" role="alert">
              {err || "This pre-call plan is no longer available."}
            </p>
          </div>
        </div>
      ) : (
        <PrepareForMeetingView
          data={data}
          engagement={engagement}
          engagementDetailHref={engagementDetailHref}
          planningError={planningError}
          onPlanningError={setPlanningError}
          onEngagementUpdated={(row) => {
            setEngagement(row);
            void load({ silent: true });
          }}
          onPrepareRefresh={() => load({ silent: true })}
          actionError={actionError}
          onActionError={setActionError}
        />
      )}
    </>
  );
}
