import { formatAskForFieldGuide } from "@/lib/surgical-sales/engagements/prepareFieldConversationAsk";
import {
  isSimilarProbeLine,
  joinProbeLines,
  splitProbeLines,
} from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistProbeUtils";

export type TacticalAskSource = "ai_recommended" | "custom";

export type TacticalAskStatus =
  | "unanswered"
  | "answered"
  | "skipped"
  | "not_relevant"
  | "ask_later"
  | "follow_up_task";

export type TacticalAskDismissReason =
  | "not_relevant"
  | "already_answered"
  | "wrong_timing"
  | "wrong_engagement_type";

export type TacticalAskGenerateCategory =
  | "workflow"
  | "access"
  | "product_evaluation"
  | "economic_buyer";

export type PrepareTacticalAsk = {
  id: string;
  text: string;
  source: TacticalAskSource;
  status: TacticalAskStatus;
  priority: number;
  dismiss_reason: TacticalAskDismissReason | null;
  answer_summary: string | null;
  intelligence_category: string | null;
  created_at: string;
  updated_at: string;
};

export type PrepareTacticalAsksDocument = {
  version: 1;
  asks: PrepareTacticalAsk[];
};

export const TACTICAL_ASK_SOURCE_LABELS: Record<TacticalAskSource, string> = {
  ai_recommended: "AI Recommended",
  custom: "Custom",
};

export const TACTICAL_ASK_STATUS_LABELS: Record<TacticalAskStatus, string> = {
  unanswered: "Unanswered",
  answered: "Answered",
  skipped: "Skipped",
  not_relevant: "Not relevant",
  ask_later: "Ask later",
  follow_up_task: "Follow-up task",
};

export const TACTICAL_ASK_DISMISS_REASON_LABELS: Record<TacticalAskDismissReason, string> = {
  not_relevant: "Not relevant",
  already_answered: "Already answered",
  wrong_timing: "Wrong timing",
  wrong_engagement_type: "Wrong engagement type",
};

export const TACTICAL_ASK_GENERATE_CATEGORY_LABELS: Record<TacticalAskGenerateCategory, string> = {
  workflow: "Workflow",
  access: "Access",
  product_evaluation: "Product evaluation",
  economic_buyer: "Economic buyer",
};

/** Statuses shown in the active execution list (field walk-in). */
export const TACTICAL_ASK_ACTIVE_STATUSES: TacticalAskStatus[] = ["unanswered", "ask_later"];

/** Statuses grouped under handled (collapsed on mobile). */
export const TACTICAL_ASK_HANDLED_STATUSES: TacticalAskStatus[] = [
  "answered",
  "skipped",
  "not_relevant",
  "follow_up_task",
];

export function newTacticalAskId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ask-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeAskText(raw: string): string {
  return formatAskForFieldGuide(raw) || raw.replace(/\s+/g, " ").trim();
}

export function createTacticalAsk(input: {
  text: string;
  source: TacticalAskSource;
  priority?: number;
  intelligenceCategory?: string | null;
}): PrepareTacticalAsk {
  const t = nowIso();
  const text = normalizeAskText(input.text);
  return {
    id: newTacticalAskId(),
    text,
    source: input.source,
    status: "unanswered",
    priority: input.priority ?? 0,
    dismiss_reason: null,
    answer_summary: null,
    intelligence_category: input.intelligenceCategory?.trim() || null,
    created_at: t,
    updated_at: t,
  };
}

export function parsePrepareTacticalAsksDocument(raw: unknown): PrepareTacticalAsksDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as { version?: unknown; asks?: unknown };
  if (doc.version !== 1 || !Array.isArray(doc.asks)) return null;
  const asks: PrepareTacticalAsk[] = [];
  for (const row of doc.asks) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = String(r.id ?? "").trim();
    const text = normalizeAskText(String(r.text ?? ""));
    const source = r.source === "custom" ? "custom" : "ai_recommended";
    const status = parseTacticalAskStatus(r.status);
    if (!id || !text || !status) continue;
    asks.push({
      id,
      text,
      source,
      status,
      priority: Number(r.priority) || 0,
      dismiss_reason: parseDismissReason(r.dismiss_reason),
      answer_summary: String(r.answer_summary ?? "").trim() || null,
      intelligence_category: String(r.intelligence_category ?? "").trim() || null,
      created_at: String(r.created_at ?? nowIso()),
      updated_at: String(r.updated_at ?? nowIso()),
    });
  }
  return { version: 1, asks };
}

