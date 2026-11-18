/** Auto-mark prepared when the rep has saved meaningful plan content (no manual button). */
export async function autoMarkEngagementPreparedClient(
  engagementId: string,
): Promise<{ ok: boolean; alreadyPrepared?: boolean }> {
  const res = await fetch(
    `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/mark-prepared`,
    { method: "POST", cache: "no-store" },
  );
  const j = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !j.ok) {
    return { ok: false };
  }
  return { ok: true };
}
