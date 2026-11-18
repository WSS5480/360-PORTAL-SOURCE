const MIN_MEANINGFUL_LEN = 12;
const MEMORY_TEXT_MAX = 140;

function truncateMemoryText(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= MEMORY_TEXT_MAX) return t;
  return `${t.slice(0, MEMORY_TEXT_MAX - 1)}…`;
}

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function firstMeaningfulLine(raw: unknown): string | null {
  const text = trimOrNull(raw);
  if (!text) return null;
  const line = normalizeWhitespace(
    text
      .split(/\n+/)
      .map((l) => l.replace(/^[\s•\-–—*]+/, "").trim())
      .find((l) => l.length >= MIN_MEANINGFUL_LEN) || text,
  );
  if (line.length < MIN_MEANINGFUL_LEN) return null;
  const sentence = line.split(/(?<=[.!?])\s+/)[0] || line;
  return truncateMemoryText(sentence);
}

/** Best single line from engagement prep / observation plan fields (for profile mapping). */
export function extractEngagementMemoryContextLine(row: Record<string, unknown>): string | null {
  const keys = [
    "observation_goal",
    "pre_observation_value_hypothesis",
    "pre_observation_additional_notes",
    "pre_observation_impact_opening_statement",
    "pre_observation_planned_close",
    "pre_observation_probes",
  ];
  for (const key of keys) {
    const line = firstMeaningfulLine(row[key]);
    if (line) return line;
  }
  return null;
}
