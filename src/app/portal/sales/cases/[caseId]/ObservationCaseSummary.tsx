"use client";



import React from "react";

import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";

import {

  formatObservationCaseExecutionStatusLabel,

  resolveObservationCaseExecutionStatus,

} from "@/lib/surgical-sales/observationCaseExecutionStatus";

import { observationCaseBriefingCss } from "./observationCaseBriefingCss";

import { observationCaseSummaryCss } from "./observationCaseSummaryCss";



type SummaryActivity = { activity_type?: string };



export function ObservationCaseSummary({

  identity,

  caseRow,

  activities,

}: {

  identity: CaseIdentity;

  caseRow: Record<string, unknown>;

  activities?: SummaryActivity[];

}) {

  const executionStatus = React.useMemo(

    () => resolveObservationCaseExecutionStatus({ caseRow, activities }),

    [activities, caseRow],

  );

  const statusLabel = formatObservationCaseExecutionStatusLabel(executionStatus);

  const dateLabel = identity.dateLineWithTime || identity.dateLine;

  const contextLine = [identity.providerName, identity.facilityName, dateLabel].filter(Boolean).join(" · ");



  return (

    <section className="case-obs-summary case-obs-summary--compact" aria-label="Case context">

      <style dangerouslySetInnerHTML={{ __html: `${observationCaseBriefingCss}\n${observationCaseSummaryCss}` }} />

      <div className="case-obs-summary-compact">

        <p className="case-obs-summary-compact-line">{contextLine}</p>

        {identity.procedureType ? (

          <p className="case-obs-summary-compact-procedure">{identity.procedureType}</p>

        ) : null}

        <span className={`case-obs-summary-status case-obs-summary-status--${executionStatus}`}>

          {statusLabel}

        </span>

      </div>

    </section>

  );

}

