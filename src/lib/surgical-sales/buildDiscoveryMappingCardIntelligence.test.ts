import { describe, expect, it } from "vitest";
import { buildDebriefDiscoveryPersistPayload, loadDiscoveryMappingFromContact } from "./debriefDiscoveryMappingPipeline";
import {
  buildDiscoveryMappingCardIntelligence,
  findContactPoolMatchByName,
} from "./buildDiscoveryMappingCardIntelligence";
import { buildStageMappingSession } from "./buildStageMappingSession";
import { buildDiscoveryIntelligenceGroupsView } from "./buildDiscoveryIntelligenceGroupsView";
import { buildDebriefMappingHandoff } from "./buildDebriefMappingHandoff";
import { JOHN_SMITH_INTRO_DEBRIEF } from "./debriefDiscoveryMappingPipeline.test";
import { enrichDebriefMappingWithPartialLeads } from "./debriefPartialIntelligenceEnrichment";
import { buildParseResultFromOpenAiMapping } from "./logUpdateOpenAiMapping";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "./intelligenceScopeInference";

function johnSmithContactPatch() {
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
    JOHN_SMITH_INTRO_DEBRIEF,
  );
  const parse = buildParseResultFromOpenAiMapping({
    sourceText: JOHN_SMITH_INTRO_DEBRIEF,
    mapping: enriched,
    context: { providerId: "provider-test-1", writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS] },
    existingFields: {},
  });
  return buildDebriefDiscoveryPersistPayload({
    logUpdate: parse,
    sourceLabel: "Intro Call",
  }).contactPatch;
}

