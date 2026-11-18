/**
 * Normalize freeform capture text (paste notes, dictation) into discrete findings.
 */

const MIN_FINDING_LENGTH = 8;
const MAX_FINDINGS = 24;
const MAX_FINDING_LENGTH = 4000;

function cleanBulletLine(line: string): string {
  return line
    .replace(/^[-•*–—]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function pushFinding(findings: string[], seen: Set<string>, raw: string) {
  const normalized = normalizeWhitespace(raw);
  if (normalized.length < MIN_FINDING_LENGTH) return;
  const clipped =
    normalized.length > MAX_FINDING_LENGTH
      ? `${normalized.slice(0, MAX_FINDING_LENGTH - 1)}…`
      : normalized;
  const key = clipped.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  findings.push(clipped);
}

export function normalizeCaptureTextToFindings(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const findings: string[] = [];
  const seen = new Set<string>();
  const paragraphs = trimmed.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);

  for (const paragraph of paragraphs) {
    const lines = paragraph.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const bulletLines = lines.filter(
      (line) => /^[-•*–—]\s+/.test(line) || /^\d+[.)]\s+/.test(line),
    );

    if (bulletLines.length >= 2) {
      for (const line of bulletLines) {
        pushFinding(findings, seen, cleanBulletLine(line));
      }
      continue;
    }

    if (lines.length >= 2 && lines.every((line) => line.length >= MIN_FINDING_LENGTH)) {
      for (const line of lines) {
        pushFinding(findings, seen, cleanBulletLine(line));
      }
      continue;
    }

    pushFinding(findings, seen, paragraph.replace(/\n+/g, " "));
  }

  if (!findings.length && trimmed.length >= MIN_FINDING_LENGTH) {
    pushFinding(findings, seen, trimmed);
  }

  return findings.slice(0, MAX_FINDINGS);
}
