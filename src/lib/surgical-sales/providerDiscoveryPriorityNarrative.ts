/**
 * Rep-facing narrative for ranked discovery priorities (why + outcome).
 * Headlines stay in DISCOVERY_COACHING_PROMPTS; this file is the operating context.
 */

import { intelligenceFieldWhyItMatters } from "@/lib/surgical-sales/providerIntelligenceCaptureGuidance";
import { intelligenceUnlocksNextLine } from "@/lib/surgical-sales/providerIntelligenceUnlocksNext";
import { PROGRESSIVE_DISCOVERY_PROMPTS } from "@/lib/surgical-sales/providerIntelligenceProgressiveCapture";

const DEFAULT_WHY =
  "This signal is still developing — capturing it sharpens recommendations on the next touch.";

export function discoveryPriorityWhyItMatters(dbKey: string): string {
  const custom = intelligenceFieldWhyItMatters(dbKey) ?? PROGRESSIVE_DISCOVERY_PROMPTS[dbKey]?.whyItMatters;
  if (custom?.trim()) return custom.trim();
  return DEFAULT_WHY;
}

export function discoveryPriorityExpectedOutcome(dbKey: string): string {
  return intelligenceUnlocksNextLine(dbKey);
}

export { discoveryPriorityCaptureLabel } from "@/lib/surgical-sales/providerIntelligenceContextualCtas";
