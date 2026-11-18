"use client";



import type { ObservationCaseExecutionStatusId } from "@/lib/surgical-sales/observationCaseExecutionStatus";

import {

  observationHeaderPrimaryAction,

  OBSERVATION_HEADER_ACTION_LABELS,

  type ObservationHeaderPrimaryActionId,

} from "@/lib/surgical-sales/buildObservationCaseHeaderControls";

import { canCompleteObservationLifecycle } from "@/lib/surgical-sales/observationCaseLifecycle";

import { OBSERVATION_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";

import { PRODUCT_SUPPORT_CAPTURE_OBSERVATION_LABEL } from "@/lib/surgical-sales/productSupportCaseDetailVocabulary";



type ActionIconKind = "note" | "debrief" | "upload" | "status" | "product" | "more" | "play" | "complete";



function MobileTabIcon({ kind }: { kind: ActionIconKind }) {

  const stroke = "currentColor";

  const common = {

    width: 16,

    height: 16,

    viewBox: "0 0 24 24",

    fill: "none",

    stroke,

    strokeWidth: 2,

    strokeLinecap: "round" as const,

    strokeLinejoin: "round" as const,

  };

  if (kind === "note") {

    return (

      <svg {...common} aria-hidden>

        <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />

      </svg>

    );

  }

  if (kind === "play") {

    return (

      <svg {...common} aria-hidden>

        <path d="M8 5v14l11-7z" />

      </svg>

    );

  }

  if (kind === "complete") {

    return (

      <svg {...common} aria-hidden>

        <path d="M9 11l3 3L22 4" />

        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />

      </svg>

    );

  }

  if (kind === "debrief") {

    return (

      <svg {...common} aria-hidden>

        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />

        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />

      </svg>

    );

  }

  if (kind === "upload") {

    return (

      <svg {...common} aria-hidden>

        <path d="M12 16V4M8 8l4-4 4 4" />

        <path d="M4 20h16" />

      </svg>

    );

  }

  if (kind === "status") {

    return (

      <svg {...common} aria-hidden>

        <circle cx="12" cy="12" r="9" />

        <path d="M8 12l2.5 2.5L16 9" />

      </svg>

    );

  }

  if (kind === "more") {

    return (

      <svg {...common} aria-hidden>

        <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />

        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />

        <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />

      </svg>

    );

  }

  return (

    <svg {...common} aria-hidden>

      <path d="M12 5v14M5 12h14" />

    </svg>

  );

}

function BottomBarAction({

  label,

  icon,

  primary,

  disabled,

  onClick,

}: {

  label: string;

  icon: ActionIconKind;

  primary?: boolean;

  disabled?: boolean;

  onClick: () => void;

}) {

  return (

    <button

      type="button"

      className={`case-mobile-tab-action${primary ? " case-mobile-tab-action--primary" : ""}`}

      onClick={onClick}

      disabled={disabled}

    >

      <span className="case-mobile-tab-action-icon">

        <MobileTabIcon kind={icon} />

      </span>

      <span className="case-mobile-tab-action-label">{label}</span>

    </button>

  );

}

function observationPrimaryActionIcon(actionId: ObservationHeaderPrimaryActionId): ActionIconKind {

  switch (actionId) {

    case "start_observation":

      return "play";

    case "complete_observation":

      return "complete";

    case "mark_completed":

      return "complete";

    case "view_intelligence":

      return "debrief";

    case "update_datetime":

      return "status";

    case "reopen_observation":

      return "play";

    default:

      return "play";

  }

}



export function CaseDetailMobileBottomBar({

  variant = "product_support",

  observationExecutionStatus,

  observationCaseDate,

  disabled,

  onAddNote,

  onObservationPrimaryAction,

  onCompleteObservation,

  onUpload,

  onMore,

  onStatus,

  onAddProduct,

}: {

  variant?: "observation" | "product_support";

  observationExecutionStatus?: ObservationCaseExecutionStatusId;

  observationCaseDate?: string | null;

  disabled?: boolean;

  onAddNote: () => void;

  onObservationPrimaryAction?: () => void;

  onCompleteObservation?: () => void;

  onUpload: () => void;

  onMore?: () => void;

  onStatus?: () => void;

  onAddProduct?: () => void;

}) {

  const isObservation = variant === "observation";

  const executionStatus = observationExecutionStatus ?? "scheduled";



  if (isObservation) {

    const primaryActionId = observationHeaderPrimaryAction(executionStatus, {
      caseDate: observationCaseDate,
    });

    const showComplete = canCompleteObservationLifecycle(executionStatus);

    const columnCount = showComplete ? 3 : 2;



    return (

      <nav className="case-bottom-action-shell case-bottom-action-shell--mobile" aria-label="Quick case actions">

        <div

          className="case-mobile-bottom-bar"

          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}

        >

          {primaryActionId ? (

            <BottomBarAction

              label={OBSERVATION_HEADER_ACTION_LABELS[primaryActionId]}

              icon={observationPrimaryActionIcon(primaryActionId)}

              primary

              disabled={disabled}

              onClick={onObservationPrimaryAction ?? onAddNote}

            />

          ) : null}

          {showComplete ? (

            <>

              <BottomBarAction

                label="Field notes"

                icon="note"

                disabled={disabled}

                onClick={onAddNote}

              />

              <BottomBarAction

                label={OBSERVATION_DETAIL_SECTION_LABELS.completeObservation}

                icon="complete"

                disabled={disabled}

                onClick={onCompleteObservation ?? onAddNote}

              />

            </>

          ) : null}

          <BottomBarAction label="More" icon="more" disabled={disabled} onClick={onMore ?? onAddNote} />

        </div>

      </nav>

    );

  }



  return (

    <nav className="case-bottom-action-shell case-bottom-action-shell--mobile" aria-label="Quick case actions">

      <div className="case-mobile-bottom-bar">

        <BottomBarAction

          label={PRODUCT_SUPPORT_CAPTURE_OBSERVATION_LABEL}

          icon="note"

          primary

          disabled={disabled}

          onClick={onAddNote}

        />

        <BottomBarAction label="Status" icon="status" disabled={disabled} onClick={onStatus ?? onAddNote} />

        <BottomBarAction label="Upload" icon="upload" disabled={disabled} onClick={onUpload} />

        <BottomBarAction label="More" icon="more" disabled={disabled} onClick={onMore ?? onAddNote} />

      </div>

    </nav>

  );

}
