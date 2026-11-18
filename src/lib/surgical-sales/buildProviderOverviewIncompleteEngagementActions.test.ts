import { describe, expect, it } from "vitest";

import {
  buildRecordOutcomeAction,
  buildViewBriefingAction,
  ensureIncompleteEngagementTouchActions,
  hasIncompleteProviderEngagement,
  PROVIDER_OVERVIEW_RECORD_OUTCOME_LABEL,
  PROVIDER_OVERVIEW_VIEW_BRIEFING_LABEL,
} from "./buildProviderOverviewIncompleteEngagementActions";
import type { ProviderEngagementSummary } from "./engagements/providerEngagementSummary";

function plannedOrVisit(id = "e-or"): ProviderEngagementSummary {
  return {
    id,
    title: "OR visit",
    engagement_type: "or_visit",
    engagement_type_label: "OR visit",
    status: "planned",
    status_label: "Planned",
    scheduled_at: new Date().toISOString(),
    engagement_date: null,
    pre_call_filled: 0,
    pre_call_total: 2,
    pre_call_complete: false,
    briefing_status: "not_started",
    briefing_status_label: "Not started",
    planning_status: "not_started",
    planning_status_label: "Not started",
    outcome_label: "",
    updated_at: new Date().toISOString(),
  };
}

describe("buildProviderOverviewIncompleteEngagementActions", () => {
  it("detects planned or_visit as incomplete for overview CTAs", () => {
    expect(
      hasIncompleteProviderEngagement({
        engagements: [plannedOrVisit()],
        workflow: null,
      }),
    ).toBe(true);
  });

  it("adds view briefing when primary is continue prep", () => {
    const engagement = plannedOrVisit();
    const actions = ensureIncompleteEngagementTouchActions(
      [
        {
          id: "prep",
          label: "Continue Prep",
          href: `/portal/sales/engagements/${engagement.id}/prepare`,
          kind: "link",
          emphasis: "primary",
        },
      ],
      { engagements: [engagement], workflow: null, briefingLabel: PROVIDER_OVERVIEW_VIEW_BRIEFING_LABEL },
    );

    expect(actions.some((action) => action.label === PROVIDER_OVERVIEW_VIEW_BRIEFING_LABEL)).toBe(true);
  });

  it("builds view briefing and record outcome links", () => {
    const engagement = plannedOrVisit();
    expect(buildViewBriefingAction({ engagement }).href).toContain("/engagements/e-or/prepare");
    expect(buildRecordOutcomeAction({ engagement }).href).toContain("/engagements/e-or/debrief");
  });

  it("appends missing touch actions without duplicating existing briefing", () => {
    const engagement = plannedOrVisit();
    const actions = ensureIncompleteEngagementTouchActions(
      [
        {
          id: "briefing",
          label: "Open Field Briefing",
          href: `/portal/sales/engagements/${engagement.id}/prepare`,
          kind: "link",
          emphasis: "primary",
        },
      ],
      { engagements: [engagement], workflow: null },
    );

    expect(actions.some((action) => action.label === PROVIDER_OVERVIEW_RECORD_OUTCOME_LABEL)).toBe(
      true,
    );
    expect(actions.filter((action) => action.label.toLowerCase().includes("briefing"))).toHaveLength(1);
  });

  it("does not append outcome when debrief is already primary", () => {
    const engagement = {
      ...plannedOrVisit(),
      status: "completed",
      status_label: "Completed",
    };
    const actions = ensureIncompleteEngagementTouchActions(
      [
        {
          id: "debrief",
          label: PROVIDER_OVERVIEW_RECORD_OUTCOME_LABEL,
          href: `/portal/sales/engagements/${engagement.id}/debrief`,
          kind: "link",
          emphasis: "primary",
        },
      ],
      {
        engagements: [engagement],
        workflow: {
          phase: "awaiting_debrief",
          headline: "Complete",
          detail: null,
          ctaLabel: PROVIDER_OVERVIEW_RECORD_OUTCOME_LABEL,
          ctaHref: `/portal/sales/engagements/${engagement.id}/debrief`,
          engagementId: engagement.id,
          engagementTypeLabel: "OR visit",
        },
      },
    );

    expect(actions.filter((action) => action.label === PROVIDER_OVERVIEW_RECORD_OUTCOME_LABEL)).toHaveLength(
      1,
    );
  });
});
