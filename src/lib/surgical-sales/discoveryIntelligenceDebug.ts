/**
 * Dev-only tracing for debrief → Discovery Mapping persistence.
 */

export function discoveryIntelligenceDebug(
  label: string,
  payload: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === "production") return;
  console.info(`[discovery-intel] ${label}`, payload);
}
