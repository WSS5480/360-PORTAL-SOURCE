import type { StartMissionOutcomeId } from "@/lib/surgical-sales/engagements/startMissionConfig";

export type StartMissionSnapshot = {
  opened_at: string;
  live_notes: string;
  ended_at?: string;
  outcome_id?: StartMissionOutcomeId;
  outcome_label?: string;
  outcome_recorded_at?: string;
};

export const START_MISSION_SNAPSHOT_KEY = "start_mission";

export function readStartMissionSnapshot(
  debriefSnapshot: unknown,
): StartMissionSnapshot | null {
  if (!debriefSnapshot || typeof debriefSnapshot !== "object") return null;
  const raw = (debriefSnapshot as Record<string, unknown>)[START_MISSION_SNAPSHOT_KEY];
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const openedAt = String(row.opened_at ?? "").trim();
  if (!openedAt) return null;
  return {
    opened_at: openedAt,
    live_notes: String(row.live_notes ?? ""),
    ended_at: row.ended_at ? String(row.ended_at) : undefined,
    outcome_id: row.outcome_id ? (String(row.outcome_id) as StartMissionOutcomeId) : undefined,
    outcome_label: row.outcome_label ? String(row.outcome_label) : undefined,
    outcome_recorded_at: row.outcome_recorded_at ? String(row.outcome_recorded_at) : undefined,
  };
}

export function mergeStartMissionSnapshot(
  debriefSnapshot: unknown,
  patch: Partial<StartMissionSnapshot>,
): Record<string, unknown> {
  const base =
    debriefSnapshot && typeof debriefSnapshot === "object"
      ? { ...(debriefSnapshot as Record<string, unknown>) }
      : {};
  const prev = readStartMissionSnapshot(base) ?? {
    opened_at: new Date().toISOString(),
    live_notes: "",
  };
  base[START_MISSION_SNAPSHOT_KEY] = {
    ...prev,
    ...patch,
  };
  return base;
}
