/**
 * Sparse-data presentation — overview and intelligence stay useful when reps log little.
 * Show what is known; hide empty sections; never surface missing-field warnings.
 */

import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

/** Context bullet ids that frame absence or incomplete intelligence — not for overview. */
export const OVERVIEW_ABSENCE_BULLET_IDS = new Set([
  "intel-workflow",
  "intel-gap",
  "intel-building",
  "relationship-early",
  "eng-none",
  "eng-none-done",
  "opp-none",
  "case-obs",
]);

const OVERVIEW_ABSENCE_COPY_RE =
  /\b(not yet|no engagements|no evaluation|not captured|still open|still forming|not established|limited procedural|no case scheduled|no logged)\b/i;

export function isOverviewAbsenceCopy(text: string): boolean {
  const line = text.trim();
  if (!line) return true;
  return OVERVIEW_ABSENCE_COPY_RE.test(line);
}

export function shouldIncludeOverviewContextBullet(input: {
  id: string;
  text: string;
  isNextAction?: boolean;
}): boolean {
  if (input.isNextAction) return false;
  if (OVERVIEW_ABSENCE_BULLET_IDS.has(input.id)) return false;
  if (isOverviewAbsenceCopy(input.text)) return false;
  return Boolean(input.text?.trim());
}

export function resolveIntelligenceReferencePageLead(hasFieldEvidence: boolean): string {
  if (hasFieldEvidence) {
    return "What we know, what is still open, who matters, and where it came from.";
  }
  return "Field context appears here as you capture it — no need to fill everything in.";
}

/** Pull a single human line from the most recent note when structured intel is thin. */
export function extractLatestNoteHighlight(
  activityTimeline?: Array<Record<string, unknown>>,
): string | null {
  for (const row of activityTimeline ?? []) {
    const kind = String(row.kind ?? row.activity_type ?? row.type ?? "").toLowerCase();
    const isNote =
      kind === "note" ||
      kind.includes("note") ||
      String(row.event_type ?? "")
        .toLowerCase()
        .includes("note");
    if (!isNote) continue;

    const text = String(
      row.summary ?? row.body ?? row.content ?? row.title ?? row.description ?? "",
    ).trim();
    if (!text || text.length < 4) continue;
    if (/^(field note|note added|activity recorded)/i.test(text)) continue;
    return scanLine(text, 96);
  }
  return null;
}
