import { readResponseJson } from "@/lib/utils/readResponseJson";
import { prepareMissionBoardIntroCallForDebrief } from "@/lib/surgical-sales/missionBoardIntroCallCompleteClient";
import type { MissionBoardDebriefDictationReport } from "@/lib/surgical-sales/missionBoardDebriefDictationReport";

export const MISSION_BOARD_INTRO_CALL_DICTATE_COMPLETE_SUCCESS_TOAST = "Intro call completed";

export type MissionBoardIntroCallDictateCompleteToast = {
  title: string;
  detail?: string;
};

export function buildMissionBoardIntroCallDictateCompleteToast(input: {
  fieldsApplied: number;
  report?: MissionBoardDebriefDictationReport;
}): MissionBoardIntroCallDictateCompleteToast {
  const parts: string[] = [];
  if (input.fieldsApplied > 0) {
    parts.push(
      `${input.fieldsApplied} provider field${input.fieldsApplied === 1 ? "" : "s"} updated`,
    );
  }
  if (input.report?.providerStageChanged) {
    parts.push(`Pathway advanced to ${input.report.pathwayStageAfter}`);
  } else if (input.report?.followUpTasks.length) {
    parts.push(input.report.followUpTasks[0]!);
  }

  return {
    title: MISSION_BOARD_INTRO_CALL_DICTATE_COMPLETE_SUCCESS_TOAST,
    detail: parts.length > 0 ? parts.join(" • ") : undefined,
  };
}

type IntroCallDictateCompleteResponse = {
  ok?: boolean;
  error?: string;
  engagementId?: string;
  report?: MissionBoardDebriefDictationReport;
  mappingSource?: "openai" | "keyword_fallback";
  fieldsApplied?: number;
};

export async function finalizeMissionBoardIntroCallDebriefAfterCapture(input: {
  providerId: string;
  engagementId: string;
  narrative?: string;
}): Promise<void> {
  const providerId = String(input.providerId ?? "").trim();
  const engagementId = String(input.engagementId ?? "").trim();
  if (!providerId || !engagementId) {
    throw new Error("Intro call engagement not found.");
  }

  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(providerId)}/mission-board-intro-dictate-complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "finalize",
        engagement_id: engagementId,
        narrative: input.narrative?.trim() || undefined,
      }),
    },
  );
  const json = await readResponseJson<{ ok?: boolean; error?: string }>(res);
  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Could not finalize intro call debrief.");
  }
}

export async function markMissionBoardIntroCallCompleteWithoutDictation(input: {
  providerId: string;
  engagementId: string;
}): Promise<void> {
  await finalizeMissionBoardIntroCallDebriefAfterCapture({
    providerId: input.providerId,
    engagementId: input.engagementId,
  });
}

export async function runMissionBoardIntroCallDictateComplete(input: {
  providerId: string;
  engagementId: string;
  engagementStatus?: string | null;
  engagementType?: string | null;
  narrative: string;
  captureMode?: "voice" | "quick";
}): Promise<{ toast: MissionBoardIntroCallDictateCompleteToast }> {
  const providerId = String(input.providerId ?? "").trim();
  const engagementId = String(input.engagementId ?? "").trim();
  const narrative = String(input.narrative ?? "").trim();
  if (!providerId || !engagementId) {
    throw new Error("Intro call engagement not found.");
  }
  if (narrative.length < 8) {
    throw new Error("Add a bit more detail before saving dictation.");
  }

  const prepare = await prepareMissionBoardIntroCallForDebrief({
    engagementId,
    status: input.engagementStatus,
    engagementType: input.engagementType,
  });
  if (!prepare.ok) {
    throw new Error(prepare.message);
  }

  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(providerId)}/mission-board-intro-dictate-complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        engagement_id: engagementId,
        narrative,
        capture_mode: input.captureMode,
      }),
    },
  );
  const json = await readResponseJson<IntroCallDictateCompleteResponse>(res);
  if (!res.ok || !json.ok || !json.report) {
    throw new Error(json.error || "Could not complete intro call.");
  }

  return {
    toast: buildMissionBoardIntroCallDictateCompleteToast({
      fieldsApplied: json.fieldsApplied ?? 0,
      report: json.report,
    }),
  };
}
