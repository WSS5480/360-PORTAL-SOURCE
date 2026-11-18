"use client";

import React from "react";
import {
  collectFolderPathsToEnsure,
  normalizeRelativePath,
  splitRelativePath,
  type DocumentUploadEntry,
} from "@/lib/documents/collectUploadEntries";
import {
  findUploadConflicts,
  type DuplicateUploadAction,
  type UploadConflict,
} from "@/lib/documents/findUploadConflicts";
import {
  collectDescendantFolderIds,
  countSalesCommandDocumentLibraryStats,
  findFolder,
  flattenFolders,
  folderPath,
  getFolderContents,
} from "@/lib/documents/salesCommandDocumentTreeUtils";
import type {
  SalesCommandDocumentAccessLevel,
  SalesCommandDocumentFile,
  SalesCommandDocumentFolder,
} from "@/lib/sales-command/salesCommandDocumentTypes";
import DocumentsBrowser from "./DocumentsBrowser";
import DocumentsFolderSettingsDrawer from "./DocumentsFolderSettingsDrawer";
import DocumentsFolderTree from "./DocumentsFolderTree";
import DocumentsMoveModal from "./DocumentsMoveModal";
import DocumentsRepPreview from "./DocumentsRepPreview";
import DocumentsUploadConflictModal from "./DocumentsUploadConflictModal";
import { AccessLegend } from "./DocumentsVisibilityControl";
import type { AccessFilter, ViewMode } from "./documentsUi";
import styles from "./documents.module.css";

export type SalesCommandDocumentsStats = {
  folderCount: number;
  fileCount: number;
  repVisibleFolderCount: number;
};

export type SalesCommandDocumentsPush = (
  kind: "success" | "error" | "info",
  text: string,
  opts?: { sticky?: boolean },
) => void;

type Props = {
  push: SalesCommandDocumentsPush;
  stats?: SalesCommandDocumentsStats;
  onLibraryChange?: () => void | Promise<void>;
};

type MoveState =
  | { kind: "files"; ids: string[] }
  | { kind: "folders"; ids: string[] }
  | null;

async function apiJson<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json && json.ok === false)) {
    throw new Error((json && (json.error?.message || json.error)) || `Request failed (${res.status})`);
  }
  return json as T;
}

