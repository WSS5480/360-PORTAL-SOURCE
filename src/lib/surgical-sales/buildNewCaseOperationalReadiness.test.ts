import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildNewCaseOperationalReadiness } from "@/lib/surgical-sales/buildNewCaseOperationalReadiness";

const accountId = randomUUID();
const surgeonId = randomUUID();
const productId = randomUUID();
const skuId = randomUUID();

function baseInput(
  overrides: Partial<Parameters<typeof buildNewCaseOperationalReadiness>[0]> = {},
) {
  return {
    caseType: "observation" as const,
    surgeonId,
    accountId,
    relatedOpportunityId: "",
    caseDate: "2026-05-27",
    caseTime: "",
    procedureType: "",
    needsProducts: false,
    productId: "",
    skuId: "",
    expectedQty: "1",
    expectedRevenue: "",
    extraLines: [],
    productName: null,
    skuLabel: null,
    draftCaseId: null,
    providerContact: null,
    observationSchedulingOwner: "",
    observationAccessPathway: "",
    observationCredentialingRequirement: "unknown" as const,
    observationProductExpanded: false,
    observationObjectives: {
      observation_goal: "",
      observation_key_questions: "",
      observation_signals_to_validate: "",
    },
    supportSetupProcedure: "",
    supportObjective: "",
    supportRepRole: "",
    supportRequiredMaterials: "",
    followUpNeeded: false,
    todayYmd: "2026-05-27",
    ...overrides,
  };
}

function sectionLines(
  view: ReturnType<typeof buildNewCaseOperationalReadiness>,
  key: string,
): string[] {
  return view.sections.find((s) => s.key === key)?.lines.map((l) => l.text) ?? [];
}

