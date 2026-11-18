import { describe, expect, it } from "vitest";
import { buildPrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import { buildPrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { harmonizePrepareMeetingPrepSections } from "@/lib/surgical-sales/engagements/prepareMeetingPrepHarmonize";
import { buildPrepareSuggestedGoal } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedGoal";
import { buildPrepareSuggestedTalkingPoints } from "@/lib/surgical-sales/engagements/prepareForMeetingTalkingPoints";
import { buildPrepareSuggestedDiscovery } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedDiscovery";
import { buildPrepareRisksBarriers } from "@/lib/surgical-sales/engagements/prepareForMeetingRisksBarriers";
import { buildPrepareRecommendedNextActions } from "@/lib/surgical-sales/engagements/prepareForMeetingRecommendedNextAction";

const emptyProvider = {
  id: "prov-1",
  display_name: "Dr. Smith",
  relationship_strength: "weak",
  access_notes: "Coordinator gates all observation slots",
};

function smithIntel() {
  return buildPrepareKnownIntelligence({
    provider: emptyProvider,
    snapshot: buildProviderIntelligenceSnapshot(emptyProvider, "prov-1"),
  });
}

describe("prepareMeetingPrepHarmonize", () => {
  it("intro call uses success outcome goal and question probes without repeating access themes", () => {
    const intel = smithIntel();
    const suggestBase = {
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      productLine: null as string | null,
      opportunityStage: "discovery",
      knownIntelligence: intel,
      prepContextState: "discovery" as const,
    };

    const harmonized = harmonizePrepareMeetingPrepSections({
      engagementType: "intro_call",
      prepContextState: "discovery",
      knownIntelligence: intel,
      suggested_goal: buildPrepareSuggestedGoal(suggestBase),
      discovery_questions: buildPrepareSuggestedDiscovery(suggestBase).questions,
      suggested_talking_points: buildPrepareSuggestedTalkingPoints({
        specialty: "General Surgery",
        engagementType: "intro_call",
        productLine: null,
        opportunityStage: "discovery",
        knownIntelligence: intel,
        prepContextState: "discovery",
      }),
      risks_barriers: buildPrepareRisksBarriers({
        provider: emptyProvider,
        snapshot: buildProviderIntelligenceSnapshot(emptyProvider, "prov-1"),
        knownIntelligence: intel,
        opportunity: { stage: "discovery" },
        engagement: {},
        engagementType: "intro_call",
      }),
      recommended_next_actions: buildPrepareRecommendedNextActions({
        engagementId: "eng-1",
        engagementType: "intro_call",
        engagementStatus: "planned",
        opportunity: { stage: "discovery" },
        knownIntelligence: intel,
        risks: { risks: [] },
        planProgress: { filled: 0, total: 7 },
        orObservationCount: 0,
      }),
    });

    expect(harmonized.suggested_goal.goal).toMatch(/Mapped the vendor access|Clear picture of procedural/i);
    expect(harmonized.suggested_goal.goal).not.toMatch(/Determine whether.*within the next/i);

    const joined = [
      harmonized.suggested_goal.goal,
      harmonized.suggested_talking_points.points.join(" "),
      harmonized.risks_barriers.risks.map((r) => r.label).join(" "),
      harmonized.recommended_next_actions.actions.join(" "),
    ].join(" ");

    expect(joined).not.toMatch(/Qualify observation candidacy|Map coordinator and access barriers/i);
    expect(joined).not.toMatch(/Document OR workflow and procedural friction/i);
    expect(harmonized.suggested_talking_points.points.every((p) => p.includes("?"))).toBe(true);
  });

  it("buildPrepareForMeetingView returns harmonized sections for intro call", () => {
    const intel = smithIntel();
    const view = buildPrepareForMeetingView({
      engagement: {
        id: "eng-1",
        engagement_type: "intro_call",
        status: "planned",
        provider_id: "prov-1",
      },
      provider: emptyProvider,
      providerSpecialty: "General Surgery",
      organization: null,
      opportunity: { stage: "discovery", product_line: null },
      activities: [],
    });

    expect(view.suggested_goal.goal).not.toMatch(/Determine whether/i);
    expect(view.recommended_next_actions.actions.join(" ")).not.toMatch(
      /Qualify observation|Map coordinator and access barriers|Document OR workflow/i,
    );
  });
});
