import { isMachineGeneratedIntelligenceLabel } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";

/** Internal topic labels — never show without supporting detail. */
export const GENERIC_OBSERVATION_INTELLIGENCE_LABELS = new Set(
  [
    "Observation access process",
    "Observation approval",
    "Preferred procedures",
    "Technique preferences",
    "Competitor usage",
    "Scheduling owner",
    "Credentialing path",
    "Observation credentialing rules",
    "Observable procedures",
    "Workflow friction points",
    "Evaluation openness",
    "Dock and tray preferences",
    "Case access readiness",
    "Open questions for this case",
    "Competitor usage on this case",
    "Workflow fit signal",
    "Product interest signal",
    "Facility vendor pathway",
    "Observation timing and logistics",
    "Procedure workflow visibility",
    "Product fit alignment",
    "Clinical champion",
    "Facility logistics",
    "Provider preferences",
    "Product availability",
    "Tray/instrument status",
    "Credentialing and access",
  ].map((label) => label.toLowerCase()),
);

const MEANING_PATTERNS: Array<{ key: string; pattern: RegExp }> = [
  { key: "access_pathway", pattern: /\b(access pathway|observation access pathway|facility vendor pathway)\b/i },
  { key: "scheduling_owner", pattern: /\b(scheduling owner|coordinates scheduling|who owns scheduling)\b/i },
  { key: "credentialing", pattern: /\bcredentialing\b/i },
  { key: "competitor", pattern: /\bcompetitor\b/i },
  { key: "product_interest", pattern: /\bproduct interest\b/i },
  { key: "workflow_fit", pattern: /\bworkflow fit\b/i },
  { key: "workflow_friction", pattern: /\bworkflow friction\b/i },
  { key: "access_notes", pattern: /\b(provider access notes|access notes)\b/i },
  { key: "observation_approval", pattern: /\bobservation approved\b/i },
];

export function isGenericObservationIntelligenceLabel(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return GENERIC_OBSERVATION_INTELLIGENCE_LABELS.has(trimmed.toLowerCase());
}

/** Provider-sourced fragments that fail card-quality gates but are valid case summaries. */
export function isProviderSourcedIntelligenceFragment(text: string): boolean {
  return isMachineGeneratedIntelligenceLabel(text);
}

export function normalizeObservationIntelligenceMeaning(text: string): string {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ");
  for (const { key, pattern } of MEANING_PATTERNS) {
    if (pattern.test(normalized)) return key;
  }
  return normalized;
}

function intelligenceBulletScore(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return -999;
  if (isGenericObservationIntelligenceLabel(trimmed)) return -100;

  let score = Math.min(trimmed.length, 90);
  if (/[.!?]/.test(trimmed)) score += 8;
  if (trimmed.split(/\s+/).length >= 5) score += 12;
  if (/:\s+\S/.test(trimmed)) score += 10;
  if (/\b(noted|confirmed|identified|documented|observed|validated|coordinates)\b/i.test(trimmed)) score += 6;
  return score;
}

export function preferObservationIntelligenceBullet(a: string, b: string): string {
  return intelligenceBulletScore(a) >= intelligenceBulletScore(b) ? a : b;
}

export function dedupeObservationIntelligenceBullets(lines: readonly string[], max?: number): string[] {
  const byMeaning = new Map<string, string>();
  const order: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || intelligenceBulletScore(trimmed) < 0) continue;

    const key = normalizeObservationIntelligenceMeaning(trimmed);
    const existing = byMeaning.get(key);
    if (existing) {
      byMeaning.set(key, preferObservationIntelligenceBullet(existing, trimmed));
    } else {
      byMeaning.set(key, trimmed);
      order.push(key);
    }
  }

  const deduped = order.map((key) => byMeaning.get(key)!);
  return max != null ? deduped.slice(0, max) : deduped;
}
