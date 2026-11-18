import { describe, expect, it } from "vitest";
import { buildProviderIntelligenceKnowledgeDashboardView } from "./buildProviderIntelligenceKnowledgeDashboardView";

const TOM_SANDY_CONTACT = {
  id: "p1",
  first_name: "Tom",
  last_name: "Sandy",
  provider_observation_feasibility: "interested",
  provider_observation_access_path: "Jennifer coordinates scheduling with the OR team",
  provider_observation_credentialing_needed: "required",
  provider_observation_coordinator_contact: "Jennifer — contact info missing",
  provider_procedure_focus:
    "Robotic ventral hernia repair · Increasing procedure volume|Abdominal wall reconstruction · Increasing case volume",
  provider_intelligence_field_metadata: {
    provider_observation_access_path: {
      source_type: "intro_call",
      source_label: "Intro call debrief",
      source_engagement_id: "e1",
      updated_at: "2026-06-01T12:00:00Z",
      lifecycle_state: "confirmed",
      evidence_text: "Jennifer coordinates scheduling with the OR team",
    },
    provider_observation_feasibility: {
      source_type: "intro_call",
      source_label: "Intro call debrief",
      source_engagement_id: "e1",
      updated_at: "2026-06-01T12:00:00Z",
      lifecycle_state: "confirmed",
      evidence_text: "Provider is open to observation",
    },
  },
};

