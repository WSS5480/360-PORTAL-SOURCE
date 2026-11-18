"use client";



import React from "react";

import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";

import { deriveMissionBoardObservationCaseActions } from "@/lib/surgical-sales/deriveMissionBoardCardActions";

import type { ProviderObservationCasePreview } from "@/lib/surgical-sales/providerObservationCaseCollection";

import { MissionBoardObservationCaseActions } from "./MissionBoardObservationCaseActions";



const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10048 };

const panelStyle: React.CSSProperties = {

  ...sc.modalPanel,

  maxWidth: "min(560px, calc(100vw - 24px))",

};



const listStyle: React.CSSProperties = {

  display: "grid",

  gap: 10,

  margin: "0 0 16px",

  padding: 0,

  listStyle: "none",

};



const itemStyle: React.CSSProperties = {

  display: "grid",

  gap: 8,

  padding: "12px 14px",

  borderRadius: 10,

  border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",

  background: "color-mix(in srgb, var(--foreground) 2%, var(--surface))",

};



export function MissionBoardObservationQueueModal({

  providerName,

  cases,

  busy,

  onClose,

  onMarkComplete,

  onDictateComplete,

  onReschedule,

}: {

  providerName: string;

  cases: ProviderObservationCasePreview[];

  busy?: boolean;

  onClose: () => void;

  onMarkComplete: (caseId: string) => void;

  onDictateComplete: (observationCase: ProviderObservationCasePreview) => void;

  onReschedule: (observationCase: ProviderObservationCasePreview) => void;

}) {

  React.useEffect(() => {

    const onKey = (event: KeyboardEvent) => {

      if (event.key === "Escape") onClose();

    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);

  }, [onClose]);



  return (

    <div

      style={backdropStyle}

      onMouseDown={(event) => event.target === event.currentTarget && onClose()}

    >

      <div

        style={panelStyle}

        role="dialog"

        aria-modal

        aria-labelledby="mission-board-observation-queue-title"

        data-testid="mission-board-observation-queue-modal"

      >

        <style dangerouslySetInnerHTML={{ __html: surgicalCaseModalActionsCss }} />

        <h2

          id="mission-board-observation-queue-title"

          style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}

        >

          Scheduled observations ({cases.length})

        </h2>

        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--muted)" }}>

          Each action applies only to the listed case for {providerName}.

        </p>



        <ul style={listStyle}>

          {cases.map((observationCase) => (

            <li key={observationCase.caseId} style={itemStyle} data-testid="mission-board-queue-case">

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>

                <div style={{ minWidth: 0 }}>

                  <div style={{ fontSize: 14, fontWeight: 800 }}>

                    {observationCase.procedureLabel || "Procedure TBD"}

                  </div>

                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>

                    {[observationCase.dateTimeLabel, observationCase.facilityLabel]

                      .filter(Boolean)

                      .join(" · ")}

                  </div>

                </div>

                <span

                  style={{

                    flexShrink: 0,

                    fontSize: 11,

                    fontWeight: 800,

                    padding: "3px 8px",

                    borderRadius: 999,

                    border: "1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border))",

                    background: "color-mix(in srgb, var(--brand-600) 8%, var(--surface))",

                  }}

                >

                  {observationCase.statusLabel}

                </span>

              </div>

              <MissionBoardObservationCaseActions

                observationCase={observationCase}

                actions={deriveMissionBoardObservationCaseActions(observationCase)}

                busy={busy}

                layout="stack"

                onMarkComplete={onMarkComplete}

                onDictateComplete={(caseId, preview) => onDictateComplete(preview)}

                onReschedule={(caseId, preview) => onReschedule(preview)}

              />

            </li>

          ))}

        </ul>



        <div className="case-modal-actions">

          <button type="button" style={sc.btnPrimary} onClick={onClose}>

            Close

          </button>

        </div>

      </div>

    </div>

  );

}

