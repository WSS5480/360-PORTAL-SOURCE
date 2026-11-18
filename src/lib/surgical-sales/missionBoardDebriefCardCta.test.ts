import { describe, expect, it } from "vitest";

import {

  deriveMissionBoardDebriefCardLabel,

  resolveProviderDebriefEngagementPreview,

} from "@/lib/surgical-sales/missionBoardDebriefEngagement";

import { deriveMissionBoardStagePrimaryAction } from "@/lib/surgical-sales/deriveMissionBoardCardActions";

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

import {

  DEBRIEF_COMPLETE_LABEL,

  DEBRIEF_PREPARE_LABEL,

  DEBRIEF_RESUME_LABEL,

  DEBRIEF_SCHEDULE_LABEL,

  DEBRIEF_START_LABEL,

} from "@/lib/surgical-sales/debriefEngagementLifecycle";

import { MISSION_BOARD_DEBRIEF_REVIEW_LABEL } from "@/lib/surgical-sales/missionBoardDebriefComplete";



function baseProvider(extra: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {

  return {

    id: "11111111-1111-4111-8111-111111111111",

    organization_count: 1,

    specialty: "Orthopedics",

    primary_organization_name: "Metro General",

    primary_organization_id: "org-1",

    additional_organizations_count: 0,

    territory: "TX",

    planning_status: "not_started",

    linked_opportunities_count: 0,

    recent_case_count: 0,

    last_activity_at: null,

    relationship_pathway_stage_id: "debrief",

    ...extra,

  };

}



describe("Mission Board debrief card CTA terminology", () => {

  it("shows Schedule Debrief when no provider_debrief engagement exists", () => {

    const primary = deriveMissionBoardStagePrimaryAction(baseProvider(), "debrief");

    expect(primary.label).toBe(DEBRIEF_SCHEDULE_LABEL);

    expect(primary.kind).toBe("fast_debrief");

  });



  it("shows Start Debrief when a scheduled provider_debrief exists", () => {

    const primary = deriveMissionBoardStagePrimaryAction(

      baseProvider({

        provider_debrief_engagement: {

          id: "eng-1",

          status: "planned",

          debrief_completed: false,

        },

      }),

      "debrief",

    );

    expect(primary.label).toBe(DEBRIEF_START_LABEL);

    expect(primary.kind).toBe("debrief_start");

    expect(primary.href).toContain("/active");

  });



  it("shows Resume Debrief when provider_debrief is in_progress", () => {

    const primary = deriveMissionBoardStagePrimaryAction(

      baseProvider({

        provider_debrief_engagement: {

          id: "eng-1",

          status: "in_progress",

          debrief_completed: false,

        },

      }),

      "debrief",

    );

    expect(primary.label).toBe(DEBRIEF_RESUME_LABEL);

    expect(primary.kind).toBe("link");

    expect(primary.href).toContain("/active");

  });



  it("shows Review Debrief when debrief_completed is true", () => {

    const primary = deriveMissionBoardStagePrimaryAction(

      baseProvider({

        provider_debrief_engagement: {

          id: "eng-1",

          status: "completed",

          debrief_completed: true,

        },

      }),

      "debrief",

    );

    expect(primary.label).toBe(MISSION_BOARD_DEBRIEF_REVIEW_LABEL);

    expect(primary.kind).toBe("link");

  });



  it("shows Complete Debrief when completed without debrief_completed", () => {

    const primary = deriveMissionBoardStagePrimaryAction(

      baseProvider({

        provider_debrief_engagement: {

          id: "eng-1",

          status: "completed",

          debrief_completed: false,

        },

      }),

      "debrief",

    );

    expect(primary.label).toBe(DEBRIEF_COMPLETE_LABEL);

    expect(primary.href).toContain("/debrief");

  });



  it("prefers provider_debrief_engagement over unrelated upcoming_engagement", () => {

    const debrief = resolveProviderDebriefEngagementPreview(

      baseProvider({

        provider_debrief_engagement: {

          id: "debrief-1",

          status: "in_progress",

          debrief_completed: false,

        },

        upcoming_engagement: {

          id: "intro-1",

          href: "/engagements/intro-1",

          engagement_type: "intro_call",

          type_label: "Intro call",

          datetime_label: "Tomorrow",

          location_label: "Metro General",

          primary_goal: "Discovery",

          open_items: [],

        },

      }),

    );

    expect(deriveMissionBoardDebriefCardLabel(debrief)).toBe(DEBRIEF_RESUME_LABEL);

  });

});


