import type { StartMissionView } from "@/lib/surgical-sales/engagements/buildStartMissionView";
import {
  buildEngagementStartMissionHref,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";

export type OpenStartMissionClientResult =
  | {
      ok: true;
      live: StartMissionView;
      session_opened: boolean;
      opened_at: string;
    }
  | { ok: false; message: string };

export async function openStartMissionClient(
  engagementId: string,
): Promise<OpenStartMissionClientResult> {
  const res = await fetch(
    `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/live/open`,
    { method: "POST", cache: "no-store" },
  );
  const j = (await res.json()) as {
    ok?: boolean;
    error?: string;
    live?: StartMissionView;
    session_opened?: boolean;
    opened_at?: string;
  };
  if (!res.ok || !j.ok || !j.live) {
    return { ok: false, message: j.error || "Could not open live mission" };
  }
  return {
    ok: true,
    live: j.live,
    session_opened: Boolean(j.session_opened),
    opened_at: j.opened_at ?? new Date().toISOString(),
  };
}

export function buildStartMissionHref(engagementId: string): string {
  return buildEngagementStartMissionHref(engagementId);
}

export async function saveStartMissionNotesClient(
  engagementId: string,
  liveNotes: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(
    `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/live`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ live_notes: liveNotes }),
    },
  );
  const j = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !j.ok) {
    return { ok: false, message: j.error || "Could not save notes" };
  }
  return { ok: true };
}

export async function recordStartMissionOutcomeClient(
  engagementId: string,
  outcomeId: string,
  liveNotes?: string,
): Promise<{ ok: true; live: StartMissionView } | { ok: false; message: string }> {
  const res = await fetch(
    `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/live`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome_id: outcomeId, live_notes: liveNotes }),
    },
  );
  const j = (await res.json()) as { ok?: boolean; error?: string; live?: StartMissionView };
  if (!res.ok || !j.ok || !j.live) {
    return { ok: false, message: j.error || "Could not record outcome" };
  }
  return { ok: true, live: j.live };
}
