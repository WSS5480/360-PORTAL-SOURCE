import { describe, expect, it } from "vitest";
import { extractObservationNoteEntities } from "./extractObservationNoteEntities";

describe("extractObservationNoteEntities", () => {
  it("extracts structured competitor product finding with separate evidence", () => {
    const result = extractObservationNoteEntities(
      "They're still using Competitor Mesh pretty heavily.",
    );

    expect(result.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "competitor_signal",
          label: "Competitor Product",
          category: "Competitor Products",
          finding: "Competitor Mesh",
          evidence: "They're still using Competitor Mesh pretty heavily.",
          confidence: "High",
        }),
        expect.objectContaining({
          type: "product_signal",
          label: "Current Product",
          category: "Current Products",
          finding: "Competitor Mesh",
        }),
      ]),
    );
    expect(result.entities[0]?.finding).not.toContain("They're still");
  });

  it("extracts scheduling contact and procedure focus as concise findings", () => {
    const result = extractObservationNoteEntities(
      "Karen handles scheduling and they have been doing more robotic hernia work lately.",
    );

    expect(result.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "scheduling_contact",
          finding: "Karen",
          confidence: "High",
        }),
        expect.objectContaining({
          type: "procedure_focus",
          finding: "Robotic Hernia",
          confidence: "Medium",
        }),
      ]),
    );
  });

  it("does not emit weak transcript-only competitor matches", () => {
    const result = extractObservationNoteEntities("Competitor rep was in the room.");

    expect(result.entities).toEqual([
      expect.objectContaining({
        type: "competitor_signal",
        finding: "Competitor rep present",
        evidence: "Competitor rep was in the room.",
      }),
    ]);
  });

  it("does not infer pain points from weak clinical keywords alone", () => {
    const result = extractObservationNoteEntities("Clinical team seemed fine today.");

    expect(result.entities).toHaveLength(0);
  });

  it("extracts explicit workflow friction findings", () => {
    const result = extractObservationNoteEntities("Long room turnover before start.");

    expect(result.entities).toEqual([
      expect.objectContaining({
        type: "workflow_friction_signal",
        finding: "Room turnover delay",
        confidence: "High",
      }),
    ]);
  });

  it("ignores conversational filler without actionable evidence", () => {
    const result = extractObservationNoteEntities(
      "Yeah first case today. Overall went pretty well. Had a quick conversation afterward.",
    );

    expect(result.entities).toHaveLength(0);
  });

  it("extracts visualization workflow finding from extra time language", () => {
    const result = extractObservationNoteEntities(
      "They spent extra time trying to improve visualization.",
    );

    expect(result.entities).toEqual([
      expect.objectContaining({
        type: "workflow_friction_signal",
        finding: "Visualization challenges observed",
        evidence: "They spent extra time trying to improve visualization.",
      }),
    ]);
  });

  it("extracts staff pain point from product opening trouble", () => {
    const result = extractObservationNoteEntities("Had trouble getting one of the products opened.");

    expect(result.entities).toEqual([
      expect.objectContaining({
        type: "staff_signal",
        finding: "Product availability/setup delays observed",
      }),
    ]);
  });

  it("extracts multi-signal field note without inferring unknown or negative evidence", () => {
    const note =
      "First case in. They're still using Competitor Mesh on pretty much everything from what I could tell. Team seemed comfortable with it. One thing I noticed was they spent a decent amount of time trying to get a better view before fixation. Not sure if that's normal or not. Staff seemed pretty organized overall. Didn't hear anyone complaining about products or equipment. Need a few more cases before I really know where the pain points are.";

    const result = extractObservationNoteEntities(note);
    const findings = result.entities.map((entity) => entity.finding);

    expect(findings).toContain("Competitor Mesh");
    expect(findings).toContain("Extra visualization time observed before fixation");
    expect(findings).toContain("Team appeared organized");
    expect(findings).not.toContain("Provider pain points");
    expect(findings.some((finding) => /complain/i.test(finding))).toBe(false);
    expect(findings.some((finding) => /need more cases/i.test(finding))).toBe(false);
  });

  it("credits current product usage from using language", () => {
    const result = extractObservationNoteEntities(
      "They're still using Competitor Mesh on pretty much everything.",
    );

    expect(result.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "product_signal",
          finding: "Competitor Mesh",
          category: "Current Products",
        }),
        expect.objectContaining({
          type: "competitor_signal",
          finding: "Competitor Mesh",
        }),
      ]),
    );
  });

  it("caps output and never stores transcript chunks as findings", () => {
    const longNote = `${"Long workflow detail. ".repeat(20)}Karen handles scheduling.`;
    const result = extractObservationNoteEntities(longNote);

    expect(result.entities.length).toBeLessThanOrEqual(8);
    expect(result.entities.every((entity) => entity.finding !== longNote.trim())).toBe(true);
    expect(result.entities.some((entity) => entity.type === "scheduling_contact")).toBe(true);
  });
});
