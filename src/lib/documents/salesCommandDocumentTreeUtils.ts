import type { SalesCommandDocumentFolder } from "@/lib/sales-command/salesCommandDocumentTypes";

export function findFolder(
  nodes: SalesCommandDocumentFolder[],
  id: string | null,
): SalesCommandDocumentFolder | null {
  if (!id) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = findFolder(node.subfolders ?? [], id);
    if (nested) return nested;
  }
  return null;
}

export function folderPath(
  nodes: SalesCommandDocumentFolder[],
  id: string | null,
): SalesCommandDocumentFolder[] {
  if (!id) return [];
  for (const node of nodes) {
    if (node.id === id) return [node];
    const nested = folderPath(node.subfolders ?? [], id);
    if (nested.length) return [node, ...nested];
  }
  return [];
}

export function flattenFolders(
  nodes: SalesCommandDocumentFolder[],
  expanded: Set<string>,
  depth = 0,
): { node: SalesCommandDocumentFolder; depth: number }[] {
  const rows: { node: SalesCommandDocumentFolder; depth: number }[] = [];
  for (const node of nodes) {
    rows.push({ node, depth });
    if (expanded.has(node.id)) {
      rows.push(...flattenFolders(node.subfolders ?? [], expanded, depth + 1));
    }
  }
  return rows;
}

export function countFilesInTree(nodes: SalesCommandDocumentFolder[]): number {
  let total = 0;
  for (const node of nodes) {
    total += node.files?.length ?? 0;
    total += countFilesInTree(node.subfolders ?? []);
  }
  return total;
}

export function folderFileCount(node: SalesCommandDocumentFolder): number {
  return (node.files?.length ?? 0) + (node.subfolders ?? []).reduce((sum, child) => sum + folderFileCount(child), 0);
}

export function collectAllFolders(nodes: SalesCommandDocumentFolder[]): SalesCommandDocumentFolder[] {
  const out: SalesCommandDocumentFolder[] = [];
  for (const node of nodes) {
    out.push(node);
    out.push(...collectAllFolders(node.subfolders ?? []));
  }
  return out;
}

/** Descendant folder ids only (does not include the root folder itself). */
export function collectDescendantFolderIds(folder: SalesCommandDocumentFolder): string[] {
  const ids: string[] = [];
  for (const child of folder.subfolders ?? []) {
    ids.push(child.id);
    ids.push(...collectDescendantFolderIds(child));
  }
  return ids;
}

export function isDescendantFolder(
  nodes: SalesCommandDocumentFolder[],
  ancestorId: string,
  candidateId: string,
): boolean {
  const ancestor = findFolder(nodes, ancestorId);
  if (!ancestor) return false;
  return !!findFolder(ancestor.subfolders ?? [], candidateId);
}

export function getFolderContents(
  tree: SalesCommandDocumentFolder[],
  folderId: string | null,
): { subfolders: SalesCommandDocumentFolder[]; files: SalesCommandDocumentFolder["files"] } {
  if (!folderId) {
    return { subfolders: tree, files: [] };
  }
  const folder = findFolder(tree, folderId);
  return {
    subfolders: folder?.subfolders ?? [],
    files: folder?.files ?? [],
  };
}

export function countSalesCommandDocumentLibraryStats(tree: SalesCommandDocumentFolder[]): {
  folderCount: number;
  fileCount: number;
  repVisibleFolderCount: number;
} {
  const folders = collectAllFolders(tree);
  return {
    folderCount: folders.length,
    fileCount: countFilesInTree(tree),
    repVisibleFolderCount: folders.filter((folder) => folder.access_level !== "admin_only").length,
  };
}
