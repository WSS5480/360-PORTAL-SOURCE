/**
 * Format partial debrief intelligence for provider/facility field storage and discovery display.
 */

import { extractSuspectedContactFromSchedulingContext } from "@/lib/surgical-sales/namedEntityIntelligenceGuardrails";

export const PARTIAL_INTELLIGENCE_LEAD_PREFIX = "[Partial lead]";

export function formatPartialIntelligencePersistValue(input: {
  narrative: string;
  stillNeeds?: string[];
  suspectedContact?: string | null;
  contactScopeNote?: string | null;
  sourceQuote?: string | null;
}): string {
  const blocks: string[] = [];
  const narrative = input.narrative.trim();
  if (input.suspectedContact?.trim()) {
    const scope = input.contactScopeNote?.trim();
    blocks.push(
      `${PARTIAL_INTELLIGENCE_LEAD_PREFIX} ${input.suspectedContact.trim()}${scope ? ` (${scope})` : ""}`,
    );
  }
  if (narrative) blocks.push(narrative);
  const still = (input.stillNeeds ?? []).map((s) => s.trim()).filter(Boolean);
  if (still.length > 0) {
    blocks.push(`Still needed: ${still.join("; ")}.`);
  }
  if (input.sourceQuote?.trim()) {
    blocks.push(`Source: "${input.sourceQuote.trim().slice(0, 280)}"`);
  }
  return blocks.join("\n\n").trim();
}

/** Pull quoted source line from a persisted partial-intelligence field value. */
export function extractSourceQuoteFromPersistedValue(text: string | null | undefined): string | null {
  const blob = String(text ?? "").trim();
  if (!blob) return null;
  const match = blob.match(/Source:\s*"([^"]+)"/i) ?? blob.match(/Source:\s*(.+)$/im);
  const quote = match?.[1]?.trim();
  return quote && quote.length > 8 ? quote.slice(0, 400) : null;
}

export function extractSuspectedContactName(text: string): string | null {
  const blob = text.trim();
  if (!blob) return null;
  const schedulingContact = extractSuspectedContactFromSchedulingContext(blob);
  if (schedulingContact) return schedulingContact;
  const cameUp = blob.match(/\b([A-Z][a-z]+)\s+came up\b/i);
  if (cameUp?.[1] && !/^(He|She|They|We|I|The|OR|PA|As)$/i.test(cameUp[1])) {
    return cameUp[1];
  }
  const lead =
    blob.match(/\b(?:suspected|possible|likely)\s+(?:contact|lead)?:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i) ??
    blob.match(/\b([A-Z][a-z]+)\s+(?:from\s+(?:his|her)\s+office|handles?\s+most\b)/i) ??
    blob.match(/\b(?:mentioned|bringing up|brought up)\s+([A-Z][a-z]{2,})\b/i);
  const name = lead?.[1]?.trim();
  if (!name || /^(He|She|They|We|I|The|OR|PA|As|To|At|In|On|Up)$/i.test(name)) return null;
  return name;
}
