import { describe, expect, it } from "vitest";

import {
  buildProviderIntelligenceBriefingView,
  PROVIDER_BRIEFING_SECTION,
} from "./buildProviderIntelligenceBriefingView";

describe("buildProviderIntelligenceBriefingView", () => {
  it("returns an empty field briefing when no activity exists", () => {
    const view = buildProviderIntelligenceBriefingView({
      contact: { id: "p1", first_name: "Tom", last_name: "Sandy" },
      providerId: "p1",
      engagements: [],
      cases: [],
    });

    expect(view.hasFieldEvidence).toBe(false);
    expect(view.whatWeKnow).toEqual([]);
    expect(view.openQuestions).toEqual([]);
    expect(view.opportunitySignals).toEqual([]);
    expect(view.relationshipMap).toEqual([]);
    expect(view.evidenceFromField).toEqual([]);
    expect(view.pageTitle).toBe(PROVIDER_BRIEFING_SECTION.title);
  });

  it("organizes Tom Sandy intro debrief into briefing sections", () => {
    const view = buildProviderIntelligenceBriefingView({
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
          provider_observation_credentialing_needed: {
            source_type: "intro_call",
            source_label: "Intro call debrief",
            source_engagement_id: "e1",
            updated_at: "2026-06-01T12:00:00Z",
            lifecycle_state: "confirmed",
            evidence_text: "Vendor credentialing required before OR access",
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
    expect(view.accessPicture.observationStatus).toMatch(/permission requested|interested/i);
    expect(view.whatWeKnow.some((item) => /permission requested|interested/i.test(item.text))).toBe(true);
    expect(view.whatWeKnow.every((item) => !/not approved/i.test(item.text))).toBe(true);
    expect(view.whatWeKnow.some((item) => /credentialing required/i.test(item.text))).toBe(true);
    expect(view.openQuestions.some((item) => /scheduling contact|contact info|jennifer/i.test(item.text))).toBe(
      true,
    );
    const schedulerMention = [
      ...view.openQuestions,
      ...view.whatWeKnow,
      ...view.relationshipMap.map((entry) => `${entry.name} ${entry.detail ?? ""}`),
    ].join(" ");
    expect(/jennifer|scheduling owner|OR scheduling/i.test(schedulerMention)).toBe(true);
    expect(view.opportunitySignals.some((item) => /robotic ventral hernia/i.test(item.signal))).toBe(
      true,
    );
    expect(view.nextAction.objective.trim().length).toBeGreaterThan(0);
  });

  it("does not surface evaluation unknowns unless evaluation was discussed", () => {
    const view = buildProviderIntelligenceBriefingView({
      contact: {
        id: "p1",
        first_name: "Tom",
        last_name: "Sandy",
        provider_observation_feasibility: "interested",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "intro_call",
            source_engagement_id: "e1",
            source_label: "Intro call",
            updated_at: "2026-06-01T12:00:00Z",
            lifecycle_state: "confirmed",
          },
        },
      },
      providerId: "p1",
      engagements: [{ id: "e1", engagement_type: "intro_call", status: "completed" } as never],
    });

    const openQuestionText = view.openQuestions.map((item) => item.text).join(" ");
    expect(/evaluation/i.test(openQuestionText)).toBe(false);
  });

  it("includes engagement evidence in the field evidence section", () => {
    const view = buildProviderIntelligenceBriefingView({
      contact: { id: "p1", first_name: "Tom", last_name: "Sandy" },
      providerId: "p1",
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          status: "completed",
          debrief_completed: true,
          updated_at: "2026-06-01T12:00:00Z",
        } as never,
      ],
    });

    expect(view.evidenceFromField.length).toBeGreaterThan(0);
    expect(view.evidenceFromField.some((item) => /intro|debrief/i.test(item.title))).toBe(true);
  });
});
