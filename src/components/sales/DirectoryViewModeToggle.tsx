"use client";

import React from "react";
import type { DirectoryViewMode } from "@/lib/surgical-sales/directoryViewMode";

const DEFAULT_MODES: {
  id: DirectoryViewMode;
  label: string;
  title: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "mission",
    label: "Mission",
    title: "Mission view — what should I do next?",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "operations",
    label: "Operations",
    title: "Operations view — portfolio operational state",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
  },
];

export function DirectoryViewModeToggle({
  value,
  onChange,
  className,
  panelIdPrefix = "directory-view",
  "aria-label": ariaLabel = "List view",
  modes = DEFAULT_MODES,
}: {
  value: DirectoryViewMode;
  onChange: (mode: DirectoryViewMode) => void;
  className?: string;
  panelIdPrefix?: string;
  "aria-label"?: string;
  modes?: typeof DEFAULT_MODES;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const focusMode = (mode: DirectoryViewMode) => {
    const idx = modes.findIndex((m) => m.id === mode);
    refs.current[idx]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = e.key === "ArrowRight" ? (index + 1) % modes.length : (index - 1 + modes.length) % modes.length;
    const mode = modes[next].id;
    onChange(mode);
    focusMode(mode);
  };

  return (
    <div
      className={className ? `directory-view-mode-toggle ${className}` : "directory-view-mode-toggle"}
      role="tablist"
      aria-label={ariaLabel}
    >
      {modes.map((mode, index) => {
        const active = value === mode.id;
        return (
          <button
            key={mode.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`${panelIdPrefix}-tab-${mode.id}`}
            aria-selected={active}
            aria-controls={`${panelIdPrefix}-panel-${mode.id}`}
            tabIndex={active ? 0 : -1}
            title={mode.title}
            className={`directory-view-mode-toggle__btn${active ? " directory-view-mode-toggle__btn--active" : ""}`}
            onClick={() => onChange(mode.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            <span className="directory-view-mode-toggle__icon">{mode.icon}</span>
            <span className="directory-view-mode-toggle__label">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
