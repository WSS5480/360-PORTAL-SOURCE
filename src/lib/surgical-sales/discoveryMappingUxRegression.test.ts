/**
 * Discovery Mapping UX regression (lib/session layer).
 *
 * Case coverage:
 *  2–4, 10–12 — this file
 *  1, 5–9 — StageMappingQuestionCard.test.tsx (+ RapidDiscoverySupportContactPanel)
 */
import { describe, expect, it } from "vitest";
import { buildDiscoveryIntelligenceGroupsView } from "./buildDiscoveryIntelligenceGroupsView";
import { buildStageMappingSession } from "./buildStageMappingSession";
import { formatStageMappingCompactSummary } from "./formatStageMappingCompactSummary";
import {
  groupStageMappingQuestionsByBucket,
  pickNextRequiredStageMappingQuestion,
} from "./stageMappingOperationalGroups";
import {
  inferStageMappingValidationStatus,
  seedStageMappingValidationStatuses,
} from "./stageMappingSourceAttribution";
import type { StageMappingSignalId } from "./stageMappingQuestions";

const SNAKE_CASE_RE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/i;

function prospectSession(contact: Record<string, unknown> = { provider_relationship_stage: "prospect" }) {
  const view = buildDiscoveryIntelligenceGroupsView({ contact });
  return buildStageMappingSession(view, { contact });
}

describe("Discovery Mapping UX regression", () => {
  it("keeps completed required items out of Required now and in Confirmed intelligence", () => {
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
    const session = prospectSession(contact);
    const groups = groupStageMappingQuestionsByBucket(session.operationalQuestions);

    const approval = session.operationalQuestions.find((q) => q.signalId === "observation_approval");
    expect(approval?.visibilityBucket).toBe("confirmed");
    expect(groups.confirmed.some((q) => q.signalId === "observation_approval")).toBe(true);
    expect(groups.requiredNow.some((q) => q.signalId === "observation_approval")).toBe(false);
  });

  it("limits Required now to unresolved operational dependencies", () => {
    const session = prospectSession();
    const groups = groupStageMappingQuestionsByBucket(session.operationalQuestions);

    expect(groups.requiredNow).toHaveLength(0);
    for (const question of groups.helpfulNext) {
      expect(["helpful_next", "later_stage"]).toContain(question.visibilityBucket);
      expect(question.resolved).toBe(false);
    }
    for (const question of groups.confirmed) {
      expect(question.visibilityBucket).toBe("confirmed");
    }
  });

  it("resolve-next target skips completed required items", () => {
    const session = prospectSession({
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
    });

    const next = pickNextRequiredStageMappingQuestion(session.operationalQuestions);
    expect(next).toBeNull();
  });

  it("compact summaries avoid snake_case and internal enum tokens", () => {
    const session = prospectSession({
      provider_relationship_stage: "prospect",
      provider_observation_scheduling_control: "provider_office",
      provider_observation_credentialing_needed: "required",
      provider_observation_access_path: "office_manager",
      provider_intelligence_field_metadata: {
        provider_observation_credentialing_needed: {
          source_type: "engagement",
          source_label: "Intro Call debrief",
          updated_at: "2026-05-20T12:00:00.000Z",
          discovery_stance: "needs_validation",
        },
      },
    });

    for (const question of session.operationalQuestions) {
      const summary = formatStageMappingCompactSummary({
        question,
        contact: {
          provider_relationship_stage: "prospect",
          provider_observation_scheduling_control: "provider_office",
          provider_observation_credentialing_needed: "required",
          provider_observation_access_path: "office_manager",
        },
        metadata: { approval_required: "yes", access_pathway: "office_manager" },
      });
      if (!summary) continue;
      expect(summary).not.toMatch(SNAKE_CASE_RE);
      expect(summary).not.toMatch(/\b(provider_office|shared_workflow|credentialing_required)\b/i);
    }
  });

  it("defaults debrief-extracted answers to Needs validation", () => {
    const status = inferStageMappingValidationStatus({
      meta: {
        source_type: "engagement",
        source_label: "Intro Call debrief",
        updated_at: "2026-05-20T12:00:00.000Z",
        discovery_stance: "needs_validation",
      },
    });
    expect(status).toBe("needs_validation");

    const seeded = seedStageMappingValidationStatuses({
      contact: {
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "engagement",
            source_label: "Intro Call debrief",
            updated_at: "2026-05-20T12:00:00.000Z",
            discovery_stance: "needs_validation",
          },
        },
      },
      signalIds: ["observation_approval"],
    });
    expect(seeded.observation_approval).toBe("needs_validation");
  });

  it("defaults manual mapping metadata without validation to unknown until evidence is validated", () => {
    const status = inferStageMappingValidationStatus({
      meta: {
        source_type: "profile",
        source_label: "Manual mapping",
        updated_at: new Date().toISOString(),
      },
    });
    expect(status).toBe("unknown");

    const seeded = seedStageMappingValidationStatuses({
      contact: {
        provider_intelligence_field_metadata: {
          provider_observation_scheduling_control: {
            source_type: "profile",
            source_label: "Manual mapping",
            updated_at: new Date().toISOString(),
          },
        },
      },
      signalIds: ["scheduling_owner" as StageMappingSignalId],
    });
    expect(seeded.scheduling_owner).toBe("unknown");
  });

  it("surfaces debrief scheduling intelligence in the scheduling_owner card read model", () => {
    const contact = {
      provider_relationship_stage: "prospect",
      provider_observation_scheduling_control: "shared_workflow",
      provider_scheduling_contact: "[Partial lead] Karen\nMentioned coordinating timing with OR scheduling.",
      provider_intelligence_field_metadata: {
        provider_observation_scheduling_control: {
          source_type: "engagement",
          source_label: "Intro Call debrief",
          updated_at: new Date().toISOString(),
          discovery_stance: "needs_validation",
        },
        provider_scheduling_contact: {
          source_type: "engagement",
          source_label: "Intro Call debrief",
          updated_at: new Date().toISOString(),
          discovery_stance: "needs_validation",
        },
      },
    };
    const session = prospectSession(contact);
    const question = session.operationalQuestions.find((q) => q.signalId === "scheduling_owner");
    expect(question).toBeDefined();

    const summary = formatStageMappingCompactSummary({ question: question!, contact });
    expect(summary).toMatch(/Karen/i);
    expect(summary).not.toMatch(/Where is observation scheduling controlled/i);
  });

  it("keeps partial debrief signals open in helpful next instead of Confirmed", () => {
    const contact = {
      provider_relationship_stage: "prospect",
      provider_observation_scheduling_control: "shared_workflow",
      provider_scheduling_contact: "[Partial lead] Karen",
      provider_intelligence_field_metadata: {
        provider_observation_scheduling_control: {
          source_type: "engagement",
          source_label: "Intro Call debrief",
          updated_at: new Date().toISOString(),
          discovery_stance: "needs_validation",
        },
      },
    };
    const session = prospectSession(contact);
    const groups = groupStageMappingQuestionsByBucket(session.operationalQuestions);
    const scheduling = session.operationalQuestions.find((q) => q.signalId === "scheduling_owner");

    expect(scheduling?.resolved).toBe(false);
    expect(groups.helpfulNext.some((q) => q.signalId === "scheduling_owner")).toBe(true);
    expect(groups.confirmed.some((q) => q.signalId === "scheduling_owner")).toBe(false);
  });
});
