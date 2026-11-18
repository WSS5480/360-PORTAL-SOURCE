/** Leaf constants for workflow understanding — no imports (avoids circular module init). */

export const WORKFLOW_UNDERSTANDING_QUESTION =
  "How well is the procedure workflow understood?";

export const WORKFLOW_MATURITY_VALUES = [
  "discussed_only",
  "partially_understood",
  "observed_in_field",
  "fully_validated",
  "unknown",
] as const;

export type WorkflowMaturityValue = (typeof WORKFLOW_MATURITY_VALUES)[number];

export const WORKFLOW_MATURITY_OPTIONS: Array<{
  value: WorkflowMaturityValue;
  label: string;
  tone: "positive" | "partial" | "neutral";
}> = [
  { value: "discussed_only", label: "Discussed only", tone: "partial" },
  { value: "partially_understood", label: "Partially understood", tone: "partial" },
  { value: "observed_in_field", label: "Observed in field", tone: "positive" },
  { value: "fully_validated", label: "Fully validated", tone: "positive" },
  { value: "unknown", label: "Unknown", tone: "neutral" },
];
