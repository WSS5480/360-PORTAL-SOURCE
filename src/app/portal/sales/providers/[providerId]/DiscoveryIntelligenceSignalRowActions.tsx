"use client";



import React from "react";

import type { WorkflowRowAction } from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";

import { DISCOVERY_INTELLIGENCE_UI } from "@/lib/surgical-sales/discoveryIntelligenceCopy";

import { discoverySignalActions } from "@/lib/surgical-sales/discoveryIntelligenceBriefingPresentation";

import type { DiscoveryIntelligenceSignalRow } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";



function useCloseOnOutsideClick(

  open: boolean,

  onClose: () => void,

  ref: React.RefObject<HTMLDivElement | null>,

) {

  React.useEffect(() => {

    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {

      if (ref.current?.contains(e.target as Node)) return;

      onClose();

    };

    const onKeyDown = (e: KeyboardEvent) => {

      if (e.key === "Escape") onClose();

    };

    document.addEventListener("mousedown", onPointerDown);

    document.addEventListener("keydown", onKeyDown);

    return () => {

      document.removeEventListener("mousedown", onPointerDown);

      document.removeEventListener("keydown", onKeyDown);

    };

  }, [open, onClose, ref]);

}



/** Intelligence tab — one inline action; remainder in a menu (revealed on row hover/focus). */

export function DiscoveryIntelligenceSignalRowActions({

  row,

  busyActionId,

  onAction,

}: {

  row: DiscoveryIntelligenceSignalRow;

  busyActionId?: string | null;

  onAction: (action: WorkflowRowAction) => void;

}) {

  const [menuOpen, setMenuOpen] = React.useState(false);

  const menuRef = React.useRef<HTMLDivElement>(null);



  useCloseOnOutsideClick(menuOpen, () => setMenuOpen(false), menuRef);



  const allActions = discoverySignalActions(row);

  const headline = allActions[0];

  const secondary = allActions.slice(1);



  if (!headline && secondary.length === 0) {

    return null;

  }



  const run = (action: WorkflowRowAction) => {

    setMenuOpen(false);

    onAction(action);

  };



  const solo = secondary.length === 0;

  return (

    <div
      className={`dig-signal-actions-inner${menuOpen ? " dig-signal-actions-inner--open" : ""}${solo ? " dig-signal-actions-inner--solo" : ""}`}
    >

      {headline ? (

        <button

          type="button"

          className="dig-action dig-action--primary dig-action--signal"

          disabled={busyActionId === headline.id}

          onClick={() => run(headline)}

        >

          {headline.label}

        </button>

      ) : null}



      {secondary.length > 0 ? (

        <div className="dig-action-more" ref={menuRef}>

          <button

            type="button"

            className="dig-action dig-action--more"

            aria-expanded={menuOpen}

            aria-haspopup="menu"

            aria-label={DISCOVERY_INTELLIGENCE_UI.briefingMoreActionsAria}

            onClick={() => setMenuOpen((open) => !open)}

          >

            {DISCOVERY_INTELLIGENCE_UI.briefingMoreActions}

          </button>

          {menuOpen ? (

            <div className="dig-action-menu" role="menu">

              {secondary.map((action) => (

                <button

                  key={action.id}

                  type="button"

                  className="dig-action-menu-item"

                  role="menuitem"

                  disabled={busyActionId === action.id}

                  onClick={() => run(action)}

                >

                  {action.label}

                </button>

              ))}

            </div>

          ) : null}

        </div>

      ) : null}

    </div>

  );

}

