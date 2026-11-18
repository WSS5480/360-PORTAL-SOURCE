import { describe, expect, it } from "vitest";
import {
  buildPreparationContextView,
  resolveWorkflowFocusedPrepHint,
} from "@/lib/surgical-sales/engagements/engagementPreparationContextContent";
import { buildIntroCallDiscoveryFocusView } from "@/lib/surgical-sales/engagements/introCallDiscoveryFocus";
import { buildEngagementPrepModeView } from "@/lib/surgical-sales/engagements/engagementPrepMode";
import { buildPrepareSuggestedGoal } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedGoal";
import { resolveEngagementPreparationContextState } from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";

const emptyIntel: PrepareKnownIntelligence = { bullets: [], last_key_insight: null };

describe("resolveEngagementPreparationContextState", () => {
  it("returns discovery when no product or pipeline signals", () => {
    expect(
      resolveEngagementPreparationContextState({
        engagementType: "intro_call",
        productLine: null,
        opportunityId: null,
      }),
    ).toBe("discovery");
  });

  it("discovery context uses discovery focus label and areas", () => {
    const view = buildPreparationContextView("discovery", {
      discoveryFocus: buildIntroCallDiscoveryFocusView(),
    });
    expect(view.label).toBe("Discovery focus");
    expect(view.discovery_focus?.areas).toHaveLength(7);
    expect(view.focus_areas).toContain("Observation access process");
  });

  it("stays discovery when only opportunity product exists without explicit focus", () => {
    expect(
      resolveEngagementPreparationContextState({
        engagementType: "intro_call",
        productLine: null,
        opportunityProductLine: "ACSIS",
        opportunityId: "opp-1",
      }),
    ).toBe("discovery");
  });

  it("returns product_exploration when product selected without evaluation opportunity", () => {
    expect(
      resolveEngagementPreparationContextState({
        engagementType: "intro_call",
        productLine: "ACSIS",
        opportunityId: null,
      }),
    ).toBe("product_exploration");
  });

  it("returns evaluation_planning for linked opportunity in evaluation stage", () => {
    expect(
      resolveEngagementPreparationContextState({
        engagementType: "intro_call",
        productLine: "ACSIS",
        opportunityId: "opp-1",
        opportunityStage: "evaluation_planned",
      }),
    ).toBe("evaluation_planning");
  });

  it("returns observation_support when case is linked", () => {
    expect(
      resolveEngagementPreparationContextState({
        engagementType: "intro_call",
        productLine: "ACSIS",
        caseId: "case-1",
      }),
    ).toBe("observation_support");
  });

  it("returns observation_support for observation request engagement type", () => {
    expect(
      resolveEngagementPreparationContextState({
        engagementType: "observation_request",
        productLine: null,
      }),
    ).toBe("observation_support");
  });
});

describe("resolveWorkflowFocusedPrepHint", () => {
  it("returns workflow-focused copy for intro call without product or initiative", () => {
    const hint = resolveWorkflowFocusedPrepHint({
      engagementType: "intro_call",
      productLine: null,
      opportunityId: null,
      caseId: null,
    });
    expect(hint?.lead).toMatch(/workflow discovery mode/i);
    expect(hint?.sub).toMatch(/product focus below/i);
  });

  it("hides hint when explicit product focus or case is linked", () => {
    expect(
      resolveWorkflowFocusedPrepHint({
        engagementType: "intro_call",
        productLine: "ACSIS",
      }),
    ).toBeNull();
    expect(
      resolveWorkflowFocusedPrepHint({
        engagementType: "intro_call",
        opportunityId: "opp-1",
        opportunityProductLine: "BioTissue",
      }),
    ).not.toBeNull();
    expect(
      resolveWorkflowFocusedPrepHint({
        engagementType: "intro_call",
        caseId: "case-1",
      }),
    ).toBeNull();
    expect(
      resolveWorkflowFocusedPrepHint({
        engagementType: "observation_request",
        productLine: null,
      }),
    ).toBeNull();
  });
});

describe("prep content by context state", () => {
  it("evaluation planning goal targets case profile and OR support", () => {
    const dominantPrep = buildEngagementPrepModeView({
      engagementType: "intro_call",
      prepMode: "evaluation_preparation",
      productLine: "ACSIS",
    }).generation;
    const goal = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      opportunityStage: "evaluation_planned",
      productLine: "ACSIS",
      knownIntelligence: emptyIntel,
      intentionalProductFocus: true,
      dominantPrep,
    });
    expect(goal.goal).toMatch(/evaluation case profile/i);
    expect(goal.goal).not.toMatch(/workflow conversion|OR support logistics.*document/i);
  });

  it("observation support goal focuses on logistics and barriers", () => {
    const dominantPrep = buildEngagementPrepModeView({
      engagementType: "intro_call",
      prepMode: "live_case_support",
      productLine: "ACSIS",
    }).generation;
    const goal = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      opportunityStage: "outcome_review",
      productLine: "ACSIS",
      knownIntelligence: emptyIntel,
      intentionalProductFocus: true,
      dominantPrep,
    });
    expect(goal.goal).toMatch(/support logistics/i);
    expect(goal.goal).not.toMatch(/adoption barriers.*document/i);
  });
});
