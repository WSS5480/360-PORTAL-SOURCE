import type { PrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import { buildEngagementPrepareForMeetingHref } from "@/lib/surgical-sales/engagements/engagementCreateWizard";

export type OpenPrepareMissionClientResult =
  | {
      ok: true;
      prepare: PrepareForMeetingView;
      briefing_opened: boolean;
      suggestions_generated_at: string;
    }
  | { ok: false; message: string };

/**
 * Opens the field briefing and generates suggested prep content for the engagement.
 */
export async function openPrepareMissionClient(
  engagementId: string,
): Promise<OpenPrepareMissionClientResult> {
  const res = await fetch(
    `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/open`,
    { method: "POST", cache: "no-store" },
  );
  const j = (await res.json()) as {
    ok?: boolean;
    error?: string;
    prepare?: PrepareForMeetingView;
    briefing_opened?: boolean;
    suggestions_generated_at?: string;
  };
  if (!res.ok || !j.ok || !j.prepare) {
    return { ok: false, message: j.error || "Could not open field briefing" };
  }
  return {
    ok: true,
    prepare: j.prepare,
    briefing_opened: Boolean(j.briefing_opened),
    suggestions_generated_at: j.suggestions_generated_at ?? new Date().toISOString(),
  };
}

export function buildPrepareMissionHref(engagementId: string): string {
  return buildEngagementPrepareForMeetingHref(engagementId);
}
