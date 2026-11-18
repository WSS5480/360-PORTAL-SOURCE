import type { DocumentUploadEntry } from "@/lib/documents/collectUploadEntries";
import { normalizeRelativePath, splitRelativePath } from "@/lib/documents/collectUploadEntries";
import type { SalesCommandDocumentFile, SalesCommandDocumentFolder } from "@/lib/sales-command/salesCommandDocumentTypes";

export type UploadConflict = {
  relativePath: string;
  fileName: string;
  existing: SalesCommandDocumentFile;
};

function findChildFolder(parent: SalesCommandDocumentFolder, name: string): SalesCommandDocumentFolder | null {
  const needle = name.trim().toLowerCase();
  return (parent.subfolders ?? []).find((f) => f.name.trim().toLowerCase() === needle) ?? null;
}

function findFileInFolder(folder: SalesCommandDocumentFolder, fileName: string): SalesCommandDocumentFile | null {
  const needle = fileName.trim().toLowerCase();
  if (!needle) return null;
  return (
    (folder.files ?? []).find((file) => {
      const byFilename = (file.filename ?? "").trim().toLowerCase();
      const byTitle = (file.title ?? "").trim().toLowerCase();
      return byFilename === needle || byTitle === needle;
    }) ?? null
  );
}

/** Walk existing tree under rootFolder to see if this relative upload path already has a file. */
export function findExistingFileForUploadPath(
  rootFolder: SalesCommandDocumentFolder,
  relativePath: string,
): SalesCommandDocumentFile | null {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized || normalized.endsWith("/")) return null;
  const { folderSegments, fileName } = splitRelativePath(normalized);
  let folder: SalesCommandDocumentFolder | null = rootFolder;
  for (const segment of folderSegments) {
    folder = findChildFolder(folder, segment);
    if (!folder) return null;
  }
  return findFileInFolder(folder, fileName);
}

export function findUploadConflicts(
  rootFolder: SalesCommandDocumentFolder,
  items: DocumentUploadEntry[],
): UploadConflict[] {
  const out: UploadConflict[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!item.file) continue;
    const relativePath = normalizeRelativePath(item.relativePath || item.file.name || "");
    if (!relativePath || relativePath.endsWith("/")) continue;
    const key = relativePath.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const existing = findExistingFileForUploadPath(rootFolder, relativePath);
    if (!existing) continue;
    const { fileName } = splitRelativePath(relativePath);
    out.push({ relativePath, fileName, existing });
  }

  return out;
}

export type DuplicateUploadAction = "replace" | "skip" | "keep";
