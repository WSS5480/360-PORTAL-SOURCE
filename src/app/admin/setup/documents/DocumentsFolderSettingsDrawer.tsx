"use client";

import React from "react";
import {
  SALES_COMMAND_DOCUMENT_ACCESS_DESCRIPTIONS,
  SALES_COMMAND_DOCUMENT_ACCESS_LEVELS,
  SALES_COMMAND_DOCUMENT_ACCESS_SHORT_LABELS,
  type SalesCommandDocumentAccessLevel,
  type SalesCommandDocumentFolder,
} from "@/lib/sales-command/salesCommandDocumentTypes";
import styles from "./documents.module.css";

type Props = {
  folder: SalesCommandDocumentFolder;
  open: boolean;
  saving: boolean;
  repVisibleFolderCount: number;
  onClose: () => void;
  onSave: (
    patch: { name?: string; description?: string; access_level?: SalesCommandDocumentAccessLevel },
    options?: { applyToChildren?: boolean },
  ) => Promise<void>;
  onDelete: () => void;
  onPreviewRep: () => void;
};

export default function DocumentsFolderSettingsDrawer({
  folder,
  open,
  saving,
  repVisibleFolderCount,
  onClose,
  onSave,
  onDelete,
  onPreviewRep,
}: Props) {
  const [name, setName] = React.useState(folder.name);
  const [description, setDescription] = React.useState(folder.description ?? "");
  const [accessLevel, setAccessLevel] = React.useState(folder.access_level);
  const [applyToChildren, setApplyToChildren] = React.useState(false);

  React.useEffect(() => {
    setName(folder.name);
    setDescription(folder.description ?? "");
    setAccessLevel(folder.access_level);
    setApplyToChildren(false);
  }, [folder]);

  if (!open) return null;

  const dirty =
    name.trim() !== folder.name ||
    description.trim() !== (folder.description ?? "") ||
    accessLevel !== folder.access_level;
  const hasChildren = (folder.subfolders?.length ?? 0) > 0;

  return (
    <>
      <div role="presentation" className={styles.drawerBackdrop} onClick={onClose} />
      <aside className={styles.drawer} data-testid="admin-docs-settings-drawer" aria-label="Folder settings">
        <header className={styles.drawerHeader}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>Folder settings</div>
              <div className={styles.muted} style={{ marginTop: 4 }}>{folder.name}</div>
            </div>
            <button type="button" className={styles.btnGhost} onClick={onClose} aria-label="Close settings">
              Close
            </button>
          </div>
        </header>

        <div className={styles.drawerBody}>
          <label className={styles.fieldLabel}>
            Folder name
            <input
              className={styles.input}
              value={name}
              data-testid="admin-docs-settings-name"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className={styles.fieldLabel}>
            Who can view this folder
            <select
              className={styles.input}
              value={accessLevel}
              disabled={saving}
              data-testid="admin-docs-settings-access"
              onChange={(e) => setAccessLevel(e.target.value as SalesCommandDocumentAccessLevel)}
            >
              {SALES_COMMAND_DOCUMENT_ACCESS_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level === "admin_only"
                    ? "Admin only (hidden from reps)"
                    : SALES_COMMAND_DOCUMENT_ACCESS_SHORT_LABELS[level]}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.muted} style={{ padding: "10px 12px", borderRadius: 11, background: "rgba(248,250,252,0.9)", border: "1px solid rgba(15,23,42,0.06)" }}>
            {SALES_COMMAND_DOCUMENT_ACCESS_DESCRIPTIONS[accessLevel]}
            {accessLevel !== "admin_only" ? (
              <> Currently {repVisibleFolderCount} folder(s) are visible to the field.</>
            ) : null}
          </div>
          {hasChildren ? (
            <label className={styles.visibilityCheckbox}>
              <input
                type="checkbox"
                checked={applyToChildren}
                disabled={saving || accessLevel === folder.access_level}
                data-testid="admin-docs-settings-apply-children"
                onChange={(e) => setApplyToChildren(e.target.checked)}
              />
              Also update all subfolders to this visibility
            </label>
          ) : null}
          <label className={styles.fieldLabel}>
            Description
            <textarea
              className={styles.input}
              style={{ minHeight: 88, resize: "vertical" }}
              value={description}
              placeholder="What reps will find here"
              data-testid="admin-docs-settings-description"
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <button type="button" className={styles.btnGhost} data-testid="admin-docs-preview-rep-btn" onClick={onPreviewRep}>
            Preview as rep
          </button>
        </div>

        <footer className={styles.drawerFooter}>
          <button type="button" className={styles.btnGhostDanger} data-testid="admin-docs-delete-folder-btn" onClick={onDelete}>
            Delete folder
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className={styles.btnGhost} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={saving || !name.trim() || !dirty}
              data-testid="admin-docs-save-folder-btn"
              onClick={() =>
                void onSave(
                  {
                    name: name.trim(),
                    description: description.trim(),
                    access_level: accessLevel,
                  },
                  { applyToChildren: applyToChildren && accessLevel !== folder.access_level },
                )
              }
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
