import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { calculateCaseReadiness } from "@/lib/surgical-sales/calculateCaseReadiness";

const accountId = randomUUID();
const surgeonId = randomUUID();
const productId = randomUUID();
const skuId = randomUUID();

function baseDraft(
  overrides: Partial<Parameters<typeof calculateCaseReadiness>[0]> = {},
): Parameters<typeof calculateCaseReadiness>[0] {
  return {
    caseType: "observation",
    surgeonId,
    accountId,
    caseDate: "2026-05-27",
    caseTime: "",
    procedureType: "",
    relatedOpportunityId: "",
    needsProducts: false,
    observationProductExpanded: false,
    observationObjectives: {
      observation_goal: "",
      observation_key_questions: "",
      observation_signals_to_validate: "",
    },
    observationSchedulingOwner: "",
    observationAccessPathway: "",
    observationCredentialingRequirement: "unknown",
    productId: "",
    skuId: "",
    expectedQty: "1",
    expectedRevenue: "",
    extraLines: [],
    productName: null,
    skuLabel: null,
    draftCaseId: null,
    ...overrides,
  };
}

describe("calculateCaseReadiness", () => {
  it("handles provider/facility/date-only observation as draft-ready planning state", () => {
    const result = calculateCaseReadiness(baseDraft(), { providerContact: null });
    expect(["draft_ready", "planning_incomplete"]).toContain(result.readinessLevel);
    expect(result.canSaveDraft).toBe(true);
    expect(result.readinessLevel).not.toBe("execution_ready");
    expect(result.readyItems).toEqual(
      expect.arrayContaining([
        "Provider selected",
        "Facility selected",
        "Date selected · 2026-05-27",
        "Ready to save draft observation case.",
      ]),
    );
    expect(result.missingIntelligence).toEqual(["Observation objectives not captured yet"]);
    expect(result.accessRisks).toEqual(
      expect.arrayContaining([
        "Scheduling owner — optional reference",
        "Access pathway — optional reference",
        "Credentialing — optional reference",
      ]),
    );
    expect(result.nextAction).toBe("Add observation objective.");
  });

  it("includes observation objectives in ready items when captured", () => {
    const result = calculateCaseReadiness(
      baseDraft({
        observationObjectives: {
          observation_goal: "Validate workflow",
          observation_key_questions: "",
          observation_signals_to_validate: "",
        },
      }),
      { providerContact: null },
    );
    expect(result.missingIntelligence).toHaveLength(0);
    expect(result.readyItems).toContain("Observation objectives started");
    expect(result.readinessLevel).toBe("execution_ready");
  });

  it("keeps optional access gaps in access risks, not next action", () => {
    const result = calculateCaseReadiness(
      baseDraft({
        observationAccessPathway: "OR scheduler required",
        observationCredentialingRequirement: "verified",
      }),
      { providerContact: null },
    );
    expect(result.accessRisks).toContain("Scheduling owner — optional reference");
    expect(result.nextAction).toBe("Add observation objective.");
  });

  it("does not prioritize access pathway after scheduling owner is known", () => {
    const result = calculateCaseReadiness(
      baseDraft({
        observationSchedulingOwner: "OR scheduler",
        observationCredentialingRequirement: "verified",
      }),
      { providerContact: null },
    );
    expect(result.nextAction).toBe("Add observation objective.");
    expect(result.accessRisks).toContain("Access pathway — optional reference");
  });

  it("shows credentialing as optional reference in access risks", () => {
    const result = calculateCaseReadiness(
      baseDraft({
        observationSchedulingOwner: "OR scheduler",
        observationAccessPathway: "OR scheduler required",
        observationCredentialingRequirement: "unknown",
      }),
      { providerContact: null },
    );
    expect(result.accessRisks).toContain("Credentialing — optional reference");
  });

  it("clears credentialing optional reference when credentialing is verified", () => {
    const result = calculateCaseReadiness(
      baseDraft({
        observationSchedulingOwner: "OR scheduler",
        observationAccessPathway: "OR scheduler required",
        observationCredentialingRequirement: "verified",
      }),
      { providerContact: null },
    );
    expect(result.accessRisks).toContain("Credentialing verified");
    expect(result.accessRisks).not.toContain("Credentialing — optional reference");
  });

  it("returns execution_ready when baseline details and objectives are complete", () => {
    const result = calculateCaseReadiness(
      baseDraft({
        observationObjectives: {
          observation_goal: "Validate first-case workflow",
          observation_key_questions: "",
          observation_signals_to_validate: "",
        },
      }),
      { providerContact: null },
    );
    expect(result.readinessLevel).toBe("execution_ready");
    expect(result.canSaveFinal).toBe(true);
    expect(result.nextAction).toBe("Save observation case.");
  });

  it("returns execution_ready when observation dependencies are complete", () => {
    const result = calculateCaseReadiness(
      baseDraft({
        observationObjectives: {
          observation_goal: "Validate workflow fit",
          observation_key_questions: "",
          observation_signals_to_validate: "",
        },
        observationSchedulingOwner: "OR scheduler",
        observationAccessPathway: "OR scheduler required",
        observationCredentialingRequirement: "verified",
      }),
      { providerContact: null },
    );
    expect(result.readinessLevel).toBe("execution_ready");
    expect(result.canSaveFinal).toBe(true);
    expect(result.nextAction).toBe("Save observation case.");
    expect(result.accessRisks).toContain("Credentialing verified");
  });

  it("returns missing_required when observation required fields are missing", () => {
    const result = calculateCaseReadiness(
      baseDraft({
        surgeonId: "",
      }),
      { providerContact: null },
    );
    expect(result.readinessLevel).toBe("missing_required");
    expect(result.canSaveDraft).toBe(false);
    expect(result.canSaveFinal).toBe(false);
    expect(result.missingRequired).toContain("Select a provider for this observation case.");
    expect(result.nextAction).toBe("Select a provider for this observation case.");
  });

  it("enforces product and sku for product support", () => {
    const result = calculateCaseReadiness(
      baseDraft({
        caseType: "product_support",
        needsProducts: true,
        productId: "",
        skuId: "",
      }),
      { providerContact: null },
    );
    expect(result.readinessLevel).toBe("missing_required");
    expect(result.canSaveFinal).toBe(false);
    expect(result.missingRequired).toEqual(
      expect.arrayContaining([
        "Select a product family for this support case.",
      ]),
    );
  });

  it("returns execution_ready for complete product support", () => {
    const result = calculateCaseReadiness(
      baseDraft({
        caseType: "product_support",
        needsProducts: true,
        caseDate: "2026-05-27",
        productId,
        skuId,
        productName: "ACSIS",
        skuLabel: "SKU-100",
        procedureType: "Lap chole",
        supportSetupProcedure: "Lap chole",
        supportObjective: "Tray coverage",
        supportRepRole: "Rep in room",
        supportRequiredMaterials: "Hernia set",
      }),
      { providerContact: null },
    );
    expect(result.readinessLevel).toBe("execution_ready");
    expect(result.canSaveFinal).toBe(true);
    expect(result.nextAction).toBe("Save product support case.");
  });

  it("requires a provider for product support", () => {
    const result = calculateCaseReadiness(
      baseDraft({
        caseType: "product_support",
        surgeonId: "",
        needsProducts: true,
        productId,
        skuId,
      }),
      { providerContact: null },
    );
    expect(result.canSaveFinal).toBe(false);
    expect(result.missingRequired).toContain("Select a provider for this support case.");
  });

  it("does not emit raw enum or snake_case labels in readiness output", () => {
    const result = calculateCaseReadiness(baseDraft(), { providerContact: null });
    const labels = [
      ...result.readyItems,
      ...result.missingRequired,
      ...result.missingIntelligence,
      ...result.accessRisks,
      result.nextAction,
    ];
    for (const label of labels) {
      expect(label).not.toMatch(/\b[a-z]+(?:_[a-z0-9]+)+\b/);
    }
  });
});
