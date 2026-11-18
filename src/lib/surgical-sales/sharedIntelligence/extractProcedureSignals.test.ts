import { describe, expect, it } from "vitest";

import { extractProcedureSignalsFromText } from "@/lib/surgical-sales/sharedIntelligence/extractProcedureSignals";
import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { DR_JOHN_HAM_INTRO } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";

describe("extractProcedureSignals", () => {
  it("extracts Tom Sandy volume trends for robotic ventral hernia and abdominal wall reconstruction", () => {
    const clinicalFragment =
      "Clinically, he mentioned they've been doing more robotic ventral hernia repairs lately and are seeing a higher volume of abdominal wall reconstruction cases than they were a year ago.";
    const signals = extractProcedureSignalsFromText({
      text: clinicalFragment,
      declaredSource: "intro_call",
    });

    expect(signals.some((signal) => signal.concept === "procedure_volume_trend")).toBe(true);
    expect(
      signals.some((signal) =>
        /robotic ventral hernia repair/i.test(signal.normalizedLabel),
      ),
    ).toBe(true);
    expect(
      signals.some((signal) =>
        /abdominal wall reconstruction/i.test(signal.normalizedLabel),
      ),
    ).toBe(true);
  });

  it("does not emit volume trend without growth language", () => {
    const signals = extractProcedureSignalsFromText({
      text: "He performs robotic ventral hernia repair.",
      declaredSource: "intro_call",
    });
    expect(signals.every((signal) => signal.concept !== "procedure_volume_trend")).toBe(true);
    expect(signals.some((signal) => signal.concept === "procedure_focus")).toBe(true);
  });

  it("maps single procedure mention to focus not trend", () => {
    const signals = extractProcedureSignalsFromText({
      text: "Primary focus is ventral hernia repair.",
      declaredSource: "intro_call",
    });
    expect(signals.some((signal) => signal.concept === "procedure_focus")).toBe(true);
    expect(signals.some((signal) => signal.concept === "procedure_volume_trend")).toBe(false);
  });

  it("extracts robotic technique preference from Sandy Berry dictation fragment", () => {
    const fragment = "She does most of her hernia work robotically.";
    const signals = extractProcedureSignalsFromText({
      text: fragment,
      declaredSource: "intro_call",
    });
    expect(signals.some((signal) => signal.concept === "technology_preference")).toBe(true);
  });

  it("Tom Sandy clinical fragment includes volume trends without redundant robotic technique", () => {
    const clinicalFragment =
      "Clinically, he mentioned they've been doing more robotic ventral hernia repairs lately and are seeing a higher volume of abdominal wall reconstruction cases than they were a year ago.";
    const signals = extractProcedureSignalsFromText({
      text: clinicalFragment,
      declaredSource: "intro_call",
    });
    expect(signals.map((signal) => `${signal.concept}:${signal.normalizedLabel}`)).toEqual([
      "procedure_volume_trend:Robotic ventral hernia repair · Increasing procedure volume",
      "procedure_volume_trend:Abdominal wall reconstruction · Increasing procedure volume",
    ]);
  });

  it("extracts Ham compound robotic ventral and inguinal hernia as procedure focus", () => {
    const signals = extractProcedureSignalsFromText({
      text: "He primarily performs robotic ventral and inguinal hernia repairs.",
      declaredSource: "intro_call",
    });
    expect(signals.some((signal) => signal.concept === "procedure_focus")).toBe(true);
    expect(
      signals.some((signal) =>
        /robotic ventral and inguinal hernia repair/i.test(signal.normalizedLabel),
      ),
    ).toBe(true);
    expect(signals.some((signal) => signal.concept === "technology_preference")).toBe(false);
  });

  it("emits both Robotic and Laparoscopic when dictation names both modalities", () => {
    const signals = extractProcedureSignalsFromText({
      text: "He primarily performs robotic and laparoscopic ventral hernia repairs.",
      declaredSource: "intro_call",
    });
    expect(
      signals.some(
        (signal) =>
          signal.concept === "procedure_focus" && /ventral hernia repair/i.test(signal.normalizedLabel),
      ),
    ).toBe(true);
    expect(
      signals.some(
        (s) => s.concept === "technology_preference" && /^Robotic · Technique \/ Modality$/i.test(s.normalizedLabel),
      ),
    ).toBe(true);
    expect(
      signals.some(
        (s) =>
          s.concept === "technology_preference" && /^Laparoscopic · Technique \/ Modality$/i.test(s.normalizedLabel),
      ),
    ).toBe(true);
  });

  it("extracts Ham procedure focus from full intro dictation", () => {
    const signals = extractProcedureSignalsFromText({
      text: DR_JOHN_HAM_INTRO,
      declaredSource: "intro_call",
    });
    expect(
      signals.some(
        (signal) =>
          signal.concept === "procedure_focus" &&
          /robotic ventral and inguinal hernia repair/i.test(signal.normalizedLabel),
      ),
    ).toBe(true);
  });

  it("processes full Tom Sandy dictation without duplicate procedure keys", () => {
    const signals = extractProcedureSignalsFromText({
      text: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
      declaredSource: "intro_call",
    });
    const keys = signals.map((signal) => signal.dedupeKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
