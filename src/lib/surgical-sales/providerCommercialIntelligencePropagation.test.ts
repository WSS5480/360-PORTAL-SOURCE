import { describe, expect, it } from "vitest";
import { applyAcceptedCommercialIntelligenceToContactPatch } from "@/lib/surgical-sales/applyCommercialIntelligenceToContactPatch";
import { buildProviderFieldIntelligenceModel } from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import { parseProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";

function saveAcceptedIntelligence(input: {
  fieldPatches: Array<{ dbKey: string; value: string }>;
  atomicFacts?: DebriefAtomicFact[];
}) {
  const contact = applyAcceptedCommercialIntelligenceToContactPatch(
    { id: "provider-test" },
    {
      existingContact: {},
      fieldPatches: input.fieldPatches,
      logUpdate: input.atomicFacts ? { atomicFacts: input.atomicFacts, fieldUpdates: [], sourceText: "", suggestedUpdates: [], intelligenceReview: { stillWorthConfirming: [], relatedAreas: [] }, stillMissing: [], saveAsNoteAccepted: false, usesProviderIntelligence: true } : undefined,
    },
  );
  return contact as Record<string, unknown>;
}

describe("provider commercial intelligence propagation to Provider Intelligence", () => {
  it("populates observation intelligence after accepted save", () => {
    const contact = saveAcceptedIntelligence({
      fieldPatches: [
        {
          dbKey: "provider_observation_feasibility",
          value: "Observation interest: Yes. Observation approval: No.",
        },
        {
          dbKey: "provider_observation_access_path",
          value: "Access path identified: Partial. Blocker: Credentialing",
        },
      ],
    });

    const intel = parseProviderCommercialIntelligence(contact);
    expect(intel?.observation.interest).toBe("yes");
    expect(intel?.observation.approval_status).toBe("not_approved");
    expect(intel?.observation.access_status).toBe("partial");

    const model = buildProviderFieldIntelligenceModel({ contact });
    expect(model.observationApproval.primaryLine).toBe("Permission Requested");
    expect(model.observationApproval.secondaryLine).toMatch(/permission requested/i);
    expect(model.observationApproval.captureState).not.toBe("empty");
    expect(model.observationApproval.isConfirmed).toBe(false);
  });

  it("populates clinical intelligence domains after accepted save", () => {
    const contact = saveAcceptedIntelligence({
      fieldPatches: [
        {
          dbKey: "provider_procedure_focus",
          value: "Complex abdominal wall reconstruction · Procedure focus area",
        },
        { dbKey: "provider_clinical_frustrations", value: "Fixation consistency concerns" },
        { dbKey: "provider_technique_preferences", value: "Robotic-first for ventral cases" },
      ],
    });

    const intel = parseProviderCommercialIntelligence(contact);
    expect(intel?.clinical.procedure_focus.length).toBeGreaterThan(0);
    expect(
      intel?.clinical.entries.some(
        (entry) =>
          entry.category === "clinical_frustration" &&
          entry.display_label === "Fixation" &&
          /fixation/i.test(entry.source_text),
      ) ||
        intel?.clinical.clinical_frustrations.some((value) => /fixation/i.test(value)),
    ).toBe(true);
    expect(
      intel?.clinical.entries.some(
        (entry) =>
          entry.category === "clinical_preference" &&
          /robotic/i.test(entry.display_label) &&
          /ventral/i.test(entry.source_text),
      ) ||
        intel?.clinical.clinical_preferences.some((value) => /robotic/i.test(value)),
    ).toBe(true);

    const model = buildProviderFieldIntelligenceModel({ contact });
    expect(model.clinical.procedures.length).toBeGreaterThan(0);
    expect(model.clinical.frustrations.some((value) => /fixation/i.test(value))).toBe(true);
    expect(model.clinical.preferences.some((value) => /robotic/i.test(value))).toBe(true);
    expect(model.procedureInterests.captureState).toBe("referenced");
    expect(model.procedureInterests.isConfirmed).toBe(false);
  });

  it("populates product interest intelligence without treating it as current usage", () => {
    const contact = saveAcceptedIntelligence({
      fieldPatches: [
        {
          dbKey: "provider_product_interests",
          value: "ACSIS interest: curved design and assistant learning curve",
        },
      ],
    });

    const intel = parseProviderCommercialIntelligence(contact);
    expect(intel?.clinical.product_interests).toContain(
      "ACSIS interest: curved design and assistant learning curve",
    );
    expect(
      intel?.clinical.entries.some(
        (entry) =>
          entry.category === "product_opportunity" &&
          /ACSIS interest/i.test(entry.display_label),
      ),
    ).toBe(true);

    const model = buildProviderFieldIntelligenceModel({ contact });
    expect(model.procedureInterests.primaryLine).toMatch(/Product interest: ACSIS/i);
    expect(
      model.stillLearning.some((item) => /Product interest: ACSIS interest/i.test(item.text)),
    ).toBe(true);
    expect(model.procedureInterests.primaryLine).not.toMatch(/Current product identified/i);
  });

  it("populates scheduling and credentialing intelligence after accepted save", () => {
    const contact = saveAcceptedIntelligence({
      fieldPatches: [
        {
          dbKey: "provider_scheduling_contact",
          value: "Office coordinator handles OR scheduling",
        },
        { dbKey: "provider_observation_credentialing_needed", value: "required" },
        { dbKey: "provider_credentialing_platform_name", value: "Platform unknown" },
      ],
    });

    const intel = parseProviderCommercialIntelligence(contact);
    expect(intel?.scheduling.scheduler_identified).toBe("partial");
    expect(intel?.scheduling.scheduler_contact_linked).toBe("no");
    expect(intel?.credentialing.credentialing_required).toBe("yes");
    expect(intel?.credentialing.credentialing_platform_known).toBe("no");

    const model = buildProviderFieldIntelligenceModel({ contact });
    expect(model.scheduler.captureState).toBe("referenced");
    expect(model.scheduler.isConfirmed).toBe(false);
    expect(model.scheduler.primaryLine).toMatch(/Referenced/i);
    expect(model.credentialing.primaryLine).toBe("Credentialing Required");
    expect(model.credentialing.secondaryLine).toMatch(/Platform Unknown/i);
  });

  it("does not propagate intelligence from unaccepted field categories", () => {
    const contact = saveAcceptedIntelligence({
      fieldPatches: [{ dbKey: "provider_observation_feasibility", value: "interested" }],
      atomicFacts: [
        {
          fact_type: "clinical_focus",
          entity: "",
          attribute: "clinical_frustration",
          value: "Unaccepted clinical frustration",
          confidence: "high",
          evidence: "This frustration was not accepted in review.",
        },
      ],
    });

    const intel = parseProviderCommercialIntelligence(contact);
    expect(intel?.clinical.clinical_frustrations).not.toContain("Unaccepted clinical frustration");

    const model = buildProviderFieldIntelligenceModel({ contact });
    expect(model.clinical.frustrations).not.toContain("Unaccepted clinical frustration");
  });

  it("includes accepted atomic facts in matching intelligence category", () => {
    const contact = saveAcceptedIntelligence({
      fieldPatches: [{ dbKey: "provider_clinical_frustrations", value: "Existing frustration" }],
      atomicFacts: [
        {
          fact_type: "clinical_focus",
          entity: "",
          attribute: "clinical_frustration",
          value: "Visualization during larger cases",
          confidence: "high",
          evidence: "Visualization challenges during larger cases were discussed.",
        },
      ],
    });

    const intel = parseProviderCommercialIntelligence(contact);
    expect(intel?.clinical.clinical_frustrations.length).toBeGreaterThan(1);

    const model = buildProviderFieldIntelligenceModel({ contact });
    expect(model.clinical.frustrations.length).toBeGreaterThan(1);
    expect(model.stillLearning.some((item) => /visualization/i.test(item.text))).toBe(true);
  });
});
