/**
 * Legacy intelligence / recommendation phrases retired from rep-facing UI.
 * Apply at display boundaries; keep backend enum ids unchanged.
 */

export const LEGACY_INTELLIGENCE_USER_COPY_REPLACEMENTS: readonly [RegExp, string][] = [
  [/not viable for case support yet\.?/gi, "Operational picture still developing"],
  [/not viable yet\.?/gi, "Operational picture still developing"],
  [/no confirmed signals on file yet\.?/gi, "No confirmed detail captured yet"],
  [/no confirmed signals on file/gi, "No confirmed detail captured yet"],
  [/visibility still forming\s+visibility/gi, "Visibility developing"],
  [/visibility still forming/gi, "Visibility developing"],
  [/commercialization operational picture/gi, "Operational context"],
  [/what this account means for field commercialization/gi, "Operational context"],
  [/commercial operational risk/gi, "Operational context"],
  [/critical blockers?/gi, "Needs validation"],
  [/primary blockers?/gi, "Needs validation"],
  [/primary blocker[s]?:?/gi, "Needs validation"],
  [/what matters now/gi, "Field priorities"],
  [/strategic warnings?/gi, "Still learning"],
  [/field execution risk/gi, "Operational confidence"],
  [/adoption path/gi, "Deployment path"],
  [/\bunresolved\b/gi, "Needs validation"],
  [/\bmissing\b/gi, "Still learning"],
  [/^blockers$/i, "Needs validation"],
  [/\blow confidence\b/gi, "Limited field context available"],
  [/\blow intelligence confidence\b/gi, "Limited field context available"],
  [/\bnot captured\b/gi, "Not yet captured"],
  [/\baccess barriers?\b/gi, "Access details open"],
  [/\bnot pursuing observation\b/gi, "Observation permission declined"],
  [/\bpriority learning\b/gi, "Worth confirming soon"],
  [/\bdeployment gaps?\b/gi, "Supporting details"],
  [/\bclinical missing\b/gi, "Clinical context not yet captured"],
  [/\btop gap\b/gi, "Supporting detail"],
  [/\bprimary gap\b/gi, "Focus area"],
  [/\bclose gaps?\b/gi, "Add context"],
] as const;

export const PROVIDER_FIELD_PRIORITIES_TITLE = "Field priorities";

/** Strip retired CRM / warning vocabulary from user-visible strings. */
export function sanitizeLegacyIntelligenceUserCopy(text: string): string {
  let t = text;
  for (const [pattern, replacement] of LEGACY_INTELLIGENCE_USER_COPY_REPLACEMENTS) {
    t = t.replace(pattern, replacement);
  }
  return t.replace(/\s{2,}/g, " ").replace(/\s+([.,;])/g, "$1").trim();
}
