import {
  resolveObservationCaptureFeedback,
  type ObservationCaptureFeedbackResult,
} from "@/lib/surgical-sales/observationCaptureFeedback";
import {
  canStartObservationLifecycle,
  OBSERVATION_LIFECYCLE_STATUS,
  resolveObservationLifecycleStatus,
} from "@/lib/surgical-sales/observationCaseLifecycle";
import {
  markMissionBoardObservationComplete,
  patchMissionBoardObservationCase,
} from "@/lib/surgical-sales/missionBoardObservationCaseActions";
import type { ProviderObservationCasePreview } from "@/lib/surgical-sales/providerObservationCaseCollection";

/** Same endpoint contract as Case Detail `saveActivityNote`. */
export function observationCaseNotesApiPath(caseId: string): string {
  return `/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/notes`;
}

export type SaveObservationCaseNoteResult = {
  noteId: string | null;
  intelligence: {
    live_field_patches?: Record<string, string>;
    ai_extraction?: Record<string, unknown>;
  } | null;
  capture_feedback: ObservationCaptureFeedbackResult | null;
};

export type MissionBoardObservationDictateCompleteToast = {
  title: string;
  detail?: string;
};

export type MissionBoardObservationDictateCompleteResult = {
  toast: MissionBoardObservationDictateCompleteToast;
  feedback: ObservationCaptureFeedbackResult | null;
};

type FetchFn = typeof fetch;

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

/** Mirror Case Detail `ensureObservationStarted` before first note save. */
export async function ensureObservationCaseInProgressBeforeCapture(
  caseId: string,
  fetchFn: FetchFn = fetch,
): Promise<void> {
  const res = await fetchFn(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}`);
  const payload = await readJson<{ ok?: boolean; case?: Record<string, unknown> }>(res);
  if (!res.ok || !payload.ok || !payload.case) {
    throw new Error("Could not load observation case.");
  }

  const executionStatus = resolveObservationLifecycleStatus({ caseRow: payload.case });
  if (!canStartObservationLifecycle(executionStatus)) {
    return;
  }

  await patchMissionBoardObservationCase(caseId, {
    status: OBSERVATION_LIFECYCLE_STATUS.inProgress,
  });
}

/** POST case note — triggers server-side Observation Intelligence Engine (processObservationNoteCapture). */
export async function saveObservationCaseNote(
  input: {
    caseId: string;
    body: string;
    captureMode?: "voice" | "quick";
  },
  fetchFn: FetchFn = fetch,
): Promise<SaveObservationCaseNoteResult> {
  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new Error("Note is empty.");
  }

  const res = await fetchFn(observationCaseNotesApiPath(input.caseId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      body: trimmed,
      ...(input.captureMode ? { capture_mode: input.captureMode } : {}),
    }),
  });

  const payload = await readJson<{
    ok?: boolean;
    error?: string;
    note?: { id?: string };
    intelligence?: SaveObservationCaseNoteResult["intelligence"];
    capture_feedback?: ObservationCaptureFeedbackResult | null;
  }>(res);

  if (!res.ok || !payload.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Could not save note.");
  }

  return {
    noteId: payload.note?.id ?? null,
    intelligence: payload.intelligence ?? null,
    capture_feedback: payload.capture_feedback ?? null,
  };
}

export function buildMissionBoardObservationDictateCompleteToast(input: {
  caseId: string;
  noteBody: string;
  intelligence?: SaveObservationCaseNoteResult["intelligence"];
  capture_feedback?: ObservationCaptureFeedbackResult | null;
}): MissionBoardObservationDictateCompleteToast {
  const feedback =
    input.capture_feedback ??
    resolveObservationCaptureFeedback({
      caseId: input.caseId,
      noteBody: input.noteBody,
      aiExtraction: input.intelligence?.ai_extraction ?? null,
      readModelEnabled: false,
    });

  const detail =
    feedback?.status === "chips"
      ? feedback.items.map((item) => item.text).join(" • ")
      : feedback?.status === "deferred"
        ? feedback.message
        : undefined;

  return {
    title: "Observation completed",
    detail: detail || undefined,
  };
}

/**
 * Mission Board Dictate & Complete — Observation Intelligence Engine path.
 * Saves through the case notes API, then marks only the selected case complete.
 */
export async function runMissionBoardObservationDictateComplete(
  input: {
    caseId: string;
    noteBody: string;
    captureMode?: "voice" | "quick";
  },
  fetchFn: FetchFn = fetch,
): Promise<MissionBoardObservationDictateCompleteResult> {
  const caseId = String(input.caseId ?? "").trim();
  if (!caseId) {
    throw new Error("Observation case is required.");
  }

  await ensureObservationCaseInProgressBeforeCapture(caseId, fetchFn);
  const saved = await saveObservationCaseNote(
    {
      caseId,
      body: input.noteBody,
      captureMode: input.captureMode,
    },
    fetchFn,
  );

  await markMissionBoardObservationComplete(caseId);

  const feedback =
    saved.capture_feedback ??
    resolveObservationCaptureFeedback({
      caseId,
      noteBody: input.noteBody,
      aiExtraction: saved.intelligence?.ai_extraction ?? null,
      readModelEnabled: false,
    });

  return {
    toast: buildMissionBoardObservationDictateCompleteToast({
      caseId,
      noteBody: input.noteBody,
      intelligence: saved.intelligence,
      capture_feedback: saved.capture_feedback,
    }),
    feedback,
  };
}

/** Resolve a scheduled observation case preview for case-scoped Dictate & Complete flows. */
export function resolveObservationCasePreviewForDictateComplete(input: {
  caseId: string;
  scheduledCases?: ProviderObservationCasePreview[] | null;
}): ProviderObservationCasePreview | null {
  const caseId = String(input.caseId ?? "").trim();
  if (!caseId) return null;
  return (input.scheduledCases ?? []).find((row) => row.caseId === caseId) ?? null;
}
