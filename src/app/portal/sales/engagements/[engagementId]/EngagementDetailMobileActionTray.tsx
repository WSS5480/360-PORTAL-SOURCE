"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { StartEngagementButton } from "@/components/sales/StartEngagementButton";
import {
  buildEngagementMobileActionTray,
  type EngagementMobileTrayAction,
} from "@/lib/surgical-sales/engagements/engagementMobileActionTray";

function TrayIcon({ kind }: { kind: "case" | "followup" | "more" | "briefing" | "intel" }) {
  const stroke = "currentColor";
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "case") {
    return (
      <svg {...common} aria-hidden>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h6" />
      </svg>
    );
  }
  if (kind === "followup") {
    return (
      <svg {...common} aria-hidden>
        <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    );
  }
  if (kind === "briefing") {
    return (
      <svg {...common} aria-hidden>
        <path d="M4 6h16M4 12h10M4 18h14" />
      </svg>
    );
  }
  if (kind === "intel") {
    return (
      <svg {...common} aria-hidden>
        <path d="M12 3v3M8 6l-1 2M16 6l1 2" />
        <path d="M5 11a7 7 0 0 1 14 0v2H5v-2z" />
        <path d="M9 21h6" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <circle cx="12" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function secondaryIconKind(id: string): "case" | "followup" | "more" {
  if (id === "case") return "case";
  if (id === "follow_up") return "followup";
  return "more";
}

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

export function EngagementDetailMobileActionTray({
  engagementId,
  status,
  linkedCaseId,
  hasProvider,
  engagement,
  saving,
  onLogUpdate,
}: {
  engagementId: string;
  status: string;
  linkedCaseId: string | null;
  hasProvider: boolean;
  engagement?: Record<string, unknown>;
  saving?: boolean;
  onLogUpdate: () => void;
}) {
  const router = useRouter();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement>(null);
  const tray = React.useMemo(
    () =>
      buildEngagementMobileActionTray({
        engagementId,
        status,
        linkedCaseId,
        hasProvider,
        engagement,
      }),
    [engagement, engagementId, hasProvider, linkedCaseId, status],
  );

  useCloseOnOutsideClick(moreOpen, () => setMoreOpen(false), moreRef);

  function runOverflowAction(action: EngagementMobileTrayAction) {
    setMoreOpen(false);
    if (action.href) {
      router.push(action.href);
      return;
    }
    if (action.action === "log_update") {
      onLogUpdate();
    }
  }

  function renderSegAction(action: EngagementMobileTrayAction) {
    const icon = secondaryIconKind(action.id);
    const label = action.id === "follow_up" ? "Follow-up" : action.label;

    if (action.action === "log_update") {
      return (
        <button
          key={action.id}
          type="button"
          className="edm-action-tray-seg-btn"
          disabled={saving}
          onClick={onLogUpdate}
        >
          <span className="edm-action-tray-seg-icon">
            <TrayIcon kind={icon} />
          </span>
          <span className="edm-action-tray-seg-label">{label}</span>
        </button>
      );
    }

    if (action.href) {
      return (
        <Link
          key={action.id}
          href={action.href}
          className="edm-action-tray-seg-btn"
          aria-disabled={saving}
          onClick={(e) => saving && e.preventDefault()}
        >
          <span className="edm-action-tray-seg-icon">
            <TrayIcon kind={icon} />
          </span>
          <span className="edm-action-tray-seg-label">{label}</span>
        </Link>
      );
    }

    return null;
  }

  function renderOverflowItem(action: EngagementMobileTrayAction) {
    if (action.href) {
      return (
        <Link
          key={action.id}
          href={action.href}
          className="edm-action-tray-menu-item"
          role="menuitem"
          aria-disabled={saving}
          onClick={(e) => {
            if (saving) e.preventDefault();
            setMoreOpen(false);
          }}
        >
          {action.label}
        </Link>
      );
    }
    return (
      <button
        key={action.id}
        type="button"
        className="edm-action-tray-menu-item"
        role="menuitem"
        disabled={saving}
        onClick={() => runOverflowAction(action)}
      >
        {action.label}
      </button>
    );
  }

  const primaryIcon =
    tray.primary.id === "intel" || tray.primary.id === "debrief" ? "intel" : "briefing";

  return (
    <footer className="edm-action-tray" aria-label="Engagement actions">
      <div className="edm-action-tray-inner">
        {tray.primary.action === "start_engagement" ? (
          <StartEngagementButton
            engagementId={engagementId}
            className="edm-action-tray-primary"
            disabled={saving}
          />
        ) : tray.primary.href ? (
          <Link
            href={tray.primary.href}
            className="edm-action-tray-primary"
            aria-disabled={saving}
            onClick={(e) => saving && e.preventDefault()}
          >
            <span className="edm-action-tray-primary-icon" aria-hidden>
              <TrayIcon kind={primaryIcon} />
            </span>
            <span className="edm-action-tray-primary-label">{tray.primary.label}</span>
          </Link>
        ) : (
          <button type="button" className="edm-action-tray-primary" disabled={saving}>
            <span className="edm-action-tray-primary-icon" aria-hidden>
              <TrayIcon kind={primaryIcon} />
            </span>
            <span className="edm-action-tray-primary-label">{tray.primary.label}</span>
          </button>
        )}

        <div className="edm-action-tray-seg" role="group" aria-label="Secondary actions">
          {tray.secondaries.map(renderSegAction)}
          <div className="edm-action-tray-more-wrap" ref={moreRef}>
            <button
              type="button"
              className="edm-action-tray-seg-btn edm-action-tray-seg-btn--more"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              disabled={saving}
              onClick={() => setMoreOpen((o) => !o)}
            >
              <span className="edm-action-tray-seg-icon">
                <TrayIcon kind="more" />
              </span>
              <span className="edm-action-tray-seg-label">More</span>
            </button>
            {moreOpen ? (
              <div className="edm-action-tray-menu" role="menu" aria-label="More engagement actions">
                {tray.overflow.map(renderOverflowItem)}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
