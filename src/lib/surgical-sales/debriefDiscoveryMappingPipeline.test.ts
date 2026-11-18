import { describe, expect, it } from "vitest";
import { enrichDebriefMappingWithPartialLeads } from "@/lib/surgical-sales/debriefPartialIntelligenceEnrichment";
import {
  buildParseResultFromOpenAiMapping,
  type LogUpdateOpenAiMapping,
} from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import { buildFieldEvidenceFromLogUpdate } from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import { buildDiscoveryMappingQuestionView } from "@/lib/surgical-sales/buildDiscoveryMappingQuestionView";
import { buildDiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";
import { formatPartialIntelligencePersistValue } from "@/lib/surgical-sales/partialIntelligencePersist";
import {
  buildDebriefDiscoveryPersistPayload,
  loadDiscoveryMappingFromContact,
} from "@/lib/surgical-sales/debriefDiscoveryMappingPipeline";

export const JOHN_SMITH_INTRO_DEBRIEF =
  "Met with Dr. John Smith at Test Hospital today for an initial intro discussion. Main goal was understanding whether there is a realistic pathway to observe one of his robotic hernia cases. He mentioned they are doing more robotic abdominal wall and hernia work. Observation was not directly approved but he did not seem opposed. Karen from the office came up a few times. Sounds like she helps coordinate scheduling and probably works with the OR scheduling team. I still need to get her info and understand how much control the office has versus hospital side.";

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

function parseJohnSmithDebrief() {
  const enriched = enrichDebriefMappingWithPartialLeads(emptyMapping(), JOHN_SMITH_INTRO_DEBRIEF);
  const writableKeys = [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS];
  return buildParseResultFromOpenAiMapping({
    sourceText: JOHN_SMITH_INTRO_DEBRIEF,
    mapping: enriched,
    context: { providerId: "provider-test-1", writableFieldKeys: writableKeys },
    existingFields: {},
  });
}

describe("debriefDiscoveryMappingPipeline", () => {
  it("maps observation opposition language to feasibility with partial evidence", () => {
    const parse = parseJohnSmithDebrief();
    const observationField = parse.fieldUpdates.find(
      (f) =>
        f.dbKey === "provider_observation_feasibility" ||
        f.dbKey === "provider_observation_access_path",
    );
    expect(observationField).toBeDefined();
    expect(observationField?.proposedValue).toMatch(/did not seem opposed|not shut down|Partial lead/i);

    const evidence = buildFieldEvidenceFromLogUpdate(parse);
    const observationEvidence =
      evidence.provider_observation_feasibility ?? evidence.provider_observation_access_path;
    expect(observationEvidence).toMatch(/did not seem opposed|not shut down/i);
  });

  it("maps Karen scheduling language to scheduling control with shared workflow", () => {
    const parse = parseJohnSmithDebrief();
    const control = parse.fieldUpdates.find(
      (f) => f.dbKey === "provider_observation_scheduling_control",
    );
    expect(control?.proposedValue).toBe("shared_workflow");

    const evidence = buildFieldEvidenceFromLogUpdate(parse);
    expect(evidence.provider_observation_scheduling_control).toMatch(/Karen/i);
    expect(evidence.provider_observation_scheduling_control).toMatch(/OR scheduling/i);
  });

  it("maps robotic abdominal wall / hernia language to clinical procedure focus", () => {
    const parse = parseJohnSmithDebrief();
    const focus = parse.fieldUpdates.find((f) => f.dbKey === "provider_procedure_focus");
    expect(focus?.proposedValue).toMatch(/abdominal wall|hernia/i);
  });

  it("stores Karen as a soft contact lead on scheduling contact, not a confirmed contact", () => {
    const parse = parseJohnSmithDebrief();
    const contactField = parse.fieldUpdates.find((f) => f.dbKey === "provider_scheduling_contact");
    expect(contactField?.proposedValue).toMatch(/\[Partial lead\]\s*Karen/i);
    expect(contactField?.proposedValue).not.toMatch(/^Karen,/);
  });

  it("loader returns persisted mapped evidence for discovery mapping questions", () => {
    const parse = parseJohnSmithDebrief();
    const payload = buildDebriefDiscoveryPersistPayload({
      logUpdate: parse,
      sourceLabel: "Intro Call debrief",
    });

    const loader = loadDiscoveryMappingFromContact({
      providerId: "provider-test-1",
      contact: payload.contactPatch,
    });

    const observation = loader.items.find((i) => i.signalId === "observation_approval");
    expect(observation?.currentUnderstanding).toMatch(/did not seem opposed|not shut down/i);
    expect(observation?.evidence).toMatch(/did not seem opposed|not shut down/i);
    expect(observation?.source).toMatch(/Intro Call debrief/i);

    const scheduling = loader.items.find((i) => i.signalId === "scheduling_owner");
    expect(scheduling?.currentUnderstanding).toMatch(/Scheduling ownership|Karen|partial/i);
    expect(scheduling?.evidence).toMatch(/Karen/i);
    expect(scheduling?.suggestedAnswer).toMatch(/Shared scheduling workflow/i);
    expect(scheduling?.status).toMatch(/Partial|Captured|Unknown/i);

    const clinical = loader.items.find((i) => i.dbKey === "provider_procedure_focus");
    expect(clinical?.evidence).toMatch(/abdominal wall|hernia/i);
  });

  it("does not render raw enum strings like credentialing_required as evidence", () => {
    const view = buildDiscoveryMappingQuestionView({
      dbKey: "provider_observation_feasibility",
      contact: {
        provider_observation_feasibility: "credentialing_required",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "engagement",
            source_label: "Intro Call debrief",
            updated_at: "2026-05-20T12:00:00.000Z",
            evidence_text:
              "Observation was not directly approved, but provider did not seem opposed.",
            lifecycle_state: "captured",
          },
        },
      },
    });
    expect(view?.currentState.summary).not.toMatch(/credentialing_required/);
    expect(view?.evidence?.quote).toMatch(/did not seem opposed/i);
  });

  it("does not show generic on-file placeholder when debrief evidence exists", () => {
    const stored = formatPartialIntelligencePersistValue({
      narrative:
        "Provider did not appear opposed to observation, but approval was not directly confirmed.",
      stillNeeds: ["Direct approval from surgeon"],
    });
    const view = buildDiscoveryMappingQuestionView({
      dbKey: "provider_observation_feasibility",
      contact: {
        provider_observation_feasibility: stored,
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "engagement",
            source_label: "Intro Call debrief",
            updated_at: "2026-05-20T12:00:00.000Z",
            evidence_text:
              "Observation was not directly approved, but provider did not seem opposed.",
            lifecycle_state: "captured",
          },
        },
      },
    });
    expect(view?.currentState.summary).toMatch(/did not seem opposed|not directly confirmed/i);
    expect(view?.currentState.summary).not.toMatch(/on file/i);
    expect(view?.currentState.summary).not.toBe("No validated answer yet.");
  });

  it("discovery groups view surfaces scheduling evidence after debrief-shaped contact", () => {
    const parse = parseJohnSmithDebrief();
    const payload = buildDebriefDiscoveryPersistPayload({
      logUpdate: parse,
      sourceLabel: "Intro Call debrief",
    });
    const groups = buildDiscoveryIntelligenceGroupsView({ contact: payload.contactPatch });
    const scheduling = groups.groups
      .flatMap((g) => g.rows)
      .find((r) => r.signalId === "scheduling_owner");
    expect(scheduling?.evidenceSnippet).toMatch(/Karen/i);
    expect(scheduling?.statusLabel).not.toBe("Unknown");
  });
});
