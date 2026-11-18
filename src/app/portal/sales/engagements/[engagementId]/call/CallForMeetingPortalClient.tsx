"use client";



import { useRouter } from "next/navigation";

import React from "react";

import { userFacingError } from "@/lib/errors/userFacingError";

import { endEngagementCallClient } from "@/lib/surgical-sales/engagements/endEngagementCallClient";

import {
  buildEngagementDebriefHref,
  buildEngagementPrepareForMeetingHref,
} from "@/lib/surgical-sales/engagements/engagementLifecycle";

import type { PrepareForMeetingView as PrepareView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";

import type { StartMissionOutcomeId } from "@/lib/surgical-sales/engagements/startMissionConfig";

import { LiveCallWorkspace } from "./LiveCallWorkspace";

import { engagementRepLifecycleStripCss } from "@/components/sales/EngagementRepLifecycleStrip";
import { liveCallWorkspaceCss } from "./liveCallWorkspaceCss";
import { liveEngagementBriefEditCss } from "./liveEngagementBriefEditCss";



type PreparePayload = {

  ok?: boolean;

  error?: string;

  prepare?: PrepareView;

};



export default function CallForMeetingPortalClient({ engagementId }: { engagementId: string }) {

  const router = useRouter();

  const [data, setData] = React.useState<PrepareView | null>(null);

  const [busy, setBusy] = React.useState(true);

  const [err, setErr] = React.useState<string | null>(null);

  const [phaseError, setPhaseError] = React.useState<string | null>(null);

  const [endingEngagement, setEndingEngagement] = React.useState(false);

  const navigatedToDebriefRef = React.useRef(false);



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

      setErr(userFacingError(e, "We could not open this engagement. Please try again."));

      setData(null);

    } finally {

      setBusy(false);

    }

  }, [engagementId]);



  React.useEffect(() => {

    void load();

  }, [load]);



  React.useEffect(() => {

    if (busy || !data) return;

    const status = data.upcoming_engagement.status;

    if (status === "planned") {

      router.replace(buildEngagementPrepareForMeetingHref(engagementId));

      return;

    }

    if (status === "completed") {

      navigatedToDebriefRef.current = true;

      router.replace(buildEngagementDebriefHref(engagementId));

    }

  }, [busy, data, engagementId, router]);



  async function handleEndEngagement(outcomeId: StartMissionOutcomeId | null, liveNotes: string) {

    setEndingEngagement(true);

    setPhaseError(null);

    try {

      const result = await endEngagementCallClient(
        engagementId,
        outcomeId ?? undefined,
        liveNotes,
      );

      if (!result.ok) {

        setPhaseError(result.message);

        return;

      }

      navigatedToDebriefRef.current = true;

      router.replace(result.debriefHref);

    } finally {

      setEndingEngagement(false);

    }

  }



  const alert = phaseError || err;



  return (

    <>

      <style
        dangerouslySetInnerHTML={{
          __html: `${liveCallWorkspaceCss}${liveEngagementBriefEditCss}${engagementRepLifecycleStripCss}`,
        }}
      />

      <div className="live-call-page">

        {busy ? (

          <p className="live-call-page--loading">Loading engagement…</p>

        ) : !data ? (

          <p className="live-call-page--error" role="alert">

            {alert || "This engagement is no longer available."}

          </p>

        ) : (

          <>

            {alert ? (

              <div style={{ padding: "12px var(--live-call-pad-x) 0" }}>

                <p className="live-call-page__alert" role="alert">

                  {alert}

                </p>

              </div>

            ) : null}

            <LiveCallWorkspace

              engagementId={engagementId}

              data={data}

              onReload={load}

              onError={setPhaseError}

              onEndEngagement={handleEndEngagement}

              endingEngagement={endingEngagement}

            />

          </>

        )}

      </div>

    </>

  );

}


