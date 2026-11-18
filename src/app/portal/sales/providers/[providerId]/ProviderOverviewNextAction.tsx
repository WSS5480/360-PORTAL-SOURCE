"use client";

import Link from "next/link";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";

export function ProviderOverviewNextAction({
  label,
  href,
  reason,
  newEngagementHref,
  newCaseHref,
  createOpportunityHref,
  noteHref,
  onCaptureIntelligence,
}: {
  label: string;
  href: string;
  reason: string;
  newEngagementHref: string;
  newCaseHref: string;
  createOpportunityHref: string;
  noteHref: string;
  onCaptureIntelligence: () => void;
}) {
  const showNewEngagementOverflow = !href.includes("/engagements/new");

  return (
    <section className="provider-cc-next-action" aria-labelledby="provider-cc-next-action-title">
      <p id="provider-cc-next-action-title" className="provider-cc-next-action-kicker">
        Next recommended action
      </p>
      <div className="provider-cc-next-action-main">
        <Link href={href} className="provider-cc-next-action-cta">
          {label}
        </Link>
        <p className="provider-cc-next-action-reason">{reason}</p>
      </div>
      <div className="provider-cc-next-action-overflow provider-act-row provider-act-row--hierarchy">
        {showNewEngagementOverflow ? (
          <Link href={newEngagementHref} className="provider-act-btn">
            New engagement
          </Link>
        ) : null}
        {LOG_UPDATE_UI_ENABLED ? (
          <button
            type="button"
            className="provider-act-btn provider-act-btn--secondary"
            onClick={onCaptureIntelligence}
          >
            Log update
          </button>
        ) : null}
        <Link href={newCaseHref} className="provider-act-btn">
          Add case
        </Link>
        <Link href={createOpportunityHref} className="provider-act-btn">
          {OPPORTUNITY_UI.createFromProvider}
        </Link>
        <Link href={noteHref} className="provider-act-btn">
          Add note
        </Link>
      </div>
    </section>
  );
}
