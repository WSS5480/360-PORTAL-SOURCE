export const OBSERVATION_OBJECTIVE_CHIP_OPTIONS = [
  "Understand fixation workflow",
  "Evaluate visualization challenges",
  "Assess product fit",
  "Observe procedural inefficiencies",
  "Identify competitor weaknesses",
] as const;

export const OBSERVATION_LEARNING_QUESTION_CHIP_OPTIONS = [
  "What products are currently used?",
  "What frustrations occur during the procedure?",
  "What workarounds are being used?",
  "What outcomes matter most to the provider?",
  "What staff concerns are observed?",
] as const;

export type ObservationObjectivesDraft = {
  observation_goal: string;
  observation_key_questions: string;
  observation_signals_to_validate: string;
};

export function observationObjectivesHasContent(draft: ObservationObjectivesDraft): boolean {
  return Boolean(
    draft.observation_goal.trim() ||
      draft.observation_key_questions.trim() ||
      draft.observation_signals_to_validate.trim(),
  );
}

export function splitDelimitedObjectiveLines(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(/\n|,|;/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function countDelimitedObjectiveLines(value: string | null | undefined): number {
  return splitDelimitedObjectiveLines(value).length;
}

export function observationObjectivesFromCaseRow(row: Record<string, unknown>): ObservationObjectivesDraft {
  return {
    observation_goal: String(row.observation_goal ?? "").trim(),
    observation_key_questions: String(row.observation_key_questions ?? "").trim(),
    observation_signals_to_validate: String(row.observation_signals_to_validate ?? "").trim(),
  };
}

export function appendObservationObjectiveChip(current: string, chip: string): string {
  const base = current.trim();
  if (!base) return chip;
  if (base.toLowerCase().includes(chip.toLowerCase())) return base;
  return `${base}\n${chip}`;
}

/** Append a provider signal line into known signals — skips exact line duplicates. */
export function appendObservationSignalsLine(current: string, line: string): string {
  const chip = line.trim();
  if (!chip) return current.trim();

  const lines = current
    .split(/\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  const lower = chip.toLowerCase();
  if (lines.some((existing) => existing.toLowerCase() === lower)) {
    return lines.join("\n");
  }
  if (lines.some((existing) => existing.toLowerCase().includes(lower))) {
    return lines.join("\n");
  }

  return lines.length ? `${lines.join("\n")}\n${chip}` : chip;
}

export function isMissingObservationObjectiveColumnsError(message: string | null | undefined): boolean {
  const m = String(message || "").toLowerCase();
  return (
    m.includes("surgical_sales_cases") &&
    (m.includes("observation_key_questions") || m.includes("observation_signals_to_validate")) &&
    m.includes("schema cache")
  );
}
