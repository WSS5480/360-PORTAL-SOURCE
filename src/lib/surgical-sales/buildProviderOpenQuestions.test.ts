import { describe, expect, it } from "vitest";
import {
  buildImmediateActionOpenQuestions,
  buildProviderOpenQuestions,
} from "./buildProviderOpenQuestions";
import { buildProviderFieldIntelligenceModel } from "./providerFieldIntelligenceModel";
import { buildSchedulingSupportContactCommercialIntelligencePatch } from "./rapidDiscoverySupportContact";
import { PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY } from "./providerCommercialIntelligenceModel";

describe("buildProviderOpenQuestions", () => {
  it("returns no questions on an empty discovery profile", () => {
    const model = buildProviderFieldIntelligenceModel({ contact: {} });
    expect(
      buildProviderOpenQuestions({
        contact: {},
        model,
      }),
    ).toEqual([]);
  });

  it("surfaces scheduling confirmation when a coordinator was referenced without contact info", () => {
    const contact = {
      provider_observation_feasibility: "interested",
      provider_observation_coordinator_contact: "Jennifer — contact info missing",
    };
    const model = buildProviderFieldIntelligenceModel({ contact });
    const questions = buildProviderOpenQuestions({ contact, model });

    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThanOrEqual(3);
    expect(questions.some((q) => /scheduling contact/i.test(q.text))).toBe(true);
    expect(questions.every((q) => !/evaluation/i.test(q.text))).toBe(true);
  });

  it("surfaces credentialing platform when notes explicitly say it is unknown", () => {
    const contact = {
      provider_observation_feasibility: "yes",
      provider_observation_credentialing_needed: "required",
      provider_credentialing_status:
        "They use credentialing but I don't know which platform.",
    };
    const model = buildProviderFieldIntelligenceModel({ contact });
    const questions = buildProviderOpenQuestions({ contact, model });

    expect(questions.some((q) => /credentialing path needs confirmation/i.test(q.text))).toBe(true);
  });

  it("surfaces intelligence gaps when observation is approved but logistics remain open", () => {
    const questions = buildImmediateActionOpenQuestions({
      provider_observation_feasibility: "yes",
      provider_observation_coordinator_contact: "Karen — contact info missing",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          lifecycle_state: "validated",
          validated_at: "2026-06-01T00:00:00Z",
        },
      },
    });

    expect(questions.some((q) => /first observation not scheduled/i.test(q.text))).toBe(true);
    expect(questions.some((q) => /Karen contact information unknown/i.test(q.text))).toBe(true);
    expect(questions.some((q) => /which case/i.test(q.text))).toBe(false);
    expect(questions.some((q) => /which date/i.test(q.text))).toBe(false);
  });

  it("assigns a unique non-empty id to every open question", () => {
    const contact = {
      provider_observation_feasibility: "yes",
      provider_observation_coordinator_contact: "Jennifer — contact info missing",
      provider_observation_credentialing_needed: "required",
      provider_credentialing_status: "They use credentialing but I don't know which platform.",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          lifecycle_state: "validated",
          validated_at: "2026-06-01T00:00:00Z",
        },
      },
    };
    const model = buildProviderFieldIntelligenceModel({ contact });
    const questions = buildProviderOpenQuestions({ contact, model });
    const ids = questions.map((q) => q.id);

    expect(questions.length).toBeGreaterThan(0);
    expect(ids.every((id) => Boolean(id?.trim()))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not invent evaluation or procedure-mix questions without evidence", () => {
    const contact = {
      provider_observation_feasibility: "interested",
      provider_procedure_focus: "Robotic ventral hernia repair",
    };
    const model = buildProviderFieldIntelligenceModel({ contact });
    const joined = buildProviderOpenQuestions({ contact, model })
      .map((q) => q.text)
      .join(" ");

    expect(/evaluation/i.test(joined)).toBe(false);
    expect(/procedure mix/i.test(joined)).toBe(false);
    expect(/first[- ]case validation/i.test(joined)).toBe(false);
  });

  it("does not surface scheduler contact gap after Save & Link validates the field", () => {
    const contact = {
      provider_observation_feasibility: "yes",
      provider_observation_coordinator_contact: "Karen · Scheduler · Observation scheduling",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          lifecycle_state: "validated",
          validated_at: "2026-06-01T00:00:00Z",
        },
        provider_observation_coordinator_contact: {
          lifecycle_state: "validated",
          validated_at: "2026-06-02T00:00:00Z",
        },
      },
    };

    const questions = buildImmediateActionOpenQuestions(contact);
    expect(questions.some((q) => /contact information unknown/i.test(q.text))).toBe(false);
  });

  it("marks linked scheduler commercial intelligence as captured without phone or email", () => {
    const patch = buildSchedulingSupportContactCommercialIntelligencePatch(
      {},
      { provider_observation_coordinator_contact: "Karen · Scheduler · Observation scheduling" },
    );
    const intel = patch?.[PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY];
    expect(intel?.scheduling.scheduler_identified).toBe("yes");
    expect(intel?.scheduling.scheduler_contact_linked).toBe("yes");
  });

  it("shows only pathway execution gaps after observation approval is confirmed (Dr. Apple)", () => {
    const contact = {
      provider_observation_feasibility: "approved",
      provider_observation_access_path:
        "Observation interest: Yes. Observation approval: No. Access path identified: Partial.",
      provider_observation_credentialing_needed: "required",
      provider_credentialing_status: "Vendor credentialing required before OR access",
      provider_observation_coordinator_contact: "Karen — contact info missing",
      provider_competitive_products: "Bard Mesh — needs confirmation during observation",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          lifecycle_state: "validated",
          validated_at: "2026-06-01T00:00:00Z",
        },
        provider_competitive_products: {
          lifecycle_state: "captured",
          evidence_text:
            "He is currently using Bard Mesh in a lot of his hernia cases from what I understood, but I need to confirm that during observation.",
        },
      },
    };
    const model = buildProviderFieldIntelligenceModel({ contact });
    const questions = buildProviderOpenQuestions({ contact, model, maxItems: 5 });
    const joined = questions.map((q) => q.text).join("\n");

    expect(joined).toMatch(/Karen contact information unknown/i);
    expect(joined).toMatch(/First observation not scheduled/i);
    expect(joined).toMatch(/Confirm current product use/i);
    expect(joined).toMatch(/Identify provider pain points/i);
    expect(joined).toMatch(/Identify staff workflow pain points/i);
    expect(joined).not.toMatch(/Observation allowance/i);
    expect(joined).not.toMatch(/Vendor list partial/i);
    expect(joined).not.toMatch(/Whether you can observe needs reconfirmation/i);
    expect(joined).not.toMatch(/re-validate on next touch/i);
    expect(joined).not.toMatch(/Credentialing path needs confirmation/i);
    expect(questions.length).toBeLessThanOrEqual(5);
  });
});