describe("buildDiscoveryMappingCardIntelligence", () => {
  it("surfaces applied scheduling intelligence inside the scheduling mapping card", () => {
    const contact = johnSmithContactPatch();
    const view = buildDiscoveryIntelligenceGroupsView({ contact });
    const session = buildStageMappingSession(view, { contact });
    const question = session.operationalQuestions.find((q) => q.signalId === "scheduling_owner");
    expect(question).toBeDefined();

    const intelligence = buildDiscoveryMappingCardIntelligence({
      question: question!,
      contact,
      providerId: "provider-test-1",
    });

    expect(intelligence.hasAppliedIntelligence).toBe(true);
    expect(intelligence.currentIntelligence?.summary).toMatch(/Karen.*scheduling/i);
    expect(intelligence.currentIntelligence?.statusLabel).toMatch(/Partial|Potential Lead/i);
    expect(intelligence.stillNeedToConfirm.join(" ")).toMatch(/Contact information|Karen/i);
  });

  it("extracts Karen as a suggested contact lead from partial debrief intelligence", () => {
    const contact = johnSmithContactPatch();
    const view = buildDiscoveryIntelligenceGroupsView({ contact });
    const session = buildStageMappingSession(view, { contact });
    const question = session.operationalQuestions.find((q) => q.signalId === "scheduling_owner");

    const intelligence = buildDiscoveryMappingCardIntelligence({
      question: question!,
      contact,
      providerId: "provider-test-1",
    });

    expect(intelligence.suggestedContactLead?.name).toBe("Karen");
    expect(intelligence.suggestedContactLead?.hint).toMatch(/timing/i);
  });

  it("stores layered intelligence on metadata and shows interpretation in current intelligence", () => {
    const contact = johnSmithContactPatch();
    const meta = contact.provider_intelligence_field_metadata as Record<string, Record<string, unknown>>;
    const workflowMeta = meta.provider_procedure_focus?.discovery_mapping as Record<string, string> | undefined;
    expect(workflowMeta?.evidence_text).toMatch(/hernia|abdominal wall/i);
    expect(workflowMeta?.interpretation).toMatch(/Procedure mix|Robotic hernia/i);
    expect(workflowMeta?.mapped_category).toMatch(/Procedure focus \/ case mix/i);
    expect(workflowMeta?.status).toBe("partial");

    const view = buildDiscoveryIntelligenceGroupsView({ contact });
    const session = buildStageMappingSession(view, { contact });
    const workflowQuestion = session.operationalQuestions.find(
      (q) => q.signalId === "workflow_visibility",
    );
    const intelligence = buildDiscoveryMappingCardIntelligence({
      question: workflowQuestion!,
      contact,
      providerId: "provider-test-1",
    });

    expect(intelligence.currentIntelligence?.summary).toMatch(/Procedure mix|Robotic hernia/i);
    expect(intelligence.currentIntelligence?.summary).not.toMatch(
      /Where is observation scheduling controlled|What procedure workflow/i,
    );
    expect(intelligence.currentIntelligence?.rawEvidence).toMatch(/hernia|abdominal wall/i);
    expect(intelligence.currentIntelligence?.mappedCategory).toMatch(/Procedure focus \/ case mix/i);
  });

  it("does not surface Karen on workflow cards when she was only mentioned for scheduling", () => {
    const contact = johnSmithContactPatch();
    const view = buildDiscoveryIntelligenceGroupsView({ contact });
    const session = buildStageMappingSession(view, { contact });
    const workflowQuestion = session.operationalQuestions.find(
      (q) => q.signalId === "workflow_visibility",
    );
    expect(workflowQuestion).toBeDefined();

    const intelligence = buildDiscoveryMappingCardIntelligence({
      question: workflowQuestion!,
      contact,
      providerId: "provider-test-1",
    });

    expect(intelligence.suggestedContactLead?.name).not.toBe("Karen");
    expect(intelligence.currentIntelligence?.summary ?? "").not.toMatch(/Karen/i);
    expect(intelligence.understandingSummary ?? "").not.toMatch(/Karen/i);
  });

  it("does not treat partial debrief intelligence as fully confirmed", () => {
    const contact = johnSmithContactPatch();
    const view = buildDiscoveryIntelligenceGroupsView({ contact });
    const session = buildStageMappingSession(view, { contact });
    const question = session.operationalQuestions.find((q) => q.signalId === "scheduling_owner");

    const intelligence = buildDiscoveryMappingCardIntelligence({
      question: question!,
      contact,
      providerId: "provider-test-1",
    });

    expect(intelligence.currentIntelligence?.validationStatus).toBe("needs_validation");
    expect(intelligence.currentIntelligence?.statusLabel).not.toBe("Confirmed");
    expect(intelligence.scanStatus.slug).not.toBe("confirmed");
    expect(intelligence.currentIntelligence?.confidenceLevel).toBe("medium");
    expect(intelligence.currentIntelligence?.confidenceLabel).toBe("Observed");
    expect(intelligence.hasAppliedIntelligence).toBe(true);
  });

  it("summarizes current understanding from applied intelligence instead of the question text", () => {
    const contact = johnSmithContactPatch();
    const view = buildDiscoveryIntelligenceGroupsView({ contact });
    const session = buildStageMappingSession(view, { contact });
    const question = session.operationalQuestions.find((q) => q.signalId === "scheduling_owner");

    const intelligence = buildDiscoveryMappingCardIntelligence({
      question: question!,
      contact,
      providerId: "provider-test-1",
    });

    expect(intelligence.understandingSummary).toMatch(/Karen.*scheduling/i);
    expect(intelligence.understandingSummary).not.toMatch(/Where is observation scheduling controlled/i);
  });

  it("shows open status when metadata exists without substantive evidence", () => {
    const contact = {
      provider_relationship_stage: "prospect",
      provider_intelligence_field_metadata: {
        provider_observation_scheduling_control: {
          source_type: "engagement",
          source_label: "Intro Call debrief",
          updated_at: new Date().toISOString(),
          discovery_stance: "needs_validation",
        },
      },
    };
    const view = buildDiscoveryIntelligenceGroupsView({ contact });
    const session = buildStageMappingSession(view, { contact });
    const question = session.operationalQuestions.find((q) => q.signalId === "scheduling_owner");

    const intelligence = buildDiscoveryMappingCardIntelligence({
      question: question!,
      contact,
      providerId: "provider-test-1",
    });

    expect(intelligence.scanStatus).toEqual({ label: "Open", slug: "open" });
    expect(intelligence.currentIntelligence?.summary).toMatch(/No intelligence captured yet/i);
    expect(intelligence.currentIntelligence?.summary).not.toMatch(
      /Where is observation scheduling controlled/i,
    );
    expect(intelligence.currentIntelligence?.sourceLine).toMatch(/Source reviewed: Intro Call debrief/i);
    expect(intelligence.stillNeedToConfirm.length).toBeGreaterThan(0);
    expect(intelligence.currentIntelligence?.suggestedNextAction).toMatch(/next call/i);
    expect(intelligence.hasAppliedIntelligence).toBe(false);
  });

  it("shows open status for unanswered sales intelligence cards", () => {
    const contact = { provider_relationship_stage: "prospect" };
    const view = buildDiscoveryIntelligenceGroupsView({ contact });
    const session = buildStageMappingSession(view, { contact });
    const question = session.operationalQuestions.find((q) => q.signalId === "workflow_visibility");
    expect(question).toBeDefined();

    const intelligence = buildDiscoveryMappingCardIntelligence({
      question: question!,
      contact,
      providerId: "provider-test-1",
    });

    expect(intelligence.scanStatus.slug).toBe("open");
    expect(intelligence.currentIntelligence?.summary).toMatch(/No intelligence captured yet/i);
    expect(intelligence.currentIntelligence?.summary).not.toMatch(/procedure workflow/i);
    expect(intelligence.stillNeedToConfirm.length).toBeGreaterThan(0);
    expect(intelligence.currentIntelligence?.suggestedNextAction).toMatch(
      /Observe a relevant case|log field intel/i,
    );
  });

  it("formats partial-lead-only scheduling contact as a potential signal", () => {
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
    const view = buildDiscoveryIntelligenceGroupsView({ contact });
    const session = buildStageMappingSession(view, { contact });
    const question = session.operationalQuestions.find((q) => q.signalId === "scheduling_owner");

    const intelligence = buildDiscoveryMappingCardIntelligence({
      question: question!,
      contact,
      providerId: "provider-test-1",
    });

    expect(intelligence.scanStatus.slug).toBe("partial");
    expect(intelligence.currentIntelligence?.summary).toMatch(/Karen/i);
    expect(intelligence.currentIntelligence?.summary).not.toMatch(/No intelligence captured yet/i);
  });
});

