import { describe, expect, it } from "vitest";
import { buildDiscoveryMappingCardIntelligence } from "./buildDiscoveryMappingCardIntelligence";
import { buildStageMappingSession } from "./buildStageMappingSession";
import { buildDiscoveryIntelligenceGroupsView } from "./buildDiscoveryIntelligenceGroupsView";
import {
  buildDebriefDiscoveryPersistPayload,
} from "./debriefDiscoveryMappingPipeline";
import { enrichDebriefMappingWithPartialLeads } from "./debriefPartialIntelligenceEnrichment";
import { buildParseResultFromOpenAiMapping } from "./logUpdateOpenAiMapping";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "./intelligenceScopeInference";
import {
  buildFieldSignalsFromCommit,
  formatPropagatedSignalSummary,
  isGenericIntelligenceSummary,
} from "./propagatedIntelligenceSignal";

const KAREN_HANDLES_SCHEDULING_NOTE = "Karen handles scheduling.";

describe("propagatedIntelligenceSignal", () => {
  it("extracts known facts from a direct scheduling debrief", () => {
    const signals = buildFieldSignalsFromCommit({
      sourceText: KAREN_HANDLES_SCHEDULING_NOTE,
      fieldPatches: [
        { dbKey: "provider_observation_scheduling_control", value: "provider_office" },
        { dbKey: "provider_scheduling_contact", value: "[Partial lead] Karen\nKaren handles scheduling." },
      ],
    });

    const schedulingSignal =
      signals.provider_scheduling_contact ?? signals.provider_observation_scheduling_control;
    expect(schedulingSignal).toBeDefined();
    expect(schedulingSignal?.knownFacts.join(" ")).toMatch(/Karen handles scheduling/i);
    expect(schedulingSignal?.evidenceText).toMatch(/Karen handles scheduling/i);
    expect(schedulingSignal?.remainingUnknowns).toEqual(
      expect.arrayContaining(["Contact information"]),
    );
    expect(formatPropagatedSignalSummary(schedulingSignal!)).toMatch(
      /Karen was mentioned as the scheduling coordinator/i,
    );
    expect(isGenericIntelligenceSummary(formatPropagatedSignalSummary(schedulingSignal!))).toBe(
      false,
    );
  });

  it("surfaces Karen scheduling intelligence on the discovery card instead of generic copy", () => {
    const enriched = enrichDebriefMappingWithPartialLeads(
      {
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
      },
      KAREN_HANDLES_SCHEDULING_NOTE,
    );
    const parse = buildParseResultFromOpenAiMapping({
      sourceText: KAREN_HANDLES_SCHEDULING_NOTE,
      mapping: enriched,
      context: { providerId: "provider-test-1", writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS] },
      existingFields: {},
    });
    const payload = buildDebriefDiscoveryPersistPayload({
      logUpdate: parse,
      sourceLabel: "Intro Call debrief",
    });

    const view = buildDiscoveryIntelligenceGroupsView({ contact: payload.contactPatch });
    const session = buildStageMappingSession(view, { contact: payload.contactPatch });
    const question = session.operationalQuestions.find((q) => q.signalId === "scheduling_owner");
    expect(question).toBeDefined();

    const intelligence = buildDiscoveryMappingCardIntelligence({
      question: question!,
      contact: payload.contactPatch,
      providerId: "provider-test-1",
    });

    expect(intelligence.currentIntelligence?.summary).toMatch(/Karen/i);
    expect(intelligence.currentIntelligence?.summary).not.toMatch(
      /Scheduling coordination was mentioned/i,
    );
    expect(intelligence.stillNeedToConfirm).toEqual(
      expect.arrayContaining(["Contact information"]),
    );
  });
});
