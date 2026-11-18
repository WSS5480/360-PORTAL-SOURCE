import { isActionableIntelligenceFinding } from "@/lib/surgical-sales/observationFindingQuality";

/** Append a deduped intelligence line into a case live_observation text field. */

export function appendObservationLiveFieldLine(current: unknown, line: string): string {
  const chip = line.trim();

  if (!chip || !isActionableIntelligenceFinding(chip)) return String(current ?? "").trim();



  const existing = String(current ?? "").trim();

  const lower = chip.toLowerCase();



  if (existing.toLowerCase() === lower) return existing;



  const lines = existing

    .split(/\n/)

    .map((part) => part.trim())

    .filter(Boolean);



  if (lines.some((part) => part.toLowerCase() === lower)) return lines.join("\n");

  if (lines.some((part) => part.toLowerCase().includes(lower))) return lines.join("\n");



  return lines.length ? `${lines.join("\n")}\n${chip}` : chip;

}


