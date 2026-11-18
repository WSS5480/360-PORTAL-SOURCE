import { describe, expect, it } from "vitest";
import { buildProviderIntelligenceReferenceView } from "./buildProviderIntelligenceReferenceView";

describe("buildProviderIntelligenceReferenceView", () => {
  it("returns empty reference sections when no field evidence exists", () => {
    const view = buildProviderIntelligenceReferenceView({
      contact: { id: "p1", first_name: "Tom", last_name: "Sandy" },
      providerId: "p1",
      engagements: [],
      cases: [],
    });

    expect(view.hasFieldEvidence).toBe(false);
    expect(view.openQuestions).toEqual([]);
    expect(view.relationships).toEqual([]);
    expect(view.evidenceTimeline).toEqual([]);
    expect(view.accessPermission.some((row) => row.label === "Observation permission")).toBe(true);
    expect(view.pageLead).toMatch(/no need to fill everything/i);
  });

  it("organizes Tom Sandy intro debrief into reference sections without mission CTAs", () => {
    const view = buildProviderIntelligenceReferenceView({
      contact: {
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
      },
      providerId: "p1",
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          status: "completed",
          debrief_completed: true,
        } as never,
      ],
    });

    expect(view.hasFieldEvidence).toBe(true);
    expect(view.accessPermission.some((row) => /permission/i.test(row.label))).toBe(true);
    expect(view.clinicalSignals.some((group) => group.label === "Procedure focus")).toBe(true);
    expect(view.relationships.some((row) => /scheduler|coordinator/i.test(row.role))).toBe(true);
    expect(view.openQuestions.some((q) => /scheduling|jennifer|contact/i.test(q.text))).toBe(true);
    expect(view.openQuestions.every((q) => !/priority learning/i.test(q.text))).toBe(true);
    expect(view.evidenceTimeline.length).toBeGreaterThan(0);
  });

  it("does not invent open questions for blank fields without evidence", () => {
    const view = buildProviderIntelligenceReferenceView({
      contact: { id: "p2", first_name: "Pat", last_name: "Lee" },
      providerId: "p2",
      engagements: [],
    });

    expect(view.openQuestions).toEqual([]);
    expect(view.relationships).toEqual([]);
  });
});
