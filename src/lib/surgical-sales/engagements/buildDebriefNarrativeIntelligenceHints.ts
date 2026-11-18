/**
 * Lightweight read-model hints from saved debrief / start-mission narrative when
 * structured CRM fields or follow_up_tasks were not fully persisted.
 */

import { normalizeNextActionDisplayTitle } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefNextActionDisplay";
import {
  formatProductInterestHeadline,
  normalizeProductInterestLabel,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductInterestDisplay";
import { isGenericClinicalFactText } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { parseDebriefIntelligenceSnapshot } from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { readStartMissionSnapshot } from "@/lib/surgical-sales/engagements/startMissionSnapshot";
import { canonicalProcedureLabel } from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";
import { extractProductMentionsFromText } from "@/lib/surgical-sales/sharedIntelligence/extractProductMention";

export type DebriefNarrativeDossierHints = {
  procedureFocus: string | null;
  currentProducts: string[];
  productInterests: string[];
  workflowNotes: string[];
  positioningFrictions: string[];
};

function sentenceChunks(text: string): string[] {
  return text
    .replace(/^["']|["']$/g, "")
    .replace(/\[[^\]]+\]/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeNarrative(raw: string): string {
  return raw.replace(/^["']|["']$/g, "").replace(/\s+/g, " ").trim();
}

export function resolveLatestEngagementDebriefNarrative(
  engagements?: ProviderEngagementSummary[],
): string | null {
  for (const engagement of engagements ?? []) {
    const snapshot = parseDebriefIntelligenceSnapshot(engagement.debrief_intelligence_snapshot);
    const snapshotNarrative = normalizeNarrative(snapshot?.narrative ?? "");
    if (snapshotNarrative.length >= 40) return snapshotNarrative;

    const mission = readStartMissionSnapshot(engagement.debrief_intelligence_snapshot);
    const missionNarrative = normalizeNarrative(mission?.live_notes ?? "");
    if (missionNarrative.length >= 40) return missionNarrative;

    const rawSnapshot = engagement.debrief_intelligence_snapshot;
    if (rawSnapshot && typeof rawSnapshot === "object") {
      const startMission = (rawSnapshot as Record<string, unknown>).start_mission;
      if (startMission && typeof startMission === "object") {
        const liveNotes = normalizeNarrative(
          String((startMission as Record<string, unknown>).live_notes ?? ""),
        );
        if (liveNotes.length >= 40) return liveNotes;
      }
    }
  }
  return null;
}

function extractProcedureFocus(narrative: string): string | null {
  const performsMatch = narrative.match(
    /\b(?:primarily\s+)?(?:performs|performing|focuses on|specializes in)\s+(.+?)(?:[.!?]|,\s+(?:he|she|they|and)\b)/i,
  );
  if (performsMatch?.[1]) {
    const focus = canonicalProcedureLabel(performsMatch[1].replace(/\s+and\s+/i, " and ").trim());
    if (focus && !isGenericClinicalFactText(focus)) return focus;
  }

  const roboticMatch = narrative.match(
    /\b(robotic\s+(?:ventral|inguinal|hernia|abdominal|wall)[^.!?]{0,80})/i,
  );
  if (roboticMatch?.[1]) {
    const focus = canonicalProcedureLabel(roboticMatch[1].trim());
    if (focus && !isGenericClinicalFactText(focus)) return focus;
  }

  return null;
}

function extractCurrentProducts(narrative: string): string[] {
  const mentions = extractProductMentionsFromText({ text: narrative, mode: "debrief" });
  const products = new Set<string>();
  for (const mention of mentions) {
    const name = mention.productName.trim();
    if (name.length >= 3) products.add(name);
  }
  return [...products];
}

function extractProductInterests(narrative: string): string[] {
  const interests: string[] = [];
  if (/published outcomes|before considering any changes|wanted to see published/i.test(narrative)) {
    interests.push(
      formatProductInterestHeadline(
        normalizeProductInterestLabel("wanted to see published outcomes before considering any changes"),
      ),
    );
    return interests;
  }
  if (/comparative clinical data/i.test(narrative)) {
    interests.push(formatProductInterestHeadline("comparative clinical data interest"));
  }
  return interests;
}

function extractWorkflowNotes(narrative: string): string[] {
  const notes: string[] = [];
  const scheduling = narrative.match(
    /\b((?:mornings?\s+on\s+)?(?:mondays?|tuesdays?|wednesdays?|thursdays?|fridays?)(?:\s+and\s+(?:mondays?|tuesdays?|wednesdays?|thursdays?|fridays?))?(?:\s+(?:mornings?|afternoons?))?(?:\s+(?:are|is)\s+(?:usually\s+)?(?:the\s+)?easiest(?:\s+to\s+schedule)?)?[^.!?]{0,40})/i,
  );
  if (scheduling?.[1]) {
    notes.push(`Scheduling preference: ${scheduling[1].trim().replace(/\s+/g, " ")}`);
  }
  return notes;
}

function extractPositioningFrictions(narrative: string): string[] {
  const friction: string[] = [];
  const positioning = narrative.match(
    /\b(?:wishes|wish|harder|difficult|easier to position|position in larger defects)[^.!?]{0,120}/i,
  );
  if (positioning?.[0] && /position|defect|mesh/i.test(positioning[0])) {
    friction.push("Positioning in larger defects can be challenging with current mesh.");
  }
  return friction;
}

export function extractDossierHintsFromDebriefNarrative(narrative: string): DebriefNarrativeDossierHints {
  const text = normalizeNarrative(narrative);
  return {
    procedureFocus: extractProcedureFocus(text),
    currentProducts: extractCurrentProducts(text),
    productInterests: extractProductInterests(text),
    workflowNotes: extractWorkflowNotes(text),
    positioningFrictions: extractPositioningFrictions(text),
  };
}

function isFollowUpActionSentence(sentence: string): boolean {
  const trimmed = sentence.trim();
  if (!trimmed) return false;
  if (/^(?:she|he|they|it|the\s+\w+)\s+said\b/i.test(trimmed)) return false;
  if (/\beasiest to schedule\b/i.test(trimmed) && !/\basked me to\b/i.test(trimmed)) return false;
  if (/\b(?:i told|i(?:'ll| will)|asked me to|my next step|next step is)\b/i.test(trimmed)) {
    return true;
  }
  if (/\bfollow(?:ing)?\s+up\s+with\b/i.test(trimmed)) return true;
  if (/\basked me to\b/i.test(trimmed) && /\b(?:email|send|share|bring|schedule)\b/i.test(trimmed)) {
    return true;
  }
  return false;
}

export function extractFollowUpLinesFromDebriefNarrative(narrative: string): string[] {
  const text = normalizeNarrative(narrative);
  if (!text) return [];

  const seen = new Set<string>();
  const lines: string[] = [];

  const push = (line: string) => {
    const normalized = line.trim();
    if (normalized.length < 8) return;
    if (/^(?:she|he|they)\s+said\b/i.test(normalized)) return;
    if (/\beasiest to schedule\b/i.test(normalized)) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(normalized);
  };

  for (const sentence of sentenceChunks(text)) {
    if (!isFollowUpActionSentence(sentence)) continue;
    push(normalizeNextActionDisplayTitle(sentence));
  }

  return lines.slice(0, 8);
}

export function buildDebriefNarrativeDossierHints(input: {
  engagements?: ProviderEngagementSummary[];
  narrativeFallback?: string | null;
}): DebriefNarrativeDossierHints | null {
  const narrative =
    resolveLatestEngagementDebriefNarrative(input.engagements) ??
    normalizeNarrative(String(input.narrativeFallback ?? ""));
  if (narrative.length < 40) return null;
  return extractDossierHintsFromDebriefNarrative(narrative);
}

export function resolveProviderDebriefNarrativeFallback(input: {
  engagements?: ProviderEngagementSummary[];
  narrativeFallback?: string | null;
}): string | null {
  const fromEngagements = resolveLatestEngagementDebriefNarrative(input.engagements);
  if (fromEngagements) return fromEngagements;
  const fallback = normalizeNarrative(String(input.narrativeFallback ?? ""));
  return fallback.length >= 40 ? fallback : null;
}
