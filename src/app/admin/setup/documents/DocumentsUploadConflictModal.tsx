"use client";

import React from "react";
import type { DuplicateUploadAction, UploadConflict } from "@/lib/documents/findUploadConflicts";
import styles from "./documents.module.css";

type Props = {
  open: boolean;
  conflicts: UploadConflict[];
  totalFiles: number;
  busy: boolean;
  onCancel: () => void;
  onResolve: (action: DuplicateUploadAction) => void;
};

export default function DocumentsUploadConflictModal({
  open,
  conflicts,
  totalFiles,
  busy,
  onCancel,
  onResolve,
}: Props) {
  if (!open) return null;

  const preview = conflicts.slice(0, 8);
  const remaining = Math.max(0, conflicts.length - preview.length);
  const newCount = Math.max(0, totalFiles - conflicts.length);

  return (
    <>
      <div role="presentation" className={styles.modalBackdrop} onClick={busy ? undefined : onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-docs-upload-conflict-title"
        className={styles.modal}
        data-testid="admin-docs-upload-conflict-modal"
      >
        <header className={styles.modalHeader}>
          <div id="admin-docs-upload-conflict-title" style={{ fontWeight: 700, fontSize: 16 }}>
            {conflicts.length} duplicate{conflicts.length === 1 ? "" : "s"} found
          </div>
          <div className={styles.muted} style={{ marginTop: 4 }}>
            {newCount > 0
              ? `${newCount} new file${newCount === 1 ? "" : "s"} can upload cleanly. Choose what to do with duplicates.`
              : "Every selected file already exists in this folder tree."}
          </div>
        </header>

        <div className={styles.modalBody}>
          <ul className={styles.conflictList}>
            {preview.map((conflict) => (
              <li key={conflict.existing.id} className={styles.conflictItem}>
                <span className={styles.conflictPath}>{conflict.relativePath}</span>
                <span className={styles.muted}>
                  Already have “{conflict.existing.title}”
                  {conflict.existing.filename && conflict.existing.filename !== conflict.existing.title
                    ? ` (${conflict.existing.filename})`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
          {remaining > 0 ? <div className={styles.muted}>…and {remaining} more</div> : null}
        </div>

        <footer className={styles.conflictFooter}>
          <button type="button" className={styles.btnGhost} disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <div className={styles.conflictActions}>
            <button
              type="button"
              className={styles.btnGhost}
              disabled={busy}
              data-testid="admin-docs-upload-keep-both"
              onClick={() => onResolve("keep")}
            >
              Keep both
            </button>
            <button
              type="button"
              className={styles.btnGhost}
              disabled={busy}
              data-testid="admin-docs-upload-skip-duplicates"
              onClick={() => onResolve("skip")}
            >
              Skip duplicates
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={busy}
              data-testid="admin-docs-upload-replace"
              onClick={() => onResolve("replace")}
            >
              {busy ? "Working…" : "Replace duplicates"}
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
