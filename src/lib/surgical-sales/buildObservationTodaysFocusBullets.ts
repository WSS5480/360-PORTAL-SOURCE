import {
  buildObservationFocusGuidance,
  type ObservationFocusGuidanceItem,
} from "@/lib/surgical-sales/buildObservationFocusGuidance";
import type { ObservationFocusChip } from "@/lib/surgical-sales/observationCaseFocusChips";

const FOCUS_BULLETS: Record<ObservationFocusChip, string> = {
  "Current products used": "Note which products are on preference and in use",
  "Competitor products used": "Watch for competitor products and trays in the case",
  "Provider pain points": "Listen for provider pain points during the procedure",
  "Staff pain points": "Notice staff pain points during setup and turnover",
  "Workflow bottlenecks": "Observe workflow bottlenecks and delays",
  "Product fit opportunities": "Look for moments where product fit could improve",
};

const DEFAULT_BULLETS = [
  "Note which products are on preference and in use",
  "Observe workflow bottlenecks and delays",
  "Listen for provider pain points during the procedure",
] as const;

export function focusGuidanceToBullets(guidance: ObservationFocusGuidanceItem[]): string[] {
  const bullets = guidance
    .map((item) => FOCUS_BULLETS[item.label])
    .filter((bullet): bullet is string => Boolean(bullet));

  const unique = [...new Set(bullets)];
  if (unique.length >= 3) return unique.slice(0, 6);
  if (unique.length > 0) return unique;

  return [...DEFAULT_BULLETS];
}

export function buildObservationTodaysFocusBullets(input: {
  caseRow: Record<string, unknown>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
  activities?: Array<{ activity_type?: string; body?: string }>;
}): string[] {
  const guidance = buildObservationFocusGuidance(input);
  return focusGuidanceToBullets(guidance);
}
