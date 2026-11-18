/** Max characters for a single ask shown in Prepare mission prep (scannable, one–two lines). */
export const MAX_FIELD_ASK_DISPLAY_CHARS = 88;

function capLength(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1).replace(/[,;]\s*[^,;.]*$/, "").trim();
  return `${cut}…`;
}

function lowerFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function stripLabelPrefix(text: string): string {
  return text
    .replace(
      /^(documented |procedure |stated |incumbent |prior touchpoint follow-up|follow-through from last touchpoint|evaluation openness|interest in|sim \/ hands-on focus)[^—:]+[—:]\s*/i,
      "",
    )
    .replace(/^procedure focus —\s*/i, "")
    .trim();
}

function pickCorePhrase(text: string): string {
  const parts = text.split(/\s*[—–]\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    const tail = parts[parts.length - 1]!;
    if (tail.length >= 14) return tail;
    if (parts[0]!.length <= 52) return parts[0]!;
  }
  const hyphen = text.split(/\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  if (hyphen.length > 1 && hyphen[0]!.length <= 40 && hyphen[1]!.length >= 14) {
    return hyphen[1]!;
  }
  return text;
}

/**
 * Turn a suggested talking point into a short, direct field question for display and copy.
 */
export function formatAskForFieldGuide(raw: string): string {
  let t = stripLabelPrefix(String(raw ?? "").replace(/\s+/g, " ").trim());
  if (!t) return "";
  t = pickCorePhrase(t);

  if (t.endsWith("?")) {
    return capLength(t, MAX_FIELD_ASK_DISPLAY_CHARS);
  }

  const lower = t.toLowerCase();
  if (/^(which|what|how|who|when|where|why|is |are |do |does |can |could |would )/.test(lower)) {
    return capLength(`${t}?`, MAX_FIELD_ASK_DISPLAY_CHARS);
  }

  if (/\b(workflow|sequence|volume|mix|steps|habits|friction|bottleneck|turnover|protocol)\b/i.test(t)) {
    return capLength(`How does ${lowerFirst(t)} work today?`, MAX_FIELD_ASK_DISPLAY_CHARS);
  }

  if (/\b(interest|openness|focus|criteria|metrics|objection|evaluation|trial|case)\b/i.test(t)) {
    return capLength(`What's the story on ${lowerFirst(t)}?`, MAX_FIELD_ASK_DISPLAY_CHARS);
  }

  return capLength(`What can you learn about ${lowerFirst(t)}?`, MAX_FIELD_ASK_DISPLAY_CHARS);
}

export function formatFieldAsksForClipboard(asks: string[]): string {
  return asks
    .map((a, i) => {
      const q = a.trim();
      return q ? `${i + 1}. ${q}` : "";
    })
    .filter(Boolean)
    .join("\n");
}
