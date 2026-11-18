import { describe, expect, it } from "vitest";
import {
  buildProviderOverviewActivityTimeline,
  conciseActivityLineFromPreviewRow,
  formatActivityTimelineDateLabel,
} from "./buildProviderOverviewActivityTimeline";
import type { ProviderEngagementSummary } from "./engagements/providerEngagementSummary";

const introCallEngagement: ProviderEngagementSummary = {
  id: "eng-1",
  engagement_type: "intro_call",
  engagement_type_label: "Intro Call",
  status: "planned",
  status_label: "Planned",
  title: null,
  organization_name: "Sinai Hospital",
  pre_call_filled: 0,
  pre_call_total: 5,
  pre_call_complete: false,
  outcome_label: "Planned",
  scheduled_at: "2026-06-03T14:00:00.000Z",
  updated_at: "2026-06-03T14:00:00.000Z",
};

describe("formatActivityTimelineDateLabel", () => {
  it("labels today, yesterday, and older dates", () => {
    const now = new Date("2026-06-03T12:00:00.000Z");
    expect(formatActivityTimelineDateLabel("2026-06-03T08:00:00.000Z", now)).toBe("Today");
    expect(formatActivityTimelineDateLabel("2026-06-02T08:00:00.000Z", now)).toBe("Yesterday");
    expect(formatActivityTimelineDateLabel("2026-05-29T08:00:00.000Z", now)).toBe("May 29");
  });
});

describe("conciseActivityLineFromPreviewRow", () => {
  it("uses plain engagement scheduling copy", () => {
    expect(
      conciseActivityLineFromPreviewRow({
        id: "1",
        kind: "engagement",
        activityTypeLabel: "Engagement Scheduled",
        title: "Intro Call",
        summary: "Intro Call on the calendar at Sinai Hospital.",
        relatedEntity: null,
        nextStep: null,
        timestamp: "2026-06-03T14:00:00.000Z",
        href: "/portal/sales/engagements/eng-1",
      }),
    ).toBe("Intro Call scheduled");
  });
});

describe("buildProviderOverviewActivityTimeline", () => {
  it("groups recent activity by date with concise lines", () => {
    const view = buildProviderOverviewActivityTimeline({
      now: new Date("2026-06-03T12:00:00.000Z"),
      timeline: [
        {
          id: "pc-1",
          kind: "provider_activity",
          activity_type: "provider_created",
          at: "2026-06-02T10:00:00.000Z",
          title: "Provider created",
          body: "Provider created.",
        },
        {
          id: "org-1",
          kind: "provider_activity",
          activity_type: "organization_linked",
          at: "2026-05-29T10:00:00.000Z",
          title: "Organization linked",
          body: "Hospital linked.",
        },
      ],
      engagements: [introCallEngagement],
      contact: { created_at: "2026-06-02T10:00:00.000Z" },
      organizationLinks: [
        {
          account_id: "acct-1",
          is_primary: true,
          created_at: "2026-05-29T10:00:00.000Z",
        },
      ],
    });

    expect(view.groups.map((g) => g.dateLabel)).toEqual(["Today", "Yesterday", "May 29"]);
    expect(view.groups[0].entries[0].line).toBe("Intro Call scheduled");
    expect(view.groups[1].entries.some((e) => e.line === "Provider created")).toBe(true);
    expect(view.groups[2].entries.some((e) => e.line === "Hospital affiliation added")).toBe(true);
    expect(JSON.stringify(view)).not.toMatch(/intelligence captured|operational picture/i);
  });

  it("dedupes provider created and skips duplicate day lines", () => {
    const view = buildProviderOverviewActivityTimeline({
      now: new Date("2026-06-03T12:00:00.000Z"),
      timeline: [
        {
          id: "pc-1",
          kind: "provider_activity",
          activity_type: "provider_created",
          at: "2026-06-02T10:00:00.000Z",
          title: "Provider created",
          body: "Provider created.",
        },
      ],
      contact: { created_at: "2026-06-02T10:00:00.000Z" },
    });

    const providerCreatedLines = view.groups.flatMap((g) => g.entries).filter((e) => e.line === "Provider created");
    expect(providerCreatedLines).toHaveLength(1);
  });

  it("returns empty groups when no activity exists", () => {
    const view = buildProviderOverviewActivityTimeline({ timeline: [], contact: {} });
    expect(view.groups).toEqual([]);
    expect(view.totalCount).toBe(0);
  });
});
