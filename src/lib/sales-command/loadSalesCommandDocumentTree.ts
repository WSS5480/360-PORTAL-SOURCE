import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildFolderTree } from "@/lib/documents/buildFolderTree";
import {
  canViewSalesCommandDocumentFolder,
  type SalesCommandDocumentViewer,
} from "@/lib/sales-command/salesCommandDocumentAccess";
import type {
  SalesCommandDocumentAccessLevel,
  SalesCommandDocumentFile,
  SalesCommandDocumentFolder,
} from "@/lib/sales-command/salesCommandDocumentTypes";

type FolderRow = {
  id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  access_level: SalesCommandDocumentAccessLevel;
  sort_order: number;
  created_at: string;
};

type FileRow = {
  id: string;
  folder_id: string;
  title: string;
  filename: string | null;
  storage_bucket: string;
  storage_path: string | null;
  content_type: string | null;
  size_bytes: number | null;
  external_url: string | null;
  sort_order: number;
  created_at: string;
};

export async function fetchSalesCommandDocumentRows(): Promise<{ folders: FolderRow[]; files: FileRow[] }> {
  const [foldersRes, filesRes] = await Promise.all([
    supabaseAdmin
      .from("sales_command_document_folders")
      .select("id, parent_id, name, description, access_level, sort_order, created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("sales_command_document_files")
      .select(
        "id, folder_id, title, filename, storage_bucket, storage_path, content_type, size_bytes, external_url, sort_order, created_at",
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  if (foldersRes.error) throw new Error(foldersRes.error.message);
  if (filesRes.error) throw new Error(filesRes.error.message);

  return {
    folders: (foldersRes.data ?? []) as FolderRow[],
    files: (filesRes.data ?? []) as FileRow[],
  };
}

function mapFile(row: FileRow): SalesCommandDocumentFile {
  return {
    id: row.id,
    folder_id: row.folder_id,
    title: row.title,
    filename: row.filename,
    storage_bucket: row.storage_bucket,
    storage_path: row.storage_path,
    content_type: row.content_type,
    size_bytes: row.size_bytes,
    external_url: row.external_url,
    sort_order: row.sort_order,
    created_at: row.created_at,
  };
}

function attachFilesToTree(
  nodes: ReturnType<typeof buildFolderTree<FolderRow>>,
  filesByFolder: Map<string, SalesCommandDocumentFile[]>,
): SalesCommandDocumentFolder[] {
  return nodes.map((node) => ({
    id: node.id,
    parent_id: node.parent_id,
    name: node.name,
    description: node.description,
    access_level: node.access_level,
    sort_order: node.sort_order,
    created_at: node.created_at,
    files: filesByFolder.get(node.id) ?? [],
    subfolders: attachFilesToTree(node.subfolders, filesByFolder),
  }));
}

export function buildSalesCommandDocumentTree(
  folders: FolderRow[],
  files: FileRow[],
  viewer?: SalesCommandDocumentViewer,
): SalesCommandDocumentFolder[] {
  const visibleFolderIds = new Set<string>();
  const folderById = new Map(folders.map((f) => [f.id, f]));

  for (const folder of folders) {
    const visible = viewer
      ? canViewSalesCommandDocumentFolder(folder.access_level, viewer)
      : true;
    if (visible) visibleFolderIds.add(folder.id);
  }

  const scopedFolders = viewer
    ? folders.filter((folder) => {
        if (!visibleFolderIds.has(folder.id)) return false;
        return true;
      })
    : folders;

  const visibleSet = new Set(scopedFolders.map((f) => f.id));
  const normalizedFolders = scopedFolders.map((folder) => {
    let parentId = folder.parent_id;
    while (parentId && !visibleSet.has(parentId)) {
      parentId = folderById.get(parentId)?.parent_id ?? null;
    }
    return parentId === folder.parent_id ? folder : { ...folder, parent_id: parentId };
  });

  const filesByFolder = new Map<string, SalesCommandDocumentFile[]>();
  for (const file of files) {
    if (viewer && !visibleFolderIds.has(file.folder_id)) continue;
    const mapped = mapFile(file);
    const bucket = filesByFolder.get(file.folder_id) ?? [];
    bucket.push(mapped);
    filesByFolder.set(file.folder_id, bucket);
  }

  const tree = buildFolderTree(normalizedFolders);
  return attachFilesToTree(tree, filesByFolder);
}

export async function loadSalesCommandDocumentTree(viewer?: SalesCommandDocumentViewer) {
  const { folders, files } = await fetchSalesCommandDocumentRows();
  return buildSalesCommandDocumentTree(folders, files, viewer);
}
