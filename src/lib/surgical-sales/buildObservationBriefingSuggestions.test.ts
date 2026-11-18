import { describe, expect, it } from "vitest";
import { buildObservationBriefingSuggestions } from "./buildObservationBriefingSuggestions";

describe("buildObservationBriefingSuggestions", () => {
  it("builds OR-mission suggestions without access-planning signals", () => {
    const watch = buildObservationBriefingSuggestions({
      pillarId: "watch_signals",
      caseRow: { case_type: "observation" },
      providerContact: {
        provider_workflow_pain_points: "Visualization challenges during closure",
        provider_observation_coordinator_contact: "",
      },
    });

    expect(watch.items.some((item) => /visualization/i.test(item.text))).toBe(true);
    expect(watch.items.some((item) => /scheduling owner unknown/i.test(item.text))).toBe(false);
    expect(watch.items.some((item) => /vendor pathway unclear/i.test(item.text))).toBe(false);
    expect(watch.items.some((item) => /Current products used/i.test(item.text))).toBe(true);
  });

  it("builds objective suggestions from procedure and provider intelligence", () => {
    const objective = buildObservationBriefingSuggestions({
      pillarId: "why_here",
      caseRow: { case_type: "observation", procedure_type: "Abdominal wall reconstruction" },
      providerContact: {
        provider_procedure_focus: "Complex abdominal wall reconstruction",
        provider_clinical_frustrations: "Fixation workflow concerns",
      },
      procedureLabel: "Abdominal wall reconstruction",
    });

    expect(objective.combinedText).toMatch(/Assess product fit during/i);
    expect(objective.items.some((item) => item.source === "Provider intelligence")).toBe(true);
  });

  it("builds learning and opportunity suggestions from mission templates", () => {
    const learning = buildObservationBriefingSuggestions({
      pillarId: "still_to_learn",
      caseRow: { case_type: "observation" },
    });

    expect(learning.items.some((item) => /What products are currently being used/i.test(item.text))).toBe(
      true,
    );
    expect(learning.items.some((item) => /What frustrates the surgeon/i.test(item.text))).toBe(true);

    const opportunities = buildObservationBriefingSuggestions({
      pillarId: "opportunities",
      caseRow: { case_type: "observation" },
      providerContact: {
        provider_product_gaps: "Visualization gap during closure",
      },
    });

    expect(opportunities.items.some((item) => /Opportunity to address/i.test(item.text))).toBe(true);
    expect(
      opportunities.items.some((item) => /Potential fit opportunity exists/i.test(item.text)),
    ).toBe(true);
  });
});
