import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildNewCaseCreatePayload,
  buildQuickAddCreatePayload,
  containsOpportunityWording,
  containsRawIntelligenceLabel,
  parseOptionalCaseRevenue,
  resolveNeedsProducts,
  resolveNewCasePathwayContext,
  resolveQuickAddPostSaveHref,
  resolveShowCompactProviderContext,
  validateNewCaseSubmit,
  validateQuickAddCase,
} from "@/lib/surgical-sales/newSurgicalCasePageLogic";

const accountId = randomUUID();
const surgeonId = randomUUID();
const productId = randomUUID();
const skuId = randomUUID();
const observationAccess = {
  scheduling_owner: "",
  access_pathway: "Unknown",
  credentialing_requirement: "unknown" as const,
  vendor_restrictions: "",
  preferred_timing: "",
};

function validObservationBase() {
  return {
    caseType: "observation" as const,
    surgeonId,
    accountId,
    caseDate: "2026-05-27",
    showProductsForObservation: false,
    productId: "",
    skuId: "",
    expectedQty: "1",
    expectedRevenue: "",
    needsProducts: false,
    extraLines: [] as { product_id: string; sku_id: string; expected_quantity: string }[],
    notes: "",
    phiAcknowledged: true,
  };
}

describe("resolveShowCompactProviderContext", () => {
  it("is compact when surgeon_contact_id is present and picker is locked", () => {
    expect(resolveShowCompactProviderContext("surgeon-1", false)).toBe(true);
  });

  it("is full when surgeon_contact_id is absent", () => {
    expect(resolveShowCompactProviderContext("", false)).toBe(false);
  });

  it("is full after the user unlocks the provider picker", () => {
    expect(resolveShowCompactProviderContext("surgeon-1", true)).toBe(false);
  });
});

describe("resolveNeedsProducts", () => {
  it("does not require product for observation without product focus", () => {
    expect(
      resolveNeedsProducts({
        caseType: "observation",
        showProductsForObservation: false,
        observationProductLineComplete: false,
      }),
    ).toBe(false);
  });

  it("requires product for product support", () => {
    expect(
      resolveNeedsProducts({
        caseType: "product_support",
        showProductsForObservation: false,
        observationProductLineComplete: false,
      }),
    ).toBe(true);
  });

  it("requires product for observation only when focus is expanded and complete", () => {
    expect(
      resolveNeedsProducts({
        caseType: "observation",
        showProductsForObservation: true,
        observationProductLineComplete: true,
      }),
    ).toBe(true);
    expect(
      resolveNeedsProducts({
        caseType: "observation",
        showProductsForObservation: true,
        observationProductLineComplete: false,
      }),
    ).toBe(false);
  });
});

describe("resolveQuickAddPostSaveHref", () => {
  it("routes observation cases to case detail workspace", () => {
    expect(resolveQuickAddPostSaveHref("case-1", "observation")).toBe("/portal/sales/cases/case-1");
  });

  it("routes product support cases to case detail", () => {
    expect(resolveQuickAddPostSaveHref("case-1", "product_support")).toBe("/portal/sales/cases/case-1");
  });
});

describe("parseOptionalCaseRevenue", () => {
  it("parses currency-like strings", () => {
    expect(parseOptionalCaseRevenue("$4,500.50")).toEqual({ ok: true, value: 4500.5 });
  });

  it("treats blank as null", () => {
    expect(parseOptionalCaseRevenue("  ")).toEqual({ ok: true, value: null });
  });

  it("rejects invalid amounts", () => {
    expect(parseOptionalCaseRevenue("abc").ok).toBe(false);
    expect(parseOptionalCaseRevenue("-10").ok).toBe(false);
  });
});

