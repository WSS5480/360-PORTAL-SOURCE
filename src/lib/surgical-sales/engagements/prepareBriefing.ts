import type { PrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import { assembleMeetingPrepContext } from "@/lib/surgical-sales/engagements/assembleMeetingPrepContext";
import { loadPrepareForMeetingViewForActor } from "@/lib/surgical-sales/engagements/loadPrepareForMeetingView";

/** How the prepare briefing suggestions are produced. */
export type PrepareBriefingSource = "rules" | "ai";

export const DEFAULT_PREPARE_BRIEFING_SOURCE: PrepareBriefingSource = "rules";

export type GeneratePrepareBriefingResult =
  | {
      ok: true;
      prepare: PrepareForMeetingView;
      source: PrepareBriefingSource;
      refreshed_at: string;
    }
  | { ok: false; message: string; status: 400 | 404 | 501 | 500 };

/**
 * Regenerates the prepare-for-meeting briefing.
 * Today: `rules` reloads CRM data and rebuilds rule-based sections.
 * Future: `ai` will call an OpenAI (or internal) briefing endpoint.
 */
export async function generatePrepareBriefing(input: {
  engagementId: string;
  userId: string;
  source?: PrepareBriefingSource;
}): Promise<GeneratePrepareBriefingResult> {
  const source = input.source ?? DEFAULT_PREPARE_BRIEFING_SOURCE;

  if (source === "ai") {
    return generatePrepareBriefingFromAi(input);
  }

  return generatePrepareBriefingFromRules(input);
}

async function generatePrepareBriefingFromRules(input: {
  engagementId: string;
  userId: string;
}): Promise<GeneratePrepareBriefingResult> {
  const loaded = await loadPrepareForMeetingViewForActor(input.engagementId, input.userId);
  if (!loaded.ok) {
    return { ok: false, message: loaded.error, status: loaded.status };
  }

  return {
    ok: true,
    prepare: loaded.prepare,
    source: "rules",
    refreshed_at: new Date().toISOString(),
  };
}

/**
 * Placeholder for AI-generated briefings.
 * Context is assembled via `assembleMeetingPrepContext` — wire that payload to your model endpoint here.
 */
async function generatePrepareBriefingFromAi(input: {
  engagementId: string;
  userId: string;
}): Promise<GeneratePrepareBriefingResult> {
  const assembled = await assembleMeetingPrepContext({
    engagementId: input.engagementId,
    userId: input.userId,
  });
  if (!assembled.ok) {
    return { ok: false, message: assembled.error, status: assembled.status };
  }

  void assembled.context;

  return {
    ok: false,
    message: "AI briefing is not enabled yet. Use rule-based refresh for now.",
    status: 501,
  };
}
