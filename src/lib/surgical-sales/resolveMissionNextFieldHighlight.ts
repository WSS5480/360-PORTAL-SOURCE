export type MissionNextFieldKey =
  | "scheduling_owner"
  | "access_pathway"
  | "credentialing_requirement"
  | "observation_goal";

const NEXT_ACTION_TO_FIELD: Record<string, MissionNextFieldKey> = {
  "Confirm scheduling owner.": "scheduling_owner",
  "Confirm observation access pathway.": "access_pathway",
  "Verify credentialing requirements.": "credentialing_requirement",
  "Add observation objective.": "observation_goal",
};

export function resolveMissionNextFieldHighlight(nextAction: string): MissionNextFieldKey | null {
  return NEXT_ACTION_TO_FIELD[nextAction] ?? null;
}

export function missionNextFieldLabelClass(active: boolean): string | undefined {
  return active ? "new-case-field-label new-case-field-label--next" : undefined;
}
