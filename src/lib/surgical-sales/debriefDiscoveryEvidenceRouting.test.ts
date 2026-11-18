import { describe, expect, it } from "vitest";
import {
  ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
  enrichDebriefMappingWithPartialLeads,
} from "@/lib/surgical-sales/debriefPartialIntelligenceEnrichment";
import {
  buildSchedulingOwnershipEvidenceSummary,
  classifySchedulingDebriefStrength,
  evidenceSnippetBelongsToDbKey,
  humanEvidenceForDomain,
  inferSchedulingControlFromDebrief,
  noteMatchesSchedulingOwnershipDebrief,
} from "@/lib/surgical-sales/debriefDiscoveryEvidenceRouting";
import { pickSchedulingIntelligenceDbKey } from "@/lib/surgical-sales/schedulingIntelligenceDbKeys";
import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

function emptyMapping(): LogUpdateOpenAiMapping {
  return {
    summary: "",
    confidence: "medium",
    reasoning: "",
    source_scope: "debrief",
    operational_signals: [],
    confirmed_updates: [],
    partial_updates: [],
    still_to_validate: [],
    recommended_next_moves: [],
    do_not_update: [],
  };
}

describe("debriefDiscoveryEvidenceRouting", () => {
  it("classifies clear vs vague vs absent scheduling language", () => {
    expect(
      classifySchedulingDebriefStrength(
        "Karen handles scheduling and works with OR scheduling.",
      ),
    ).toBe("clear");
    expect(
      classifySchedulingDebriefStrength(
        "Karen came up a few times and seems to help with timing.",
      ),
    ).toBe("vague");
    expect(
      classifySchedulingDebriefStrength(
        "Good intro call, surgeon open to observation, robotic hernia volume increasing.",
      ),
    ).toBe("none");
  });

  it("detects scheduling ownership language without requiring Karen by name", () => {
    const note =
      "Karen from the office came up a few times. Sounds like she helps coordinate scheduling and probably works with the OR scheduling team as well.";
    expect(noteMatchesSchedulingOwnershipDebrief(note)).toBe(true);
    expect(inferSchedulingControlFromDebrief(note)).toBe("shared_workflow");
    expect(buildSchedulingOwnershipEvidenceSummary(note)).toMatch(/Karen/i);
    expect(buildSchedulingOwnershipEvidenceSummary(note)).toMatch(/Name: Karen|help with scheduling timing|OR scheduling/i);
  });

  it("routes ACSIS evidence away from observation access", () => {
    const acsis =
      "Interest in ACSIS discussed; fit strength still needs confirmation in a live case.";
    expect(
      evidenceSnippetBelongsToDbKey(
        "provider_observation_feasibility",
        acsis,
        "observation_approval",
      ),
    ).toBe(false);
    expect(
      evidenceSnippetBelongsToDbKey("provider_preference_card_signals", acsis, "product_alignment"),
    ).toBe(true);
  });

  it("rejects Karen scheduling evidence on procedure workflow fields", () => {
    const karenScheduling =
      "Karen from the office helps coordinate scheduling with the OR scheduling team.";
    expect(
      evidenceSnippetBelongsToDbKey(
        "provider_procedure_focus",
        karenScheduling,
        "workflow_visibility",
      ),
    ).toBe(false);
    expect(
      evidenceSnippetBelongsToDbKey(
        "provider_scheduling_contact",
        karenScheduling,
        "scheduling_owner",
      ),
    ).toBe(true);
  });

  it("maps Andy/Karen debrief to scheduling control and contact fields", () => {
    const enriched = enrichDebriefMappingWithPartialLeads(
      emptyMapping(),
      ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
    );
    const ownershipPartial = enriched.partial_updates.find((p) =>
      /scheduling ownership/i.test(p.label),
    );
    expect(ownershipPartial).toBeDefined();
    const contactPartial = enriched.partial_updates.find(
      (p) =>
        p.domain === "scheduling" &&
        /scheduling owner/i.test(p.label) &&
        !/scheduling ownership/i.test(p.label),
    )!;
    const writableKeys = new Set([
      "provider_observation_scheduling_control",
      "provider_scheduling_contact",
    ]);
    expect(
      pickSchedulingIntelligenceDbKey({
        label: ownershipPartial.label,
        value: ownershipPartial.value,
        reasoning: ownershipPartial.reasoning,
        rawNote: ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
        proposedScope: "provider",
        writableKeys,
      }),
    ).toBe("provider_observation_scheduling_control");
    expect(
      pickSchedulingIntelligenceDbKey({
        label: contactPartial.label,
        value: contactPartial.value,
        reasoning: contactPartial.reasoning,
        rawNote: ANDY_KAREN_DEBRIEF_REGRESSION_NOTE,
        proposedScope: "provider",
        writableKeys,
      }),
    ).toBe("provider_scheduling_contact");
  });

  it("builds domain-specific human evidence", () => {
    expect(humanEvidenceForDomain("or_access", ANDY_KAREN_DEBRIEF_REGRESSION_NOTE)).toMatch(
      /Observation interest: Yes.*Observation approval: No/s,
    );
    expect(humanEvidenceForDomain("product_fit", ANDY_KAREN_DEBRIEF_REGRESSION_NOTE)).toMatch(
      /ACSIS/i,
    );
    expect(humanEvidenceForDomain("workflow", ANDY_KAREN_DEBRIEF_REGRESSION_NOTE)).toMatch(
      /visualization/i,
    );
  });
});