export default function SalesCommandDocumentsManager({ push, stats, onLibraryChange }: Props) {
  const [tree, setTree] = React.useState<SalesCommandDocumentFolder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [accessFilter, setAccessFilter] = React.useState<AccessFilter>("all");
  const [selectedFileIds, setSelectedFileIds] = React.useState<Set<string>>(() => new Set());
  const [selectedFolderIds, setSelectedFolderIds] = React.useState<Set<string>>(() => new Set());
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [repPreviewOpen, setRepPreviewOpen] = React.useState(false);
  const [moveState, setMoveState] = React.useState<MoveState>(null);
  const [creatingFolder, setCreatingFolder] = React.useState(false);
  const [creatingSubfolder, setCreatingSubfolder] = React.useState(false);
  const [savingFolder, setSavingFolder] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [savingVisibility, setSavingVisibility] = React.useState(false);
  const [moving, setMoving] = React.useState(false);
  const [uploadConflict, setUploadConflict] = React.useState<{
    items: DocumentUploadEntry[];
    conflicts: UploadConflict[];
  } | null>(null);
  const [libraryStats, setLibraryStats] = React.useState<SalesCommandDocumentsStats>(
    stats ?? { folderCount: 0, fileCount: 0, repVisibleFolderCount: 0 },
  );

  React.useEffect(() => {
    if (stats) setLibraryStats(stats);
  }, [stats]);

  const currentFolder = findFolder(tree, currentFolderId);
  const path = folderPath(tree, currentFolderId);
  const { subfolders, files } = getFolderContents(tree, currentFolderId);
  const flatRows = flattenFolders(tree, expanded);

  const notifyLibraryChange = React.useCallback(async () => {
    await onLibraryChange?.();
  }, [onLibraryChange]);

  const loadTree = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ tree: SalesCommandDocumentFolder[] }>("/api/admin/setup/documents/folders", "GET");
      const nextTree = data.tree ?? [];
      setTree(nextTree);
      if (!stats) {
        setLibraryStats(countSalesCommandDocumentLibraryStats(nextTree));
      }
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const root of nextTree) next.add(root.id);
        return next;
      });
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not load documents");
    } finally {
      setLoading(false);
    }
  }, [push, stats]);

  React.useEffect(() => {
    void loadTree();
  }, [loadTree]);

  React.useEffect(() => {
    setSelectedFileIds(new Set());
    setSelectedFolderIds(new Set());
    setSearchQuery("");
  }, [currentFolderId]);

  function navigateToFolder(id: string | null) {
    setCurrentFolderId(id);
    if (id) {
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const segment of folderPath(tree, id)) next.add(segment.id);
        return next;
      });
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createFolder(parentId: string | null, name: string) {
    if (!name.trim()) return;
    if (parentId) setCreatingSubfolder(true);
    else setCreatingFolder(true);
    try {
      const data = await apiJson<{ folder: SalesCommandDocumentFolder }>("/api/admin/setup/documents/folders", "POST", {
        name: name.trim(),
        parent_id: parentId,
        access_level: parentId
          ? (findFolder(tree, parentId)?.access_level ?? "admin_only")
          : "admin_only",
      });
      await loadTree();
      if (data.folder?.id) {
        navigateToFolder(data.folder.id);
        if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
      }
      push("success", parentId ? "Subfolder created" : "Folder created");
      await notifyLibraryChange();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreatingFolder(false);
      setCreatingSubfolder(false);
    }
  }

  async function changeVisibility(args: {
    folderIds: string[];
    accessLevel: SalesCommandDocumentAccessLevel;
    applyToChildren?: boolean;
  }): Promise<boolean> {
    const uniqueIds = new Set(args.folderIds);
    if (args.applyToChildren) {
      for (const id of args.folderIds) {
        const folder = findFolder(tree, id);
        if (!folder) continue;
        for (const childId of collectDescendantFolderIds(folder)) uniqueIds.add(childId);
      }
    }

    const ids = [...uniqueIds];
    if (!ids.length) return true;

    setSavingVisibility(true);
    try {
      for (const id of ids) {
        await apiJson(`/api/admin/setup/documents/folders/${id}`, "PATCH", { access_level: args.accessLevel });
      }
      await loadTree();
      push(
        "success",
        ids.length === 1 ? "Visibility updated" : `Visibility updated on ${ids.length} folders`,
      );
      await notifyLibraryChange();
      return true;
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not update visibility");
      await loadTree();
      return false;
    } finally {
      setSavingVisibility(false);
    }
  }

  async function updateFolder(
    patch: Partial<{ name: string; description: string; access_level: SalesCommandDocumentAccessLevel }>,
    options?: { applyToChildren?: boolean },
  ) {
    if (!currentFolder) return;
    setSavingFolder(true);
    try {
      const accessChanged = !!patch.access_level && patch.access_level !== currentFolder.access_level;
      if (accessChanged && patch.access_level) {
        const ok = await changeVisibility({
          folderIds: [currentFolder.id],
          accessLevel: patch.access_level,
          applyToChildren: options?.applyToChildren,
        });
        if (!ok) return;
      }

      const rest: Partial<{ name: string; description: string }> = {};
      if (patch.name !== undefined && patch.name !== currentFolder.name) rest.name = patch.name;
      if (patch.description !== undefined && (patch.description || "") !== (currentFolder.description ?? "")) {
        rest.description = patch.description;
      }

      if (Object.keys(rest).length) {
        await apiJson(`/api/admin/setup/documents/folders/${currentFolder.id}`, "PATCH", rest);
        await loadTree();
        push("success", "Folder updated");
        await notifyLibraryChange();
      } else if (!accessChanged) {
        push("info", "No changes to save");
      }
      setSettingsOpen(false);
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingFolder(false);
    }
  }

  async function deleteFolderById(id: string) {
    if (!window.confirm("Delete this folder and everything inside it?")) return;
    const parentAfterDelete = findFolder(tree, id)?.parent_id ?? null;
    try {
      await apiJson(`/api/admin/setup/documents/folders/${id}`, "DELETE");
      if (currentFolderId === id) setCurrentFolderId(parentAfterDelete);
      setSelectedFolderIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await loadTree();
      push("success", "Folder deleted");
      await notifyLibraryChange();
      setSettingsOpen(false);
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Delete failed");
    }
  }

  function insertFolderIntoTree(
    nodes: SalesCommandDocumentFolder[],
    parentId: string,
    folder: SalesCommandDocumentFolder,
  ): SalesCommandDocumentFolder[] {
    return nodes.map((node) => {
      if (node.id === parentId) {
        const subfolders = [...(node.subfolders ?? []), { ...folder, files: [], subfolders: [] }];
        return { ...node, subfolders };
      }
      if (node.subfolders?.length) {
        return { ...node, subfolders: insertFolderIntoTree(node.subfolders, parentId, folder) };
      }
      return node;
    });
  }

  async function ensureChildFolder(
    parentId: string,
    name: string,
    accessLevel: SalesCommandDocumentAccessLevel,
    workingTree: SalesCommandDocumentFolder[],
    pathCache: Map<string, string>,
    cacheKey: string,
  ): Promise<{ folderId: string; tree: SalesCommandDocumentFolder[] }> {
    const cached = pathCache.get(cacheKey);
    if (cached) return { folderId: cached, tree: workingTree };

    const parent = findFolder(workingTree, parentId);
    const existing = (parent?.subfolders ?? []).find((f) => f.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      pathCache.set(cacheKey, existing.id);
      return { folderId: existing.id, tree: workingTree };
    }

    const data = await apiJson<{ folder: SalesCommandDocumentFolder }>("/api/admin/setup/documents/folders", "POST", {
      name: name.trim(),
      parent_id: parentId,
      access_level: accessLevel,
    });
    if (!data.folder?.id) throw new Error("Folder create failed");

    pathCache.set(cacheKey, data.folder.id);
    return {
      folderId: data.folder.id,
      tree: insertFolderIntoTree(workingTree, parentId, data.folder),
    };
  }

  async function uploadItems(items: DocumentUploadEntry[]) {
    if (!currentFolder) {
      push("error", "Select a folder first");
      return;
    }
    const fileItems = items.filter((item) => item.file || item.externalUrl);
    const conflicts = findUploadConflicts(currentFolder, fileItems);
    if (conflicts.length) {
      setUploadConflict({ items, conflicts });
      return;
    }
    await performUpload(items, "keep", []);
  }

  async function resolveUploadConflict(action: DuplicateUploadAction) {
    if (!uploadConflict) return;
    const pending = uploadConflict;
    setUploadConflict(null);
    await performUpload(pending.items, action, pending.conflicts);
  }

  async function performUpload(
    items: DocumentUploadEntry[],
    duplicateAction: DuplicateUploadAction,
    conflicts: UploadConflict[],
  ) {
    if (!currentFolder) {
      push("error", "Select a folder first");
      return;
    }

    const conflictByPath = new Map(conflicts.map((c) => [c.relativePath.toLowerCase(), c.existing]));
    let workItems = items;
    if (duplicateAction === "skip") {
      workItems = items.filter((item) => {
        if (!item.file) return true;
        const relativePath = normalizeRelativePath(item.relativePath || item.file.name || "");
        return !conflictByPath.has(relativePath.toLowerCase());
      });
      if (!workItems.some((item) => item.file || item.externalUrl)) {
        push("info", "No new files to upload — duplicates skipped");
        return;
      }
    }

    setUploading(true);
    try {
      let workingTree = tree;
      const pathCache = new Map<string, string>();
      pathCache.set("", currentFolder.id);
      const accessLevel = currentFolder.access_level;

      const folderPaths = collectFolderPathsToEnsure(workItems);
      for (const folderPathKey of folderPaths) {
        const segments = normalizeRelativePath(folderPathKey).split("/").filter(Boolean);
        let parentId = currentFolder.id;
        let built = "";
        for (const segment of segments) {
          built = built ? `${built}/${segment}` : segment;
          const ensured = await ensureChildFolder(parentId, segment, accessLevel, workingTree, pathCache, built);
          workingTree = ensured.tree;
          parentId = ensured.folderId;
        }
      }

      const fileItems = workItems.filter((item) => item.file || item.externalUrl);
      let uploaded = 0;
      let replaced = 0;
      for (const item of fileItems) {
        const relativePath = normalizeRelativePath(item.relativePath || item.file?.name || "");
        const { folderSegments } = splitRelativePath(relativePath);
        const targetKey = folderSegments.join("/");
        const folderId = pathCache.get(targetKey) || currentFolder.id;
        const label = item.file?.name || item.relativePath || item.title || "file";
        const existing = conflictByPath.get(relativePath.toLowerCase());

        const form = new FormData();
        form.set("folderId", folderId);
        form.set("title", item.title.trim());
        if (item.file) form.set("file", item.file);
        if (item.externalUrl) form.set("externalUrl", item.externalUrl.trim());

        const res = await fetch("/api/admin/setup/documents/files", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        const raw = await res.text();
        let json: { ok?: boolean; error?: string } = {};
        try {
          json = raw ? (JSON.parse(raw) as { ok?: boolean; error?: string }) : {};
        } catch {
          throw new Error(
            res.status === 413
              ? `“${label}” is too large for upload`
              : `Upload failed for “${label}” (HTTP ${res.status}${raw ? `: ${raw.slice(0, 120)}` : ""})`,
          );
        }
        if (!res.ok || json.ok === false) {
          const detail = typeof json.error === "string" && json.error.trim() ? json.error.trim() : `HTTP ${res.status}`;
          throw new Error(
            uploaded > 0
              ? `Stopped at “${label}” after ${uploaded} uploaded: ${detail}`
              : `Upload failed for “${label}”: ${detail}`,
          );
        }

        if (duplicateAction === "replace" && existing) {
          try {
            await apiJson(`/api/admin/setup/documents/files/${existing.id}`, "DELETE");
            replaced += 1;
          } catch (replaceErr) {
            throw new Error(
              `Uploaded “${label}” but could not remove the old copy: ${
                replaceErr instanceof Error ? replaceErr.message : "delete failed"
              }`,
            );
          }
        }

        uploaded += 1;
      }

      if (folderPaths.length) {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.add(currentFolder.id);
          for (const [key, id] of pathCache) {
            if (key) next.add(id);
          }
          return next;
        });
      }

      await loadTree();
      const folderCount = folderPaths.length;
      const skipped = duplicateAction === "skip" ? conflicts.length : 0;
      if (uploaded === 0 && folderCount > 0) {
        push("success", folderCount === 1 ? "Folder created" : `${folderCount} folders created`);
      } else if (replaced > 0) {
        push(
          "success",
          `${uploaded} uploaded (${replaced} replaced${skipped ? `, ${skipped} skipped` : ""})`,
        );
      } else if (skipped > 0) {
        push("success", `${uploaded} uploaded, ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped`);
      } else if (folderCount > 0) {
        push(
          "success",
          uploaded === 1
            ? `1 document added across ${folderCount} folder${folderCount === 1 ? "" : "s"}`
            : `${uploaded} documents added across ${folderCount} folder${folderCount === 1 ? "" : "s"}`,
        );
      } else {
        push("success", uploaded > 1 ? `${uploaded} documents added` : "Document added");
      }
      await notifyLibraryChange();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Upload failed");
      await loadTree();
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(file: SalesCommandDocumentFile) {
    if (!window.confirm(`Remove "${file.title}"?`)) return;
    try {
      await apiJson(`/api/admin/setup/documents/files/${file.id}`, "DELETE");
      setSelectedFileIds((prev) => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
      await loadTree();
      push("success", "Document removed");
      await notifyLibraryChange();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function renameFile(fileId: string, title: string) {
    try {
      await apiJson(`/api/admin/setup/documents/files/${fileId}`, "PATCH", { title });
      await loadTree();
      push("success", "Document renamed");
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Rename failed");
    }
  }

  async function reorderItem(kind: "file" | "folder", id: string, direction: "up" | "down") {
    const list =
      kind === "file"
        ? [...(currentFolder?.files ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
        : [...subfolders].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

    const idx = list.findIndex((row) => row.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;

    const current = list[idx];
    const other = list[swapIdx];
    try {
      if (kind === "file") {
        await apiJson(`/api/admin/setup/documents/files/${current.id}`, "PATCH", { sort_order: swapIdx });
        await apiJson(`/api/admin/setup/documents/files/${other.id}`, "PATCH", { sort_order: idx });
      } else {
        await apiJson(`/api/admin/setup/documents/folders/${current.id}`, "PATCH", { sort_order: swapIdx });
        await apiJson(`/api/admin/setup/documents/folders/${other.id}`, "PATCH", { sort_order: idx });
      }
      await loadTree();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Reorder failed");
    }
  }

  async function executeMove(targetFolderId: string | null) {
    if (!moveState) return;
    setMoving(true);
    try {
      if (moveState.kind === "files") {
        if (!targetFolderId) {
          push("error", "Choose a folder for files");
          return;
        }
        for (const id of moveState.ids) {
          await apiJson(`/api/admin/setup/documents/files/${id}`, "PATCH", { folder_id: targetFolderId });
        }
      } else {
        for (const id of moveState.ids) {
          await apiJson(`/api/admin/setup/documents/folders/${id}`, "PATCH", { parent_id: targetFolderId });
        }
      }
      await loadTree();
      setMoveState(null);
      setSelectedFileIds(new Set());
      setSelectedFolderIds(new Set());
      push("success", "Moved successfully");
      await notifyLibraryChange();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Move failed");
    } finally {
      setMoving(false);
    }
  }

  async function bulkDelete() {
    const fileIds = [...selectedFileIds];
    const folderIds = [...selectedFolderIds];
    if (!fileIds.length && !folderIds.length) return;
    const label = `${fileIds.length} file(s) and ${folderIds.length} folder(s)`;
    if (!window.confirm(`Delete ${label}? Folders include all nested content.`)) return;

    try {
      for (const id of fileIds) {
        await apiJson(`/api/admin/setup/documents/files/${id}`, "DELETE");
      }
      for (const id of folderIds) {
        await apiJson(`/api/admin/setup/documents/folders/${id}`, "DELETE");
      }
      if (currentFolderId && folderIds.includes(currentFolderId)) setCurrentFolderId(null);
      setSelectedFileIds(new Set());
      setSelectedFolderIds(new Set());
      await loadTree();
      push("success", "Selection deleted");
      await notifyLibraryChange();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Delete failed");
    }
  }

  function toggleFileSelect(id: string) {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleFolderSelect(id: string) {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    const q = searchQuery.trim().toLowerCase();
    const visibleFolders = subfolders.filter((f) => {
      if (accessFilter !== "all" && f.access_level !== accessFilter) return false;
      if (!q) return true;
      return f.name.toLowerCase().includes(q);
    });
    const visibleFiles = (files ?? []).filter((f) => {
      if (!q) return true;
      return f.title.toLowerCase().includes(q) || (f.filename ?? "").toLowerCase().includes(q);
    });
    setSelectedFolderIds(new Set(visibleFolders.map((f) => f.id)));
    setSelectedFileIds(new Set(visibleFiles.map((f) => f.id)));
  }

  const repVisible = libraryStats.repVisibleFolderCount;

  return (
    <section className={styles.root} data-testid="admin-docs-root">
      <div className={styles.libraryBar}>
        <div className={styles.libraryBarMain}>
          <AccessLegend />
        </div>
        <div className={styles.libraryStats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{libraryStats.folderCount}</span>
            <span className={styles.statLabel}>Folders</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{libraryStats.fileCount}</span>
            <span className={styles.statLabel}>Files</span>
          </div>
          <div className={styles.stat}>
            <span className={`${styles.statValue} ${repVisible === 0 ? styles.heroMetaWarn : styles.heroMetaStrong}`}>
              {repVisible}
            </span>
            <span className={styles.statLabel}>Visible to field</span>
          </div>
        </div>
      </div>

      <div className={`${styles.layout} ${sidebarCollapsed ? "" : styles.layoutWithTree}`}>
        <DocumentsFolderTree
          rows={flatRows}
          expanded={expanded}
          currentFolderId={currentFolderId}
          loading={loading}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
          onToggleExpanded={toggleExpanded}
          onSelectFolder={navigateToFolder}
          onCreateTopLevel={(name) => void createFolder(null, name)}
          creatingFolder={creatingFolder}
        />

        <DocumentsBrowser
          currentFolder={currentFolder}
          path={path}
          subfolders={subfolders}
          files={files ?? []}
          viewMode={viewMode}
          searchQuery={searchQuery}
          accessFilter={accessFilter}
          selectedFileIds={selectedFileIds}
          selectedFolderIds={selectedFolderIds}
          uploading={uploading}
          creatingSubfolder={creatingSubfolder}
          savingVisibility={savingVisibility}
          onNavigate={navigateToFolder}
          onOpenSettings={() => setSettingsOpen(true)}
          onPreviewRep={() => setRepPreviewOpen(true)}
          onViewModeChange={setViewMode}
          onSearchChange={setSearchQuery}
          onAccessFilterChange={setAccessFilter}
          onToggleFileSelect={toggleFileSelect}
          onToggleFolderSelect={toggleFolderSelect}
          onSelectAll={selectAllVisible}
          onClearSelection={() => {
            setSelectedFileIds(new Set());
            setSelectedFolderIds(new Set());
          }}
          onCreateSubfolder={(name) => createFolder(currentFolderId, name)}
          onUpload={uploadItems}
          onRenameFile={renameFile}
          onDeleteFile={(file) => void deleteFile(file)}
          onDeleteFolder={(folder) => void deleteFolderById(folder.id)}
          onMoveFiles={() => setMoveState({ kind: "files", ids: [...selectedFileIds] })}
          onMoveFolders={() => setMoveState({ kind: "folders", ids: [...selectedFolderIds] })}
          onBulkDelete={() => void bulkDelete()}
          onChangeVisibility={(args) => changeVisibility(args).then(() => undefined)}
          onReorderFile={(id, direction) => void reorderItem("file", id, direction)}
          onReorderFolder={(id, direction) => void reorderItem("folder", id, direction)}
        />
      </div>

      {currentFolder && settingsOpen ? (
        <DocumentsFolderSettingsDrawer
          folder={currentFolder}
          open={settingsOpen}
          saving={savingFolder}
          repVisibleFolderCount={repVisible}
          onClose={() => setSettingsOpen(false)}
          onSave={(patch, options) => updateFolder(patch, options)}
          onDelete={() => void deleteFolderById(currentFolder.id)}
          onPreviewRep={() => {
            setSettingsOpen(false);
            setRepPreviewOpen(true);
          }}
        />
      ) : null}

      {currentFolder && repPreviewOpen ? (
        <DocumentsRepPreview folder={currentFolder} onClose={() => setRepPreviewOpen(false)} />
      ) : null}

      <DocumentsMoveModal
        open={!!moveState}
        tree={tree}
        excludeFolderIds={moveState?.kind === "folders" ? moveState.ids : []}
        title={moveState?.kind === "files" ? "Move files" : "Move folders"}
        allowRoot={moveState?.kind === "folders"}
        onClose={() => setMoveState(null)}
        onMove={executeMove}
        moving={moving}
      />

      <DocumentsUploadConflictModal
        open={!!uploadConflict}
        conflicts={uploadConflict?.conflicts ?? []}
        totalFiles={(uploadConflict?.items ?? []).filter((item) => item.file || item.externalUrl).length}
        busy={uploading}
        onCancel={() => setUploadConflict(null)}
        onResolve={(action) => void resolveUploadConflict(action)}
      />
    </section>
  );
}