describe("buildDebriefMappingHandoff", () => {
  it("builds review mapping navigation for the first updated signal", () => {
    const contact = johnSmithContactPatch();
    const loader = loadDiscoveryMappingFromContact({
      providerId: "provider-test-1",
      contact,
    });
    expect(loader.items.some((item) => item.signalId === "scheduling_owner")).toBe(true);

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
      JOHN_SMITH_INTRO_DEBRIEF,
    );
    const parse = buildParseResultFromOpenAiMapping({
      sourceText: JOHN_SMITH_INTRO_DEBRIEF,
      mapping: enriched,
      context: { providerId: "provider-test-1", writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS] },
      existingFields: {},
    });

    const handoff = buildDebriefMappingHandoff({
      providerId: "provider-test-1",
      logUpdate: parse,
    });

    expect(handoff?.updateCount).toBeGreaterThan(0);
    expect(handoff?.firstSignalId).toBe("scheduling_owner");
    expect(handoff?.reviewMappingHref).toMatch(/mapping=1/);
    expect(handoff?.reviewMappingHref).toMatch(/signal=scheduling_owner/);
  });
});

describe("findContactPoolMatchByName", () => {
  it("matches contacts in the pool by first name", () => {
    const match = findContactPoolMatchByName(
      [{ id: "c-1", first_name: "Karen", last_name: "Nguyen" }],
      "Karen",
    );
    expect(match?.id).toBe("c-1");
  });
});
