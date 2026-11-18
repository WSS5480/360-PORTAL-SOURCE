"use client";

import type React from "react";
import { useState } from "react";
import { caseActivityMobileCss } from "./caseActivityMobileCss";

export type ActivityFeedCategory = "notes" | "discovery" | "system" | "workflow" | "products" | "documents";

export type MobileActivityFeedItem = {
  id: string;
  category: ActivityFeedCategory;
  title: string;
  timestamp: string;
  userLabel: string;
  details?: string;
  metaChips?: string[];
  pulseId?: string | null;
};

type ActivityFilter = { id: "all" | ActivityFeedCategory; label: string };

function ActivityCategoryIcon({ category }: { category: ActivityFeedCategory }) {
  const stroke = "currentColor";
  const common = {
    width: 13,
    height: 13,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const className = `case-activity-feed-icon case-activity-feed-icon--${category}`;
  if (category === "notes") {
    return (
      <span className={className} aria-hidden>
        <svg {...common}>
          <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
      </span>
    );
  }
  if (category === "discovery") {
    return (
      <span className={className} aria-hidden>
        <svg {...common}>
          <path d="M9 18h6" />
          <path d="M10 14h4" />
          <path d="M12 3a5 5 0 0 0-5 5v2h10V8a5 5 0 0 0-5-5z" />
        </svg>
      </span>
    );
  }
  if (category === "workflow") {
    return (
      <span className={className} aria-hidden>
        <svg {...common}>
          <path d="M5 12l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (category === "products") {
    return (
      <span className={className} aria-hidden>
        <svg {...common}>
          <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
        </svg>
      </span>
    );
  }
  if (category === "documents") {
    return (
      <span className={className} aria-hidden>
        <svg {...common}>
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
          <path d="M14 2v5h5" />
        </svg>
      </span>
    );
  }
  return (
    <span className={className} aria-hidden>
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </span>
  );
}

function ActivityQuickNote({
  disabled,
  busy,
  onSave,
  onAddCaseInsight,
  addCaseInsightLabel,
}: {
  disabled?: boolean;
  busy?: boolean;
  onSave: (body: string) => Promise<void>;
  onAddCaseInsight?: () => void;
  addCaseInsightLabel?: string;
}) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || disabled || saving || busy) return;
    setSaving(true);
    try {
      await onSave(trimmed);
      setBody("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="case-activity-quick-note" onSubmit={(event) => void submit(event)}>
      <span className="case-activity-quick-note-icon" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
      </span>
      <input
        type="text"
        className="case-activity-quick-note-input"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Add note…"
        disabled={disabled || saving || busy}
        aria-label="Add note"
      />
      <div className="case-activity-quick-note-actions">
        {onAddCaseInsight ? (
          <div className="case-activity-note-overflow" style={{ position: "relative" }}>
            <button
              type="button"
              className="case-activity-note-overflow-btn"
              aria-label="Note actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={disabled || saving || busy}
              onClick={() => setMenuOpen((open) => !open)}
            >
              ⋯
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="case-activity-note-overflow-menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 4px)",
                  zIndex: 5,
                  minWidth: 220,
                  padding: 6,
                  borderRadius: 10,
                  border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
                  background: "var(--surface)",
                  boxShadow: "0 8px 24px color-mix(in srgb, var(--foreground) 12%, transparent)",
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="case-activity-note-overflow-item"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    padding: "8px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    borderRadius: 8,
                  }}
                  onClick={() => {
                    setMenuOpen(false);
                    onAddCaseInsight();
                  }}
                >
                  {addCaseInsightLabel || "Add case insight to Provider Discovery"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        <button
          type="submit"
          className="case-activity-quick-note-submit"
          disabled={disabled || saving || busy || !body.trim()}
        >
          {saving ? "…" : "Post"}
        </button>
      </div>
    </form>
  );
}

function formatFeedTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function CaseDetailMobileActivityFeed({
  filters,
  activityFilter,
  onFilterChange,
  items,
  totalCount,
  disabled,
  busy,
  onSaveNote,
  onPromoteProviderIntelligence,
  onAddCaseInsight,
  addCaseInsightLabel,
  promoteActionLabel,
  pulseIds,
}: {
  filters: readonly ActivityFilter[];
  activityFilter: ActivityFilter["id"];
  onFilterChange: (id: ActivityFilter["id"]) => void;
  items: MobileActivityFeedItem[];
  totalCount: number;
  disabled?: boolean;
  busy?: boolean;
  onSaveNote: (body: string) => Promise<void>;
  onPromoteProviderIntelligence?: () => void;
  onAddCaseInsight?: () => void;
  addCaseInsightLabel?: string;
  promoteActionLabel?: string;
  pulseIds?: Set<string>;
}) {
  const showCaughtUp = items.length > 0;

  return (
    <section className="case-mobile-only case-activity-feed-mobile">
      <style dangerouslySetInnerHTML={{ __html: caseActivityMobileCss }} />
      <header className="case-activity-feed-head">
        <span className="case-activity-feed-kicker">Activity feed</span>
      </header>
      <div className="case-activity-feed-filters" role="tablist" aria-label="Activity filters">
        {filters.map((filter) => {
          const active = activityFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              className="case-activity-feed-filter"
              aria-pressed={active}
              onClick={() => onFilterChange(filter.id)}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
      <ActivityQuickNote
        disabled={disabled}
        busy={busy}
        onSave={onSaveNote}
        onAddCaseInsight={onAddCaseInsight}
        addCaseInsightLabel={addCaseInsightLabel}
      />
      {onPromoteProviderIntelligence ? (
        <div className="case-activity-promote-intel">
          <button
            type="button"
            className="case-activity-promote-intel-btn"
            data-surgical-press
            disabled={disabled || busy}
            onClick={onPromoteProviderIntelligence}
          >
            {promoteActionLabel || "Update provider intelligence from this case"}
          </button>
        </div>
      ) : null}
      <ul className="case-activity-feed-timeline">
        {items.length === 0 ? (
          <li className="case-activity-feed-empty">
            {totalCount === 0
              ? "No activity yet. Add a note or complete workflow steps to build the case record."
              : "No matching activity for this filter."}
          </li>
        ) : (
          items.map((item, index) => (
            <li
              key={item.id}
              className={[
                "case-activity-feed-item",
                item.pulseId && pulseIds?.has(item.pulseId) ? "surgical-timeline-row--new" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {index < items.length - 1 ? <span className="case-activity-feed-rail" aria-hidden /> : null}
              <ActivityCategoryIcon category={item.category} />
              <div className="case-activity-feed-main">
                <div className="case-activity-feed-title">{item.title}</div>
                {item.details ? <div className="case-activity-feed-details">{item.details}</div> : null}
                {item.metaChips && item.metaChips.length > 0 ? (
                  <div className="case-activity-feed-meta">
                    {item.metaChips.map((chip) => (
                      <span key={chip} className="case-activity-feed-meta-chip">
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="case-activity-feed-foot">
                  <time dateTime={item.timestamp}>{formatFeedTimestamp(item.timestamp)}</time>
                  <span aria-hidden>·</span>
                  <span>{item.userLabel}</span>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
      {showCaughtUp ? <p className="case-activity-feed-caught-up">You&apos;re all caught up</p> : null}
    </section>
  );
}
