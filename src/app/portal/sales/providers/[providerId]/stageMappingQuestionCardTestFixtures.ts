import { buildDiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { buildStageMappingSession, type StageMappingQuestion } from "@/lib/surgical-sales/buildStageMappingSession";
import type { StageMappingVisibilityBucket } from "@/lib/surgical-sales/stageMappingQuestionRegistry";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";

export function stageMappingQuestionFixture(
  signalId: StageMappingSignalId,
  contact: Record<string, unknown> = { provider_relationship_stage: "prospect" },
): StageMappingQuestion {
  const view = buildDiscoveryIntelligenceGroupsView({ contact });
  const session = buildStageMappingSession(view, { contact });
  const question = session.operationalQuestions.find((q) => q.signalId === signalId);
  if (!question) {
    throw new Error(`Fixture missing signal ${signalId}`);
  }
  return question;
}

export function resolvedStageMappingQuestion(
  signalId: StageMappingSignalId,
): StageMappingQuestion {
  const contact = {
    provider_relationship_stage: "prospect",
    provider_observation_feasibility: "approved",
    provider_intelligence_field_metadata: {
      provider_observation_feasibility: {
        source_type: "profile",
        source_label: "Manual mapping",
        updated_at: new Date().toISOString(),
        validated_at: new Date().toISOString(),
        lifecycle_state: "validated",
      },
    },
  };
  const question = stageMappingQuestionFixture(signalId, contact);
  return {
    ...question,
    resolved: true,
    visibilityBucket: "confirmed" as StageMappingVisibilityBucket,
  };
}
