/**
 * Loads program-wide observation note bodies for a provider with stable 1-based indices.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadProviderObservationCasesForIntelligence } from "@/lib/surgical-sales/loadProviderObservationCasesForIntelligence";
import type { ProviderDebriefPlanActivityInput } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";

export type ProviderObservationNoteEntry = {
  caseId: string;
  caseDate: string | null;
  observationIndex: number;
  body: string;
  sourceNoteId: string | null;
  createdAt: string | null;
};

const NOTE_ACTIVITY_TYPES = new Set(["note", "dictation", "observation_note"]);

function isCompletedObservationCase(row: Record<string, unknown>): boolean {
  const status = String(row.status ?? "").trim().toLowerCase();
  return status === "completed" || Boolean(row.observation_completed_at);
}

function noteActivitiesFromRows(
  activities: ProviderDebriefPlanActivityInput[],
): ProviderDebriefPlanActivityInput[] {
  return activities.filter((activity) => {
    const type = String(activity.activity_type ?? "").trim().toLowerCase();
    return NOTE_ACTIVITY_TYPES.has(type);
  });
}

export function observationNoteBodiesFromCorpus(
  corpus: ProviderObservationNoteEntry[],
): string[] {
  return corpus.map((entry) => entry.body);
}

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 5);
}

export function resolveObservationIndexFromCorpus(
  corpus: ProviderObservationNoteEntry[],
  input: { sourceNoteId?: string | null; excerpt?: string | null },
): number | null {
  const noteId = String(input.sourceNoteId ?? "").trim();
  if (noteId) {
    const byId = corpus.find((entry) => entry.sourceNoteId === noteId);
    if (byId) return byId.observationIndex;
  }

  const excerpt = String(input.excerpt ?? "").trim().toLowerCase();
  if (excerpt.length >= 12) {
    const byExcerpt = corpus.find((entry) => entry.body.toLowerCase().includes(excerpt.slice(0, 48)));
    if (byExcerpt) return byExcerpt.observationIndex;

    const excerptWords = significantWords(excerpt);
    if (excerptWords.length >= 2) {
      let bestMatch: ProviderObservationNoteEntry | null = null;
      let bestScore = 0;

      for (const entry of corpus) {
        const bodyWords = new Set(significantWords(entry.body));
        const score = excerptWords.filter((word) => bodyWords.has(word)).length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = entry;
        }
      }

      if (bestMatch && bestScore >= 2) {
        return bestMatch.observationIndex;
      }
    }
  }

  return null;
}

export async function loadProviderObservationNoteCorpus(
  supabase: SupabaseClient,
  input: {
    providerId: string;
    salesRepId: string;
    limit?: number;
  },
): Promise<ProviderObservationNoteEntry[]> {
  const cases = await loadProviderObservationCasesForIntelligence(supabase, {
    providerId: input.providerId,
    salesRepId: input.salesRepId,
    limit: input.limit ?? 24,
  });

  const completedCases = cases
    .filter(isCompletedObservationCase)
    .sort((a, b) => {
      const dateA = String(a.case_date ?? a.updated_at ?? "");
      const dateB = String(b.case_date ?? b.updated_at ?? "");
      return dateA.localeCompare(dateB);
    });

  if (completedCases.length === 0) return [];

  const caseIds = completedCases.map((row) => String(row.id));
  const { data: activities, error } = await supabase
    .from("surgical_sales_case_activities")
    .select("id, case_id, activity_type, body, created_at")
    .in("case_id", caseIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[loadProviderObservationNoteCorpus]", error.message);
    return [];
  }

  const activitiesByCase = new Map<string, ProviderDebriefPlanActivityInput[]>();
  for (const row of activities ?? []) {
    const caseId = String((row as { case_id?: string }).case_id ?? "");
    if (!caseId) continue;
    const list = activitiesByCase.get(caseId) ?? [];
    list.push(row as ProviderDebriefPlanActivityInput);
    activitiesByCase.set(caseId, list);
  }

  const corpus: ProviderObservationNoteEntry[] = [];
  let observationIndex = 0;

  for (const caseRow of completedCases) {
    const caseId = String(caseRow.id);
    const caseActivities = noteActivitiesFromRows(activitiesByCase.get(caseId) ?? []);

    for (const activity of caseActivities) {
      const body = String(activity.body ?? "").trim();
      if (body.length < 8) continue;

      observationIndex += 1;
      corpus.push({
        caseId,
        caseDate: caseRow.case_date ? String(caseRow.case_date) : null,
        observationIndex,
        body,
        sourceNoteId: activity.id ? String(activity.id) : null,
        createdAt: activity.created_at ? String(activity.created_at) : null,
      });
    }
  }

  return corpus;
}

export async function latestProviderObservationNoteActivityAt(
  supabase: SupabaseClient,
  input: { providerId: string; salesRepId: string },
): Promise<string | null> {
  const corpus = await loadProviderObservationNoteCorpus(supabase, input);
  if (corpus.length === 0) return null;

  const timestamps = corpus
    .map((entry) => entry.createdAt)
    .filter((value): value is string => Boolean(value));

  if (timestamps.length === 0) return null;
  return timestamps.sort().at(-1) ?? null;
}
