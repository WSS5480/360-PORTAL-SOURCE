"use client";



import React from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

import { providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";

import type { MissionBoardDebriefLauncherView } from "@/lib/surgical-sales/missionBoardDebriefLauncherView";

import {

  fetchMissionBoardDebriefLauncher,

  runMissionBoardDebriefLauncherAction,

} from "@/lib/surgical-sales/missionBoardDebriefLauncherClient";

import { MissionBoardEngagementCommandBrief } from "./MissionBoardEngagementCommandBrief";

import { MISSION_BOARD_DEBRIEF_REVIEW_LABEL } from "@/lib/surgical-sales/missionBoardDebriefComplete";

import {

  DEBRIEF_MISSION_COMMAND_SECONDARY_COMPLETE,

  DEBRIEF_MISSION_COMMAND_SECONDARY_PREPARE,

} from "@/lib/surgical-sales/missionBoardEngagementCommand";

import { MISSION_BOARD_DEBRIEF_LAUNCHER_TITLE } from "@/lib/surgical-sales/missionBoardDebriefLauncherUx";

import { missionBoardDebriefLauncherCss } from "./missionBoardDebriefLauncherCss";



const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10050 };

const panelStyle: React.CSSProperties = {

  ...sc.modalPanel,

  maxWidth: "min(520px, calc(100vw - 24px))",

};



export function MissionBoardDebriefLauncherModal({

  provider,

  busy,

  onClose,

  onLaunched,

}: {

  provider: ProviderDirectoryRow;

  busy?: boolean;

  /** @deprecated Completion routes through /debrief — no inline dictate panel */

  initialPanel?: "default" | "dictate";

  onClose: () => void;

  onLaunched?: () => void | Promise<void>;

  /** @deprecated */

  onCompleted?: () => void | Promise<void>;

}) {

  const router = useRouter();

  const providerName = providerDisplayName(provider);

  const [loading, setLoading] = React.useState(true);

  const [submitting, setSubmitting] = React.useState<"start" | "prepare" | null>(null);

  const [error, setError] = React.useState<string | null>(null);

  const [view, setView] = React.useState<MissionBoardDebriefLauncherView | null>(null);



  const disabled = Boolean(busy) || Boolean(submitting) || loading;

  const existing = view?.existingEngagement ?? null;

  const isDebriefComplete = Boolean(existing?.isDebriefComplete);

  const phase = existing?.lifecyclePhase;

  const primaryLabel = existing?.primaryActionLabel ?? DEBRIEF_MISSION_COMMAND_SECONDARY_PREPARE;



  React.useEffect(() => {

    setError(null);

  }, [provider.id]);



  React.useEffect(() => {

    let cancelled = false;

    async function load() {

      setLoading(true);

      setError(null);

      const result = await fetchMissionBoardDebriefLauncher(provider.id);

      if (cancelled) return;

      if (!result.ok) {

        setError(result.message);

        setView(null);

      } else {

        setView(result.view);

      }

      setLoading(false);

    }

    void load();

    return () => {

      cancelled = true;

    };

  }, [provider.id]);



  async function handleAction(action: "start" | "prepare") {

    if (disabled) return;

    setSubmitting(action);

    setError(null);

    try {

      const result = await runMissionBoardDebriefLauncherAction(provider.id, action);

      if (!result.ok) {

        setError(result.message);

        return;

      }

      await onLaunched?.();

      router.push(result.href);

    } finally {

      setSubmitting(null);

    }

  }



  function renderPrimaryAction() {

    if (isDebriefComplete && existing?.debriefReviewHref) {

      return (

        <Link

          href={existing.debriefReviewHref}

          className="mb-debrief-launcher__primary"

          data-testid="mission-board-debrief-review"

        >

          {MISSION_BOARD_DEBRIEF_REVIEW_LABEL}

        </Link>

      );

    }



    if (phase === "complete_debrief" && existing?.debriefCompleteHref) {

      return (

        <Link

          href={existing.debriefCompleteHref}

          className="mb-debrief-launcher__primary"

          data-testid="mission-board-debrief-complete"

          onClick={() => onClose()}

        >

          {DEBRIEF_MISSION_COMMAND_SECONDARY_COMPLETE}

        </Link>

      );

    }



    const action: "start" | "prepare" = phase === "scheduled" ? "prepare" : "start";



    return (

      <button

        type="button"

        className="mb-debrief-launcher__primary"

        disabled={disabled || !view}

        onClick={() => void handleAction(action)}

        data-testid={action === "prepare" ? "mission-board-debrief-prepare" : "mission-board-debrief-start"}

      >

        {submitting === action

          ? action === "prepare"

            ? "Opening…"

            : "Launching…"

          : primaryLabel}

      </button>

    );

  }



  return (

    <>

      <style dangerouslySetInnerHTML={{ __html: `${surgicalCaseModalActionsCss}\n${missionBoardDebriefLauncherCss}` }} />

      <div

        className="mission-board-debrief-launcher-backdrop"

        style={backdropStyle}

        onMouseDown={(event) => {

          if (event.target === event.currentTarget && !disabled) onClose();

        }}

      >

        <div

          className="mission-board-debrief-launcher-modal"

          style={panelStyle}

          role="dialog"

          aria-modal="true"

          aria-labelledby="mission-board-debrief-launcher-title"

          data-testid="mission-board-debrief-launcher-modal"

          onMouseDown={(event) => event.stopPropagation()}

        >

          <header className="mb-debrief-launcher__head">

            <p className="mb-debrief-launcher__kicker">{providerName}</p>

            <h2 id="mission-board-debrief-launcher-title" className="mb-debrief-launcher__title">

              {MISSION_BOARD_DEBRIEF_LAUNCHER_TITLE}

            </h2>

            {view?.organizationName ? (

              <p className="mb-debrief-launcher__org">{view.organizationName}</p>

            ) : null}

          </header>



          {loading ? (

            <p className="mb-debrief-launcher__loading" role="status">

              Loading debrief mission…

            </p>

          ) : view ? (

            <MissionBoardEngagementCommandBrief

              brief={{

                objective: view.objective,

                whatWeKnow: view.whatWeKnow,

                biggestUnknown: view.biggestUnknown,

                suggestedOpeningQuestion: view.suggestedOpeningQuestion,

              }}

              completeStateMessage={

                isDebriefComplete

                  ? "Debrief complete — review the saved outcome or start your next provider motion."

                  : null

              }

            />

          ) : null}



          {error ? (

            <p className="mb-debrief-launcher__error" role="alert">

              {error}

            </p>

          ) : null}



          <footer className="mb-debrief-launcher__actions">

            {renderPrimaryAction()}



            {!isDebriefComplete && phase === "active" && existing?.debriefCompleteHref ? (

              <Link

                href={existing.debriefCompleteHref}

                className="mb-debrief-launcher__secondary mb-debrief-launcher__complete"

                data-testid="mission-board-debrief-complete"

                onClick={() => onClose()}

              >

                {DEBRIEF_MISSION_COMMAND_SECONDARY_COMPLETE}

              </Link>

            ) : null}



            <button

              type="button"

              className="mb-debrief-launcher__cancel"

              disabled={Boolean(submitting)}

              onClick={onClose}

            >

              Cancel

            </button>

          </footer>

        </div>

      </div>

    </>

  );

}


