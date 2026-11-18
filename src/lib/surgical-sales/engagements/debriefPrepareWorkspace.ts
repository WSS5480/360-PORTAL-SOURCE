/**
 * Rep-owned debrief prepare workspace — persisted on engagement debrief_intelligence_snapshot.
 */

import { sanitizeMeetingObjectiveForDisplay } from "@/lib/surgical-sales/engagements/debriefPrepareIntelligenceValidation";
import type { DebriefGuidanceIntelligence } from "@/lib/surgical-sales/engagements/debriefGuidanceIntelligenceTypes";
import {
  dedupePrepareLearnQuestions,
  rebuildDebriefGuidanceIntelligenceFromWorkspaceDraft,
} from "@/lib/surgical-sales/engagements/buildDebriefGuidanceIntelligence";

export const DEBRIEF_PREPARE_WORKSPACE_SNAPSHOT_KEY = "debrief_prepare_workspace";

export type DebriefPrepareDesiredOutcome =
  | "no_action"
  | "follow_up"
  | "360_experience"
  | "evaluation_case"
  | "opportunity_creation"
  | "other";

export const DEBRIEF_PREPARE_DESIRED_OUTCOMES: Array<{
  id: DebriefPrepareDesiredOutcome;
  label: string;
}> = [
  { id: "no_action", label: "No Action" },
  { id: "follow_up", label: "Follow-Up" },
  { id: "360_experience", label: "360 Experience" },
  { id: "evaluation_case", label: "Evaluation Case" },
  { id: "opportunity_creation", label: "Opportunity Creation" },
  { id: "other", label: "Other" },
];

export type DebriefPrepareLearnItem = {
  id: string;
  text: string;
  checked: boolean;
};

export type DebriefPrepareQuestionCard = {
  id: string;
  text: string;
  used: boolean;
};

export type DebriefPrepareWorkspaceDraft = {
  meetingObjective: string;
  knownFacts: string[];
  whyItMatters: string;
  /** Auto-generated commercial hypothesis — shown until the rep writes their own. */
  suggestedHypothesis: string;
  suggestedLearnItems: string[];
  suggestedQuestions: string[];
  wedgeTopic?: string | null;
  incumbentProduct?: string | null;
  procedureLabel?: string | null;
  providerName?: string | null;
  strongestObservedPattern?: string | null;
  guidanceIntelligence?: DebriefGuidanceIntelligence | null;
};

export type DebriefPrepareWorkspaceRepState = {
  meetingObjective: string;
  hypothesis: string;
  learnItems: DebriefPrepareLearnItem[];
  questionCards: DebriefPrepareQuestionCard[];
  desiredOutcome: DebriefPrepareDesiredOutcome | null;
  desiredOutcomeOther: string;
  meetingNotes: string;
  updatedAt: string | null;
};

export type DebriefPrepareWorkspaceView = {
  draft: DebriefPrepareWorkspaceDraft;
  rep: DebriefPrepareWorkspaceRepState;
  meetingObjective: string;
  knownFacts: string[];
  whyItMatters: string;
  hypothesis: string;
  learnItems: DebriefPrepareLearnItem[];
  questionCards: DebriefPrepareQuestionCard[];
  desiredOutcome: DebriefPrepareDesiredOutcome | null;
  desiredOutcomeOther: string;
  meetingNotes: string;
  guidanceIntelligence: DebriefGuidanceIntelligence;
};

export type DebriefPrepareWorkspaceSnapshot = DebriefPrepareWorkspaceRepState;

function isDesiredOutcome(value: unknown): value is DebriefPrepareDesiredOutcome {
  return (
    value === "no_action" ||
    value === "follow_up" ||
    value === "360_experience" ||
    value === "evaluation_case" ||
    value === "opportunity_creation" ||
    value === "other"
  );
}

