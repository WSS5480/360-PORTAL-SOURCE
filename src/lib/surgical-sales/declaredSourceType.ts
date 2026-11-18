/**
 * Declared capture source — set by the capture surface, never guessed from text.
 * Drives source-aware assertion ceilings (Phase C); Phase B threads it only.
 */

export const DECLARED_SOURCE_TYPES = [
  "field_note",
  "observation_case",
  "debrief",
  "evaluation",
  "outcome",
] as const;

export type DeclaredSourceType = (typeof DECLARED_SOURCE_TYPES)[number];

export function isDeclaredSourceType(value: unknown): value is DeclaredSourceType {
  return (
    typeof value === "string" && (DECLARED_SOURCE_TYPES as readonly string[]).includes(value)
  );
}

export function parseDeclaredSourceType(value: unknown): DeclaredSourceType | undefined {
  return isDeclaredSourceType(value) ? value : undefined;
}
