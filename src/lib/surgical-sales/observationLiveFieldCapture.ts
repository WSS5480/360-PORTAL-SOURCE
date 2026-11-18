export type ObservationLiveCaptureField =
  | "live_observation_clinical_pain_points"
  | "live_observation_competitors"
  | "live_observation_product_fit";

export function appendObservationLiveFieldLine(existing: unknown, line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return String(existing ?? "").trim();

  const current = String(existing ?? "").trim();
  if (!current) return trimmed;

  const lines = current
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const key = trimmed.toLowerCase();
  if (lines.some((entry) => entry.toLowerCase() === key)) return current;

  return `${current}\n${trimmed}`;
}

export function observationLiveFieldCapturePatch(
  field: ObservationLiveCaptureField,
  line: string,
  caseRow: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    [field]: appendObservationLiveFieldLine(caseRow[field], line),
  };

  if (field === "live_observation_competitors") {
    patch.live_observation_competitors = patch[field];
  }

  return patch;
}