function normalizeLearnItems(raw: unknown): DebriefPrepareLearnItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const text = String(row.text ?? "").trim();
      if (!text) return null;
      const id = String(row.id ?? `learn-${index + 1}`).trim() || `learn-${index + 1}`;
      return {
        id,
        text,
        checked: Boolean(row.checked),
      };
    })
    .filter((item): item is DebriefPrepareLearnItem => item != null);
}

function normalizeQuestionCards(raw: unknown): DebriefPrepareQuestionCard[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const text = String(row.text ?? "").trim();
      if (!text) return null;
      const id = String(row.id ?? `question-${index + 1}`).trim() || `question-${index + 1}`;
      return {
        id,
        text,
        used: Boolean(row.used),
      };
    })
    .filter((item): item is DebriefPrepareQuestionCard => item != null);
}

export function readDebriefPrepareWorkspaceSnapshot(
  debriefSnapshot: unknown,
): DebriefPrepareWorkspaceSnapshot | null {
  if (!debriefSnapshot || typeof debriefSnapshot !== "object") return null;
  const raw = (debriefSnapshot as Record<string, unknown>)[DEBRIEF_PREPARE_WORKSPACE_SNAPSHOT_KEY];
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  return {
    meetingObjective: String(row.meetingObjective ?? "").trim(),
    hypothesis: String(row.hypothesis ?? "").trim(),
    learnItems: normalizeLearnItems(row.learnItems),
    questionCards: normalizeQuestionCards(row.questionCards),
    desiredOutcome: isDesiredOutcome(row.desiredOutcome) ? row.desiredOutcome : null,
    desiredOutcomeOther: String(row.desiredOutcomeOther ?? "").trim(),
    meetingNotes: String(row.meetingNotes ?? "").trim(),
    updatedAt: row.updatedAt ? String(row.updatedAt) : null,
  };
}

export function mergeDebriefPrepareWorkspaceSnapshot(
  debriefSnapshot: unknown,
  patch: Partial<DebriefPrepareWorkspaceSnapshot>,
): Record<string, unknown> {
  const base =
    debriefSnapshot && typeof debriefSnapshot === "object"
      ? { ...(debriefSnapshot as Record<string, unknown>) }
      : {};
  const prev = readDebriefPrepareWorkspaceSnapshot(base) ?? {
    meetingObjective: "",
    hypothesis: "",
    learnItems: [],
    questionCards: [],
    desiredOutcome: null,
    desiredOutcomeOther: "",
    meetingNotes: "",
    updatedAt: null,
  };

  base[DEBRIEF_PREPARE_WORKSPACE_SNAPSHOT_KEY] = {
    ...prev,
    ...patch,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };
  return base;
}

function buildLearnItemId(text: string, index: number): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return slug ? `learn-${slug}` : `learn-${index + 1}`;
}

function buildQuestionCardId(text: string, index: number): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return slug ? `question-${slug}` : `question-${index + 1}`;
}

export function mergeLearnItemsWithSuggestions(input: {
  saved: DebriefPrepareLearnItem[];
  suggested: string[];
}): DebriefPrepareLearnItem[] {
  const byText = new Map<string, DebriefPrepareLearnItem>();

  for (const item of input.saved) {
    byText.set(item.text.toLowerCase(), item);
  }

  const merged: DebriefPrepareLearnItem[] = [];

  for (const [index, text] of input.suggested.entries()) {
    const normalized = text.trim();
    if (!normalized) continue;
    const existing = byText.get(normalized.toLowerCase());
    if (existing) {
      merged.push(existing);
      byText.delete(normalized.toLowerCase());
      continue;
    }
    merged.push({
      id: buildLearnItemId(normalized, index),
      text: normalized,
      checked: false,
    });
  }

  for (const item of input.saved) {
    if (!merged.some((row) => row.id === item.id)) {
      merged.push(item);
    }
  }

  const dedupedTexts = dedupePrepareLearnQuestions(merged.map((item) => item.text), 6);
  const textToItem = new Map(merged.map((item) => [item.text.toLowerCase(), item]));

  return dedupedTexts.map((text, index) => {
    const existing = textToItem.get(text.toLowerCase());
    if (existing) return existing;
    return {
      id: buildLearnItemId(text, index),
      text,
      checked: false,
    };
  });
}

