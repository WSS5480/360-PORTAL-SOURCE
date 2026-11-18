import { describe, expect, it } from "vitest";
import {
  applyConversationFocusToTemplatePreview,
  parseIntroCallConversationFocus,
  prioritizeProbesForConversationFocus,
  serializeIntroCallConversationFocus,
} from "@/lib/surgical-sales/engagements/introCallConversationFocus";
import { buildIntroCallPrepTemplate } from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";

describe("introCallConversationFocus", () => {
  it("parses and serializes comma-separated focus ids", () => {
    expect(parseIntroCallConversationFocus("observation_access,product_fit")).toEqual([
      "observation_access",
      "product_fit",
    ]);
    expect(serializeIntroCallConversationFocus(["workflow_mapping"])).toBe("workflow_mapping");
    expect(parseIntroCallConversationFocus("invalid,general_discovery")).toEqual(["general_discovery"]);
  });

  it("prioritizes probes without changing other template fields", () => {
    const base = buildIntroCallPrepTemplate({ productFocus: "generic" });
    const originalObjective = base.smartObjective;
    const adjusted = applyConversationFocusToTemplatePreview(base, ["observation_access"]);

    expect(adjusted.smartObjective).toBe(originalObjective);
    expect(adjusted.impactOpeningStatement).toBe(base.impactOpeningStatement);
    expect(adjusted.probesInformationToGather[0]).toMatch(/comfortable|observe|pay attention/i);
    expect(adjusted.probesInformationToGather.length).toBeGreaterThan(0);
  });

  it("returns base probes when no focus selected", () => {
    const base = ["Probe A?", "Probe B?"];
    expect(prioritizeProbesForConversationFocus(base, [])).toEqual(base);
  });
});
