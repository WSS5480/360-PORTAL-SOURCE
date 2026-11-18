"use client";

import React from "react";
import SalesCrmConfirmModal from "@/components/sales/SalesCrmConfirmModal";
import type { ProductSupportFieldNoteEntry } from "@/lib/surgical-sales/buildProductSupportFieldNoteTimeline";
import { formatProductSupportFieldNoteTime } from "@/lib/surgical-sales/buildProductSupportFieldNoteTimeline";

export function CaseFieldNoteList({
  entries,
  disabled,
  onDeleteNote,
  itemClassName = "case-obs-execution-note-item",
  timeClassName = "case-obs-execution-note-time",
  bodyClassName = "case-obs-execution-note-body",
}: {
  entries: ProductSupportFieldNoteEntry[];
  disabled?: boolean;
  onDeleteNote?: (noteId: string) => Promise<void>;
  itemClassName?: string;
  timeClassName?: string;
  bodyClassName?: string;
}) {
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  if (entries.length === 0) return null;

  return (
    <>
      {entries.map((entry) => (
        <article key={entry.id} className={itemClassName}>
          <div className="case-field-note-item-head">
            <p className={timeClassName}>
              <time dateTime={entry.timestamp}>{formatProductSupportFieldNoteTime(entry.timestamp)}</time>
            </p>
            {onDeleteNote && entry.noteId ? (
              <button
                type="button"
                className="case-field-note-delete"
                disabled={disabled || deleting}
                onClick={() => setPendingDeleteId(entry.noteId)}
                aria-label="Delete note"
                title="Delete note"
              >
                Delete
              </button>
            ) : null}
          </div>
          <p className={bodyClassName}>{entry.body}</p>
        </article>
      ))}

      <SalesCrmConfirmModal
        open={pendingDeleteId != null}
        title="Delete this note?"
        message="This removes the note and any intelligence extracted from it on this case."
        confirmLabel="Delete note"
        danger
        busy={deleting}
        onClose={() => !deleting && setPendingDeleteId(null)}
        onConfirm={async () => {
          if (!pendingDeleteId || !onDeleteNote) return;
          setDeleting(true);
          try {
            await onDeleteNote(pendingDeleteId);
            setPendingDeleteId(null);
          } finally {
            setDeleting(false);
          }
        }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
.case-field-note-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.case-field-note-delete {
  border: none;
  background: transparent;
  color: var(--danger);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 4px;
  cursor: pointer;
  flex-shrink: 0;
}
.case-field-note-delete:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
`,
        }}
      />
    </>
  );
}
