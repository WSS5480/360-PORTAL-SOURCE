"use client";

import Link from "next/link";
import React from "react";
import {
  ENGAGEMENT_FIELD_BRIEFING_EMPTY_LEAD,
  ENGAGEMENT_FIELD_BRIEFING_EMPTY_TITLE,
  ENGAGEMENT_GENERATE_FIELD_BRIEFING_LABEL,
  formatEngagementFieldBriefingLabelFromRow,
  resolveEngagementBriefingStatus,
  type EngagementBriefingStatus,
} from "@/lib/surgical-sales/engagements/engagementPlanningModel";
import { openPrepareMissionClient } from "@/lib/surgical-sales/engagements/openPrepareMissionClient";
import { userFacingError } from "@/lib/errors/userFacingError";

export function EngagementFieldBriefingCard({
  engagementId,
  engagement,
  prepareHref,
  planFilled,
  planTotal,
  onReload,
}: {
  engagementId: string;
  engagement: Record<string, unknown>;
  prepareHref: string;
  planFilled: number;
  planTotal: number;
  onReload?: () => Promise<void>;
}) {
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const briefingStatus = resolveEngagementBriefingStatus(engagement);
  const statusLabel = formatEngagementFieldBriefingLabelFromRow(engagement);

  async function startFieldBriefing() {
    setStarting(true);
    setError(null);
    try {
      const result = await openPrepareMissionClient(engagementId);
      if (!result.ok) {
        throw new Error(result.message);
      }
      if (onReload) await onReload();
      window.location.href = prepareHref;
    } catch (e: unknown) {
      setError(userFacingError(e, "Could not start field briefing."));
    } finally {
      setStarting(false);
    }
  }

  return (
    <section
      className={`edm-record-briefing edm-record-briefing--${briefingStatus}`}
      aria-labelledby="edm-briefing-title"
    >
      <div className="edm-record-briefing-row">
        <div>
          <h3 id="edm-briefing-title" className="edm-record-section-title">
            Field briefing
          </h3>
          {briefingStatus === "not_planned" ? (
            <>
              <p className="edm-record-briefing-empty-title">{ENGAGEMENT_FIELD_BRIEFING_EMPTY_TITLE}</p>
              <p className="edm-record-briefing-empty-lead">{ENGAGEMENT_FIELD_BRIEFING_EMPTY_LEAD}</p>
            </>
          ) : (
            <>
              <p className="edm-record-briefing-status">{statusLabel}</p>
              <BriefingStatusHint
                status={briefingStatus}
                planFilled={planFilled}
                planTotal={planTotal}
                isPrepared={Boolean(engagement.prepared_at)}
              />
            </>
          )}
          {error ? <p className="edm-record-briefing-error">{error}</p> : null}
        </div>
        {briefingStatus === "not_planned" ? (
          <button
            type="button"
            className="edm-record-briefing-cta"
            onClick={() => void startFieldBriefing()}
            disabled={starting}
          >
            {starting ? "Opening…" : ENGAGEMENT_GENERATE_FIELD_BRIEFING_LABEL}
          </button>
        ) : (
          <Link href={prepareHref} className="edm-record-briefing-cta">
            Prepare
          </Link>
        )}
      </div>
    </section>
  );
}

function BriefingStatusHint({
  status,
  planFilled,
  planTotal,
  isPrepared,
}: {
  status: EngagementBriefingStatus;
  planFilled: number;
  planTotal: number;
  isPrepared: boolean;
}) {
  if (status === "planned") {
    if (isPrepared) {
      return <p className="edm-record-briefing-hint">Preparation is ready for this touchpoint.</p>;
    }
    if (planTotal > 0) {
      return (
        <p className="edm-record-briefing-hint">
          {planFilled}/{planTotal} prep fields saved.
        </p>
      );
    }
    return <p className="edm-record-briefing-hint">Briefing is ready to use before this touch.</p>;
  }

  if (planTotal > 0 && planFilled > 0) {
    return (
      <p className="edm-record-briefing-hint">
        {planFilled}/{planTotal} prep fields saved — finish when you are ready.
      </p>
    );
  }

  return <p className="edm-record-briefing-hint">Suggested prep is available in Field Briefing.</p>;
}