describe("buildQuickAddCreatePayload", () => {
  it("includes revenue per case when provided", () => {
    const body = buildQuickAddCreatePayload({
      caseType: "product_support",
      accountId,
      surgeonId,
      caseDate: "2026-08-12",
      procedureType: "Hernia repair",
      notes: "",
      expectedRevenue: "4500",
    });
    expect(body.expected_revenue).toBe(4500);
  });

  it("omits revenue as null when blank", () => {
    const body = buildQuickAddCreatePayload({
      caseType: "observation",
      accountId,
      surgeonId,
      caseDate: "2026-08-12",
      procedureType: "Scope",
      notes: "",
    });
    expect(body.expected_revenue).toBeNull();
  });

  it("logs a past observation as completed", () => {
    const body = buildQuickAddCreatePayload({
      caseType: "observation",
      accountId,
      surgeonId,
      caseDate: "2020-01-15",
      procedureType: "Scope",
      notes: "",
    });
    expect(body.status).toBe("completed");
  });

  it("keeps a future observation as a draft on quick add", () => {
    const body = buildQuickAddCreatePayload({
      caseType: "observation",
      accountId,
      surgeonId,
      caseDate: "2099-01-15",
      procedureType: "Scope",
      notes: "",
    });
    expect(body.status).toBe("draft");
  });
});

