import { describe, expect, it } from "vitest";
import {
  buildObservationReadinessSummary,
  computeObservationReadinessScore,
  OBSERVATION_READINESS_MAX_PER_SECTION,
} from "./buildObservationReadinessSummary";

describe("buildObservationReadinessSummary", () => {
  it("returns prioritized buckets capped per section", () => {
    const summary = buildObservationReadinessSummary({ caseRow: {} });
    expect(summary.known.length).toBeLessThanOrEqual(OBSERVATION_READINESS_MAX_PER_SECTION);
    expect(summary.needsConfirmation.length).toBeLessThanOrEqual(OBSERVATION_READINESS_MAX_PER_SECTION);
    expect(summary.nextBestQuestions.length).toBeLessThanOrEqual(OBSERVATION_READINESS_MAX_PER_SECTION);
    expect(summary.hasContent).toBe(true);
    expect(summary.nextBestQuestions.length).toBeGreaterThan(0);
  });

  it("groups case access into known and next best questions", () => {
    const summary = buildObservationReadinessSummary({
      caseRow: {
        observation_access_scheduling_owner: "Maria — OR desk",
        observation_access_pathway: "Vendor badge via materials",
        observation_access_credentialing: "verified",
      },
      providerContact: {
        access_notes: "Check in at 6am with badge sponsor.",
      },
    });

    expect(summary.known).toContain("Scheduling owner identified");
    expect(summary.known).toContain("Access pathway noted for this case");
    expect(summary.known).toContain("Credentialing confirmed");
    expect(summary.nextBestQuestions).not.toContain("Who owns scheduling for this case?");
    expect(summary.nextBestQuestions).not.toContain("What is the observation access process?");
  });

  it("surfaces open questions and validation targets as next best questions", () => {
    const summary = buildObservationReadinessSummary({
      caseRow: {
        observation_access_scheduling_owner: "Maria",
        observation_access_pathway: "Badge desk",
        observation_access_credentialing: "verified",
        live_observation_questions: "- Who owns tray setup?\nPreferred docking angle?",
        observation_validation_targets: [
          {
            id: "watch-1",
            label: "Workflow fit",
            source: "chip",
            status: "planned",
            created_at: "2026-05-01T00:00:00.000Z",
          },
          {
            id: "watch-2",
            label: "Dock preference",
            source: "chip",
            status: "observed",
            created_at: "2026-05-01T00:00:00.000Z",
          },
        ],
      },
    });

    expect(summary.nextBestQuestions).toContain("Who owns tray setup?");
    expect(summary.nextBestQuestions).toContain("Preferred docking angle?");
    expect(summary.nextBestQuestions).toContain("Workflow fit");
    expect(summary.known).toContain("Dock preference — validated");
  });

  it("maps validated discovery signals to known lines", () => {
    const summary = buildObservationReadinessSummary({
      caseRow: {},
      providerContact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            source_label: "Manual",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
        },
      },
    });

    expect(summary.known).toContain("Observation approved");
    expect(summary.nextBestQuestions).toContain("Who owns scheduling for this case?");
  });

  it("reflects quick finding signals in known and needs confirmation", () => {
    const summary = buildObservationReadinessSummary({
      caseRow: {
        live_observation_product_fit: "Strong",
        observation_quick_finding_product_interest: "Mentioned",
        live_observation_competitors: "Yes",
      },
    });

    expect(summary.known).toEqual(
      expect.arrayContaining([
        "Workflow fit noted on case",
        "Product interest noted",
        "Competitor product observed",
      ]),
    );
    expect(summary.needsConfirmation).not.toContain("Workflow fit signal");
    expect(summary.needsConfirmation).not.toContain("Product interest signal");
  });

  it("computes readiness score from bucket balance", () => {
    expect(
      computeObservationReadinessScore({
        known: ["A", "B", "C"],
        needsConfirmation: [],
        nextBestQuestions: [],
      }),
    ).toBeGreaterThan(
      computeObservationReadinessScore({
        known: [],
        needsConfirmation: ["Partial"],
        nextBestQuestions: ["Question?"],
      }),
    );
  });
});
