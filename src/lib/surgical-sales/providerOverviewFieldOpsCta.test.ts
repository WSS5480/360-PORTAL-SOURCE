import { describe, expect, it } from "vitest";
import {
  FIELD_OPS_PRIMARY_CTA,
  normalizeFieldOpsPrimaryCta,
} from "./providerOverviewFieldOpsCta";

describe("normalizeFieldOpsPrimaryCta", () => {
  it("maps intro and debrief labels to standard field ops CTAs", () => {
    expect(normalizeFieldOpsPrimaryCta("Schedule intro call")).toBe(
      FIELD_OPS_PRIMARY_CTA.scheduleIntroCall,
    );
    expect(normalizeFieldOpsPrimaryCta("Debrief")).toBe(FIELD_OPS_PRIMARY_CTA.debriefTouchpoint);
    expect(normalizeFieldOpsPrimaryCta("Debrief intro call")).toBe(
      FIELD_OPS_PRIMARY_CTA.debriefTouchpoint,
    );
    expect(normalizeFieldOpsPrimaryCta("Open field briefing")).toBe("Open Field Briefing");
  });
});
