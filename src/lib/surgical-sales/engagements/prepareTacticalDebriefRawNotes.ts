/** Extract rep-authored debrief text from stored engagement notes (legacy formatted notes supported). */

const FORMATTED_NOTE_SPLIT =
  /\n\n(?:operational intelligence captured:|---\s*tactical\s+debrief\s*---)/i;

export function extractRawDebriefFromStoredNotes(notes: string | null | undefined): string {
  const t = String(notes ?? "").trim();
  if (!t) return "";

  const whatHappened = /^what happened:\s*\n([\s\S]*)$/i.exec(t);
  if (whatHappened) {
    const body = whatHappened[1] ?? "";
    const split = body.split(FORMATTED_NOTE_SPLIT);
    return split[0]?.trim() ?? "";
  }

  if (FORMATTED_NOTE_SPLIT.test(t)) {
    return t.split(FORMATTED_NOTE_SPLIT)[0]?.trim() ?? "";
  }

  if (/^[-—\s]*tactical\s+debrief[-—\s]*$/i.test(t)) return "";

  return t;
}

export function isFormattedDebriefNotes(notes: string | null | undefined): boolean {
  const t = String(notes ?? "");
  return (
    /operational intelligence captured:/i.test(t) ||
    /---\s*tactical\s+debrief\s*---/i.test(t) ||
    /^what happened:\s*\n/i.test(t)
  );
}
