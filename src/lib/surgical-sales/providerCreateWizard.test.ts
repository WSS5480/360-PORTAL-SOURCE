import { describe, expect, it } from "vitest";

import { mergeProviderWizardFieldsPatch } from "./providerCreateWizard";

describe("mergeProviderWizardFieldsPatch", () => {
  it("persists organization-scoped scheduling fields on the provider row", () => {
    const patch: Record<string, unknown> = {};

    mergeProviderWizardFieldsPatch(
      patch,
      {
        provider_observation_coordinator_contact: "Maria Lopez (Scheduler) maria@hospital.org",
      },
      {
        captureContext: { source_type: "profile", source_label: "Provider overview" },
        actor: { userId: "u1", userName: "Rep" },
        existingContact: {},
      },
    );

    expect(patch.provider_observation_coordinator_contact).toBe(
      "Maria Lopez (Scheduler) maria@hospital.org",
    );
    expect(patch.provider_intelligence_field_metadata).toBeTruthy();
  });

  it("persists provider product interests from capture intelligence", () => {
    const patch: Record<string, unknown> = {};

    mergeProviderWizardFieldsPatch(
      patch,
      {
        provider_product_interests: "ACSIS interest: curved design and suction setup compatibility",
      },
      {
        captureContext: { source_type: "ai_capture", source_label: "Intelligence review" },
        actor: { userId: "u1", userName: "Rep" },
        existingContact: {},
        fieldEvidence: {
          provider_product_interests:
            "Asked whether ACSIS works with their existing suction setup and was interested in the curved design.",
        },
      },
    );

    expect(patch.provider_product_interests).toBe(
      "ACSIS interest: curved design and suction setup compatibility",
    );
    expect(
      JSON.stringify(patch.provider_intelligence_field_metadata),
    ).toMatch(/curved design/i);
  });
});
