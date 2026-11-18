import { describe, expect, it } from "vitest";
import { resolvePrepProductFocusView } from "@/lib/surgical-sales/engagements/prepProductFocus";
import { buildPrepareSuggestedTalkingPoints } from "@/lib/surgical-sales/engagements/prepareForMeetingTalkingPoints";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";

const emptyIntel: PrepareKnownIntelligence = { bullets: [], last_key_insight: null };

describe("prepProductFocus", () => {
  it("defaults to workflow discovery mode without product selection", () => {
    const view = resolvePrepProductFocusView({ productLine: null });
    expect(view.mode).toBe("workflow_discovery");
    expect(view.summary).toMatch(/General procedural workflow/i);
  });

  it("returns product-specific guidance when ACSIS is selected", () => {
    const view = resolvePrepProductFocusView({
      productLine: "ACSIS",
      providerSpecialty: "General Surgery",
    });
    expect(view.mode).toBe("product_focus");
    expect(view.summary).toMatch(/Hernia and fixation/i);
    expect(view.workflowFocus).toMatch(/fixation workflow/i);
  });

  it("returns chronic wound guidance when BioTissue is selected", () => {
    const view = resolvePrepProductFocusView({ productLine: "BioTissue" });
    expect(view.summary).toMatch(/wound workflow/i);
  });

  it("changes talking points when intentional product focus is set at medium tier", () => {
    const neutral = buildPrepareSuggestedTalkingPoints({
      specialty: "General Surgery",
      engagementType: "intro_call",
      productLine: null,
      knownIntelligence: emptyIntel,
      prepSpecializationTier: "low",
      intentionalProductFocus: false,
    });
    const acsis = buildPrepareSuggestedTalkingPoints({
      specialty: "General Surgery",
      engagementType: "intro_call",
      productLine: "ACSIS",
      knownIntelligence: emptyIntel,
      prepSpecializationTier: "medium",
      intentionalProductFocus: true,
      prepContextState: "product_exploration",
    });
    expect(neutral.points.join(" ")).not.toMatch(/fixation workflow and closure inefficiencies/i);
    expect(acsis.points.join(" ")).toMatch(/fixation|ventral|hernia/i);
  });
});
