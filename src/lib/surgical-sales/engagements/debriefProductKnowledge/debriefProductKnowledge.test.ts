import { describe, expect, it } from "vitest";
import {
  buildDebriefStrategyProductContext,
  buildDebriefStrategyProductContextFromPlan,
  DEBRIEF_PRODUCT_KNOWLEDGE,
  DEBRIEF_PRODUCT_KNOWLEDGE_IDS,
  getDebriefProductKnowledge,
  listDebriefProductKnowledge,
  tryResolveDebriefProductKnowledgeId,
} from "./index";
import type { ProviderDebriefPlan } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";

describe("debriefProductKnowledge", () => {
  it("covers all product lines with required fields", () => {
    expect(DEBRIEF_PRODUCT_KNOWLEDGE_IDS).toHaveLength(6);

    for (const id of DEBRIEF_PRODUCT_KNOWLEDGE_IDS) {
      const product = DEBRIEF_PRODUCT_KNOWLEDGE[id];
      expect(product.id).toBe(id);
      expect(product.name.trim().length).toBeGreaterThan(0);
      expect(product.shortDescription.trim().length).toBeGreaterThan(0);
      expect(product.bestFitProcedures.length).toBeGreaterThan(0);
      expect(product.problemsSolved.length).toBeGreaterThan(0);
      expect(product.workflowTriggers.length).toBeGreaterThan(0);
      expect(product.clinicalTriggers.length).toBeGreaterThan(0);
      expect(product.idealProviderSignals.length).toBeGreaterThan(0);
      expect(product.commonObjections.length).toBeGreaterThan(0);
      expect(product.discoveryQuestions.length).toBeGreaterThan(0);
      expect(product.experience360Positioning.trim().length).toBeGreaterThan(0);
      expect(product.evaluationCaseTriggers.length).toBeGreaterThan(0);
      expect(product.avoidWhen.length).toBeGreaterThan(0);
    }

    expect(listDebriefProductKnowledge()).toHaveLength(6);
  });

  it("resolves product ids from common aliases", () => {
    expect(tryResolveDebriefProductKnowledgeId("ACSIS")).toBe("ACSIS");
    expect(tryResolveDebriefProductKnowledgeId("acsis")).toBe("ACSIS");
    expect(tryResolveDebriefProductKnowledgeId("Skeletal Dynamics")).toBe("Skeletal Dynamics");
    expect(tryResolveDebriefProductKnowledgeId("skeletaldynamics")).toBe("Skeletal Dynamics");
    expect(tryResolveDebriefProductKnowledgeId("unknown-product")).toBeNull();
  });

  it("returns catalog entries by id", () => {
    const acsis = getDebriefProductKnowledge("ACSIS");
    expect(acsis.name).toBe("ACSIS");
    expect(acsis.shortDescription).toMatch(/hernia|fixation|abdominal/i);
  });

  it("ranks product signals by fit level for strategy context", () => {
    const context = buildDebriefStrategyProductContext({
      productSignals: [
        { product: "Endolumik", fitLevel: "possible" },
        { product: "ACSIS", fitLevel: "strong" },
        { product: "future_opportunity", fitLevel: "unknown" },
      ],
    });

    expect(context.primaryProductId).toBe("ACSIS");
    expect(context.primary?.name).toBe("ACSIS");
    expect(context.candidates.map((c) => c.id)).toEqual(["ACSIS", "Endolumik"]);
  });

  it("builds context from provider debrief plan assessments", () => {
    const plan = {
      productOpportunityAssessment: [
        {
          product: "TelaBio",
          fitLevel: "needs_surgeon_confirmation",
          fitRationale: [],
          evidence: [],
        },
      ],
    } as ProviderDebriefPlan;

    const context = buildDebriefStrategyProductContextFromPlan(plan);
    expect(context.primaryProductId).toBe("TelaBio");
    expect(context.primary?.shortDescription).toMatch(/reinforcement|fascial/i);
  });
});
