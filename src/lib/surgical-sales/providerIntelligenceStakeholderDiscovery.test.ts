import { describe, expect, it } from "vitest";
import { buildGuidedIntelCaptureQueue } from "@/lib/surgical-sales/providerGuidedIntelCapture";
import { buildProgressiveCaptureSteps } from "@/lib/surgical-sales/providerIntelligenceProgressiveCapture";
import {
  discoveryAudienceCategoryForField,
  discoveryCoachingPrompt,
  isIntelligenceFieldAppropriateForStakeholder,
  primaryStakeholderForIntelligenceField,
  resolveDiscoveryScopeForField,
  resolveIntelligenceDiscoveryStakeholder,
  stakeholderDiscoveryPrompt,
} from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";
import { discoveryCoachingPrompt as gapDiscoveryCoachingPrompt } from "@/lib/surgical-sales/providerIntelligenceGapVocabulary";

const EMPTY_CONTACT: Record<string, unknown> = {};

describe("providerIntelligenceStakeholderDiscovery", () => {
  it("resolves stakeholder from role and engagement type", () => {
    expect(
      resolveIntelligenceDiscoveryStakeholder({ roleType: "scheduler" }),
    ).toBe("scheduler_office");
    expect(
      resolveIntelligenceDiscoveryStakeholder({ roleType: "purchasing" }),
    ).toBe("administrative_procurement");
    expect(
      resolveIntelligenceDiscoveryStakeholder({
        roleType: "surgeon",
        engagementType: "observation_request",
      }),
    ).toBe("provider_surgeon");
    expect(
      resolveIntelligenceDiscoveryStakeholder({
        engagementType: "office_visit",
      }),
    ).toBe("scheduler_office");
  });

  it("uses surgeon-tailored prompts instead of credentialing logistics", () => {
    const prompt = stakeholderDiscoveryPrompt(
      "provider_workflow_pain_points",
      "provider_surgeon",
    );
    expect(prompt.prompt).toMatch(/workflow friction/i);
    expect(prompt.prompt).not.toMatch(/credentialing/i);
  });

  it("uses scheduler-tailored observation prompts", () => {
    const prompt = stakeholderDiscoveryPrompt(
      "provider_observation_coordinator_contact",
      "scheduler_office",
    );
    expect(prompt.prompt).toMatch(/coordinates observation scheduling/i);
    expect(primaryStakeholderForIntelligenceField("provider_observation_access_path")).toBe(
      "facility_or_access",
    );
  });

  it("includes cross-stakeholder gaps in the All guided queue", () => {
    const contact = { provider_observation_feasibility: "easy" };
    const allQueue = buildGuidedIntelCaptureQueue(contact, {
      discoveryStakeholder: "unspecified",
    });
    const surgeonQueue = buildGuidedIntelCaptureQueue(contact, {
      discoveryStakeholder: "provider_surgeon",
    });
    const schedulerQueue = buildGuidedIntelCaptureQueue(contact, {
      discoveryStakeholder: "scheduler_office",
    });
    const allKeys = new Set(allQueue.map((q) => q.dbKey));
    const surgeonKeys = new Set(surgeonQueue.map((q) => q.dbKey));
    const schedulerKeys = new Set(schedulerQueue.map((q) => q.dbKey));
    expect(allKeys.has("provider_procedure_focus")).toBe(true);
    const facilityQueue = buildGuidedIntelCaptureQueue(contact, {
      discoveryStakeholder: "facility_or_access",
    });
    const facilityKeys = new Set(facilityQueue.map((q) => q.dbKey));
    expect(facilityKeys.has("provider_observation_access_path")).toBe(true);
    expect(facilityKeys.has("provider_procedure_focus")).toBe(false);
    expect(surgeonKeys.has("provider_observation_access_path")).toBe(false);
    expect(allKeys.has("provider_observation_access_path")).toBe(true);
    expect(allQueue.length).toBeGreaterThan(surgeonQueue.length);
  });

  it("excludes scheduler-only fields from surgeon guided queue", () => {
    const surgeonQueue = buildGuidedIntelCaptureQueue(EMPTY_CONTACT, {
      discoveryStakeholder: "provider_surgeon",
    });
    const surgeonKeys = new Set(surgeonQueue.map((q) => q.dbKey));
    expect(surgeonKeys.has("provider_observation_credentialing_needed")).toBe(false);
    expect(surgeonKeys.has("provider_observation_coordinator_contact")).toBe(false);
    expect(surgeonKeys.has("provider_credentialing_status")).toBe(false);
    expect(surgeonKeys.has("provider_observation_access_path")).toBe(false);
    expect(surgeonKeys.has("provider_observation_feasibility")).toBe(true);
    expect(surgeonKeys.has("provider_competitive_products")).toBe(false);
    expect(surgeonKeys.has("provider_dissatisfaction_areas")).toBe(false);

    const schedulerQueue = buildGuidedIntelCaptureQueue(
      { provider_observation_feasibility: "easy" },
      { discoveryStakeholder: "scheduler_office" },
    );
    const schedulerKeys = new Set(schedulerQueue.map((q) => q.dbKey));
    expect(schedulerKeys.has("provider_observation_access_path")).toBe(true);
    expect(schedulerKeys.has("provider_procedure_focus")).toBe(false);
  });

  it("filters progressive capture steps by stakeholder", () => {
    const surgeonSteps = buildProgressiveCaptureSteps("observation_readiness", EMPTY_CONTACT, {
      discoveryStakeholder: "provider_surgeon",
    });
    expect(surgeonSteps.map((s) => s.dbKey)).not.toContain("provider_observation_access_path");

    const schedulerSteps = buildProgressiveCaptureSteps(
      "observation_readiness",
      { provider_observation_feasibility: "easy" },
      { discoveryStakeholder: "scheduler_office" },
    );
    expect(schedulerSteps.map((s) => s.dbKey)).toContain("provider_observation_access_path");
    expect(schedulerSteps.map((s) => s.dbKey)).not.toContain("provider_ideal_observation_cases");
  });

  it("labels All-mode questions by audience category", () => {
    const allQueue = buildGuidedIntelCaptureQueue(EMPTY_CONTACT, {
      discoveryStakeholder: "unspecified",
    });
    const procedure = allQueue.find((q) => q.dbKey === "provider_procedure_focus");
    expect(procedure?.audienceCategory).toBe("Provider");
    expect(discoveryAudienceCategoryForField("provider_credentialing_status")).toBe("Facility");
    expect(discoveryAudienceCategoryForField("provider_decision_maker_status")).toBe("Admin");
    expect(
      allQueue.every((q) =>
        ["Provider", "Facility", "Office", "Admin", "General"].includes(q.audienceCategory),
      ),
    ).toBe(true);
  });

  it("prioritizes surgeon-clinical questions ahead of logistics in All mode", () => {
    const allQueue = buildGuidedIntelCaptureQueue(EMPTY_CONTACT, {
      discoveryStakeholder: "unspecified",
    });
    const firstSchedulerOnly = allQueue.findIndex((q) =>
      ["provider_observation_access_path", "provider_observation_credentialing_needed"].includes(
        q.dbKey,
      ),
    );
    const firstSurgeonClinical = allQueue.findIndex((q) =>
      ["provider_workflow_pain_points", "provider_procedure_focus"].includes(q.dbKey),
    );
    expect(firstSurgeonClinical).toBeGreaterThanOrEqual(0);
    if (firstSchedulerOnly >= 0) {
      expect(firstSurgeonClinical).toBeLessThan(firstSchedulerOnly);
    }
  });

  it("routes coaching prompts through stakeholder overrides", () => {
    expect(
      gapDiscoveryCoachingPrompt("provider_workflow_pain_points", undefined, "provider_surgeon"),
    ).toMatch(/workflow friction/i);
    expect(
      discoveryCoachingPrompt("provider_observation_coordinator_contact", "scheduler_office"),
    ).toMatch(/coordinates vendor observation/i);
    expect(
      isIntelligenceFieldAppropriateForStakeholder(
        "provider_credentialing_status",
        "provider_surgeon",
      ),
    ).toBe(false);
  });

  it("defaults proposed scope by Rapid Discovery audience lane", () => {
    expect(resolveDiscoveryScopeForField("provider_observation_access_path", "facility_or_access").scope).toBe(
      "organization",
    );
    expect(resolveDiscoveryScopeForField("provider_procedure_focus", "provider_surgeon").scope).toBe(
      "provider",
    );
    expect(
      resolveDiscoveryScopeForField("provider_observation_coordinator_contact", "scheduler_office").scope,
    ).toBe("organization");
  });
});
