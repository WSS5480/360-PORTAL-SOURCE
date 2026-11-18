import { describe, expect, it } from "vitest";
import {
  mapQuickCaptureToUniversalDeclaredSource,
  resolveQuickCaptureEngagementType,
} from "./mapQuickCaptureToUniversalDeclaredSource";

describe("mapQuickCaptureToUniversalDeclaredSource", () => {
  it("maps provider discovery notes to discovery_note", () => {
    expect(mapQuickCaptureToUniversalDeclaredSource({})).toBe("discovery_note");
    expect(
      mapQuickCaptureToUniversalDeclaredSource({
        engagementType: "office_visit_360",
      }),
    ).toBe("discovery_note");
  });

  it("maps intro call engagements to intro_call", () => {
    expect(
      mapQuickCaptureToUniversalDeclaredSource({
        engagementType: "intro_call",
      }),
    ).toBe("intro_call");
    expect(
      mapQuickCaptureToUniversalDeclaredSource({
        engagementTypeLabel: "Intro Call",
      }),
    ).toBe("intro_call");
  });

  it("resolves intro call from engagement type label fallback", () => {
    expect(
      resolveQuickCaptureEngagementType({
        engagementTypeLabel: "Intro Call",
      }),
    ).toBe("intro_call");
  });
});
