import { OBSERVATION_LIFECYCLE_STATUS } from "@/lib/surgical-sales/observationCaseLifecycle";

export async function patchMissionBoardObservationCase(
  caseId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string };
  if (!res.ok || !payload?.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Could not update observation case.");
  }
}

export async function markMissionBoardObservationComplete(caseId: string): Promise<void> {
  await patchMissionBoardObservationCase(caseId, {
    status: OBSERVATION_LIFECYCLE_STATUS.completed,
  });
}

export async function rescheduleMissionBoardObservationCase(input: {
  caseId: string;
  caseDate: string;
  caseTime: string | null;
}): Promise<void> {
  await patchMissionBoardObservationCase(input.caseId, {
    case_date: input.caseDate,
    case_time: input.caseTime,
    status: OBSERVATION_LIFECYCLE_STATUS.scheduled,
  });
}
