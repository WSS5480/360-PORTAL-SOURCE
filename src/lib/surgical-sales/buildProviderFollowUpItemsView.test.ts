import { describe, expect, it } from "vitest";

import {
  buildProviderFollowUpItemsView,
  providerFollowUpProgress,
} from "@/lib/surgical-sales/buildProviderFollowUpItemsView";
import { followUpTaskCompletionKey } from "@/lib/surgical-sales/engagements/syncEngagementDebriefFollowUpTasks";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

function engagement(partial: Partial<ProviderEngagementSummary>): ProviderEngagementSummary {
  return {
    id: "e1",
    engagement_type: "intro_call",
    engagement_type_label: "Intro Call",
    status: "completed",
    status_label: "Completed",
    pre_call_filled: 0,
    pre_call_total: 0,
    pre_call_complete: false,
    briefing_status: "not_started",
    briefing_status_label: "Not Started",
    planning_status: "not_started",
    planning_status_label: "Not Started",
    outcome_label: "Completed",
    debrief_completed: true,
    debrief_completed_at: "2026-07-06T12:00:00.000Z",
    ...partial,
  };
}

describe("buildProviderFollowUpItemsView", () => {
  it("merges follow-up column and snapshot tasks without duplicates", () => {
    const items = buildProviderFollowUpItemsView({
      engagements: [
        engagement({
          follow_up_tasks: "Share comparative clinical data and schedule observation case\nEmail proposed observation dates",
          debrief_intelligence_snapshot: {
            version: 1,
            savedAt: "2026-07-06T12:00:00.000Z",
            narrative: "Intro call debrief",
            analysis: null,
            logUpdate: null,
            propagationTargets: [],
            discoveryContext: null,
            providerContactSnapshot: null,
            proposedContacts: [],
            followUpTasks: ["Share comparative clinical data and schedule observation case"],
          },
        }),
      ],
    });

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.title)).toEqual([
      "Share comparative clinical data and schedule observation case",
      "Email proposed observation dates",
    ]);
    expect(items.every((item) => !item.completed)).toBe(true);
  });

  it("drops generic next-step placeholder when a specific follow-up exists", () => {
    const items = buildProviderFollowUpItemsView({
      engagements: [
        engagement({
          follow_up_tasks: "Next step recommended\nFollow up with Jessica next week to confirm observation date",
        }),
      ],
    });

    expect(items.map((item) => item.title)).toEqual([
      "Follow up with Jessica next week to confirm observation date",
    ]);
  });

  it("marks completed tasks from snapshot completion map", () => {
    const title = "Email proposed observation dates";
    const items = buildProviderFollowUpItemsView({
      engagements: [
        engagement({
          follow_up_tasks: title,
          debrief_intelligence_snapshot: {
            version: 1,
            savedAt: "2026-07-06T12:00:00.000Z",
            narrative: "Intro call debrief",
            analysis: null,
            logUpdate: null,
            propagationTargets: [],
            discoveryContext: null,
            providerContactSnapshot: null,
            proposedContacts: [],
            followUpTaskCompletions: {
              [followUpTaskCompletionKey(title)]: "2026-07-06T13:00:00.000Z",
            },
          },
        }),
      ],
    });

    expect(items[0]?.completed).toBe(true);
    expect(providerFollowUpProgress(items)).toEqual({ openCount: 0, completedCount: 1 });
  });
});
