import { describe, expect, it } from "vitest";
import { enrichDebriefMappingWithPartialLeads } from "./debriefPartialIntelligenceEnrichment";
import { buildParseResultFromOpenAiMapping, type LogUpdateOpenAiMapping } from "./logUpdateOpenAiMapping";
import { buildDebriefDiscoveryPersistPayload } from "./debriefDiscoveryMappingPipeline";
import { buildDiscoveryMappingCardIntelligence } from "./buildDiscoveryMappingCardIntelligence";
import { buildStageMappingSession } from "./buildStageMappingSession";
import { buildDiscoveryIntelligenceGroupsView } from "./buildDiscoveryIntelligenceGroupsView";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "./intelligenceScopeInference";
import type { StageMappingSignalId } from "./stageMappingQuestions";
import { DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY } from "./discoveryMappingEvidenceQuality";
import { isPlaceholderDiscoveryMappingAnswer } from "./discoveryMappingEvidenceQuality";

const PROVIDER_ID = "provider-classification-test";

function salesAndAccessQuestions(contact: Record<string, unknown>) {
  const view = buildDiscoveryIntelligenceGroupsView({ contact });
  const session = buildStageMappingSession(view, { contact });
  return session.operationalQuestions.filter(
    (q) => q.intelligenceCategory === "sales" || q.intelligenceCategory === "operational",
  );
}

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

function contactPatchFromDebrief(debrief: string, sourceLabel = "Test debrief") {
  const enriched = enrichDebriefMappingWithPartialLeads(emptyMapping(), debrief);
  const parse = buildParseResultFromOpenAiMapping({
    sourceText: debrief,
    mapping: enriched,
    context: {
      providerId: PROVIDER_ID,
      writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
    },
    existingFields: {},
  });
  return buildDebriefDiscoveryPersistPayload({
    logUpdate: parse,
    sourceLabel,
  }).contactPatch;
}

function cardIntelligence(
  contact: Record<string, unknown>,
  signalId: StageMappingSignalId,
) {
  const view = buildDiscoveryIntelligenceGroupsView({ contact });
  const session = buildStageMappingSession(view, { contact });
  const question = session.operationalQuestions.find((q) => q.signalId === signalId);
  if (!question) {
    throw new Error(`Missing stage mapping question for ${signalId}`);
  }
  return buildDiscoveryMappingCardIntelligence({
    question,
    contact,
    providerId: PROVIDER_ID,
  });
}

function summaryText(intelligence: ReturnType<typeof buildDiscoveryMappingCardIntelligence>): string {
  return [
    intelligence.currentIntelligence?.summary,
    intelligence.understandingSummary,
    intelligence.currentIntelligence?.rawEvidence,
  ]
    .filter(Boolean)
    .join(" ");
}

describe("Discovery Mapping intelligence classification", () => {
  it("classifies Karen scheduling debrief without cross-card leakage", () => {
    const debrief =
      "Karen appears to be involved in scheduling. I still need her contact info.";
    const contact = {
      provider_relationship_stage: "prospect",
      ...contactPatchFromDebrief(debrief),
    };

    const scheduling = cardIntelligence(contact, "scheduling_owner");
    expect(scheduling.scanStatus.slug).toMatch(/partial|potential_lead/);
    expect(scheduling.currentIntelligence?.statusLabel).toMatch(/Partial|Potential Lead/i);
    expect(["low", "medium"]).toContain(scheduling.currentIntelligence?.confidenceLevel);
    expect(scheduling.stillNeedToConfirm.join(" ")).toMatch(/contact info|Karen/i);
    expect(summaryText(scheduling)).toMatch(/Karen/i);

    for (const signalId of [
      "workflow_visibility",
      "opportunity_clinical_frustrations",
      "opportunity_product_gaps",
    ] as StageMappingSignalId[]) {
      const intel = cardIntelligence(contact, signalId);
      expect(summaryText(intel)).not.toMatch(/Karen/i);
      expect(intel.suggestedContactLead?.name).not.toBe("Karen");
    }
  });

  it("classifies Jim case mix debrief without confirming product cards", () => {
    const debrief =
      "Jim mentioned higher volume of complex abdominal wall reconstruction cases.";
    const contact = {
      provider_relationship_stage: "prospect",
      ...contactPatchFromDebrief(debrief),
    };

    const workflow = cardIntelligence(contact, "workflow_visibility");
    const caseOpportunity = cardIntelligence(contact, "case_opportunity");
    const procedureIntel =
      workflow.hasAppliedIntelligence && workflow.scanStatus.slug !== "open"
        ? workflow
        : caseOpportunity;

    expect(procedureIntel.hasAppliedIntelligence).toBe(true);
    expect(procedureIntel.scanStatus.slug).toMatch(/partial|confirmed/);
    expect(procedureIntel.currentIntelligence?.confidenceLevel).toBe("medium");
    expect(procedureIntel.currentIntelligence?.summary ?? "").toMatch(
      /abdominal wall|reconstruction|volume|case mix|procedure/i,
    );
    expect(procedureIntel.currentIntelligence?.summary ?? "").not.toMatch(/Jim/i);

    const productsInUse = cardIntelligence(contact, "opportunity_products_in_use");

    expect(productsInUse.scanStatus.slug).not.toBe("confirmed");
    expect(productsInUse.currentIntelligence?.validationStatus).not.toBe("confirmed");
  });

  it("keeps products-in-use open when rep states they do not know", () => {
    const debrief = "I don't know what products they are currently using.";
    const contact = {
      provider_relationship_stage: "prospect",
      ...contactPatchFromDebrief(debrief),
    };

    const productsInUse = cardIntelligence(contact, "opportunity_products_in_use");

    expect(["open", "unknown"]).toContain(productsInUse.scanStatus.slug);
    expect(productsInUse.currentIntelligence?.confidenceLevel).toBe("low");
    expect(productsInUse.scanStatus.slug).not.toBe("confirmed");
    expect(productsInUse.hasAppliedIntelligence).toBe(false);
    expect(productsInUse.currentIntelligence?.summary).toMatch(/No intelligence captured yet/i);
  });

  it("keeps all sales and access cards open when source evidence is empty", () => {
    const contact = {
      provider_relationship_stage: "prospect",
      ...contactPatchFromDebrief(""),
    };

    for (const question of salesAndAccessQuestions(contact)) {
      const intel = cardIntelligence(contact, question.signalId as StageMappingSignalId);

      expect(intel.scanStatus.slug).toBe("open");
      expect(intel.scanStatus.slug).not.toBe("confirmed");
      expect(intel.hasAppliedIntelligence).toBe(false);
      expect(intel.currentIntelligence?.summary).toBe(DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY);
      expect(
        isPlaceholderDiscoveryMappingAnswer(intel.currentIntelligence?.summary, intel.currentIntelligence?.mappedCategory),
      ).toBe(false);

      const summary = intel.currentIntelligence?.summary ?? "";
      expect(summary).not.toMatch(/Captured intelligence/i);
      expect(isPlaceholderDiscoveryMappingAnswer(summary)).toBe(false);
    }
  });
});
