import type { StartMissionOutcomeId } from "@/lib/surgical-sales/engagements/startMissionConfig";

export async function endEngagementCallClient(
  engagementId: string,
  outcomeId?: StartMissionOutcomeId,
  liveNotes?: string,
): Promise<{ ok: true; debriefHref: string } | { ok: false; message: string }> {
  const body: { live_notes?: string; outcome_id?: StartMissionOutcomeId } = {};
  if (outcomeId) body.outcome_id = outcomeId;
  if (liveNotes?.trim()) body.live_notes = liveNotes;

  const res = await fetch(
    `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/active/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const j = (await res.json()) as { ok?: boolean; error?: string; debrief_href?: string };
  if (!res.ok || !j.ok || !j.debrief_href) {
    return { ok: false, message: j.error || "Could not end engagement" };
  }
  return { ok: true, debriefHref: j.debrief_href };
}
