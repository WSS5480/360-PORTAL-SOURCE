export type FolderTreeNode<T extends { id: string; parent_id?: string | null }> = T & {
  subfolders: FolderTreeNode<T>[];
};

export function buildFolderTree<T extends { id: string; parent_id?: string | null }>(
  rows: T[],
  attach?: (node: T, children: FolderTreeNode<T>[]) => FolderTreeNode<T>,
): FolderTreeNode<T>[] {
  const byParent = new Map<string | null, T[]>();
  for (const row of rows) {
    const parentId = row.parent_id ?? null;
    const bucket = byParent.get(parentId) ?? [];
    bucket.push(row);
    byParent.set(parentId, bucket);
  }

  function walk(parentId: string | null): FolderTreeNode<T>[] {
    const siblings = byParent.get(parentId) ?? [];
    return siblings.map((row) => {
      const children = walk(row.id);
      return attach ? attach(row, children) : { ...row, subfolders: children };
    });
  }

  return walk(null);
}
