import { splitDelimitedObjectiveLines } from "@/lib/surgical-sales/observationObjectives";

export const OBSERVATION_FOCUS_CHIP_OPTIONS = [
  "Provider pain points",
  "Staff pain points",
  "Workflow bottlenecks",
  "Current products used",
  "Competitor products used",
  "Product fit opportunities",
] as const;

export type ObservationFocusChip = (typeof OBSERVATION_FOCUS_CHIP_OPTIONS)[number];

const CHIP_SET = new Set<string>(OBSERVATION_FOCUS_CHIP_OPTIONS);

const LEGACY_CHIP_ALIASES: Record<string, ObservationFocusChip> = {
  "Provider frustrations": "Provider pain points",
  "Staff frustrations": "Staff pain points",
  "Competitor products": "Competitor products used",
};

export function normalizeObservationFocusChip(value: string): ObservationFocusChip | null {
  const trimmed = value.trim();
  if (isObservationFocusChip(trimmed)) return trimmed;
  return LEGACY_CHIP_ALIASES[trimmed] ?? null;
}

export function isObservationFocusChip(value: string): value is ObservationFocusChip {
  return CHIP_SET.has(value);
}

export function observationFocusChipsFromCaseRow(row: Record<string, unknown>): ObservationFocusChip[] {
  const fromKeyQuestions = splitDelimitedObjectiveLines(String(row.observation_key_questions ?? ""))
    .map(normalizeObservationFocusChip)
    .filter((chip): chip is ObservationFocusChip => Boolean(chip));
  if (fromKeyQuestions.length > 0) return fromKeyQuestions;

  return splitDelimitedObjectiveLines(String(row.observation_goal ?? ""))
    .map(normalizeObservationFocusChip)
    .filter((chip): chip is ObservationFocusChip => Boolean(chip));
}

export function serializeObservationFocusChips(chips: ObservationFocusChip[]): string | null {
  const unique = OBSERVATION_FOCUS_CHIP_OPTIONS.filter((chip) => chips.includes(chip));
  return unique.length > 0 ? unique.join("\n") : null;
}

export function toggleObservationFocusChip(
  selected: ObservationFocusChip[],
  chip: ObservationFocusChip,
): ObservationFocusChip[] {
  return selected.includes(chip) ? selected.filter((item) => item !== chip) : [...selected, chip];
}
