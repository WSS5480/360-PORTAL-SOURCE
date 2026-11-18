import { describe, expect, it } from "vitest";
import {
  emptyProviderCommercialIntelligence,
  PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import { collectQuickAddProcedureSuggestions } from "@/lib/surgical-sales/quickAddProcedureSuggestions";

describe("collectQuickAddProcedureSuggestions", () => {
  it("returns clean procedure values without concatenated intelligence blobs", () => {
    expect(
      collectQuickAddProcedureSuggestions({
        provider_procedure_focus:
          "Robotic ventral hernia repair · Increasing procedure volume|Abdominal wall reconstruction · Increasing case volume",
      }),
    ).toEqual(["Robotic ventral hernia repair", "Abdominal wall reconstruction"]);
  });

  it("includes specialty when distinct", () => {
    expect(
      collectQuickAddProcedureSuggestions(
        { provider_procedure_focus: "Robotic ventral hernia repair" },
        "General surgery",
      ),
    ).toEqual(["Robotic ventral hernia repair", "General surgery"]);
  });

  it("prioritizes prior case procedures ahead of provider intelligence", () => {
    expect(
      collectQuickAddProcedureSuggestions(
        { provider_procedure_focus: "Hernia repair" },
        null,
        ["Lap chole", "Hernia repair"],
      ),
    ).toEqual(["Lap chole", "Hernia repair"]);
  });

  it("includes procedures from commercial intelligence JSON", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.clinical.procedure_focus = ["Lap chole"];

    expect(
      collectQuickAddProcedureSuggestions({
        provider_procedure_focus: "Robotic ventral hernia repair",
        provider_ideal_observation_cases: "Complex abdominal wall reconstruction",
        [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: commercial,
      }),
    ).toEqual(["Robotic ventral hernia repair", "Complex abdominal wall reconstruction", "Lap chole"]);
  });

  it("recommends a newly typed case procedure next time even without intelligence", () => {
    expect(collectQuickAddProcedureSuggestions(null, null, ["Robotic ventral hernia"])).toEqual([
      "Robotic ventral hernia",
    ]);
  });
});
