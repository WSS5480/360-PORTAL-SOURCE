"use client";

import React from "react";
import { SALES_COMMAND_DOCUMENT_ACCESS_DESCRIPTIONS, type SalesCommandDocumentFolder } from "@/lib/sales-command/salesCommandDocumentTypes";
import { folderFileCount } from "@/lib/documents/salesCommandDocumentTreeUtils";
import { AccessPill, IconChevronDown, IconChevronRight, IconFolder, IconHome, IconPanelLeft } from "./DocumentIcons";
import styles from "./documents.module.css";

type Props = {
  rows: { node: SalesCommandDocumentFolder; depth: number }[];
  expanded: Set<string>;
  currentFolderId: string | null;
  loading: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onToggleExpanded: (id: string) => void;
  onSelectFolder: (id: string | null) => void;
  onCreateTopLevel: (name: string) => void;
  creatingFolder: boolean;
};

export default function DocumentsFolderTree({
  rows,
  expanded,
  currentFolderId,
  loading,
  collapsed,
  onToggleCollapsed,
  onToggleExpanded,
  onSelectFolder,
  onCreateTopLevel,
  creatingFolder,
}: Props) {
  const [newName, setNewName] = React.useState("");

  if (collapsed) {
    return (
      <aside className={`${styles.panel} ${styles.sidebarCollapsed}`} data-testid="admin-docs-tree-collapsed">
        <button type="button" className={styles.btnIcon} onClick={onToggleCollapsed} aria-label="Expand folder panel">
          <IconPanelLeft size={16} />
        </button>
        <button
          type="button"
          className={`${styles.btnIcon} ${currentFolderId === null ? styles.btnIconActive : ""}`}
          onClick={() => onSelectFolder(null)}
          aria-label="Library root"
          data-testid="admin-docs-nav-root"
        >
          <IconHome size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className={`${styles.panel} ${styles.sidebar}`} data-testid="admin-docs-tree">
      <div className={styles.sidebarHead}>
        <div className={styles.sidebarTitle}>Folders</div>
        <button type="button" className={styles.btnIcon} onClick={onToggleCollapsed} aria-label="Collapse folder panel">
          <IconPanelLeft size={16} />
        </button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <button
          type="button"
          className={`${styles.treeItem} ${currentFolderId === null ? styles.treeItemActive : ""}`}
          onClick={() => onSelectFolder(null)}
          data-testid="admin-docs-nav-root"
        >
          <IconHome size={15} stroke={currentFolderId === null ? "var(--brand-700)" : "#64748b"} />
          <span className={styles.treeItemLabel}>All folders</span>
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            className={styles.input}
            placeholder="New folder"
            value={newName}
            data-testid="admin-docs-new-folder-input"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                onCreateTopLevel(newName.trim());
                setNewName("");
              }
            }}
          />
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={creatingFolder || !newName.trim()}
            data-testid="admin-docs-create-folder-btn"
            onClick={() => {
              if (!newName.trim()) return;
              onCreateTopLevel(newName.trim());
              setNewName("");
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div role="tree" aria-label="Document folders" className={styles.treeScroll}>
        {loading ? <div className={styles.muted}>Loading…</div> : null}
        {!loading && !rows.length ? <div className={styles.muted}>No folders yet.</div> : null}
        {rows.map(({ node, depth }) => {
          const hasChildren = (node.subfolders?.length ?? 0) > 0;
          const isOpen = expanded.has(node.id);
          const active = currentFolderId === node.id;
          return (
            <div key={node.id} role="none">
              <button
                type="button"
                role="treeitem"
                aria-expanded={hasChildren ? isOpen : undefined}
                aria-selected={active}
                data-testid={`admin-docs-tree-folder-${node.id}`}
                data-folder-name={node.name}
                onClick={() => onSelectFolder(node.id)}
                className={`${styles.treeItem} ${active ? styles.treeItemActive : ""}`}
                style={{ paddingLeft: 8 + depth * 14 }}
              >
                {hasChildren ? (
                  <span
                    role="presentation"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpanded(node.id);
                    }}
                    style={{ display: "inline-flex", color: "#94a3b8", cursor: "pointer" }}
                  >
                    {isOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                  </span>
                ) : (
                  <span style={{ width: 14, flexShrink: 0 }} />
                )}
                <IconFolder size={15} stroke={active ? "var(--brand-700)" : "#64748b"} />
                <span className={styles.treeItemLabel}>{node.name}</span>
                {folderFileCount(node) > 0 ? <span className={styles.treeCount}>{folderFileCount(node)}</span> : null}
                <AccessPill level={node.access_level} title={SALES_COMMAND_DOCUMENT_ACCESS_DESCRIPTIONS[node.access_level]} />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
