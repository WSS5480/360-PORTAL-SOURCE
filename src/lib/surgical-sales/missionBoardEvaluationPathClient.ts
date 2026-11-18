import type { MissionBoardEvaluationPathView } from "@/lib/surgical-sales/missionBoardEvaluationPathView";
import type { SalesPathwayEvaluationActivity } from "@/lib/surgical-sales/salesPathwayCanonical";

function readApiError(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  if (status === 401) return "Sign in again to load evaluation path.";
  if (status === 403) return "You do not have access to this provider.";
  if (status === 404) return "Provider not found.";
  if (status >= 500) return "Server error while loading evaluation path.";
  return "Could not load evaluation path.";
}

export async function fetchMissionBoardEvaluationPath(
  providerId: string,
): Promise<{ ok: true; view: MissionBoardEvaluationPathView } | { ok: false; message: string }> {
  let res: Response;
  try {
    res = await fetch(
      `/api/portal/sales/providers/${encodeURIComponent(providerId)}/mission-board-evaluation-path`,
      { cache: "no-store" },
    );
  } catch {
    return { ok: false, message: "Network error while loading evaluation path." };
  }

  const payload = (await res.json().catch(() => null)) as {
    ok?: boolean;
    view?: MissionBoardEvaluationPathView;
    error?: string;
  } | null;

  if (!res.ok || !payload?.ok || !payload.view) {
    return { ok: false, message: readApiError(payload, res.status) };
  }
  return { ok: true, view: payload.view };
}

function extractErrorFromRawBody(rawBody: string): string | null {
  const trimmed = rawBody.trim();
  if (!trimmed || trimmed.startsWith("<!DOCTYPE")) return null;
  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
  } catch {
    const match = trimmed.match(/"error"\s*:\s*"([^"]+)"/);
    if (match?.[1]) return match[1];
  }
  return null;
}

function readSaveApiError(payload: unknown, status: number, rawBody?: string): string {
  if (payload && typeof payload === "object") {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
    if (error && typeof error === "object") {
      const message = String((error as { message?: unknown }).message ?? "").trim();
      if (message) return message;
    }
  }
  const parsedFromBody = extractErrorFromRawBody(String(rawBody ?? ""));
  if (parsedFromBody) return parsedFromBody;
  const bodyHint = String(rawBody ?? "").trim();
  if (bodyHint && !bodyHint.startsWith("<!DOCTYPE") && bodyHint.length <= 280) {
    return bodyHint;
  }
  if (status === 401) return "Sign in again to save evaluation path.";
  if (status === 403) return "You do not have access to this provider.";
  if (status === 404) return "Provider not found.";
  if (status === 400) return "Invalid evaluation path request.";
  if (status >= 500) {
    return bodyHint
      ? `Server error while saving evaluation path (${status}).`
      : "Server error while saving evaluation path.";
  }
  return "Could not save evaluation path.";
}

export async function saveMissionBoardEvaluationPath(input: {
  providerId: string;
  evaluationPath: SalesPathwayEvaluationActivity;
  targetDate?: string | null;
  notes?: string | null;
}): Promise<
  | { ok: true; engagementSynced: boolean; engagementSyncWarning: string | null }
  | { ok: false; message: string }
> {
  let res: Response;
  try {
    res = await fetch(
      `/api/portal/sales/providers/${encodeURIComponent(input.providerId)}/mission-board-evaluation-path`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluation_path: input.evaluationPath,
          target_date: input.targetDate ?? null,
          notes: input.notes ?? null,
        }),
      },
    );
  } catch {
    return { ok: false, message: "Network error while saving evaluation path." };
  }

  const rawBody = await res.text().catch(() => "");
  type SaveEvaluationPathPayload = {
    ok?: boolean;
    error?: string;
    engagement_synced?: boolean;
    engagement_sync_warning?: string | null;
  };
  let payload: SaveEvaluationPathPayload | null = null;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as SaveEvaluationPathPayload) : null;
  } catch {
    payload = null;
  }

  if (!res.ok || !payload?.ok) {
    return { ok: false, message: readSaveApiError(payload, res.status, rawBody) };
  }

  const warning =
    typeof payload.engagement_sync_warning === "string" && payload.engagement_sync_warning.trim()
      ? payload.engagement_sync_warning
      : null;

  return {
    ok: true,
    engagementSynced: payload.engagement_synced === true,
    engagementSyncWarning: warning,
  };
}
