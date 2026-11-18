/**
 * Field-friendly AI debrief review presentation — compact cards, no audit-console copy.
 */

import { convertOpenQuestionToFieldAction } from "@/lib/surgical-sales/buildConcreteDebriefNextSteps";
import type { DebriefIntelligenceExtractionReview, DebriefIntelligenceUpdateItem } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import { debriefContactCardPrompt } from "@/lib/surgical-sales/debriefDetectedContact";
import type { ReviewScopeDisplayContext } from "@/lib/surgical-sales/logUpdateReviewScopeDisplay";
import {
  classifyDebriefPathwaySignal,
  debriefCardBody,
  stripStoredIntelligenceEncoding,
} from "@/lib/surgical-sales/debriefReviewDisplayLanguage";
import { sanitizeFieldIntelligenceText } from "@/lib/surgical-sales/fieldIntelligenceLanguage";

const SYSTEM_PHRASE_RE =
  /\b(?:partially\s+mapped|organization\s+intelligence|provider\s+operational\s+understanding|validation\s+items?|ambiguous|mapped\s+to|operational\s+signals?|workflow\s+maturity\s+suggestion)\b/gi;

export type DebriefReviewFollowUpGroups = {
  required: string[];
  helpful: string[];
};

export type DebriefReviewSummaryCounts = {
  usableUpdates: number;
  followUpItems: number;
};

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function sanitizeDebriefUserCopy(text: string, maxLen = 160): string {
  let t = stripStoredIntelligenceEncoding(text);
  t = sanitizeFieldIntelligenceText(t, { maxLen: maxLen + 40 });
  t = t.replace(SYSTEM_PHRASE_RE, "").replace(/\s{2,}/g, " ").trim();
  return clip(t, maxLen);
}

export function buildDebriefReviewContextLine(input: {
  providerLabel?: string | null;
  organizationLabel?: string | null;
  engagementTypeLabel?: string | null;
}): string {
  const parts = [
    input.providerLabel?.trim(),
    input.organizationLabel?.trim(),
    input.engagementTypeLabel?.trim(),
  ].filter(Boolean);
  return parts.join(" • ");
}

export function buildDebriefReviewSummaryCounts(input: {
  extraction: DebriefIntelligenceExtractionReview;
  proposedContacts: DebriefProposedContactItem[];
  followUp: DebriefReviewFollowUpGroups;
}): DebriefReviewSummaryCounts {
  const usableUpdates =
    input.extraction.intelligenceUpdates.length +
    input.proposedContacts.filter((c) => c.disposition !== "skipped").length +
    input.extraction.platformMatches.length;

  const followUpItems = input.followUp.required.length + input.followUp.helpful.length;

  return { usableUpdates, followUpItems };
}

export function intelligenceCardTitle(item: DebriefIntelligenceUpdateItem): string {
  const label = item.intelligenceFieldLabel.trim().toLowerCase();
  if (label.includes("scheduling") && label.includes("owner")) return "Scheduling contact found";
  if (label.includes("scheduling")) return "Scheduling contact found";
  if (label.includes("credential") || label.includes("vendor") || label.includes("platform")) {
    return "Vendor access mentioned";
  }
  if (label.includes("approval") || label.includes("observation access")) return "Observation access noted";
  if (label.includes("workflow") || label.includes("procedure")) return "Workflow insight";
  if (label.includes("champion")) return "Champion signal";
  if (label.includes("influence") || label.includes("decision")) return "Decision influence noted";
  if (label.includes("logistics")) return "Observation logistics noted";
  const cleaned = sanitizeDebriefUserCopy(item.intelligenceFieldLabel, 48);
  if (!cleaned) return "Field update";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function intelligenceCardSummary(item: DebriefIntelligenceUpdateItem): string {
  const pathwayClass = classifyDebriefPathwaySignal({ item });
  return debriefCardBody({ item, pathwayClass });
}

export function intelligenceCardStatusHint(
  item: DebriefIntelligenceUpdateItem,
  disposition: "needs_review" | "accepted" | "ignored" | "edited" = "needs_review",
): string | null {
  if (disposition !== "needs_review") return null;
  if (item.hasConflict) return "Choose how to merge with what's on file";
  if (item.confidenceTier === "ambiguous") return "Needs a quick look";
  if (item.confidenceTier === "needs_review") return "Confirm before saving";
  return null;
}

export function intelligenceConfidenceLabel(tier: string): string | null {
  if (tier === "high_confidence") return null;
  if (tier === "needs_review") return "Medium";
  if (tier === "ambiguous") return "Low";
  return null;
}

export function platformCardTitle(): string {
  return "Vendor access mentioned";
}

export function platformCardSummary(match: DebriefIntelligenceExtractionReview["platformMatches"][number]): string {
  if (match.matchedPlatformName) {
    return `Possible platform: ${match.matchedPlatformName}`;
  }
  return `Possible platform: ${match.mentionedName}`;
}

export function contactCardTitle(contact: DebriefProposedContactItem): string {
  const role = contact.roleLabel?.trim().toLowerCase();
  if (role.includes("schedul")) return "Scheduling contact found";
  return "Contact mentioned";
}

export function contactCardSummary(contact: DebriefProposedContactItem): string {
  const prompt = debriefContactCardPrompt(contact);
  return sanitizeDebriefUserCopy(prompt.replace(/add contact details\?/i, "").trim(), 120);
}

export function buildDebriefFollowUpGroups(input: {
  unresolvedItems: string[];
  openQuestionLabels?: string[];
}): DebriefReviewFollowUpGroups {
  const required: string[] = [];
  const helpful: string[] = [];
  const seen = new Set<string>();

  const add = (bucket: "required" | "helpful", raw: string) => {
    const action =
      convertOpenQuestionToFieldAction(raw) ??
      sanitizeDebriefUserCopy(raw.replace(/\?+$/, "").trim(), 120);
    if (!action || action.length < 14) return;
    const line = action.endsWith(".") ? action : `${action}.`;
    const key = line.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    if (bucket === "required" && required.length < 2) required.push(line);
    else if (bucket === "helpful" && helpful.length < 3) helpful.push(line);
  };

  for (const q of input.unresolvedItems) {
    const lower = q.toLowerCase();
    if (lower.includes("workflow maturity")) continue;
    if (
      /\b(required|must|approval|who officially|blocking|before observation)\b/i.test(lower)
    ) {
      add("required", q);
    } else {
      add("helpful", q);
    }
  }

  for (const label of input.openQuestionLabels ?? []) {
    if (required.length >= 2 && helpful.length >= 3) break;
    const lower = label.toLowerCase();
    if (lower.includes("approval") || lower.includes("officially")) add("required", label);
    else add("helpful", label);
  }

  return { required, helpful };
}

export function buildDebriefReviewOpenQuestionLabels(
  extraction: DebriefIntelligenceExtractionReview,
): string[] {
  return extraction.unresolvedItems
    .filter((item) => item.endsWith("?") || /\bwho\b/i.test(item))
    .slice(0, 6);
}
