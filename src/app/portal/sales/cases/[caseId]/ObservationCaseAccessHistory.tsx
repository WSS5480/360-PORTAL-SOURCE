"use client";



import Link from "next/link";

import React from "react";

import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";

import { buildObservationAccessSummary } from "@/lib/surgical-sales/observationBriefingScope";

import {

  OBSERVATION_ACCESS_SUMMARY_LEAD,

  OBSERVATION_DETAIL_SECTION_LABELS,

} from "@/lib/surgical-sales/observationCaseDetailVocabulary";

import { observationCaseAccessHistoryCss } from "./observationCaseAccessHistoryCss";



function AccessLine({ label, value }: { label: string; value: string }) {

  if (!value.trim()) return null;

  return (

    <li className="case-obs-access-history-line">

      <span className="case-obs-access-history-label">{label}</span>

      <span className="case-obs-access-history-value">{value}</span>

    </li>

  );

}



export function ObservationCaseAccessHistory({

  caseId,

  caseRow,

  providerContact,

  engagement,

  identity,

}: {

  caseId: string;

  caseRow: Record<string, unknown>;

  providerContact?: Record<string, unknown> | null;

  engagement?: Record<string, unknown> | null;

  identity?: CaseIdentity;

}) {

  const summaryItems = React.useMemo(

    () =>

      buildObservationAccessSummary({

        caseRow,

        providerContact,

        dateLabel: identity?.dateLineWithTime ?? identity?.dateLine ?? null,

      }),

    [caseRow, identity?.dateLine, identity?.dateLineWithTime, providerContact],

  );



  const engagementId = String(engagement?.id ?? "").trim();

  const engagementTitle = String(engagement?.title ?? "").trim() || "Linked observation request";

  const engagementHref = engagementId ? `/portal/sales/engagements/${engagementId}` : null;



  return (

    <details className="case-obs-access-history">

      <style dangerouslySetInnerHTML={{ __html: observationCaseAccessHistoryCss }} />

      <summary className="case-obs-access-history-summary">

        <span className="case-obs-access-history-summary-title">

          {OBSERVATION_DETAIL_SECTION_LABELS.accessSummary}

        </span>

        <span className="case-obs-access-history-summary-note">Reference only — not OR mission</span>

      </summary>



      <div className="case-obs-access-history-body">

        <p className="case-obs-access-history-lead">{OBSERVATION_ACCESS_SUMMARY_LEAD}</p>



        {engagementHref ? (

          <section className="case-obs-access-history-block" aria-label="Related observation request">

            <h3 className="case-obs-access-history-block-title">

              {OBSERVATION_DETAIL_SECTION_LABELS.relatedRequest}

            </h3>

            <Link href={engagementHref} className="case-obs-access-history-link">

              {engagementTitle}

            </Link>

          </section>

        ) : null}



        <section className="case-obs-access-history-block" aria-label="Observation access summary">

          <ul className="case-obs-access-history-list">

            {summaryItems.map((item) => (

              <AccessLine key={`${item.label}-${item.value}`} label={item.label} value={item.value} />

            ))}

          </ul>

        </section>



        <Link href={`/portal/sales/cases/${caseId}#case-workspace`} className="case-obs-access-history-plan-link">

          Manage observation access

        </Link>

      </div>

    </details>

  );

}


