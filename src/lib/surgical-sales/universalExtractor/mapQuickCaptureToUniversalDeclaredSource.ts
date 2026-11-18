import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { UniversalDeclaredSourceType } from "@/lib/surgical-sales/universalExtractor/types";

/** Resolve engagement type from explicit value or intro-call label fallback. */
export function resolveQuickCaptureEngagementType(input: {
  engagementType?: string | null;
  engagementTypeLabel?: string | null;
}): string | null {
  const normalized = normalizeEngagementType(input.engagementType);
  if (normalized) return normalized;

  const label = String(input.engagementTypeLabel ?? "").trim().toLowerCase();
  if (label === "intro call" || label.includes("intro call")) {
    return "intro_call";
  }

  return null;
}

/**
 * Map provider/discovery quick capture to universal declared source.
 * Intro-call engagements → intro_call; all other provider field notes → discovery_note.
 */
export function mapQuickCaptureToUniversalDeclaredSource(input: {
  engagementType?: string | null;
  engagementTypeLabel?: string | null;
}): UniversalDeclaredSourceType {
  const engagementType = resolveQuickCaptureEngagementType(input);
  if (engagementType === "intro_call") return "intro_call";
  return "discovery_note";
}