function parseTacticalAskStatus(raw: unknown): TacticalAskStatus | null {
  const s = String(raw ?? "").trim() as TacticalAskStatus;
  return s in TACTICAL_ASK_STATUS_LABELS ? s : null;
}

function parseDismissReason(raw: unknown): TacticalAskDismissReason | null {
  const s = String(raw ?? "").trim() as TacticalAskDismissReason;
  return s in TACTICAL_ASK_DISMISS_REASON_LABELS ? s : null;
}

export function serializePrepareTacticalAsks(asks: PrepareTacticalAsk[]): PrepareTacticalAsksDocument {
  return { version: 1, asks };
}

export function findAskById(asks: PrepareTacticalAsk[], id: string): PrepareTacticalAsk | undefined {
  return asks.find((a) => a.id === id);
}

export function asksForFieldExecution(asks: PrepareTacticalAsk[]): PrepareTacticalAsk[] {
  return [...asks]
    .filter((a) => TACTICAL_ASK_ACTIVE_STATUSES.includes(a.status))
    .sort((a, b) => a.priority - b.priority || a.created_at.localeCompare(b.created_at));
}

export function handledTacticalAsks(asks: PrepareTacticalAsk[]): PrepareTacticalAsk[] {
  return [...asks]
    .filter((a) => TACTICAL_ASK_HANDLED_STATUSES.includes(a.status))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function syncProbesFromTacticalAsks(asks: PrepareTacticalAsk[]): string | null {
  const lines = asksForFieldExecution(asks).map((a) => a.text);
  return joinProbeLines(lines);
}

export function bootstrapTacticalAsksFromProbes(input: {
  stored: unknown;
  probes: string | null;
  suggestedPoints: string[];
}): PrepareTacticalAsk[] {
  const parsed = parsePrepareTacticalAsksDocument(input.stored);
  if (parsed && parsed.asks.length > 0) {
    return mergeNewProbeLinesIntoAsks(parsed.asks, input.probes);
  }

  const lines =
    splitProbeLines(input.probes).length > 0
      ? splitProbeLines(input.probes)
      : input.suggestedPoints.map((p) => normalizeAskText(p)).filter(Boolean);

  return lines.map((line, i) =>
    createTacticalAsk({ text: line, source: "ai_recommended", priority: i }),
  );
}

function mergeNewProbeLinesIntoAsks(
  asks: PrepareTacticalAsk[],
  probes: string | null,
): PrepareTacticalAsk[] {
  const existing = [...asks];
  const probeLines = splitProbeLines(probes).map((l) => normalizeAskText(l)).filter(Boolean);
  let nextPriority = Math.max(0, ...existing.map((a) => a.priority)) + 1;
  for (const line of probeLines) {
    if (existing.some((a) => isSimilarProbeLine(a.text, line))) continue;
    existing.push(
      createTacticalAsk({ text: line, source: "ai_recommended", priority: nextPriority++ }),
    );
  }
  return existing;
}

export function updateTacticalAsk(
  asks: PrepareTacticalAsk[],
  askId: string,
  patch: Partial<
    Pick<
      PrepareTacticalAsk,
      "status" | "dismiss_reason" | "answer_summary" | "text" | "intelligence_category"
    >
  >,
): PrepareTacticalAsk[] {
  const t = nowIso();
  return asks.map((a) => {
    if (a.id !== askId) return a;
    return {
      ...a,
      ...patch,
      updated_at: t,
    };
  });
}

export function removeTacticalAsk(asks: PrepareTacticalAsk[], askId: string): PrepareTacticalAsk[] {
  return asks.filter((a) => a.id !== askId);
}

export function dismissTacticalAsk(
  asks: PrepareTacticalAsk[],
  askId: string,
  reason: TacticalAskDismissReason,
): PrepareTacticalAsk[] {
  const status: TacticalAskStatus =
    reason === "already_answered" ? "answered" : "not_relevant";
  return updateTacticalAsk(asks, askId, {
    status,
    dismiss_reason: reason,
    answer_summary: reason === "already_answered" ? "Marked already answered in prep." : null,
  });
}

export function appendGeneratedAsk(
  asks: PrepareTacticalAsk[],
  text: string,
): { asks: PrepareTacticalAsk[]; added: boolean } {
  const normalized = normalizeAskText(text);
  if (!normalized) return { asks, added: false };
  if (asks.some((a) => isSimilarProbeLine(a.text, normalized))) {
    return { asks, added: false };
  }
  const nextPriority = Math.max(0, ...asks.map((a) => a.priority)) + 1;
  return {
    asks: [...asks, createTacticalAsk({ text: normalized, source: "ai_recommended", priority: nextPriority })],
    added: true,
  };
}

/** One-line field capture appended to engagement additional notes after an answer. */
export function formatTacticalAskIntelligenceCaptureLine(ask: PrepareTacticalAsk): string {
  const answer = ask.answer_summary?.trim();
  if (!answer) return "";
  const tag = ask.source === "custom" ? "Custom ask" : "Top ask";
  return `[${tag}] ${ask.text} → ${answer}`;
}

export function appendIntelligenceCaptureToNotes(
  existingNotes: string | null,
  line: string,
): string | null {
  const trimmed = line.trim();
  if (!trimmed) return existingNotes?.trim() || null;
  const base = String(existingNotes ?? "").trim();
  if (base.includes(trimmed)) return base || null;
  return base ? `${base}\n${trimmed}` : trimmed;
}

export function appendFollowUpToNextAction(
  existing: string | null,
  askText: string,
): string | null {
  const line = `Follow-up: ${askText.replace(/\s+/g, " ").trim()}`;
  const base = String(existing ?? "").trim();
  if (!line || base.includes(line)) return base || null;
  return base ? `${base}\n${line}` : line;
}

/** After AI assist rewrites probes, keep handled/custom rows and rebuild active AI asks from probe text. */
export function reconcileTacticalAsksWithProbes(
  asks: PrepareTacticalAsk[],
  probes: string | null,
): PrepareTacticalAsk[] {
  const preserved = asks.filter(
    (a) =>
      a.source === "custom" ||
      TACTICAL_ASK_HANDLED_STATUSES.includes(a.status) ||
      a.status === "ask_later",
  );
  const probeLines = splitProbeLines(probes).map((l) => normalizeAskText(l)).filter(Boolean);
  const activeFromProbes: PrepareTacticalAsk[] = [];
  for (let i = 0; i < probeLines.length; i++) {
    const line = probeLines[i]!;
    const existing = asks.find(
      (a) =>
        isSimilarProbeLine(a.text, line) &&
        (a.source === "ai_recommended" || a.source === "custom"),
    );
    if (existing && existing.source === "custom") {
      activeFromProbes.push({ ...existing, priority: i });
      continue;
    }
    if (existing && TACTICAL_ASK_ACTIVE_STATUSES.includes(existing.status)) {
      activeFromProbes.push({ ...existing, text: line, priority: i });
      continue;
    }
    activeFromProbes.push(
      createTacticalAsk({ text: line, source: "ai_recommended", priority: i }),
    );
  }
  const merged = [...activeFromProbes];
  for (const p of preserved) {
    if (merged.some((a) => a.id === p.id || isSimilarProbeLine(a.text, p.text))) continue;
    merged.push(p);
  }
  return merged;
}

export type FieldBriefQuestionDraft = {
  id: string | null;
  text: string;
};

/** Apply edit-brief queue draft: reorder/reword active asks; preserve handled rows. */
export function mergeBriefQuestionsIntoAsks(
  existingAsks: PrepareTacticalAsk[],
  draftQuestions: FieldBriefQuestionDraft[],
): PrepareTacticalAsk[] {
  const handled = existingAsks.filter((a) => TACTICAL_ASK_HANDLED_STATUSES.includes(a.status));
  const drafts = draftQuestions
    .map((q) => ({
      id: String(q.id ?? "").trim() || null,
      text: normalizeAskText(q.text),
    }))
    .filter((q) => q.text);

  const t = nowIso();
  const active: PrepareTacticalAsk[] = [];
  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i]!;
    const existing = draft.id ? existingAsks.find((a) => a.id === draft.id) : undefined;
    if (existing && TACTICAL_ASK_ACTIVE_STATUSES.includes(existing.status)) {
      const textChanged = !isSimilarProbeLine(existing.text, draft.text);
      active.push({
        ...existing,
        text: draft.text,
        source: existing.source === "custom" || textChanged ? "custom" : existing.source,
        priority: i,
        updated_at: t,
      });
      continue;
    }
    active.push(createTacticalAsk({ text: draft.text, source: "custom", priority: i }));
  }

  return [...active, ...handled];
}
