"use client";

import Link from "next/link";
import type React from "react";
import { useMemo, useState } from "react";
import SalesCrmConfirmModal from "@/components/sales/SalesCrmConfirmModal";
import { sc } from "@/components/sales/salesCommandUi";
import {
  activityFeedItemIsDeletable,
  filterUnifiedFeedItems,
  UNIFIED_ACTIVITY_FEED_FILTERS,
  type UnifiedActivityFeedFilterId,
  type UnifiedActivityFeedItem,
} from "@/lib/activity/activityFeedPresentation";
import "./unifiedActivityFeed.css";

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function CategoryIcon({ category }: { category: UnifiedActivityFeedItem["category"] }) {
  const glyphs: Record<UnifiedActivityFeedItem["category"], string> = {
    notes: "✎",
    workflow: "✓",
    products: "◫",
    documents: "📄",
    system: "◎",
    ai: "✦",
  };
  return (
    <span
      className={`unified-activity-feed-icon${category === "ai" ? " unified-activity-feed-icon--ai" : ""}`}
      aria-hidden
    >
      {glyphs[category]}
    </span>
  );
}

export function UnifiedActivityFeed({
  items,
  loading,
  activityFilter,
  onFilterChange,
  totalCount,
  disabled,
  busy,
  onSaveNote,
  notePlaceholder = "Add note…",
  headerExtra,
  promoteAction,
  itemPromoteAction,
  onDeleteItem,
  pulseIds,
  className,
}: {
  items: UnifiedActivityFeedItem[];
  loading?: boolean;
  activityFilter: UnifiedActivityFeedFilterId;
  onFilterChange: (id: UnifiedActivityFeedFilterId) => void;
  totalCount: number;
  disabled?: boolean;
  busy?: boolean;
  onSaveNote?: (body: string) => Promise<void>;
  notePlaceholder?: string;
  headerExtra?: React.ReactNode;
  promoteAction?: { label: string; onClick: () => void };
  /** Per-timeline-row action (e.g. promote intelligence from a workflow note). */
  itemPromoteAction?: (item: UnifiedActivityFeedItem) => { label: string; onClick: () => void } | null;
  onDeleteItem?: (item: UnifiedActivityFeedItem) => Promise<void>;
  pulseIds?: Set<string>;
  className?: string;
}) {
  const [noteBody, setNoteBody] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<UnifiedActivityFeedItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(
    () => filterUnifiedFeedItems(items, activityFilter),
    [items, activityFilter],
  );

  const submitNote = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = noteBody.trim();
    if (!trimmed || !onSaveNote || noteSaving || busy || disabled) return;
    setNoteSaving(true);
    try {
      await onSaveNote(trimmed);
      setNoteBody("");
    } finally {
      setNoteSaving(false);
    }
  };

  return (
    <section className={["unified-activity-feed", className].filter(Boolean).join(" ")}>
      <header className="unified-activity-feed-head">
        <span className="unified-activity-feed-kicker">Activity</span>
      </header>

      <div className="unified-activity-feed-filters" role="tablist" aria-label="Activity filters">
        {UNIFIED_ACTIVITY_FEED_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            className="unified-activity-feed-filter"
            aria-pressed={activityFilter === filter.id}
            onClick={() => onFilterChange(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {onSaveNote || headerExtra || promoteAction ? (
        <div className="unified-activity-feed-toolbar">
          {onSaveNote ? (
            <form onSubmit={(e) => void submitNote(e)} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder={notePlaceholder}
                disabled={disabled || noteSaving || busy}
                style={{ ...sc.input, flex: 1, minWidth: 0 }}
                aria-label="Add note"
              />
              <button type="submit" style={sc.btnPrimary} disabled={disabled || noteSaving || busy || !noteBody.trim()}>
                {noteSaving ? "…" : "Post"}
              </button>
            </form>
          ) : null}
          {headerExtra}
          {promoteAction ? (
            <button
              type="button"
              style={sc.btnSecondary}
              disabled={disabled || busy}
              onClick={promoteAction.onClick}
            >
              {promoteAction.label}
            </button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="unified-activity-feed-empty">Loading activity…</p>
      ) : (
        <ul className="unified-activity-feed-timeline">
          {filtered.length === 0 ? (
            <li className="unified-activity-feed-empty">
              {totalCount === 0 ? "No activity yet." : "No matching activity for this filter."}
            </li>
          ) : (
            filtered.map((item, index) => (
              <li
                key={item.id}
                className={[
                  "unified-activity-feed-item",
                  item.pulseId && pulseIds?.has(item.pulseId) ? "unified-activity-feed-item--pulse" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {index < filtered.length - 1 ? <span className="unified-activity-feed-rail" aria-hidden /> : null}
                <CategoryIcon category={item.category} />
                <div style={{ minWidth: 0 }}>
                  <div className="unified-activity-feed-title-row">
                    <div className="unified-activity-feed-title">
                      {item.href ? (
                        <Link href={item.href} style={sc.linkBrand}>
                          {item.title}
                        </Link>
                      ) : (
                        item.title
                      )}
                      {item.aiGenerated ? (
                        <span className="unified-activity-feed-meta-chip" style={{ marginLeft: 6 }}>
                          AI
                        </span>
                      ) : null}
                    </div>
                    {onDeleteItem && activityFeedItemIsDeletable(item) ? (
                      <button
                        type="button"
                        className="unified-activity-feed-delete"
                        disabled={disabled || busy || deleting}
                        onClick={() => setPendingDeleteItem(item)}
                        aria-label="Delete note"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                  {item.summary ? <div className="unified-activity-feed-summary">{item.summary}</div> : null}
                  {item.metaChips && item.metaChips.length > 0 ? (
                    <div className="unified-activity-feed-meta">
                      {item.metaChips.map((chip) => (
                        <span key={chip} className="unified-activity-feed-meta-chip">
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {itemPromoteAction ? (() => {
                    const rowAction = itemPromoteAction(item);
                    return rowAction ? (
                      <div className="unified-activity-feed-item-actions">
                        <button
                          type="button"
                          style={sc.btnGhost}
                          disabled={disabled || busy}
                          onClick={rowAction.onClick}
                        >
                          {rowAction.label}
                        </button>
                      </div>
                    ) : null;
                  })() : null}
                  <div className="unified-activity-feed-foot">
                    <time dateTime={item.timestamp}>{formatTimestamp(item.timestamp)}</time>
                    <span aria-hidden>·</span>
                    <span>{item.userLabel}</span>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
      {!loading && filtered.length > 0 ? (
        <p className="unified-activity-feed-caught-up">You&apos;re all caught up</p>
      ) : null}

      <SalesCrmConfirmModal
        open={pendingDeleteItem != null}
        title="Delete this note?"
        message="This removes the note from activity history."
        confirmLabel="Delete note"
        danger
        busy={deleting}
        onClose={() => !deleting && setPendingDeleteItem(null)}
        onConfirm={async () => {
          if (!pendingDeleteItem || !onDeleteItem) return;
          setDeleting(true);
          try {
            await onDeleteItem(pendingDeleteItem);
            setPendingDeleteItem(null);
          } finally {
            setDeleting(false);
          }
        }}
      />
    </section>
  );
}