describe("buildProviderIntelligenceKnowledgeDashboardView", () => {
  it("returns an empty briefing shell when no field evidence exists", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: { id: "p1", first_name: "Tom", last_name: "Sandy" },
      providerId: "p1",
    });

    expect(view.hasFieldEvidence).toBe(false);
    expect(view.fieldBrief.join(" ")).toMatch(/no field intelligence/i);
    expect(view.whatWeKnow).toHaveLength(0);
    expect(view.keyPeople).toHaveLength(0);
    expect(view.progress.completionPercent).toBeGreaterThanOrEqual(0);
  });

  it("builds a living field briefing workspace for Tom Sandy", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: TOM_SANDY_CONTACT,
      providerId: "p1",
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          status: "completed",
          debrief_completed: true,
        } as never,
        {
          id: "e2",
          engagement_type: "follow_up",
          status: "completed",
          debrief_completed: false,
        } as never,
      ],
    });

    expect(view.hasFieldEvidence).toBe(true);
    expect(view.fieldBrief.join(" ")).toMatch(/observation/i);
    expect(view.fieldBrief.length).toBeGreaterThan(1);
    expect(view.pulse.biggestUnknown).toBeNull();
    expect(view.pulse.biggestUnknownSource).toBeNull();
    expect(view.pulse.accessPathwayStatus).toBeTruthy();
    expect(view.progress.accessSteps.length).toBe(5);
    expect(view.whatWeKnow.length).toBeGreaterThan(0);
    expect(view.whatWeKnow[0].tone).toBe("known");
    expect(view.whyThisMatters.length).toBeGreaterThan(0);
    expect(view.keyPeople.find((p) => p.role === "Provider")?.name).toMatch(/Tom Sandy/i);
    expect(view.keyPeople.find((p) => p.role === "Provider")?.whyTheyMatter).toBeTruthy();
    expect(view.keyPeople.some((p) => /Jennifer/i.test(p.name))).toBe(true);
    expect(view.pulse.mostImportantRelationship).toBeNull();
    expect(view.fieldEvidence.length).toBeGreaterThan(0);
    expect(view.fieldEvidence[0].intelligenceImpacts.length).toBeGreaterThan(0);
  });

  it("does not promote the provider as the snapshot key relationship", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: {
        id: "p-sandy",
        first_name: "Sandy",
        last_name: "Berry",
        provider_observation_feasibility: "interested",
      },
      providerId: "p-sandy",
      engagements: [{ id: "e1", engagement_type: "intro_call", status: "planned" } as never],
    });

    expect(view.hasFieldEvidence).toBe(true);
    expect(view.keyPeople.some((person) => person.name === "Sandy Berry")).toBe(true);
    expect(view.pulse.mostImportantRelationship).toBeNull();
  });

  it("promotes verified related contacts as the snapshot key relationship", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: {
        id: "p-sandy",
        first_name: "Sandy",
        last_name: "Berry",
        provider_observation_feasibility: "interested",
      },
      providerId: "p-sandy",
      relatedContacts: [
        {
          id: "c-jennifer",
          first_name: "Jennifer",
          last_name: "Jones",
          role: "OR coordinator",
          phone: "555-0100",
          verification_status: "verified",
        },
      ],
    });

    expect(view.pulse.mostImportantRelationship?.name).toMatch(/Jennifer Jones/i);
    expect(view.pulse.mostImportantRelationship?.role).toMatch(/coordinator/i);
    expect(view.pulse.mostImportantRelationshipSource).toBe("Verified contact");
  });

  it("dedupes field-derived support contacts once a linked contact exists", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: {
        id: "p-lettuce",
        first_name: "Tom",
        last_name: "Lettuce",
        provider_observation_feasibility: "interested",
        provider_observation_coordinator_contact: "Sarah — scheduling coordinator",
        provider_intelligence_field_metadata: {
          provider_observation_coordinator_contact: {
            source_type: "profile",
            source_label: "Suggested facility intelligence",
            updated_at: "2026-06-26T12:00:00Z",
            lifecycle_state: "confirmed",
          },
        },
      },
      providerId: "p-lettuce",
      relatedContacts: [
        {
          id: "c-sarah",
          first_name: "Sarah",
          last_name: "Smith",
          role_type: "scheduler",
          verification_status: "verified",
        },
      ],
    });

    expect(view.keyPeople.filter((person) => /Sarah/i.test(person.name))).toHaveLength(1);
    expect(view.keyPeople.find((person) => /Sarah/i.test(person.name))?.href).toBe(
      "/portal/sales/contacts/c-sarah",
    );
  });

  it("does not promote access-pathway task text as biggest unknown without evidence", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: {
        id: "p-sandy",
        first_name: "Sandy",
        last_name: "Berry",
      },
      providerId: "p-sandy",
      engagements: [{ id: "e1", engagement_type: "intro_call", status: "planned" } as never],
    });

    expect(view.pulse.biggestUnknown).toBeNull();
    expect(view.pulse.biggestUnknownSource).toBeNull();
  });

  it("withholds generic observation-access copy from top opportunity on permission-only signal", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: {
        id: "p-sandy",
        first_name: "Sandy",
        last_name: "Berry",
        provider_observation_feasibility: "interested",
      },
      providerId: "p-sandy",
      engagements: [{ id: "e1", engagement_type: "intro_call", status: "planned" } as never],
    });

    expect(view.pulse.strongestCommercialSignal).toBeNull();
    expect(view.commercialMeaning.some((chip) => /observation access opportunity/i.test(chip.text))).toBe(
      false,
    );
  });

  it("surfaces useful intro-call product and workflow intelligence without generic clinical trend noise", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: {
        id: "p-lettuce",
        first_name: "Tom",
        last_name: "Lettuce",
        provider_observation_feasibility: "interested",
        provider_product_interests: "ACSIS interest: curved design, suction setup compatibility, assistant learning curve",
        provider_workflow_pain_points:
          "Current setup: standard rigid suction irrigation | Challenge reaching pooled fluid in tight pelvic anatomy without fighting other instruments",
        provider_procedure_focus: "general",
        provider_intelligence_field_metadata: {
          provider_product_interests: {
            source_type: "intro_call",
            source_label: "Intro call debrief",
            source_engagement_id: "e-lettuce",
            updated_at: "2026-06-24T12:00:00Z",
            evidence_text:
              "Asked whether ACSIS works with their existing suction setup. Was interested in the curved design and learning curve.",
          },
          provider_workflow_pain_points: {
            source_type: "intro_call",
            source_label: "Intro call debrief",
            source_engagement_id: "e-lettuce",
            updated_at: "2026-06-24T12:00:00Z",
            evidence_text:
              "Currently using standard rigid suction irrigation. Deeper pelvic cases make pooled fluid hard to reach.",
          },
          provider_procedure_focus: {
            source_type: "ai_capture",
            source_label: "Quick capture field note",
            updated_at: "2026-06-24T12:00:00Z",
            evidence_text: "Increasing general volume noted during discovery.",
          },
        },
      },
      providerId: "p-lettuce",
      engagements: [
        {
          id: "e-lettuce",
          engagement_type: "intro_call",
          status: "completed",
          debrief_completed: true,
        } as never,
      ],
    });

    const capturedSignals = view.emergingSignals.map((chip) => chip.text).join(" | ");
    const commercialMeaning = view.commercialMeaning.map((chip) => chip.text).join(" | ");
    const evidence = view.fieldEvidence.map((card) => `${card.title}: ${card.excerpt}`).join(" | ");
    const pageBlob = `${capturedSignals} | ${commercialMeaning} | ${evidence}`;

    expect(pageBlob).toMatch(/Product interest: ACSIS/i);
    expect(pageBlob).toMatch(/suction|pooled fluid|tight pelvic anatomy/i);
    expect(pageBlob).not.toMatch(/Increasing general volume/i);
    expect(pageBlob).not.toMatch(/general\s+—\s+volume increasing/i);
    expect(view.pulse.strongestCommercialSignal).toMatch(/Product interest: ACSIS/i);
    expect(view.pulse.strongestCommercialSignalSource).toBeTruthy();
  });

  it("promotes raw capture notes into dynamic top cards when structured fields are thin", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: {
        id: "p-lettuce-raw",
        first_name: "Tom",
        last_name: "Lettuce",
        access_notes:
          "[6/24/2026] Intro call with Dr. Tom Lettuce. Discussed ACSIS. He does a fair amount of robotic colorectal and hernia work. Currently using standard rigid suction irrigation. Said one of the challenges in deeper pelvic cases is reaching pooled fluid without fighting other instruments. Asked whether ACSIS works with their existing suction setup. Was interested in the curved design and how it gets around anatomy.",
      },
      providerId: "p-lettuce-raw",
    });

    const topCards = [
      view.pulse.biggestUnknown,
      view.pulse.strongestCommercialSignal,
      ...view.emergingSignals.map((chip) => chip.text),
      ...view.commercialMeaning.map((chip) => chip.text),
      ...view.fieldEvidence.map((card) => card.excerpt ?? ""),
    ].join(" | ");

    expect(view.hasFieldEvidence).toBe(true);
    expect(topCards).toMatch(/Product interest: ACSIS/i);
    expect(topCards).toMatch(/suction|pooled fluid|tight/i);
    expect(view.pulse.strongestCommercialSignal).toMatch(/Product interest: ACSIS/i);
    expect(view.pulse.strongestCommercialSignalSource).toBeTruthy();
    expect(view.fieldEvidence.length).toBeGreaterThan(0);
  });

  it("treats completed credentialing as green and suppresses required signals", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: {
        id: "p-cred-complete",
        first_name: "Cred",
        last_name: "Complete",
        provider_observation_feasibility: "credentialing_required",
        provider_observation_credentialing_needed: "cleared",
        provider_credentialing_status: "cleared",
        provider_credentialing_platform_name: "Vendormate",
        provider_intelligence_field_metadata: {
          provider_credentialing_status: {
            source_type: "profile",
            source_label: "Provider profile",
            updated_at: "2026-06-24T12:00:00Z",
            evidence_text: "Need to confirm the credentialing pathway before observation.",
          },
        },
      },
      providerId: "p-cred-complete",
    });

    const credentialingStep = view.progress.accessSteps.find((step) => step.id === "credentialing");
    expect(credentialingStep?.state).toBe("known");
    expect(view.emergingSignals.map((chip) => chip.text).join(" | ")).not.toMatch(
      /Credentialing required/i,
    );
    expect(view.fieldEvidence.map((card) => `${card.title} ${card.excerpt}`).join(" | ")).not.toMatch(
      /Credentialing required/i,
    );
  });
});
