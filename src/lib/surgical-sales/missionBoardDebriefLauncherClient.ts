import { readResponseJson } from "@/lib/utils/readResponseJson";
import type { MissionBoardDebriefLauncherView } from "@/lib/surgical-sales/missionBoardDebriefLauncherView";

import type { MissionBoardDebriefDictationReport } from "@/lib/surgical-sales/missionBoardDebriefDictationReport";

export type MissionBoardDebriefLauncherResponse = {
  ok?: boolean;
  error?: string;
  view?: MissionBoardDebriefLauncherView;
};

export type MissionBoardDebriefLauncherActionResponse = {
  ok?: boolean;
  error?: string;
  engagementId?: string;
  href?: string;
  created?: boolean;
  advancedToEvaluation?: boolean;
};

export type MissionBoardDebriefCompletePayload = {
  engagementId: string;
  outcomeId: "touch_success" | "touch_follow_up" | "touch_no_progress";
  opportunityResult: "confirmed" | "not_confirmed" | "unknown";
  evaluationPath?: string | null;
  dictation: string;
  nextStep?: string | null;
};

export async function fetchMissionBoardDebriefLauncher(
  providerId: string,
): Promise<{ ok: true; view: MissionBoardDebriefLauncherView } | { ok: false; message: string }> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(providerId)}/mission-board-debrief-launcher`,
    { cache: "no-store" },
  );
  const json = await readResponseJson<MissionBoardDebriefLauncherResponse>(res);
  if (!res.ok || !json.ok || !json.view) {
    return { ok: false, message: json.error || "Could not load debrief mission." };
  }
  return { ok: true, view: json.view };
}

export async function runMissionBoardDebriefLauncherAction(
  providerId: string,
  action: "start" | "prepare",
): Promise<
  | { ok: true; engagementId: string; href: string; created: boolean }
  | { ok: false; message: string }
> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(providerId)}/mission-board-debrief-launcher`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    },
  );
  const json = await readResponseJson<MissionBoardDebriefLauncherActionResponse>(res);
  if (!res.ok || !json.ok || !json.engagementId || !json.href) {
    return { ok: false, message: json.error || "Could not launch debrief." };
  }
  return {
    ok: true,
    engagementId: json.engagementId,
    href: json.href,
    created: Boolean(json.created),
  };
}

export type MissionBoardDebriefDictationPayload = {
  engagementId: string;
  narrative: string;
};

export type MissionBoardDebriefDictationResponse = {
  ok?: boolean;
  error?: string;
  engagementId?: string;
  report?: MissionBoardDebriefDictationReport;
  mappingSource?: "openai" | "keyword_fallback";
  fieldsApplied?: number;
};

export async function applyMissionBoardDebriefDictationFromLauncher(
  providerId: string,
  payload: MissionBoardDebriefDictationPayload,
): Promise<
  | {
      ok: true;
      engagementId: string;
      report: MissionBoardDebriefDictationReport;
      mappingSource: "openai" | "keyword_fallback";
      fieldsApplied: number;
    }
  | { ok: false; message: string }
> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(providerId)}/mission-board-debrief-launcher`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "dictation",
        engagement_id: payload.engagementId,
        narrative: payload.narrative,
      }),
    },
  );
  const json = await readResponseJson<MissionBoardDebriefDictationResponse>(res);
  if (!res.ok || !json.ok || !json.engagementId || !json.report) {
    return { ok: false, message: json.error || "Could not save debrief dictation." };
  }
  return {
    ok: true,
    engagementId: json.engagementId,
    report: json.report,
    mappingSource: json.mappingSource ?? "keyword_fallback",
    fieldsApplied: json.fieldsApplied ?? 0,
  };
}

export async function advancePathwayFromCompletedDebriefClient(
  providerId: string,
  payload?: { evaluationPath?: string | null; notes?: string | null },
): Promise<
  | { ok: true; advancedToEvaluation: boolean; evaluationPath?: string | null }
  | { ok: false; message: string }
> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(providerId)}/mission-board-debrief-launcher`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "advance_pathway",
        evaluation_path: payload?.evaluationPath ?? undefined,
        notes: payload?.notes ?? undefined,
      }),
    },
  );
  const json = await readResponseJson<{
    ok?: boolean;
    error?: string;
    advancedToEvaluation?: boolean;
    evaluationPath?: string | null;
  }>(res);
  if (!res.ok || !json.ok) {
    return { ok: false, message: json.error || "Could not advance pathway." };
  }
  return {
    ok: true,
    advancedToEvaluation: Boolean(json.advancedToEvaluation),
    evaluationPath: json.evaluationPath ?? null,
  };
}

export async function logMissionBoardDebriefPathwayOutcomeFromLauncher(
  providerId: string,
  payload: Omit<MissionBoardDebriefCompletePayload, "engagementId">,
): Promise<
  | { ok: true; engagementId: string; advancedToEvaluation: boolean }
  | { ok: false; message: string }
> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(providerId)}/mission-board-debrief-launcher`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "log_pathway_outcome",
        outcome_id: payload.outcomeId,
        opportunity_result: payload.opportunityResult,
        evaluation_path: payload.evaluationPath ?? undefined,
        dictation: payload.dictation,
        next_step: payload.nextStep ?? undefined,
      }),
    },
  );
  const json = await readResponseJson<MissionBoardDebriefLauncherActionResponse>(res);
  if (!res.ok || !json.ok || !json.engagementId) {
    return { ok: false, message: json.error || "Could not log debrief outcome." };
  }
  return {
    ok: true,
    engagementId: json.engagementId,
    advancedToEvaluation: Boolean(json.advancedToEvaluation),
  };
}

export async function completeMissionBoardDebriefFromLauncher(
  providerId: string,
  payload: MissionBoardDebriefCompletePayload,
): Promise<
  | { ok: true; engagementId: string; advancedToEvaluation: boolean }
  | { ok: false; message: string }
> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(providerId)}/mission-board-debrief-launcher`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        engagement_id: payload.engagementId,
        outcome_id: payload.outcomeId,
        opportunity_result: payload.opportunityResult,
        evaluation_path: payload.evaluationPath ?? undefined,
        dictation: payload.dictation,
        next_step: payload.nextStep ?? undefined,
      }),
    },
  );
  const json = await readResponseJson<MissionBoardDebriefLauncherActionResponse>(res);
  if (!res.ok || !json.ok || !json.engagementId) {
    return { ok: false, message: json.error || "Could not complete debrief." };
  }
  return {
    ok: true,
    engagementId: json.engagementId,
    advancedToEvaluation: Boolean(json.advancedToEvaluation),
  };
}