describe("buildNewCaseOperationalReadiness", () => {
  it("builds compact mission control for observation", () => {
    const view = buildNewCaseOperationalReadiness(baseInput({ procedureType: "General" }));

    expect(view.missionControl.primaryStateLabel).toBe("Operational picture developing");
    expect(view.missionControl.nextStep).toBe("Add observation objective.");
    expect(view.missionControl.resolvePhaseIndex).toBe(2);
    expect(view.missionControl.progress).toEqual([
      { key: "mission_setup", label: "Mission setup", complete: true, statusLabel: "Settled" },
      { key: "access_readiness", label: "Access reference (optional)", complete: false, statusLabel: "Optional" },
      { key: "observation_goals", label: "Observation goals", complete: false, statusLabel: "Still developing" },
    ]);
    expect(view.missionControl.secondary.productInterest).toBe("Product interest optional");
    expect(view.missionControl.secondary.linkedInitiative).toBe("No related opportunity");
  });

  it("groups observation readiness into tactical sections", () => {
    const view = buildNewCaseOperationalReadiness(baseInput());

    expect(view.sections.map((s) => s.title)).toEqual(
      expect.arrayContaining(["Operational posture", "Ready", "Field planning", "Access reference (optional)"]),
    );
    expect(sectionLines(view, "primary_state")).toEqual(
      expect.arrayContaining(["Baseline captured — field plan still evolving"]),
    );
    expect(sectionLines(view, "ready")).toEqual(
      expect.arrayContaining([
        "Provider selected",
        "Facility selected",
        "Date selected · 2026-05-27",
        "Ready to save draft observation case.",
      ]),
    );
    expect(sectionLines(view, "missing_intelligence")).toEqual(["Observation objectives not captured yet"]);
    expect(sectionLines(view, "access_risks")).toEqual(
      expect.arrayContaining([
        "Scheduling owner — optional reference",
        "Access pathway — optional reference",
        "Credentialing — optional reference",
        "Product interest optional",
      ]),
    );
    expect(view.saveCta).toEqual({
      mode: "draft",
      label: "Save draft observation case",
      helperText: "Field planning can continue after save.",
      disabled: false,
    });
  });

  it("shows product focus in access risks when set", () => {
    const view = buildNewCaseOperationalReadiness(
      baseInput({
        observationProductExpanded: true,
        productId,
        skuId,
        productName: "ACSIS",
        skuLabel: "SKU-100",
      }),
    );
    expect(sectionLines(view, "access_risks")).toContain("Product interest: ACSIS · SKU-100");
  });

  it("mirrors save blockers when provider is missing", () => {
    const view = buildNewCaseOperationalReadiness(
      baseInput({
        surgeonId: "",
      }),
    );
    expect(view.nextAction).toBe("Select a provider for this observation case.");
    expect(view.nextActionTone).toBe("critical");
    expect(sectionLines(view, "missing_required")).toContain("Select a provider for this observation case.");
  });

  it("recommends ready when observation save prerequisites are met", () => {
    const view = buildNewCaseOperationalReadiness(
      baseInput({
        providerContact: {
          provider_observation_scheduling_control: "provider_office",
          provider_observation_access_path: "OR coordinator",
          provider_credentialing_status: "cleared",
          provider_observation_credentialing_needed: "not_required",
        },
        observationObjectives: {
          observation_goal: "Validate workflow fit",
          observation_key_questions: "Who schedules cases?",
          observation_signals_to_validate: "",
        },
      }),
    );
    expect(sectionLines(view, "primary_state")).toContain("Field picture supports observation execution.");
    expect(view.nextAction).toBe("Save observation case.");
    expect(view.nextActionTone).toBe("ready");
    expect(view.saveCta).toEqual({
      mode: "scheduled",
      label: "Save observation case",
      helperText: "Field picture supports observation execution.",
      disabled: false,
    });
  });

  it("prioritizes observation objectives as next action for draft-ready incomplete planning", () => {
    const view = buildNewCaseOperationalReadiness(baseInput());
    expect(sectionLines(view, "primary_state")).toEqual(
      expect.arrayContaining(["Baseline captured — field plan still evolving"]),
    );
    expect(view.nextAction).toBe("Add observation objective.");
    expect(view.nextActionTone).toBe("caution");
  });

  it("builds product support mission control progress", () => {
    const view = buildNewCaseOperationalReadiness(
      baseInput({
        caseType: "product_support",
        needsProducts: true,
        caseDate: "2026-05-27",
        procedureType: "Lap chole",
        productId,
        skuId,
        productName: "ACSIS",
        supportObjective: "Tray support",
        supportRepRole: "Rep in room",
        supportRequiredMaterials: "Hernia set",
        supportSetupProcedure: "Lap chole",
      }),
    );

    expect(view.missionControl.progress).toEqual([
      { key: "support_setup", label: "Support setup", complete: true, statusLabel: "Settled" },
      { key: "product_inventory", label: "Product & inventory", complete: true, statusLabel: "Settled" },
      { key: "support_plan", label: "Case support plan", complete: true, statusLabel: "Settled" },
    ]);
    expect(view.missionControl.secondary.productInterest).toMatch(/SKU line|Product line/);
  });

  it("groups product support readiness into tactical sections", () => {
    const view = buildNewCaseOperationalReadiness(
      baseInput({
        caseType: "product_support",
        needsProducts: true,
        productId: "",
        skuId: "",
        caseDate: "",
      }),
    );

    expect(view.sections.map((s) => s.title)).toEqual(
      expect.arrayContaining(["Ready", "Before save", "Support risks"]),
    );
    expect(sectionLines(view, "missing_required")).toEqual(
      expect.arrayContaining(["Select a product family for this support case.", "Set a case date."]),
    );
    expect(view.nextAction).toBe("Set a case date.");
    expect(view.nextActionTone).toBe("critical");
    expect(view.saveCta.disabled).toBe(true);
  });

  it("maps CTA text to centralized readiness states", () => {
    const missingRequiredObservation = buildNewCaseOperationalReadiness(
      baseInput({ surgeonId: "" }),
    );
    expect(missingRequiredObservation.caseReadiness.readinessLevel).toBe("missing_required");
    expect(missingRequiredObservation.saveCta).toEqual({
      mode: "scheduled",
      label: "Save observation case",
      helperText: "Select a provider for this observation case.",
      disabled: true,
    });

    const planningIncompleteObservation = buildNewCaseOperationalReadiness(baseInput());
    expect(["draft_ready", "planning_incomplete"]).toContain(
      planningIncompleteObservation.caseReadiness.readinessLevel,
    );
    expect(planningIncompleteObservation.saveCta).toEqual({
      mode: "draft",
      label: "Save draft observation case",
      helperText: "Field planning can continue after save.",
      disabled: false,
    });

    const executionReadyObservation = buildNewCaseOperationalReadiness(
      baseInput({
        observationSchedulingOwner: "OR scheduler",
        observationAccessPathway: "OR scheduler required",
        observationCredentialingRequirement: "verified",
        observationObjectives: {
          observation_goal: "Validate workflow fit",
          observation_key_questions: "",
          observation_signals_to_validate: "",
        },
      }),
    );
    expect(executionReadyObservation.caseReadiness.readinessLevel).toBe("execution_ready");
    expect(executionReadyObservation.saveCta).toEqual({
      mode: "scheduled",
      label: "Save observation case",
      helperText: "Field picture supports observation execution.",
      disabled: false,
    });
  });

  it("shows draft in access risks for observation", () => {
    const view = buildNewCaseOperationalReadiness(
      baseInput({ draftCaseId: randomUUID() }),
    );
    expect(sectionLines(view, "access_risks")).toContain("Case saved as draft");
  });

  it("saves execution-ready observation with a past date as completed", () => {
    const view = buildNewCaseOperationalReadiness(
      baseInput({
        caseDate: "2026-08-17",
        todayYmd: "2026-08-18",
        observationObjectives: {
          observation_goal: "Validate workflow fit",
          observation_key_questions: "",
          observation_signals_to_validate: "",
        },
        observationSchedulingOwner: "OR scheduler",
        observationAccessPathway: "OR scheduler required",
        observationCredentialingRequirement: "verified",
      }),
    );
    expect(view.saveCta).toEqual({
      mode: "completed",
      label: "Save completed observation",
      helperText: "This date is in the past — the case will be saved as completed.",
      disabled: false,
    });
  });

  it("saves ready product support with a past date as completed", () => {
    const view = buildNewCaseOperationalReadiness(
      baseInput({
        caseType: "product_support",
        needsProducts: true,
        caseDate: "2026-08-17",
        todayYmd: "2026-08-18",
        procedureType: "Lap chole",
        productId,
        skuId,
        productName: "ACSIS",
        supportObjective: "Tray support",
        supportRepRole: "Rep in room",
        supportRequiredMaterials: "Hernia set",
        supportSetupProcedure: "Lap chole",
      }),
    );
    expect(view.saveCta.mode).toBe("completed");
    expect(view.saveCta.label).toBe("Save completed case");
  });
});