describe("validateQuickAddCase", () => {
  it("rejects invalid revenue", () => {
    const result = validateQuickAddCase({
      caseType: "observation",
      surgeonId,
      accountId,
      caseDate: "2026-08-12",
      procedureType: "Scope",
      notes: "",
      expectedRevenue: "nope",
      phiAcknowledged: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Revenue per case/i);
  });
});

describe("resolveNewCasePathwayContext", () => {
  it("frames observation as discovery-to-observe planning", () => {
    expect(resolveNewCasePathwayContext("observation")).toEqual({
      stageText: "Discovery → Observation",
      phaseText: "Operational planning phase",
      missionText: "Access, objectives, and field intelligence enrichment",
    });
  });

  it("frames product support as evaluation execution", () => {
    expect(resolveNewCasePathwayContext("product_support")).toEqual({
      stageText: "Evaluation / Support",
      phaseText: "Support planning phase",
      missionText: "Product, coverage, and field execution details",
    });
  });
});

describe("validateNewCaseSubmit", () => {
  it("allows observation save without product", () => {
    expect(validateNewCaseSubmit(validObservationBase())).toEqual({ ok: true, blockers: [] });
  });

  it("builds observation create payload without product or engagement", () => {
    const body = buildNewCaseCreatePayload({
      caseType: "observation",
      engagementLocked: false,
      lockedEngagementId: "",
      accountId,
      surgeonId,
      caseDate: "2026-05-27",
      caseTime: "",
      procedureType: "Hernia",
      needsProducts: false,
      productId: "",
      skuId: "",
      expectedQty: "1",
      expectedRevenue: "",
      extraLines: [],
      notes: "",
      followUpNeeded: false,
      relatedOpportunityId: "",
      observationObjectives: {
        observation_goal: "",
        observation_key_questions: "",
        observation_signals_to_validate: "",
      },
      observationAccess,
      status: "scheduled",
    });
    expect(body.product_id).toBeNull();
    expect(body.sku_id).toBeUndefined();
    expect(body.engagement_id).toBeUndefined();
    expect(body.observation_validation_targets).toEqual([]);
  });

  it("stores structured observation validation targets", () => {
    const body = buildNewCaseCreatePayload({
      caseType: "observation",
      engagementLocked: false,
      lockedEngagementId: "",
      accountId,
      surgeonId,
      caseDate: "2026-05-27",
      caseTime: "",
      procedureType: "ACSIS",
      needsProducts: false,
      productId: "",
      skuId: "",
      expectedQty: "1",
      expectedRevenue: "",
      extraLines: [],
      notes: "",
      followUpNeeded: false,
      relatedOpportunityId: "",
      observationObjectives: {
        observation_goal: "Validate workflow fit\nAssess preference card variability",
        observation_key_questions: "",
        observation_signals_to_validate: "Scheduling owner unknown.",
      },
      observationAccess,
      observationValidationTargetHints: [
        { label: "Validate workflow fit", source: "chip" },
        { label: "Scheduling owner unknown.", source: "provider_signal" },
      ],
      status: "scheduled",
    });
    const targets = (body.observation_validation_targets ?? []) as Array<Record<string, unknown>>;
    expect(targets.length).toBeGreaterThanOrEqual(3);
    expect(targets.some((t) => t.label === "Validate workflow fit" && t.source === "chip")).toBe(true);
    expect(
      targets.some((t) => t.label === "Scheduling owner unknown." && t.source === "provider_signal"),
    ).toBe(true);
    expect(
      targets.some((t) => t.label === "Assess preference card variability" && t.source === "manual"),
    ).toBe(true);
  });

  it("blocks product support save without a provider", () => {
    const result = validateNewCaseSubmit({
      ...validObservationBase(),
      caseType: "product_support",
      surgeonId: "",
      needsProducts: true,
      productId,
      skuId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/select a provider/i);
    }
  });

  it("blocks product support save without product and SKU", () => {
    const result = validateNewCaseSubmit({
      ...validObservationBase(),
      caseType: "product_support",
      needsProducts: true,
      productId: "",
      skuId: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/select a product family/i);
    }
  });

  it("blocks product support save without SKU when product is set", () => {
    const result = validateNewCaseSubmit({
      ...validObservationBase(),
      caseType: "product_support",
      needsProducts: true,
      productId,
      skuId: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/select a sku/i);
    }
  });
});

describe("buildNewCaseCreatePayload", () => {
  it("omits engagement_id when not engagement-locked", () => {
    const body = buildNewCaseCreatePayload({
      caseType: "observation",
      engagementLocked: false,
      lockedEngagementId: "",
      accountId,
      surgeonId,
      caseDate: "2026-05-27",
      caseTime: "",
      procedureType: "Hernia",
      needsProducts: false,
      productId: "",
      skuId: "",
      expectedQty: "1",
      expectedRevenue: "",
      extraLines: [],
      notes: "",
      followUpNeeded: false,
      relatedOpportunityId: "",
      observationObjectives: {
        observation_goal: "",
        observation_key_questions: "",
        observation_signals_to_validate: "",
      },
      observationAccess,
      status: "scheduled",
    });
    expect(body.engagement_id).toBeUndefined();
    expect(body.product_id).toBeNull();
  });

  it("includes engagement_id only when engagement-locked", () => {
    const engagementId = randomUUID();
    const body = buildNewCaseCreatePayload({
      caseType: "observation",
      engagementLocked: true,
      lockedEngagementId: engagementId,
      accountId,
      surgeonId,
      caseDate: "2026-05-27",
      caseTime: "",
      procedureType: "",
      needsProducts: false,
      productId: "",
      skuId: "",
      expectedQty: "1",
      expectedRevenue: "",
      extraLines: [],
      notes: "",
      followUpNeeded: false,
      relatedOpportunityId: "",
      observationObjectives: {
        observation_goal: "",
        observation_key_questions: "",
        observation_signals_to_validate: "",
      },
      observationAccess,
      status: "scheduled",
    });
    expect(body.engagement_id).toBe(engagementId);
  });
});

describe("opportunity copy guards", () => {
  it("detects opportunity wording in rep-facing copy", () => {
    expect(containsOpportunityWording("Related opportunity")).toBe(true);
    expect(containsOpportunityWording("Linked provider")).toBe(false);
  });
});

describe("intelligence label guards", () => {
  it("detects long snake_case machine labels", () => {
    expect(containsRawIntelligenceLabel("interest_in_acsis_discussed")).toBe(true);
    expect(containsRawIntelligenceLabel("ACSIS interest was discussed")).toBe(false);
  });
});
