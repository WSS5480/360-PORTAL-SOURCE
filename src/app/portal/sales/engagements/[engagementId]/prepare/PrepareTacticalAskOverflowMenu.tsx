"use client";

import React from "react";
import type { TacticalAskDismissReason } from "@/lib/surgical-sales/engagements/prepareTacticalAsks";
import { TACTICAL_ASK_DISMISS_REASON_LABELS } from "@/lib/surgical-sales/engagements/prepareTacticalAsks";

export function PrepareTacticalAskOverflowMenu({
  open,
  onClose,
  onAnswer,
  onAskLater,
  onSkip,
  onFollowUp,
  onDismiss,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  onAnswer: () => void;
  onAskLater: () => void;
  onSkip: () => void;
  onFollowUp: () => void;
  onDismiss: (reason: TacticalAskDismissReason) => void;
  onRemove: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const dismissReasons = Object.entries(TACTICAL_ASK_DISMISS_REASON_LABELS) as [
    TacticalAskDismissReason,
    string,
  ][];

  return (
    <div className="pfm-ask-menu-wrap" ref={ref}>
      <menu className="pfm-ask-menu" aria-label="Ask actions">
        <li>
          <button type="button" onClick={() => { onAnswer(); onClose(); }}>
            Mark answered
          </button>
        </li>
        <li>
          <button type="button" onClick={() => { onAskLater(); onClose(); }}>
            Ask later
          </button>
        </li>
        <li>
          <button type="button" onClick={() => { onSkip(); onClose(); }}>
            Skip for this visit
          </button>
        </li>
        <li>
          <button type="button" onClick={() => { onFollowUp(); onClose(); }}>
            Convert to follow-up
          </button>
        </li>
        <li className="pfm-ask-menu-divider" role="separator" />
        {dismissReasons.map(([reason, label]) => (
          <li key={reason}>
            <button
              type="button"
              className="pfm-ask-menu--muted"
              onClick={() => {
                onDismiss(reason);
                onClose();
              }}
            >
              Dismiss — {label}
            </button>
          </li>
        ))}
        <li className="pfm-ask-menu-divider" role="separator" />
        <li>
          <button type="button" className="pfm-ask-menu--danger" onClick={() => { onRemove(); onClose(); }}>
            Remove
          </button>
        </li>
      </menu>
    </div>
  );
}
