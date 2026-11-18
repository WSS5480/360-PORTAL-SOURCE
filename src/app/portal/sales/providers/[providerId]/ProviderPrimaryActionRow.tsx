"use client";

import Link from "next/link";
import React from "react";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";

export type ProviderActionItem = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
};

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

export function ProviderPrimaryActionRow({
  primaryAction,
  newEngagementHref,
  newCaseHref,
  createOpportunityHref,
  noteHref,
  onCaptureIntelligence,
  logUpdateLabel = "Log field update",
}: {
  /** Contextual recommended action (mobile briefing primary CTA). */
  primaryAction?: { label: string; href: string } | null;
  newEngagementHref: string;
  newCaseHref: string;
  createOpportunityHref: string;
  noteHref: string;
  onCaptureIntelligence: () => void;
  logUpdateLabel?: string;
}) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement>(null);

  const primary = primaryAction ?? { label: "New engagement", href: newEngagementHref };
  const showNewEngagementInOverflow = !primary.href.includes("/engagements/new");

  const overflowActions: ProviderActionItem[] = [
    ...(showNewEngagementInOverflow ? [{ id: "engagement", label: "New engagement", href: newEngagementHref }] : []),
    { id: "case", label: "Add Case", href: newCaseHref },
    { id: "initiative", label: OPPORTUNITY_UI.createFromProvider, href: createOpportunityHref },
    { id: "note", label: "Add Note", href: noteHref },
  ];

  useCloseOnOutsideClick(moreOpen, () => setMoreOpen(false), moreRef);

  function renderMenuItem(action: ProviderActionItem) {
    if (action.href) {
      return (
        <Link
          key={action.id}
          href={action.href}
          className="provider-act-menu-item"
          role="menuitem"
          onClick={() => setMoreOpen(false)}
        >
          {action.label}
        </Link>
      );
    }
    return (
      <button
        key={action.id}
        type="button"
        className="provider-act-menu-item"
        role="menuitem"
        onClick={() => {
          action.onClick?.();
          setMoreOpen(false);
        }}
      >
        {action.label}
      </button>
    );
  }

  return (
    <div className="provider-act-row provider-act-row--hierarchy" aria-label="Provider actions">
      <div className="provider-act-primary-group">
        <Link href={primary.href} className="provider-act-btn provider-act-btn--primary">
          {primary.label}
        </Link>
        {LOG_UPDATE_UI_ENABLED ? (
          <button
            type="button"
            className="provider-act-btn provider-act-btn--secondary"
            onClick={onCaptureIntelligence}
          >
            {logUpdateLabel}
          </button>
        ) : null}
      </div>

      <div className="provider-act-more-wrap" ref={moreRef}>
        <button
          type="button"
          className="provider-act-btn provider-act-btn--overflow provider-act-more-trigger"
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          onClick={() => setMoreOpen((o) => !o)}
        >
          More actions
          <span className="provider-act-more-chevron" aria-hidden>
            {moreOpen ? "▴" : "▾"}
          </span>
        </button>
        {moreOpen ? (
          <div className="provider-act-menu" role="menu" aria-label="More provider actions">
            {overflowActions.map(renderMenuItem)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
