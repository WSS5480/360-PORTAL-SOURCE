import { describe, expect, it } from "vitest";
import { buildProviderCommercialIntelligenceFromDebrief } from "@/lib/surgical-sales/buildProviderCommercialIntelligenceFromDebrief";
import { applyCommercialIntelligenceToContactPatch } from "@/lib/surgical-sales/applyCommercialIntelligenceToContactPatch";
import {
  emptyProviderCommercialIntelligence,
  mergeProviderCommercialIntelligence,
  parseProviderCommercialIntelligence,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import { observationReadinessCoreFromCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceReadBridge";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";

function atomicFact(partial: Partial<DebriefAtomicFact> & Pick<DebriefAtomicFact, "fact_type" | "attribute" | "value" | "evidence">): DebriefAtomicFact {
  return {
    entity: "",
    confidence: "high",
    ...partial,
  };
}

describe("buildProviderCommercialIntelligenceFromDebrief", () => {
  it("maps observation_access facts to observation intelligence", () => {
    const intel = buildProviderCommercialIntelligenceFromDebrief({
      atomicFacts: [
        atomicFact({
          fact_type: "observation_access",
          attribute: "approval_status",
          value: "Provider open to observation but approval not secured",
          evidence: "Provider was not opposed to observation visits.",
        }),
      ],
    });

    expect(intel.observation.interest).toBe("yes");
    expect(intel.observation.approval_status).toBe("interested");
    expect(intel.observation.readiness).toBe("conditional");
  });

  it("maps scheduling facts to scheduling intelligence without named contact rules", () => {
    const intel = buildProviderCommercialIntelligenceFromDebrief({
      atomicFacts: [
        atomicFact({
          fact_type: "scheduling",
          entity: "Office coordinator",
          attribute: "role",
          value: "Handles OR scheduling",
          evidence: "Scheduling goes through the office coordinator.",
        }),
      ],
    });

    expect(intel.scheduling.scheduler_identified).toBe("partial");
    expect(intel.scheduling.scheduler_contact_linked).toBe("no");
    expect(intel.support_contacts).toHaveLength(1);
    expect(intel.support_contacts[0]?.contact_role).toBe("scheduling");
  });

  it("routes clinical_focus facts into clinical intelligence buckets by signal", () => {
    const intel = buildProviderCommercialIntelligenceFromDebrief({
      atomicFacts: [
        atomicFact({
          fact_type: "clinical_focus",
          attribute: "clinical_frustration",
          value: "Visualization during larger robotic cases",
          evidence: "Mentioned visualization challenges during larger robotic cases.",
        }),
        atomicFact({
          fact_type: "clinical_focus",
          attribute: "procedure_focus",
          value: "Complex abdominal wall reconstruction",
          evidence: "Discussed complex abdominal wall reconstruction volume.",
        }),
      ],
    });

    expect(intel.clinical.clinical_frustrations.length).toBeGreaterThan(0);
    expect(intel.clinical.procedure_focus.length).toBeGreaterThan(0);
    expect(intel.clinical.entries.length).toBeGreaterThan(0);
    expect(intel.clinical.entries[0]?.source_text).toBeTruthy();
    expect(intel.clinical.entries[0]?.display_label).toBeTruthy();
    expect(intel.clinical.clinical_frustrations[0]).not.toMatch(/was mentioned/i);
  });

  it("stores structured clinical entries with category and source text for frustrations", () => {
    const intel = buildProviderCommercialIntelligenceFromDebrief({
      atomicFacts: [
        atomicFact({
          fact_type: "clinical_focus",
          attribute: "clinical_frustration",
          value: "Visualization during larger robotic cases",
          evidence: "Mentioned visualization challenges during larger robotic cases.",
        }),
        atomicFact({
          fact_type: "clinical_focus",
          attribute: "increasing_case_volume",
          value: "Abdominal wall reconstruction · Increasing case volume",
          evidence: "Higher volume of abdominal wall reconstruction cases than a year ago.",
        }),
      ],
    });

    const frustration = intel.clinical.entries.find((entry) => entry.category === "clinical_frustration");
    expect(frustration?.display_label).toBe("Visualization");
    expect(frustration?.source_text).toMatch(/visualization/i);

    const trend = intel.clinical.entries.find((entry) => entry.category === "clinical_trend");
    expect(trend?.display_label).toBe("Increasing Case Volume");
  });

  it("maps credentialing facts to credentialing intelligence", () => {
    const intel = buildProviderCommercialIntelligenceFromDebrief({
      atomicFacts: [
        atomicFact({
          fact_type: "credentialing",
          attribute: "requirement",
          value: "Vendor credentialing required before observation",
          evidence: "Credentialing is required through the vendor portal.",
        }),
      ],
    });

    expect(intel.credentialing.credentialing_required).toBe("yes");
    expect(intel.observation.credentialing_required).toBe("yes");
  });

  it("maps 'Credentialing is no longer required' to credentialing_required = no, not yes", () => {
    const intel = buildProviderCommercialIntelligenceFromDebrief({
      atomicFacts: [
        atomicFact({
          fact_type: "credentialing",
          attribute: "requirement",
          value: "Credentialing is no longer required",
          evidence: "Credentialing is no longer required",
        }),
      ],
    });

    expect(intel.credentialing.credentialing_required).toBe("no");
    expect(intel.observation.credentialing_required).toBe("no");
  });

  it("maps suspended observation access to not_approved even when 'previously approved' appears", () => {
    const intel = buildProviderCommercialIntelligenceFromDebrief({
      atomicFacts: [
        atomicFact({
          fact_type: "observation_access",
          attribute: "status",
          value: "previously approved",
          evidence:
            "Observation was previously approved, but access is temporarily suspended pending policy review.",
        }),
      ],
    });

    expect(intel.observation.approval_status).toBe("not_approved");
    expect(intel.observation.interest).not.toBe("yes");
  });

  it("maps 'cannot attend cases' to not_approved", () => {
    const intel = buildProviderCommercialIntelligenceFromDebrief({
      atomicFacts: [
        atomicFact({
          fact_type: "observation_access",
          attribute: "status",
          value: "cannot attend cases",
          evidence: "They said we cannot attend cases at this facility right now.",
        }),
      ],
    });

    expect(intel.observation.approval_status).toBe("not_approved");
  });

  it("maps a credentialing reversal note to credentialing_required = no even when 'required' appears", () => {
    const intel = buildProviderCommercialIntelligenceFromDebrief({
      atomicFacts: [
        atomicFact({
          fact_type: "credentialing",
          attribute: "requirement",
          value: "credentialing is no longer required",
          evidence:
            "Today Dr. Onion clarified credentialing is no longer required and we can attend cases immediately.",
        }),
      ],
    });

    expect(intel.credentialing.credentialing_required).toBe("no");
  });

  it("maps field patches by generic db key category", () => {
    const intel = buildProviderCommercialIntelligenceFromDebrief({
      fieldPatches: [
        { dbKey: "provider_observation_feasibility", value: "interested" },
        { dbKey: "provider_clinical_frustrations", value: "Fixation consistency concerns" },
        { dbKey: "provider_observation_scheduling_control", value: "provider_office" },
      ],
    });

    expect(intel.observation.approval_status).toBe("interested");
    expect(intel.clinical.clinical_frustrations.length).toBeGreaterThan(0);
    expect(
      intel.clinical.entries.some(
        (entry) =>
          entry.category === "clinical_frustration" &&
          /fixation/i.test(`${entry.display_label} ${entry.source_text}`),
      ) ||
        intel.clinical.clinical_frustrations.some((value) => /fixation/i.test(value)),
    ).toBe(true);
    expect(intel.scheduling.scheduling_workflow_known).toBe("yes");
  });
});

describe("mergeProviderCommercialIntelligence", () => {
  it("merges tri-states and appends clinical arrays without overwriting", () => {
    const existing = emptyProviderCommercialIntelligence();
    existing.observation.interest = "unknown";
    existing.clinical.procedure_focus = ["Existing procedure signal"];

    const incoming = buildProviderCommercialIntelligenceFromDebrief({
      fieldPatches: [{ dbKey: "provider_observation_feasibility", value: "interested" }],
      atomicFacts: [
        atomicFact({
          fact_type: "clinical_focus",
          attribute: "procedure_focus",
          value: "New procedure adoption discussed",
          evidence: "Rep noted increasing adoption of a new procedure category.",
        }),
      ],
    });

    const merged = mergeProviderCommercialIntelligence(existing, incoming);
    expect(merged.observation.interest).toBe("yes");
    expect(merged.clinical.procedure_focus.length).toBe(2);
  });
});

describe("applyCommercialIntelligenceToContactPatch", () => {
  it("persists structured object on contact patch", () => {
    const patch = applyCommercialIntelligenceToContactPatch(
      { id: "provider-1" },
      {
        existingContact: {},
        fieldPatches: [{ dbKey: "provider_observation_feasibility", value: "interested" }],
      },
    );

    const parsed = parseProviderCommercialIntelligence(patch);
    expect(parsed?.observation.approval_status).toBe("interested");
    expect(parsed?.version).toBe(1);
  });
});

describe("providerCommercialIntelligenceReadBridge", () => {
  it("derives observation readiness core from structured intelligence", () => {
    const intel = buildProviderCommercialIntelligenceFromDebrief({
      fieldPatches: [
        { dbKey: "provider_observation_feasibility", value: "interested" },
        { dbKey: "provider_observation_credentialing_needed", value: "required" },
      ],
    });

    const core = observationReadinessCoreFromCommercialIntelligence(intel);
    expect(core.providerInterest).toBe("yes");
    expect(core.observationApproved).toBe("no");
    expect(core.credentialingRequired).toBe("yes");
  });
});
