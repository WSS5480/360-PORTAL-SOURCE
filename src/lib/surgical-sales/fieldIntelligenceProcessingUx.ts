/**
 * Shared UX for Capture Field Intel / Tactical Debrief analysis loading.
 * Rotating copy only — no backend stage wiring unless the API exposes stages later.
 */

export const FIELD_INTELLIGENCE_PROCESSING_TITLE = "Processing field intelligence";

export const FIELD_INTELLIGENCE_PROCESSING_SUBTITLE =
  "Turning your debrief into provider, facility, and engagement updates.";

/** @deprecated Use FIELD_INTELLIGENCE_PROCESSING_SUBTITLE */
export const FIELD_INTELLIGENCE_PROCESSING_SUBTITLE_ALT =
  "Mapping what changed from this touch.";

export const FIELD_INTELLIGENCE_PROCESSING_STEPS: readonly string[] = [
  "Capturing debrief",
  "Detecting operational signals",
  "Separating facility vs provider context",
  "Identifying what still needs validation",
  "Preparing updates for review",
] as const;

export const FIELD_INTELLIGENCE_PROCESSING_ROTATING_MESSAGES: readonly string[] = [
  "Detecting workflow signals…",
  "Checking facility access context…",
  "Mapping provider-specific insights…",
  "Separating confirmed details from still-learning items…",
  "Preparing suggested updates…",
  "Building review summary…",
] as const;

export const FIELD_INTELLIGENCE_PROCESSING_STEP_MS = 1500;
export const FIELD_INTELLIGENCE_PROCESSING_MESSAGE_MS = 2200;

export function formatFieldIntelligenceProcessingContext(input: {
  providerLabel?: string | null;
  organizationLabel?: string | null;
  engagementTypeLabel?: string | null;
}): string {
  const parts = [input.providerLabel, input.organizationLabel, input.engagementTypeLabel].filter(
    (p): p is string => Boolean(p?.trim()),
  );
  if (parts.length === 0) return "Mapping field intelligence from this touch";
  return `Updating: ${parts.join(" • ")}`;
}

export function fieldIntelligenceProcessingStepState(
  stepIndex: number,
  activeStepIndex: number,
): "done" | "active" | "pending" {
  if (stepIndex < activeStepIndex) return "done";
  if (stepIndex === activeStepIndex) return "active";
  return "pending";
}
