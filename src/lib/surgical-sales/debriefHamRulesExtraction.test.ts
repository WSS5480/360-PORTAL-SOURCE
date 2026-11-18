import { describe, expect, it } from "vitest";
import { DR_JOHN_HAM_INTRO } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { extractUniversalSurgicalFacts } from "@/lib/surgical-sales/universalExtractor/extractUniversalSurgicalFacts";
import { runRulesUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";

describe("Ham rules extraction", () => {
  it("emits procedure focus for robotic ventral and inguinal hernia", () => {
    const { facts } = extractUniversalSurgicalFacts({
      raw_note: DR_JOHN_HAM_INTRO,
      declared_source_type: "intro_call",
      context: { provider_display_name: "John Ham" },
    });
    const clinical = facts.filter((f) =>
      ["procedure_focus", "technology_preference", "procedure_volume_trend"].includes(String(f.concept)),
    );
    expect(
      clinical.some(
        (fact) =>
          fact.concept === "procedure_focus" &&
          /robotic ventral and inguinal hernia repair/i.test(fact.normalized_label),
      ),
    ).toBe(true);
    expect(clinical.some((fact) => fact.concept === "technology_preference")).toBe(false);
  });

  it("runRulesUniversalSurgicalExtraction includes procedure focus", () => {
    const result = runRulesUniversalSurgicalExtraction({
      raw_note: DR_JOHN_HAM_INTRO,
      declared_source_type: "intro_call",
      context: { provider_display_name: "John Ham" },
    });
    expect(
      result.facts.some(
        (f) =>
          f.concept === "procedure_focus" &&
          /robotic ventral and inguinal hernia repair/i.test(f.normalized_label),
      ),
    ).toBe(true);
  });
});
