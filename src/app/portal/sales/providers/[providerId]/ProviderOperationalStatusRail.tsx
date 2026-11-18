"use client";

import Link from "next/link";
import React from "react";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { PROVIDER_FIELD_OPS_CTA, PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import type { ProviderEngagementSummary } from "./providerProfileTypes";

function useCloseOnOutsideClick(open: boolean, onClose: () => void, ref: React.RefObject<HTMLDivElement | null>) {
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

export function ProviderOperationalStatusRail({
  headline,
  detail,
  newEngagementHref,
  newCaseHref,
  createOpportunityHref,
  noteHref,
  onLogFieldIntel,
  onDismiss,
}: {
  headline: string;
  detail: string;
  newEngagementHref: string;
  newCaseHref: string;
  createOpportunityHref: string;
  noteHref: string;
  onLogFieldIntel: () => void;
  onDismiss?: () => void;
}) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement>(null);
  useCloseOnOutsideClick(moreOpen, () => setMoreOpen(false), moreRef);

  return (
    <section className="pov-status-rail" aria-label={PROVIDER_FIELD_OPS_SECTION.operationalStatusRail}>
      <div className="pov-status-rail-head">
        <div className="pov-status-rail-copy">
          <p className="pov-status-rail-kicker">
            <span className="pov-status-rail-live" aria-hidden />
            {headline}
          </p>
          <p className="pov-status-rail-detail">{detail}</p>
        </div>
        {onDismiss ? (
          <button type="button" className="pov-status-rail-dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        ) : null}
      </div>
      <div className="pov-status-rail-actions" aria-label="Provider actions">
        <Link href={newEngagementHref} className="pov-status-rail-btn pov-status-rail-btn--primary">
          {PROVIDER_FIELD_OPS_CTA.startEngagement}
        </Link>
        {LOG_UPDATE_UI_ENABLED ? (
          <button type="button" className="pov-status-rail-btn pov-status-rail-btn--secondary" onClick={onLogFieldIntel}>
            {PROVIDER_FIELD_OPS_CTA.logFieldIntel}
          </button>
        ) : null}
        <div className="pov-status-rail-more" ref={moreRef}>
          <button
            type="button"
            className="pov-status-rail-btn pov-status-rail-btn--tertiary"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            onClick={() => setMoreOpen((o) => !o)}
          >
            More actions
            <span aria-hidden>{moreOpen ? " ▴" : " ▾"}</span>
          </button>
          {moreOpen ? (
            <div className="pov-status-rail-menu" role="menu">
              <Link href={newCaseHref} className="pov-status-rail-menu-item" role="menuitem" onClick={() => setMoreOpen(false)}>
                Add case
              </Link>
              <Link
                href={createOpportunityHref}
                className="pov-status-rail-menu-item"
                role="menuitem"
                onClick={() => setMoreOpen(false)}
              >
                {OPPORTUNITY_UI.createFromProvider}
              </Link>
              <Link href={noteHref} className="pov-status-rail-menu-item" role="menuitem" onClick={() => setMoreOpen(false)}>
                Add note
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function buildNewProviderStatusRailCopy(engagements: ProviderEngagementSummary[] | undefined): {
  headline: string;
  detail: string;
} {
  const count = engagements?.length ?? 0;
  if (count > 0) {
    return {
      headline: "Discovery active",
      detail: `${count} engagement${count === 1 ? "" : "s"} logged. Continue mapping workflow and access on this profile.`,
    };
  }
  return {
    headline: "Discovery active",
    detail: "No engagements logged yet. Workflow mapping has not started.",
  };
}
