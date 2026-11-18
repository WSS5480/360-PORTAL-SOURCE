import { describe, expect, it } from "vitest";

import { buildProviderIntelligenceKnowledgeDashboardView } from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

const providerRuns: UniversalFactExtractionRun[] = [
  {
    capture_id: "cap-fig",
    declared_source_type: "debrief_note",
    created_at: "2026-06-15T13:47:32.608462+00:00",
    facts: [
      {
        id: "fact-product",
        capture_id: "cap-fig",
        provider_id: "p1",
        organization_id: null,
        case_id: null,
        encounter_id: "eng-1",
        concept: "competitor_product",
        normalized_label: "Competitor product: Bard Mesh",
        assertion_level: "provider_reported",
        source_type: "debrief_note",
        evidence_text: "He is currently using Bard Mesh for the majority of these repairs.",
        confidence: "high",
        negated: false,
        uncertain: false,
        suppressed: false,
        product_mentioned: "Bard Mesh",
        created_at: "2026-06-15T13:47:32.608462+00:00",
      },
      {
        id: "fact-volume",
        capture_id: "cap-fig",
        provider_id: "p1",
        organization_id: null,
        case_id: null,
        encounter_id: "eng-1",
        concept: "case_outcome",
        normalized_label: "Routine progression",
        assertion_level: "provider_reported",
        source_type: "debrief_note",
        evidence_text:
          "Dr. Fig shared increasing robotic ventral hernia and abdominal wall reconstruction volume.",
        confidence: "high",
        negated: false,
        uncertain: false,
        suppressed: false,
        created_at: "2026-06-15T13:16:31.069039+00:00",
      },
    ],
  },
];

describe("Provider Intelligence UF cutover reads", () => {
  it("renders clinical briefing and gaps from UF when CRM clinical columns are empty", () => {
    const contact = {
      id: "p1",
      first_name: "Karen",
      last_name: "Fig",
      provider_observation_feasibility: "approved",
      provider_scheduling_contact: "Karen referenced for scheduling",
      provider_procedure_focus: "",
      provider_current_vendors: "",
      provider_commercial_intelligence: {
        version: 1,
        clinical: {
          entries: [
            {
              signal: "increasing_procedure_volume",
              category: "clinical_trend",
              source_text: "Increasing procedure volume",
              display_label: "Increasing Procedure Volume",
              procedure_context: "Robotic ventral hernia repair",
            },
          ],
          trends: ["Increasing robotic ventral hernia repair volume"],
          procedure_focus: [],
          clinical_preferences: [],
          clinical_frustrations: [],
          workflow_observations: [],
        },
        scheduling: {
          scheduler_identified: "partial",
          scheduler_contact_linked: "no",
          scheduling_workflow_known: "unknown",
        },
        observation: {
          interest: "unknown",
          readiness: "not_ready",
          access_status: "unknown",
          approval_status: "unknown",
          credentialing_required: "unknown",
        },
        credentialing: {
          credentialing_notes: [],
          credentialing_required: "unknown",
          credentialing_platform_known: "unknown",
        },
        support_contacts: [],
        candidate_contacts: [],
        updated_at: "2026-06-15T15:05:23.760Z",
      },
    };

    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact,
      providerId: "p1",
      universalFactsReadModel: { providerRuns },
    });

    const brief = view.fieldBrief.join(" ");
    expect(brief).toMatch(/robotic ventral hernia repair/i);
    expect(brief).toMatch(/abdominal wall reconstruction/i);
    expect(brief).toMatch(/Bard Mesh/i);

    expect(view.needsMoreEvidence.some((chip) => /Confirm current product use/i.test(chip.text))).toBe(
      true,
    );
    expect(view.commercialMeaning.some((chip) => /Growing robotic program/i.test(chip.text))).toBe(
      true,
    );
    expect(view.emergingSignals.some((chip) => /Bard Mesh/i.test(chip.text))).toBe(true);
  });

  it("renders from UF when CRM clinical columns are null", () => {
    const contact = {
      id: "p1",
      first_name: "Karen",
      last_name: "Fig",
      provider_observation_feasibility: "approved",
      provider_scheduling_contact: "Karen referenced for scheduling",
      provider_procedure_focus: null,
      provider_current_vendors: null,
      provider_commercial_intelligence: {
        version: 1,
        clinical: {
          entries: [
            {
              signal: "increasing_procedure_volume",
              category: "clinical_trend",
              source_text: "Increasing procedure volume",
              display_label: "Increasing Procedure Volume",
              procedure_context: "Robotic ventral hernia repair",
            },
          ],
          trends: ["Increasing robotic ventral hernia repair volume"],
          procedure_focus: [],
          clinical_preferences: [],
          clinical_frustrations: [],
          workflow_observations: [],
        },
        scheduling: {
          scheduler_identified: "partial",
          scheduler_contact_linked: "no",
          scheduling_workflow_known: "unknown",
        },
        observation: {
          interest: "unknown",
          readiness: "not_ready",
          access_status: "unknown",
          approval_status: "unknown",
          credentialing_required: "unknown",
        },
        credentialing: {
          credentialing_notes: [],
          credentialing_required: "unknown",
          credentialing_platform_known: "unknown",
        },
        support_contacts: [],
        candidate_contacts: [],
        updated_at: "2026-06-15T15:05:23.760Z",
      },
    };

    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact,
      providerId: "p1",
      universalFactsReadModel: { providerRuns },
    });

    expect(view.fieldBrief.join(" ")).toMatch(/robotic ventral hernia repair/i);
    expect(view.needsMoreEvidence.some((chip) => /Confirm current product use/i.test(chip.text))).toBe(
      true,
    );
  });

  it("does not duplicate a saved support contact from role-appended scheduler intelligence", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: {
        id: "p1",
        first_name: "Tom",
        last_name: "Lettuce",
        provider_observation_feasibility: "interested",
        provider_observation_coordinator_contact: "Jennifer · Scheduler · Observation scheduling",
      },
      providerId: "p1",
      relatedContacts: [
        {
          id: "support-jennifer",
          first_name: "Jennifer",
          title: "Scheduling Coordinator",
          role_type: "scheduler",
        },
      ],
      universalFactsReadModel: { providerRuns },
    });

    expect(view.keyPeople.filter((person) => person.name === "Jennifer")).toHaveLength(1);
    expect(view.keyPeople.some((person) => person.name.includes("Observation scheduling"))).toBe(false);
  });

  it("removes scheduling confirmation gaps once the support contact is accepted", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: {
        id: "p1",
        first_name: "Tom",
        last_name: "Lettuce",
        provider_observation_feasibility: "interested",
        provider_observation_coordinator_contact: "Jennifer · Scheduler · Observation scheduling",
      },
      providerId: "p1",
      relatedContacts: [
        {
          id: "support-jennifer",
          first_name: "Jennifer",
          title: "Scheduling Coordinator",
          role_type: "scheduler",
        },
      ],
      universalFactsReadModel: { providerRuns },
    });

    expect(view.needsMoreEvidence.map((chip) => chip.text)).not.toContain(
      "Scheduling contact needs confirmation",
    );
    expect(view.needsMoreEvidence.some((chip) => /schedul/i.test(chip.text))).toBe(false);
  });
});
