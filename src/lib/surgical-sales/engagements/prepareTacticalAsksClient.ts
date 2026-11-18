import type {
  PrepareTacticalAsk,
  TacticalAskDismissReason,
  TacticalAskGenerateCategory,
  TacticalAskStatus,
} from "@/lib/surgical-sales/engagements/prepareTacticalAsks";

export type TacticalAskMutationResult = {
  ok: true;
  asks: PrepareTacticalAsk[];
  probes: string | null;
  message?: string;
};

export type TacticalAskMutationError = { ok: false; error: string };

export async function mutatePrepareTacticalAsk(
  engagementId: string,
  body: Record<string, unknown>,
): Promise<TacticalAskMutationResult | TacticalAskMutationError> {
  try {
    const res = await fetch(
      `/api/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare/tactical-asks`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      asks?: PrepareTacticalAsk[];
      probes?: string | null;
      message?: string;
    };
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error ?? "Failed to update ask" };
    }
    return {
      ok: true,
      asks: json.asks ?? [],
      probes: json.probes ?? null,
      message: json.message,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update ask",
    };
  }
}

export function updateTacticalAskStatus(
  engagementId: string,
  askId: string,
  status: TacticalAskStatus,
  options?: { answerSummary?: string; dismissReason?: TacticalAskDismissReason },
) {
  return mutatePrepareTacticalAsk(engagementId, {
    op: "update_status",
    ask_id: askId,
    status,
    answer_summary: options?.answerSummary,
    dismiss_reason: options?.dismissReason,
  });
}

export function dismissTacticalAskClient(
  engagementId: string,
  askId: string,
  reason: TacticalAskDismissReason,
) {
  return mutatePrepareTacticalAsk(engagementId, { op: "dismiss", ask_id: askId, reason });
}

export function addCustomTacticalAsk(
  engagementId: string,
  text: string,
  intelligenceCategory?: string | null,
) {
  return mutatePrepareTacticalAsk(engagementId, {
    op: "add_custom",
    text,
    intelligence_category: intelligenceCategory,
  });
}

export function generateMoreTacticalAsk(engagementId: string, category: TacticalAskGenerateCategory) {
  return mutatePrepareTacticalAsk(engagementId, { op: "generate_more", category });
}

export function removeTacticalAskClient(engagementId: string, askId: string) {
  return mutatePrepareTacticalAsk(engagementId, { op: "remove", ask_id: askId });
}

export function saveFieldBriefClient(
  engagementId: string,
  input: {
    missionGoal: string;
    questions: Array<{ id: string | null; text: string }>;
  },
) {
  return mutatePrepareTacticalAsk(engagementId, {
    op: "save_brief",
    mission_goal: input.missionGoal.trim() || null,
    questions: input.questions
      .map((q) => ({ id: q.id, text: q.text.trim() }))
      .filter((q) => q.text.length >= 1),
  });
}
