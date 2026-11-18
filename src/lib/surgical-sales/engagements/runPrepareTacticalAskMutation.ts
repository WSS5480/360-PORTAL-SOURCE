import { loadPrepareForMeetingViewForActor } from "@/lib/surgical-sales/engagements/loadPrepareForMeetingView";
import { pickGeneratedTacticalAsk } from "@/lib/surgical-sales/engagements/prepareTacticalAskGenerate";
import { buildPatchForTodayMatter } from "@/lib/surgical-sales/engagements/prepareWhatMattersEditable";
import {
  appendFollowUpToNextAction,
  appendGeneratedAsk,
  createTacticalAsk,
  dismissTacticalAsk,
  mergeBriefQuestionsIntoAsks,
  removeTacticalAsk,
  serializePrepareTacticalAsks,
  syncProbesFromTacticalAsks,
  updateTacticalAsk,
  type FieldBriefQuestionDraft,
  type PrepareTacticalAsk,
  type TacticalAskDismissReason,
  type TacticalAskGenerateCategory,
  type TacticalAskStatus,
} from "@/lib/surgical-sales/engagements/prepareTacticalAsks";

export type RunPrepareTacticalAskMutationInput =
  | {
      op: "update_status";
      askId: string;
      status: TacticalAskStatus;
      answerSummary?: string | null;
      dismissReason?: TacticalAskDismissReason | null;
    }
  | { op: "dismiss"; askId: string; reason: TacticalAskDismissReason }
  | { op: "add_custom"; text: string; intelligenceCategory?: string | null }
  | { op: "generate_more"; category: TacticalAskGenerateCategory }
  | { op: "remove"; askId: string }
  | {
      op: "save_brief";
      missionGoal: string | null;
      questions: FieldBriefQuestionDraft[];
    };

export type RunPrepareTacticalAskMutationResult =
  | {
      ok: true;
      asks: PrepareTacticalAsk[];
      patch: Record<string, unknown>;
      message?: string;
    }
  | { ok: false; message: string; status: 400 | 404 | 500 };

export async function runPrepareTacticalAskMutation(input: {
  engagementId: string;
  userId: string;
  mutation: RunPrepareTacticalAskMutationInput;
}): Promise<RunPrepareTacticalAskMutationResult> {
  const loaded = await loadPrepareForMeetingViewForActor(input.engagementId, input.userId);
  if (!loaded.ok) {
    return { ok: false, message: loaded.error, status: loaded.status };
  }

  const prepare = loaded.prepare;
  const plan = prepare.plan_fields;

  let asks = [...prepare.tactical_asks];

  let message: string | undefined;
  let nextAction = plan.next_action;

  switch (input.mutation.op) {
    case "add_custom": {
      const text = input.mutation.text.trim();
      if (!text) return { ok: false, message: "Enter a question.", status: 400 };
      asks = [
        ...asks,
        createTacticalAsk({
          text,
          source: "custom",
          intelligenceCategory: input.mutation.intelligenceCategory,
        }),
      ];
      message = "Custom question added.";
      break;
    }
    case "generate_more": {
      const candidate = pickGeneratedTacticalAsk(input.mutation.category, asks, prepare);
      if (!candidate) {
        return {
          ok: false,
          message: "No new question available for that category — try another.",
          status: 400,
        };
      }
      const result = appendGeneratedAsk(asks, candidate);
      if (!result.added) {
        return { ok: false, message: "That question is already on your list.", status: 400 };
      }
      asks = result.asks;
      message = "Question added.";
      break;
    }
    case "dismiss": {
      asks = dismissTacticalAsk(asks, input.mutation.askId, input.mutation.reason);
      message = "Question dismissed.";
      break;
    }
    case "remove": {
      asks = removeTacticalAsk(asks, input.mutation.askId);
      message = "Question removed.";
      break;
    }
    case "update_status": {
      const { askId, status } = input.mutation;
      const existing = asks.find((a) => a.id === askId);
      if (!existing) return { ok: false, message: "Question not found.", status: 404 };

      const answerSummary = input.mutation.answerSummary?.trim() || null;
      asks = updateTacticalAsk(asks, askId, {
        status,
        answer_summary: answerSummary,
        dismiss_reason: input.mutation.dismissReason ?? existing.dismiss_reason,
      });

      if (status === "follow_up_task") {
        nextAction = appendFollowUpToNextAction(nextAction, existing.text);
      }
      break;
    }
    case "save_brief": {
      const missionGoal = input.mutation.missionGoal?.trim() ?? "";
      asks = mergeBriefQuestionsIntoAsks(asks, input.mutation.questions);
      message = "Brief saved.";
      const goalPatch = buildPatchForTodayMatter({
        lineId: "discovery_goal",
        value: missionGoal,
        planFields: plan,
        engagementType: String(prepare.upcoming_engagement.engagement_type ?? ""),
      });
      const probes = syncProbesFromTacticalAsks(asks);
      const patch: Record<string, unknown> = {
        ...goalPatch,
        prepare_tactical_asks: serializePrepareTacticalAsks(asks),
        pre_observation_probes: probes,
      };
      return { ok: true, asks, patch, message };
    }
    default:
      return { ok: false, message: "Unknown operation", status: 400 };
  }

  const probes = syncProbesFromTacticalAsks(asks);
  const patch: Record<string, unknown> = {
    prepare_tactical_asks: serializePrepareTacticalAsks(asks),
    pre_observation_probes: probes,
  };
  if (nextAction !== plan.next_action) {
    patch.next_action = nextAction;
  }

  return { ok: true, asks, patch, message };
}