export function mergeQuestionCardsWithSuggestions(input: {
  saved: DebriefPrepareQuestionCard[];
  suggested: string[];
}): DebriefPrepareQuestionCard[] {
  const byText = new Map<string, DebriefPrepareQuestionCard>();

  for (const card of input.saved) {
    byText.set(card.text.toLowerCase(), card);
  }

  const merged: DebriefPrepareQuestionCard[] = [];

  for (const [index, text] of input.suggested.entries()) {
    const normalized = text.trim();
    if (!normalized) continue;
    const existing = byText.get(normalized.toLowerCase());
    if (existing) {
      merged.push(existing);
      byText.delete(normalized.toLowerCase());
      continue;
    }
    merged.push({
      id: buildQuestionCardId(normalized, index),
      text: normalized,
      used: false,
    });
  }

  for (const card of input.saved) {
    if (!merged.some((row) => row.id === card.id)) {
      merged.push(card);
    }
  }

  return merged.slice(0, 12);
}

export function resolveDebriefPrepareGuidanceIntelligence(input: {
  draft: DebriefPrepareWorkspaceDraft;
  desiredOutcome?: DebriefPrepareDesiredOutcome | null;
}): DebriefGuidanceIntelligence {
  return (
    input.draft.guidanceIntelligence ??
    rebuildDebriefGuidanceIntelligenceFromWorkspaceDraft({
      knownFacts: input.draft.knownFacts,
      providerName: input.draft.providerName,
      procedureLabel: input.draft.procedureLabel,
      desiredOutcome: input.desiredOutcome ?? null,
    })
  );
}

export function buildDebriefPrepareWorkspaceView(input: {
  draft: DebriefPrepareWorkspaceDraft;
  saved: DebriefPrepareWorkspaceSnapshot | null;
}): DebriefPrepareWorkspaceView {
  const { draft, saved } = input;
  const guidanceIntelligence = resolveDebriefPrepareGuidanceIntelligence({
    draft,
    desiredOutcome: saved?.desiredOutcome ?? null,
  });
  const learnItems = mergeLearnItemsWithSuggestions({
    saved: saved?.learnItems ?? [],
    suggested: draft.suggestedLearnItems,
  });
  const questionCards = mergeQuestionCardsWithSuggestions({
    saved: saved?.questionCards ?? [],
    suggested: guidanceIntelligence.conversationStarters,
  });

  const meetingObjective = sanitizeMeetingObjectiveForDisplay(
    saved?.meetingObjective?.trim() || draft.meetingObjective.trim(),
    sanitizeMeetingObjectiveForDisplay(draft.meetingObjective),
  );

  return {
    draft,
    rep: saved ?? {
      meetingObjective: "",
      hypothesis: "",
      learnItems: [],
      questionCards: [],
      desiredOutcome: null,
      desiredOutcomeOther: "",
      meetingNotes: "",
      updatedAt: null,
    },
    meetingObjective,
    knownFacts: draft.knownFacts,
    whyItMatters: draft.whyItMatters,
    // Rep-authored hypothesis wins; otherwise pre-fill the auto-generated one so
    // the workspace is prepared with zero clicks.
    hypothesis: saved?.hypothesis?.trim() ? saved.hypothesis : draft.suggestedHypothesis,
    learnItems,
    questionCards,
    desiredOutcome: saved?.desiredOutcome ?? null,
    desiredOutcomeOther: saved?.desiredOutcomeOther ?? "",
    meetingNotes: saved?.meetingNotes ?? "",
    guidanceIntelligence,
  };
}
