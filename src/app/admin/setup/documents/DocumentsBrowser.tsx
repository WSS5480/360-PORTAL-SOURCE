"use client";

import React from "react";
import type { DocumentUploadEntry } from "@/lib/documents/collectUploadEntries";
import { fileTypeLabel, formatDocumentDate, formatFileSize } from "@/lib/documents/salesCommandDocumentDisplay";
import { folderFileCount } from "@/lib/documents/salesCommandDocumentTreeUtils";
import {
  SALES_COMMAND_DOCUMENT_ACCESS_DESCRIPTIONS,
  SALES_COMMAND_DOCUMENT_ACCESS_LEVELS,
  SALES_COMMAND_DOCUMENT_ACCESS_SHORT_LABELS,
  type SalesCommandDocumentAccessLevel,
  type SalesCommandDocumentFile,
  type SalesCommandDocumentFolder,
} from "@/lib/sales-command/salesCommandDocumentTypes";
import { AccessPill, FileTypeIcon, IconFolder, IconGrid, IconList, IconSettings } from "./DocumentIcons";
import DocumentsUploadZone from "./DocumentsUploadZone";
import DocumentsVisibilityControl from "./DocumentsVisibilityControl";
import styles from "./documents.module.css";
import type { AccessFilter, ViewMode } from "./documentsUi";

type SortKey = "name" | "type" | "modified" | "size";

type Props = {
  currentFolder: SalesCommandDocumentFolder | null;
  path: SalesCommandDocumentFolder[];
  subfolders: SalesCommandDocumentFolder[];
  files: SalesCommandDocumentFile[];
  viewMode: ViewMode;
  searchQuery: string;
  accessFilter: AccessFilter;
  selectedFileIds: Set<string>;
  selectedFolderIds: Set<string>;
  uploading: boolean;
  creatingSubfolder: boolean;
  savingVisibility: boolean;
  onNavigate: (folderId: string | null) => void;
  onOpenSettings: () => void;
  onPreviewRep: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSearchChange: (q: string) => void;
  onAccessFilterChange: (f: AccessFilter) => void;
  onToggleFileSelect: (id: string) => void;
  onToggleFolderSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onCreateSubfolder: (name: string) => Promise<void>;
  onUpload: (items: DocumentUploadEntry[]) => Promise<void>;
  onRenameFile: (fileId: string, title: string) => Promise<void>;
  onDeleteFile: (file: SalesCommandDocumentFile) => void;
  onDeleteFolder: (folder: SalesCommandDocumentFolder) => void;
  onMoveFiles: () => void;
  onMoveFolders: () => void;
  onBulkDelete: () => void;
  onChangeVisibility: (args: {
    folderIds: string[];
    accessLevel: SalesCommandDocumentAccessLevel;
    applyToChildren?: boolean;
  }) => Promise<void>;
  onReorderFile: (fileId: string, direction: "up" | "down") => void;
  onReorderFolder: (folderId: string, direction: "up" | "down") => void;
};

const ACCESS_FILTERS: { key: AccessFilter; label: string }[] = [
  { key: "all", label: "All visibility" },
  { key: "all_reps", label: "All reps" },
  { key: "territory_managers", label: "Managers only" },
  { key: "admin_only", label: "Admin only" },
];

