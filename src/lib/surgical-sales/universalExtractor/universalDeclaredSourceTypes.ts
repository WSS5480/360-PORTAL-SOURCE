import type { UniversalDeclaredSourceType } from "@/lib/surgical-sales/universalExtractor/types";
import { UNIVERSAL_DECLARED_SOURCE_TYPES } from "@/lib/surgical-sales/universalExtractor/types";

export const UNIVERSAL_SOURCE_TYPE_LABELS: Record<UniversalDeclaredSourceType, string> = {
  intro_call: "Intro call",
  office_visit: "Office visit",
  discovery_note: "Discovery note",
  observation_case: "Observation case",
  debrief_note: "Debrief note",
  debrief_validation: "Debrief validation",
  product_support_case: "Product support case",
  evaluation_note: "Evaluation note",
  outcome_note: "Outcome note",
};

/** Source types used to validate assertion routing for the same canonical note. */
export const UNIVERSAL_ASSERTION_PROBE_SOURCE_TYPES: UniversalDeclaredSourceType[] = [
  "intro_call",
  "observation_case",
  "product_support_case",
  "debrief_validation",
];

export const UNIVERSAL_DEFAULT_ASSERTION_PROBE_NOTE =
  "I've had issues getting the right implant size before.";

export const DEBRIEF_VALIDATION_CONFIRM_SIZING_NOTE =
  "Dr. Thompson confirmed that implant sizing has been a recurring issue in his abdominal wall cases.";

export const DEBRIEF_VALIDATION_REJECT_SIZING_NOTE =
  "Dr. Thompson said implant sizing is not actually a recurring issue and today's adjustment was routine.";

export const UNIVERSAL_DEBRIEF_VALIDATION_PROBE_PRESETS = [
  {
    id: "confirm_sizing",
    label: "Validate sizing (recurring issue)",
    note: DEBRIEF_VALIDATION_CONFIRM_SIZING_NOTE,
    declared_source_type: "debrief_validation" as const,
  },
  {
    id: "reject_sizing",
    label: "Reject sizing (not recurring)",
    note: DEBRIEF_VALIDATION_REJECT_SIZING_NOTE,
    declared_source_type: "debrief_validation" as const,
  },
];

export const UNIVERSAL_SOURCE_TYPE_OPTIONS = UNIVERSAL_DECLARED_SOURCE_TYPES.map((value) => ({
  value,
  label: UNIVERSAL_SOURCE_TYPE_LABELS[value],
}));

export function formatUniversalDeclaredSourceType(
  sourceType: string,
): string {
  const key = sourceType as UniversalDeclaredSourceType;
  return UNIVERSAL_SOURCE_TYPE_LABELS[key] ?? sourceType;
}
