"use client";

import React from "react";
import type { SalesCommandDocumentFolder } from "@/lib/sales-command/salesCommandDocumentTypes";
import { collectAllFolders, isDescendantFolder } from "@/lib/documents/salesCommandDocumentTreeUtils";
import { IconFolder, IconHome } from "./DocumentIcons";
import styles from "./documents.module.css";

type Props = {
  open: boolean;
  tree: SalesCommandDocumentFolder[];
  excludeFolderIds: string[];
  title: string;
  allowRoot?: boolean;
  onClose: () => void;
  onMove: (targetFolderId: string | null) => Promise<void>;
  moving: boolean;
};

export default function DocumentsMoveModal({
  open,
  tree,
  excludeFolderIds,
  title,
  allowRoot = false,
  onClose,
  onMove,
  moving,
}: Props) {
  const [targetId, setTargetId] = React.useState<string | null | "__root__">(null);

  React.useEffect(() => {
    if (open) setTargetId(null);
  }, [open]);

  if (!open) return null;

  const exclude = new Set(excludeFolderIds);
  const options = collectAllFolders(tree).filter((folder) => {
    if (exclude.has(folder.id)) return false;
    for (const blocked of excludeFolderIds) {
      if (isDescendantFolder(tree, blocked, folder.id)) return false;
    }
    return true;
  });

  return (
    <>
      <div role="presentation" className={styles.modalBackdrop} onClick={onClose} />
      <div role="dialog" aria-modal="true" className={styles.modal} data-testid="admin-docs-move-modal">
        <header className={styles.modalHeader}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <div className={styles.muted} style={{ marginTop: 4 }}>Choose a destination folder</div>
        </header>
        <div className={styles.modalBody}>
          {allowRoot ? (
            <button
              type="button"
              className={`${styles.btnGhost} ${targetId === "__root__" ? styles.btnIconActive : ""}`}
              style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}
              data-testid="admin-docs-move-root"
              onClick={() => setTargetId("__root__")}
            >
              <IconHome size={16} /> Library root
            </button>
          ) : null}
          {options.map((folder) => (
            <button
              key={folder.id}
              type="button"
              className={`${styles.btnGhost} ${targetId === folder.id ? styles.btnIconActive : ""}`}
              style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}
              data-testid={`admin-docs-move-target-${folder.id}`}
              onClick={() => setTargetId(folder.id)}
            >
              <IconFolder size={16} /> {folder.name}
            </button>
          ))}
          {!options.length && !allowRoot ? (
            <div className={styles.muted} style={{ padding: 8 }}>No valid destination folders.</div>
          ) : null}
        </div>
        <footer className={styles.modalFooter}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={targetId == null || moving}
            data-testid="admin-docs-move-confirm"
            onClick={() => void onMove(targetId === "__root__" ? null : targetId)}
          >
            {moving ? "Moving…" : "Move here"}
          </button>
        </footer>
      </div>
    </>
  );
}
