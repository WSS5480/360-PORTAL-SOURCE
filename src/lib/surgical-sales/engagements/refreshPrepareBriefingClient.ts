import type { PrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import type { PrepareBriefingSource } from "@/lib/surgical-sales/engagements/prepareBriefing";

export type RefreshPrepareBriefingResponse = {
  ok?: boolean;
  error?: string;
  prepare?: PrepareForMeetingView;
  source?: PrepareBriefingSource;
  refreshed_at?: string;
};

/**
 * Client entry point for regenerating the prepare briefing.
 * POST `/prepare/refresh` today runs rule-based rebuild; pass `source: "ai"` when the API is ready.
 */
export async function refreshPrepareBriefingClient(
  engagementId: string,
  options?: { source?: PrepareBriefingSource },
): Promise<
  | { ok: true; prepare: PrepareForMeetingView; source: PrepareBriefingSource; refreshed_at: string }
  | { ok: false; message: string }
> {
  const res = await fetch(
    `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/refresh`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: options?.source ?? "rules" }),
      cache: "no-store",
    },
  );

  const j = (await res.json()) as RefreshPrepareBriefingResponse;
  if (!res.ok || !j.ok || !j.prepare) {
    return { ok: false, message: j.error || "Failed to refresh briefing" };
  }

  return {
    ok: true,
    prepare: j.prepare,
    source: j.source ?? "rules",
    refreshed_at: j.refreshed_at ?? new Date().toISOString(),
  };
}
