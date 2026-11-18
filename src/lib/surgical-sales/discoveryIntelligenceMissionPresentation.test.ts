import { describe, expect, it } from "vitest";
import { buildDiscoveryIntelligenceGroupsView } from "./buildDiscoveryIntelligenceGroupsView";
import {
  buildDiscoveryMissionControl,
  discoveryBestNextQuestion,
  discoveryDomainStaleIntelLabel,
  discoveryOperationalReadiness,
} from "./discoveryIntelligenceMissionPresentation";

describe("discoveryIntelligenceMissionPresentation", () => {
  it("maps percent to operational readiness tiers", () => {
    expect(discoveryOperationalReadiness(5).tier).toBe("EARLY");
    expect(discoveryOperationalReadiness(20).tier).toBe("FORMING");
    expect(discoveryOperationalReadiness(45).tier).toBe("PARTIAL");
    expect(discoveryOperationalReadiness(60).tier).toBe("DEVELOPING");
    expect(discoveryOperationalReadiness(80).tier).toBe("READY");
    expect(discoveryOperationalReadiness(95).tier).toBe("VALIDATED");
    expect(discoveryOperationalReadiness(7).mappedLabel).toBe("7% captured");
  });

  it("surfaces a conversational best next question when field evidence exists", () => {
    const question = discoveryBestNextQuestion({
      contact: {},
      hasFieldEvidence: true,
    });
    expect(question).toBeTruthy();
    expect(question!.length).toBeGreaterThan(10);
  });

  it("does not invent a best next question without field evidence", () => {
    expect(discoveryBestNextQuestion({ contact: {}, hasFieldEvidence: false })).toBeNull();
  });

  it("builds mission control with objective and risks when evidence exists", () => {
    const view = buildDiscoveryIntelligenceGroupsView({ contact: {}, planning: null });
    const model = buildDiscoveryMissionControl({
      view,
      contact: {},
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
    expect(model.objective.length).toBeGreaterThan(0);
    expect(model.topRisks.length).toBeGreaterThan(0);
    expect(model.bestNextQuestion).toBeTruthy();
  });

  it("returns empty mission control without field evidence", () => {
    const view = buildDiscoveryIntelligenceGroupsView({ contact: {}, planning: null });
    const model = buildDiscoveryMissionControl({ view, contact: {} });
    expect(model.objective).toBe("");
    expect(model.topRisks).toEqual([]);
    expect(model.bestNextQuestion).toBeNull();
  });

  it("omits stale intel label when there is no field activity", () => {
    const view = buildDiscoveryIntelligenceGroupsView({ contact: {}, planning: null });
    const access = view.groups.find((g) => g.id === "access_readiness");
    expect(access).toBeDefined();
    if (!access) return;

    expect(discoveryDomainStaleIntelLabel(access, {})).toBeNull();
  });
});
