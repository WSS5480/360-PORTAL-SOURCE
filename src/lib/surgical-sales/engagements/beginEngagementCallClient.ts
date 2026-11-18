import { buildEngagementActiveHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";

export async function beginEngagementCallClient(
  engagementId: string,
  options?: { missionBoardFastLog?: boolean },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(
    `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/begin`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        options?.missionBoardFastLog ? { mission_board_fast_log: true } : {},
      ),
      cache: "no-store",
    },
  );
  const j = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !j.ok) {
    return { ok: false, message: j.error || "Could not start engagement" };
  }
  return { ok: true };
}

export function buildBeginEngagementHref(engagementId: string): string {
  return buildEngagementActiveHref(engagementId);
}

/** @deprecated Use buildBeginEngagementHref */
export const buildBeginCallHref = buildBeginEngagementHref;
