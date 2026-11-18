import { describe, expect, it } from "vitest";
import {
  buildNewCaseProceduralContextNotes,
  procedureMatchesProviderContext,
  procedureTextsRelate,
} from "./buildNewCaseProceduralContextNotes";

describe("procedureTextsRelate", () => {
  it("matches hernia repair variants", () => {
    expect(procedureTextsRelate("Hernia repair", "Ventral hernia")).toBe(true);
  });
});

describe("buildNewCaseProceduralContextNotes", () => {
  it("returns nothing without provider contact", () => {
    expect(buildNewCaseProceduralContextNotes({ procedureType: "Hernia repair", contact: null })).toEqual([]);
  });

  it("returns nothing when procedure does not match provider context", () => {
    expect(
      buildNewCaseProceduralContextNotes({
        procedureType: "Knee arthroscopy",
        contact: { provider_procedure_focus: "Hernia repair" },
      }),
    ).toEqual([]);
  });

  it("surfaces prior notes and gap-style lines in plain English", () => {
    const notes = buildNewCaseProceduralContextNotes({
      procedureType: "Hernia repair",
      contact: {
        provider_procedure_focus: "Hernia repair",
        provider_workflow_pain_points: "visualization concerns on long cases",
        provider_competitive_products: "",
        provider_preference_card_signals: "",
        provider_evaluation_openness: "",
      },
      maxItems: 5,
    });

    expect(notes.length).toBeGreaterThan(0);
    expect(notes.some((n) => /prior note:.*visualization/i.test(n))).toBe(true);
    expect(notes.some((n) => /workflow fit still needs validation/i.test(n))).toBe(true);
    expect(notes.some((n) => /no product preference confirmed/i.test(n))).toBe(true);
    for (const note of notes) {
      expect(note).not.toMatch(/interest_in_|provider_/);
      expect(note).not.toMatch(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/);
    }
  });

  it("procedureMatchesProviderContext uses procedure focus fields", () => {
    expect(
      procedureMatchesProviderContext("Bariatric sleeve", {
        provider_ideal_observation_cases: "Bariatric sleeve gastrectomy",
      }),
    ).toBe(true);
  });
});
