import { describe, expect, it } from "vitest";
import {
  buildProviderRelationshipMemory,
  classifyRelationshipMemoryPhrase,
  formatRelationshipMemoryAge,
} from "./buildProviderRelationshipMemory";
import { extractEngagementMemoryContextLine } from "./engagementMemoryContextLine";
import type { ProviderEngagementSummary } from "./engagements/providerEngagementSummary";

function eng(partial: Partial<ProviderEngagementSummary>): ProviderEngagementSummary {
  return {
    id: "e1",
    engagement_type: "or_observation",
    engagement_type_label: "OR Observation",
    status: "completed",
    status_label: "Completed",
    pre_call_filled: 3,
    pre_call_total: 5,
    pre_call_complete: false,
    outcome_label: "Completed",
    ...partial,
  };
}

describe("buildProviderRelationshipMemory", () => {
  it("classifies concern and interest phrasing", () => {
    expect(classifyRelationshipMemoryPhrase("Worried about biologic cost variability")).toMatch(
      /^Concern raised about/i,
    );
    expect(classifyRelationshipMemoryPhrase("Interested in workflow efficiency improvements")).toMatch(
      /^Interested in/i,
    );
    expect(classifyRelationshipMemoryPhrase("Discussed minimally invasive ventral hernia workflow")).toMatch(
      /^Last discussed:/i,
    );
  });

  it("extracts prep line from engagement row fields", () => {
    const line = extractEngagementMemoryContextLine({
      observation_goal: "Understand fixation workflow in ventral cases",
      pre_observation_value_hypothesis: "Should not win",
    });
    expect(line).toContain("fixation workflow");
  });

  it("builds timeline-aware memory from engagements, prep, discovery, and activity", () => {
    const items = buildProviderRelationshipMemory({
      engagements: [
        eng({
          id: "e-old",
          notes: "Discussed minimally invasive ventral hernia workflow",
          updated_at: "2026-01-10T12:00:00Z",
        }),
        eng({
          id: "e-new",
          notes: "Concern raised about biologic cost variability",
          memory_context_line: "Requested OR observation after committee review",
          prepared_at: "2026-05-15T09:00:00Z",
          updated_at: "2026-05-15T10:00:00Z",
        }),
      ],
      clinical_discovery_answers: [
        {
          id: "a1",
          providerId: "p1",
          questionKey: "clinical_workflow",
          questionLabel: "Procedure preferences",
          questionText: "Preferences",
          response: "Prefers laparoscopic ventral approach when anatomy allows",
          tags: [],
          confidence: "medium",
          sourceCaseId: null,
          sourceNotes: null,
          createdBy: null,
          updatedBy: null,
          createdAt: "2026-04-01T00:00:00Z",
          updatedAt: "2026-04-01T00:00:00Z",
        },
      ],
      activity_timeline: [
        {
          id: "t1",
          at: "2026-05-01T00:00:00Z",
          category: "discovery",
          question_label: "Mesh fixation habits",
          body: "Uses tackers for lateral fixation",
        },
      ],
    });

    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(6);
    expect(items[0].text).toMatch(/biologic cost|OR observation/i);
    expect(items.some((i) => i.text.includes("ventral hernia") || i.text.includes("Captured"))).toBe(true);
  });

  it("dedupes near-identical lines", () => {
    const items = buildProviderRelationshipMemory({
      engagements: [
        eng({
          notes: "Concern about biologic cost variability",
          updated_at: "2026-05-01T00:00:00Z",
        }),
        eng({
          id: "e2",
          notes: "Concern about biologic cost variability",
          updated_at: "2026-04-01T00:00:00Z",
        }),
      ],
    });
    const costLines = items.filter((i) => /biologic cost/i.test(i.text));
    expect(costLines.length).toBe(1);
  });

  it("skips audit-style activity phrases", () => {
    const items = buildProviderRelationshipMemory({
      activity_timeline: [
        { id: "x", at: "2026-05-01T00:00:00Z", body: "intro_call engagement created", category: "general" },
      ],
    });
    expect(items).toHaveLength(0);
  });
});

describe("formatRelationshipMemoryAge", () => {
  it("returns relative labels for recent dates", () => {
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(formatRelationshipMemoryAge(recent)).toMatch(/d ago|yesterday|today/);
  });
});
