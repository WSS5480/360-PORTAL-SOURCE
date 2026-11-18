/**
 * Remove Playwright e2e document folders (names starting with "E2E ").
 *
 * Run: npx tsx scripts/cleanup-e2e-document-folders.ts
 * Dry run: npx tsx scripts/cleanup-e2e-document-folders.ts --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const dryRun = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const E2E_PREFIX = "E2E ";

async function collectDescendantFolderIds(rootId: string, all: { id: string; parent_id: string | null }[]): Promise<string[]> {
  const byParent = new Map<string | null, string[]>();
  for (const row of all) {
    const parentId = row.parent_id ?? null;
    const bucket = byParent.get(parentId) ?? [];
    bucket.push(row.id);
    byParent.set(parentId, bucket);
  }
  const ids: string[] = [];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    ids.push(id);
    for (const childId of byParent.get(id) ?? []) queue.push(childId);
  }
  return ids;
}

async function deleteFolderTree(rootId: string, all: { id: string; parent_id: string | null; name: string }[]) {
  const folderIds = await collectDescendantFolderIds(rootId, all);
  const root = all.find((f) => f.id === rootId);
  const label = root?.name ?? rootId;

  const { data: files, error: filesErr } = await supabase
    .from("sales_command_document_files")
    .select("id, storage_bucket, storage_path")
    .in("folder_id", folderIds);
  if (filesErr) throw new Error(filesErr.message);

  const pathsByBucket = new Map<string, string[]>();
  for (const file of files ?? []) {
    const bucket = String(file.storage_bucket ?? "").trim();
    const path = String(file.storage_path ?? "").trim();
    if (!bucket || !path) continue;
    const bucketPaths = pathsByBucket.get(bucket) ?? [];
    bucketPaths.push(path);
    pathsByBucket.set(bucket, bucketPaths);
  }

  if (dryRun) {
    console.log(`[dry-run] Would delete folder tree "${label}" (${folderIds.length} folder(s), ${files?.length ?? 0} file(s))`);
    return;
  }

  for (const [bucket, paths] of pathsByBucket) {
    if (!paths.length) continue;
    const { error: removeErr } = await supabase.storage.from(bucket).remove(paths);
    if (removeErr) throw new Error(`Storage remove failed: ${removeErr.message}`);
  }

  const { error: delErr } = await supabase.from("sales_command_document_folders").delete().eq("id", rootId);
  if (delErr) throw new Error(delErr.message);

  console.log(`Deleted "${label}" (${folderIds.length} folder(s), ${files?.length ?? 0} file(s))`);
}

async function main() {
  const { data: folders, error } = await supabase
    .from("sales_command_document_folders")
    .select("id, parent_id, name")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const e2eIds = new Set(
    (folders ?? []).filter((f) => String(f.name).startsWith(E2E_PREFIX)).map((f) => f.id),
  );

  const roots = (folders ?? []).filter((f) => {
    if (!String(f.name).startsWith(E2E_PREFIX)) return false;
    if (!f.parent_id) return true;
    return !e2eIds.has(f.parent_id);
  });

  if (!roots.length) {
    console.log("No E2E document folders found.");
    return;
  }

  console.log(`Found ${roots.length} E2E folder tree(s) to remove.`);
  for (const root of roots) {
    await deleteFolderTree(root.id, folders ?? []);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
