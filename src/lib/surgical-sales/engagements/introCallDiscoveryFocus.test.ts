import { describe, expect, it } from "vitest";
import {
  INTRO_CALL_DISCOVERY_FOCUS_AREAS,
  INTRO_CALL_DISCOVERY_FOCUS_TITLES,
  INTRO_CALL_DISCOVERY_CORE,
  buildIntroCallDiscoveryFocusView,
  resolveIntroCallDiscoveryFocusView,
  shouldUseIntroCallDiscoveryFocus,
} from "@/lib/surgical-sales/engagements/introCallDiscoveryFocus";
import { buildPrepareSuggestedDiscovery } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedDiscovery";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";

const emptyIntel: PrepareKnownIntelligence = { bullets: [], last_key_insight: null };

describe("introCallDiscoveryFocus", () => {
  it("defines seven canonical discovery focus areas", () => {
    expect(INTRO_CALL_DISCOVERY_FOCUS_AREAS).toHaveLength(7);
    expect(INTRO_CALL_DISCOVERY_FOCUS_TITLES).toEqual([
      "Procedural workflow",
      "OR efficiency",
      "Case complexity",
      "Observation feasibility",
      "Observation focus",
      "Evaluation openness",
      "Stakeholder mapping",
    ]);
    expect(INTRO_CALL_DISCOVERY_CORE).toHaveLength(7);
  });

  it("activates only at low specialization tier on intro call", () => {
    expect(
      shouldUseIntroCallDiscoveryFocus({
        engagementType: "intro_call",
        prepSpecializationTier: "low",
      }),
    ).toBe(true);
    expect(
      shouldUseIntroCallDiscoveryFocus({
        engagementType: "intro_call",
        prepSpecializationTier: "medium",
      }),
    ).toBe(false);
    expect(
      resolveIntroCallDiscoveryFocusView({
        engagementType: "intro_call",
        prepSpecializationTier: "medium",
      }),
    ).toBeNull();
    expect(buildIntroCallDiscoveryFocusView().areas).toHaveLength(7);
  });

  it("generic intro discovery uses surgeon-focused official template probes", () => {
    const qs = buildPrepareSuggestedDiscovery({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      productLine: null,
      knownIntelligence: emptyIntel,
    });
    expect(qs.questions.some((q) => /pay attention|comfortable having us observe/i.test(q))).toBe(true);
    expect(qs.questions.some((q) => /majority of your operative volume|workflow friction/i.test(q))).toBe(true);
    expect(qs.questions.join(" ")).not.toMatch(/hernia|mesh|fixation|credential|coordinator|scheduling owner/i);
  });
});