export default function DocumentsBrowser(props: Props) {
  const {
    currentFolder,
    path,
    subfolders,
    files,
    viewMode,
    searchQuery,
    accessFilter,
    selectedFileIds,
    selectedFolderIds,
    uploading,
    creatingSubfolder,
    savingVisibility,
    onNavigate,
    onOpenSettings,
    onPreviewRep,
    onViewModeChange,
    onSearchChange,
    onAccessFilterChange,
    onToggleFileSelect,
    onToggleFolderSelect,
    onSelectAll,
    onClearSelection,
    onCreateSubfolder,
    onUpload,
    onRenameFile,
    onDeleteFile,
    onDeleteFolder,
    onMoveFiles,
    onMoveFolders,
    onBulkDelete,
    onChangeVisibility,
    onReorderFile,
    onReorderFolder,
  } = props;

  const [sortKey, setSortKey] = React.useState<SortKey>("name");
  const [sortAsc, setSortAsc] = React.useState(true);
  const [showSubfolderInput, setShowSubfolderInput] = React.useState(false);
  const [subfolderName, setSubfolderName] = React.useState("");
  const [editingFileId, setEditingFileId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [applyToChildren, setApplyToChildren] = React.useState(false);
  const [bulkVisibility, setBulkVisibility] = React.useState<SalesCommandDocumentAccessLevel | "">("");

  React.useEffect(() => {
    setApplyToChildren(false);
  }, [currentFolder?.id]);

  const q = searchQuery.trim().toLowerCase();
  const filteredSubfolders = subfolders.filter((f) => {
    if (accessFilter !== "all" && f.access_level !== accessFilter) return false;
    if (!q) return true;
    return f.name.toLowerCase().includes(q) || (f.description ?? "").toLowerCase().includes(q);
  });
  const filteredFiles = files.filter((f) => {
    if (!q) return true;
    return f.title.toLowerCase().includes(q) || (f.filename ?? "").toLowerCase().includes(q);
  });

  const sortedSubfolders = [...filteredSubfolders].sort((a, b) => {
    const cmp = a.name.localeCompare(b.name);
    return sortAsc ? cmp : -cmp;
  });
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.title.localeCompare(b.title);
    else if (sortKey === "type") cmp = fileTypeLabel(a).localeCompare(fileTypeLabel(b));
    else if (sortKey === "modified") cmp = a.created_at.localeCompare(b.created_at);
    else if (sortKey === "size") cmp = (a.size_bytes ?? 0) - (b.size_bytes ?? 0);
    return sortAsc ? cmp : -cmp;
  });

  const selectionCount = selectedFileIds.size + selectedFolderIds.size;
  const locationLabel = currentFolder ? currentFolder.name : "Library root";
  const itemSummary = `${sortedSubfolders.length} folders · ${sortedFiles.length} files`;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  async function submitSubfolder() {
    const name = subfolderName.trim();
    if (!name) return;
    await onCreateSubfolder(name);
    setSubfolderName("");
    setShowSubfolderInput(false);
  }

  return (
    <div className={`${styles.panel} ${styles.browser}`} data-testid="admin-docs-browser">
      <header className={styles.browserHeader}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb} data-testid="admin-docs-breadcrumb">
          <button type="button" className={styles.btnGhost} style={{ border: "none", padding: "0 4px" }} onClick={() => onNavigate(null)}>
            Library
          </button>
          {path.map((segment, i) => (
            <React.Fragment key={segment.id}>
              <span className={styles.breadcrumbSep}>/</span>
              <button
                type="button"
                className={styles.btnGhost}
                style={{ border: "none", padding: "0 4px", fontWeight: i === path.length - 1 ? 700 : 600, color: i === path.length - 1 ? "var(--brand-700)" : "#0f172a" }}
                onClick={() => onNavigate(segment.id)}
              >
                {segment.name}
              </button>
            </React.Fragment>
          ))}
        </nav>

        <div className={styles.browserTitleRow}>
          <div>
            <h2 className={styles.locationTitle} data-testid="admin-docs-location-title">{locationLabel}</h2>
            <p className={styles.locationMeta}>{itemSummary}</p>
          </div>
          <div className={styles.browserActions}>
            {currentFolder ? (
              <>
                <button type="button" className={styles.btnGhost} data-testid="admin-docs-preview-btn" onClick={onPreviewRep}>
                  Preview as rep
                </button>
                <button type="button" className={styles.btnGhost} data-testid="admin-docs-settings-btn" onClick={onOpenSettings}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <IconSettings size={15} /> Settings
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  data-testid="admin-docs-new-subfolder-btn"
                  onClick={() => setShowSubfolderInput((v) => !v)}
                >
                  New subfolder
                </button>
              </>
            ) : null}
          </div>
        </div>

        {currentFolder ? (
          <div className={styles.visibilityRow}>
            <DocumentsVisibilityControl
              value={currentFolder.access_level}
              saving={savingVisibility}
              showApplyToChildren={(currentFolder.subfolders?.length ?? 0) > 0}
              applyToChildren={applyToChildren}
              onApplyToChildrenChange={setApplyToChildren}
              onChange={(level) =>
                void onChangeVisibility({
                  folderIds: [currentFolder.id],
                  accessLevel: level,
                  applyToChildren,
                })
              }
            />
            {currentFolder.description ? (
              <div className={styles.folderNote}>{currentFolder.description}</div>
            ) : (
              <div className={styles.folderNoteMuted}>
                Visibility is per folder — files inside inherit who can view this folder.
              </div>
            )}
          </div>
        ) : (
          <p className={styles.rootHint}>
            Open a folder from the left to manage files and set who can view it (All reps, Managers only, or Admin only).
          </p>
        )}

        {showSubfolderInput && currentFolder ? (
          <div className={styles.subfolderForm}>
            <input
              className={styles.input}
              style={{ flex: "1 1 200px" }}
              placeholder="Subfolder name"
              value={subfolderName}
              autoFocus
              data-testid="admin-docs-subfolder-input"
              onChange={(e) => setSubfolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitSubfolder();
                if (e.key === "Escape") setShowSubfolderInput(false);
              }}
            />
            <button type="button" className={styles.btnPrimary} disabled={creatingSubfolder || !subfolderName.trim()} data-testid="admin-docs-subfolder-create" onClick={() => void submitSubfolder()}>
              {creatingSubfolder ? "Creating…" : "Create"}
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => setShowSubfolderInput(false)}>
              Cancel
            </button>
          </div>
        ) : null}
      </header>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Search in this location"
          value={searchQuery}
          data-testid="admin-docs-search"
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className={styles.chipRow}>
          {ACCESS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`${styles.chip} ${accessFilter === key ? styles.chipActive : ""}`}
              data-testid={`admin-docs-filter-${key}`}
              onClick={() => onAccessFilterChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.toolbarSpacer}>
          <div className={styles.segmented} role="group" aria-label="View mode">
            <button
              type="button"
              className={`${styles.segmentedBtn} ${viewMode === "list" ? styles.segmentedBtnActive : ""}`}
              data-testid="admin-docs-view-list"
              onClick={() => onViewModeChange("list")}
              aria-pressed={viewMode === "list"}
            >
              <IconList size={15} />
            </button>
            <button
              type="button"
              className={`${styles.segmentedBtn} ${viewMode === "grid" ? styles.segmentedBtnActive : ""}`}
              data-testid="admin-docs-view-grid"
              onClick={() => onViewModeChange("grid")}
              aria-pressed={viewMode === "grid"}
            >
              <IconGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {selectionCount > 0 ? (
        <div className={styles.bulkBar} data-testid="admin-docs-bulk-bar">
          <span>{selectionCount} selected</span>
          {selectedFolderIds.size > 0 ? (
            <select
              className={styles.bulkVisibilitySelect}
              value={bulkVisibility}
              disabled={savingVisibility}
              data-testid="admin-docs-bulk-visibility"
              onChange={(e) => {
                const next = e.target.value as SalesCommandDocumentAccessLevel | "";
                setBulkVisibility(next);
                if (!next) return;
                void onChangeVisibility({
                  folderIds: [...selectedFolderIds],
                  accessLevel: next,
                }).finally(() => setBulkVisibility(""));
              }}
            >
              <option value="">Set visibility…</option>
              {SALES_COMMAND_DOCUMENT_ACCESS_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {SALES_COMMAND_DOCUMENT_ACCESS_SHORT_LABELS[level]}
                </option>
              ))}
            </select>
          ) : null}
          {selectedFileIds.size > 0 ? (
            <button type="button" className={styles.btnGhost} data-testid="admin-docs-bulk-move-files" onClick={onMoveFiles}>
              Move files
            </button>
          ) : null}
          {selectedFolderIds.size > 0 ? (
            <button type="button" className={styles.btnGhost} data-testid="admin-docs-bulk-move-folders" onClick={onMoveFolders}>
              Move folders
            </button>
          ) : null}
          <button type="button" className={styles.btnGhostDanger} data-testid="admin-docs-bulk-delete" onClick={onBulkDelete}>
            Delete
          </button>
          <button type="button" className={styles.btnGhost} onClick={onClearSelection}>
            Clear
          </button>
        </div>
      ) : (
        <div style={{ padding: "6px 18px", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
          <button type="button" className={styles.btnGhost} style={{ fontSize: 11, padding: "5px 10px" }} data-testid="admin-docs-select-all" onClick={onSelectAll}>
            Select all
          </button>
        </div>
      )}

      <div className={styles.content} data-testid="admin-docs-content">
        {!currentFolder && !sortedSubfolders.length ? (
          <EmptyState title="Create your first folder" body="Organize playbooks, sell sheets, and training materials into folders your reps can browse in Sales Command." />
        ) : null}
        {currentFolder && !sortedSubfolders.length && !sortedFiles.length && !q ? (
          <EmptyState title="This folder is empty" body="Upload files or add a subfolder to organize content for your team." />
        ) : null}

        {viewMode === "list" ? (
          <div className={styles.tableWrap}>
            <div className={styles.tableHead}>
              <span className={styles.rowCheck} />
              <span className={styles.headMain}>
                <SortHeader label="Name" active={sortKey === "name"} asc={sortAsc} onClick={() => toggleSort("name")} />
              </span>
              <div className={styles.headMeta}>
                <span className={styles.headMetaSpacer}>
                  <SortHeader label="Type" active={sortKey === "type"} asc={sortAsc} onClick={() => toggleSort("type")} />
                </span>
                <span style={{ minWidth: 72 }}>Access</span>
                <span className={styles.headMetaDate}>
                  <SortHeader label="Added" active={sortKey === "modified"} asc={sortAsc} onClick={() => toggleSort("modified")} />
                </span>
              </div>
              <span className={styles.headActions} />
            </div>

            {sortedSubfolders.map((folder, idx) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                selected={selectedFolderIds.has(folder.id)}
                onToggleSelect={() => onToggleFolderSelect(folder.id)}
                onOpen={() => onNavigate(folder.id)}
                onDelete={() => onDeleteFolder(folder)}
                onMoveUp={idx > 0 ? () => onReorderFolder(folder.id, "up") : undefined}
                onMoveDown={idx < sortedSubfolders.length - 1 ? () => onReorderFolder(folder.id, "down") : undefined}
              />
            ))}

            {sortedFiles.map((file, idx) => (
              <FileRow
                key={file.id}
                file={file}
                selected={selectedFileIds.has(file.id)}
                editing={editingFileId === file.id}
                editTitle={editTitle}
                onToggleSelect={() => onToggleFileSelect(file.id)}
                onStartEdit={() => {
                  setEditingFileId(file.id);
                  setEditTitle(file.title);
                }}
                onEditTitleChange={setEditTitle}
                onCommitEdit={() => {
                  if (editTitle.trim() && editTitle.trim() !== file.title) void onRenameFile(file.id, editTitle.trim());
                  setEditingFileId(null);
                }}
                onCancelEdit={() => setEditingFileId(null)}
                onDelete={() => onDeleteFile(file)}
                onMoveUp={idx > 0 ? () => onReorderFile(file.id, "up") : undefined}
                onMoveDown={idx < sortedFiles.length - 1 ? () => onReorderFile(file.id, "down") : undefined}
              />
            ))}
          </div>
        ) : (
          <div className={styles.grid}>
            {sortedSubfolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className={styles.gridCard}
                data-testid={`admin-docs-grid-folder-${folder.id}`}
                onClick={() => onNavigate(folder.id)}
              >
                <IconFolder size={24} stroke="var(--brand-600)" />
                <div style={{ fontWeight: 700, fontSize: 14 }}>{folder.name}</div>
                <div className={styles.muted}>{folderFileCount(folder)} items</div>
                <AccessPill level={folder.access_level} title={SALES_COMMAND_DOCUMENT_ACCESS_DESCRIPTIONS[folder.access_level]} />
              </button>
            ))}
            {sortedFiles.map((file) => {
              const type = fileTypeLabel(file);
              const href = file.external_url || `/api/admin/setup/documents/files/${file.id}/download`;
              return (
                <div key={file.id} className={`${styles.gridCard} ${styles.gridCardStatic}`} data-testid={`admin-docs-grid-file-${file.id}`}>
                  <FileTypeIcon type={type} size={24} />
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{file.title}</div>
                  <span className={styles.typeBadge}>{type}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a href={href} target="_blank" rel="noreferrer" className={styles.btnGhost} style={{ textDecoration: "none", fontSize: 11 }}>
                      Open
                    </a>
                    <button type="button" className={styles.btnGhostDanger} style={{ fontSize: 11 }} onClick={() => onDeleteFile(file)}>
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className={styles.uploadFooter}>
        <DocumentsUploadZone disabled={!currentFolder} uploading={uploading} onUpload={onUpload} />
      </footer>
    </div>
  );
}

function SortHeader({ label, active, asc, onClick }: { label: string; active: boolean; asc: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", textAlign: "left", color: active ? "var(--brand-700)" : "#64748b", fontWeight: 700, fontSize: 11 }}>
      {label}{active ? (asc ? " ↑" : " ↓") : ""}
    </button>
  );
}

function FolderRow({
  folder,
  selected,
  onToggleSelect,
  onOpen,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  folder: SalesCommandDocumentFolder;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  return (
    <div className={`${styles.tableRow} ${selected ? styles.tableRowSelected : ""}`} data-testid={`admin-docs-folder-row-${folder.id}`} data-folder-name={folder.name}>
      <input type="checkbox" className={styles.rowCheck} checked={selected} onChange={onToggleSelect} aria-label={`Select ${folder.name}`} />
      <div className={styles.rowMain}>
        <button type="button" className={styles.rowTitleBtn} onClick={onOpen} title={folder.name}>
          <IconFolder size={16} stroke="#64748b" />
          <span className={styles.rowTitleStack}>
            <span className={styles.rowTitle}>{folder.name}</span>
            <span className={styles.rowSub}>{folderFileCount(folder)} items</span>
          </span>
        </button>
      </div>
      <div className={styles.rowMeta}>
        <span className={styles.typeBadge}>Folder</span>
        <AccessPill level={folder.access_level} title={SALES_COMMAND_DOCUMENT_ACCESS_DESCRIPTIONS[folder.access_level]} />
        <span className={`${styles.rowMetaDate} ${styles.muted}`}>{formatDocumentDate(folder.created_at)}</span>
      </div>
      <div className={`${styles.rowActions} ${styles.headActions}`}>
        {onMoveUp ? <button type="button" className={styles.rowActionBtn} onClick={onMoveUp}>Up</button> : null}
        {onMoveDown ? <button type="button" className={styles.rowActionBtn} onClick={onMoveDown}>Down</button> : null}
        <button type="button" className={`${styles.rowActionBtn} ${styles.rowActionDanger}`} onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

function FileRow({
  file,
  selected,
  editing,
  editTitle,
  onToggleSelect,
  onStartEdit,
  onEditTitleChange,
  onCommitEdit,
  onCancelEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  file: SalesCommandDocumentFile;
  selected: boolean;
  editing: boolean;
  editTitle: string;
  onToggleSelect: () => void;
  onStartEdit: () => void;
  onEditTitleChange: (v: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const type = fileTypeLabel(file);
  const href = file.external_url || `/api/admin/setup/documents/files/${file.id}/download`;

  return (
    <div className={`${styles.tableRow} ${selected ? styles.tableRowSelected : ""}`} data-testid={`admin-docs-file-row-${file.id}`} data-file-title={file.title}>
      <input type="checkbox" className={styles.rowCheck} checked={selected} onChange={onToggleSelect} aria-label={`Select ${file.title}`} />
      <div className={styles.rowMain}>
        <div className={styles.rowTitleBtn} style={{ cursor: "default" }}>
          <FileTypeIcon type={type} size={16} />
          {editing ? (
            <input
              className={styles.input}
              style={{ padding: "6px 8px", fontSize: 12.5, flex: 1 }}
              value={editTitle}
              autoFocus
              data-testid="admin-docs-file-rename-input"
              onChange={(e) => onEditTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCommitEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              onBlur={onCommitEdit}
            />
          ) : (
            <span className={styles.rowTitleStack}>
              <span className={styles.rowTitle} data-testid="admin-docs-file-title" title={file.title}>
                {file.title}
              </span>
              {file.filename ? <span className={styles.rowSub}>{file.filename}</span> : null}
            </span>
          )}
        </div>
      </div>
      <div className={styles.rowMeta}>
        <span className={styles.typeBadge}>{type}</span>
        {!file.external_url ? <span className={styles.muted}>{formatFileSize(file.size_bytes)}</span> : null}
        <span className={`${styles.rowMetaDate} ${styles.muted}`}>{formatDocumentDate(file.created_at)}</span>
      </div>
      <div className={`${styles.rowActions} ${styles.headActions}`}>
        <a href={href} target="_blank" rel="noreferrer" className={styles.rowActionBtn} style={{ textDecoration: "none" }}>Open</a>
        <button type="button" className={styles.rowActionBtn} onClick={onStartEdit}>Rename</button>
        {onMoveUp ? <button type="button" className={styles.rowActionBtn} onClick={onMoveUp}>Up</button> : null}
        {onMoveDown ? <button type="button" className={styles.rowActionBtn} onClick={onMoveDown}>Down</button> : null}
        <button type="button" className={`${styles.rowActionBtn} ${styles.rowActionDanger}`} data-testid="admin-docs-file-delete" onClick={onDelete}>Remove</button>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className={styles.empty} data-testid="admin-docs-empty-state">
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyBody}>{body}</p>
    </div>
  );
}
