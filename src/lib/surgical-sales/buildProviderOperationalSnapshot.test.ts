import { describe, expect, it } from "vitest";
import { buildProviderOperationalSnapshot } from "./buildProviderOperationalSnapshot";
import type { ProviderIntelligenceScopeDisplay } from "./buildProviderIntelligenceScopeDisplay";

const emptyScope: ProviderIntelligenceScopeDisplay = {
  facility: {
    title: "Facility environment",
    subtitle: "Test Hospital",
    bullets: [],
    emptyHint: "",
  },
  provider: {
    title: "Provider workflow",
    subtitle: "Dr. Test",
    bullets: [],
    emptyHint: "",
  },
};

describe("buildProviderOperationalSnapshot", () => {
  it("builds grouped synthesized briefing for sparse accounts with field evidence", () => {
    const snap = buildProviderOperationalSnapshot({
      scope: emptyScope,
      density: "sparse",
      suggestedNextStep: "Schedule intro call",
      organizationLinked: true,
      fieldReadiness: {
        label: "Visibility developing",
        hint: "Visibility developing — validate access and workflow on early touches.",
      },
      maturityLabel: "Visibility developing",
      openItemCount: 4,
      engagements: [
        {
          id: "eng-1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro Call",
          status: "planned",
          status_label: "Planned",
          pre_call_filled: 0,
          pre_call_total: 5,
          pre_call_complete: false,
          outcome_label: "Planned",
        },
      ],
    });

    expect(snap.groups.length).toBeGreaterThanOrEqual(3);
    expect(snap.groups.some((g) => g.id === "facility")).toBe(true);
    expect(snap.groups.some((g) => g.id === "workflow")).toBe(true);
    expect(snap.groups.some((g) => g.id === "observation")).toBe(true);
    expect(snap.groups.some((g) => g.id === "readiness")).toBe(true);

    const facility = snap.groups.find((g) => g.id === "facility");
    expect(facility?.insights[0]?.synthesis).toMatch(/affiliation anchored/i);
    expect(facility?.insights[0]?.confidenceLabel).toMatch(/confirmed/i);

    const workflow = snap.groups.find((g) => g.id === "workflow");
    expect(
      workflow?.insights.some((i) => /procedure mix|evaluation posture/i.test(i.synthesis)),
    ).toBe(true);
    expect(workflow?.insights.some((i) => i.confidenceLabel === "Needs validation")).toBe(true);

    const readiness = snap.groups.find((g) => g.id === "readiness");
    expect(readiness?.insights[0]?.synthesis).toMatch(/open item/i);
    expect(readiness?.insights[0]?.contextHint).toBe("Visibility developing");

    expect(snap.facilitySignals.length).toBeGreaterThan(0);
    expect(snap.providerSignals.length).toBeGreaterThan(0);
    expect(snap.suggestedNextStep).toMatch(/intro call/i);
  });

  it("returns empty groups when no field evidence exists", () => {
    const snap = buildProviderOperationalSnapshot({
      scope: emptyScope,
      density: "sparse",
      suggestedNextStep: "Schedule intro call",
      organizationLinked: true,
    });
    expect(snap.groups).toEqual([]);
    expect(snap.facilitySignals).toEqual([]);
    expect(snap.providerSignals).toEqual([]);
  });
});
