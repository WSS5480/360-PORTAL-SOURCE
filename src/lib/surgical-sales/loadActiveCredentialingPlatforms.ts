/**
 * Server-only loader for the credentialing platforms catalog.
 * Keep separate from credentialingPlatforms.ts so client bundles can import pure helpers.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CredentialingPlatformRecord } from "@/lib/surgical-sales/credentialingPlatforms";

const PLATFORMS_CACHE_TTL_MS = 5 * 60 * 1000;
let activePlatformsCache: { loadedAt: number; rows: CredentialingPlatformRecord[] } | null = null;

/** Cached active platforms catalog (shared across debrief / log-update requests). */
export async function loadActiveCredentialingPlatformsCached(): Promise<CredentialingPlatformRecord[]> {
  const now = Date.now();
  if (activePlatformsCache && now - activePlatformsCache.loadedAt < PLATFORMS_CACHE_TTL_MS) {
    return activePlatformsCache.rows;
  }
  const { data } = await supabaseAdmin
    .from("credentialing_platforms")
    .select("id, name, name_normalized, aliases, notes, active, updated_at")
    .eq("active", true)
    .order("name")
    .limit(80);
  const rows = (data ?? []) as CredentialingPlatformRecord[];
  activePlatformsCache = { loadedAt: now, rows };
  return rows;
}
