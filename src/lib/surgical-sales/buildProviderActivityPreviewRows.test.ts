import { describe, expect, it } from "vitest";
import type { UnifiedActivityFeedItem } from "@/lib/activity/activityFeedPresentation";
import { buildProviderActivityPreviewRows } from "./buildProviderActivityPreviewRows";
import type { ProviderEngagementSummary } from "./engagements/providerEngagementSummary";

function feedItem(
  partial: Partial<UnifiedActivityFeedItem> & Pick<UnifiedActivityFeedItem, "id" | "eventType" | "summary">,
): UnifiedActivityFeedItem {
  return {
    category: "workflow",
    title: "",
    timestamp: "2026-05-01T14:00:00.000Z",
    userLabel: "Rep",
    ...partial,
  };
}

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
};

describe("buildProviderActivityPreviewRows", () => {
  it("rewrites engagement created audit copy into operational timeline", () => {
    const rows = buildProviderActivityPreviewRows({
      feedItems: [
        feedItem({
          id: "a1",
          eventType: "ENGAGEMENT_CREATED",
          summary: "Intro Call engagement created.",
          href: "/portal/sales/engagements/eng-1",
          metadata: { engagement_id: "eng-1", engagement_type: "intro_call" },
        }),
      ],
      timeline: [],
      engagements: [introCallEngagement],
      limit: 10,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].activityTypeLabel).toBe("Engagement Scheduled");
    expect(rows[0].summary).toBe("Intro Call on the calendar at Sinai Hospital.");
    expect(rows[0].summary).not.toMatch(/created/i);
    expect(rows[0].nextStep).toBe("Prepare for meeting");
  });

  it("labels observation requests distinctly", () => {
    const rows = buildProviderActivityPreviewRows({
      feedItems: [
        feedItem({
          id: "obs-1",
          eventType: "ENGAGEMENT_CREATED",
          summary: "Observation Access Request engagement created.",
          href: "/portal/sales/engagements/eng-obs",
          metadata: { engagement_id: "eng-obs", engagement_type: "observation_request" },
        }),
      ],
      timeline: [],
      engagements: [
        {
          ...introCallEngagement,
          id: "eng-obs",
          engagement_type: "observation_request",
          engagement_type_label: "Observation Access Request",
        },
      ],
    });

    expect(rows[0].activityTypeLabel).toBe("Observation Requested");
    expect(rows[0].nextStep).toBe("Confirm access and case profile");
  });

  it("surfaces product opportunity and evaluation events", () => {
    const rows = buildProviderActivityPreviewRows({
      feedItems: [
        feedItem({
          id: "opp-1",
          eventType: "OPPORTUNITY_CREATED",
          summary: "Provider added to Opportunities",
          metadata: { opportunity_name: "Wound matrix trial", product_line: "Matrix HD" },
        }),
        feedItem({
          id: "eval-1",
          eventType: "EVALUATION_ACTIVE",
          summary: "Evaluation is now active.",
          metadata: { product_line: "Matrix HD", account_name: "Sinai Hospital" },
        }),
      ],
      timeline: [],
      limit: 10,
    });

    expect(rows.map((r) => r.activityTypeLabel)).toEqual(
      expect.arrayContaining(["Provider added to Opportunities", "Evaluation started"]),
    );
  });

  it("structures rows with badge, summary, related context, and time", () => {
    const rows = buildProviderActivityPreviewRows({
      feedItems: [
        feedItem({
          id: "n1",
          category: "notes",
          eventType: "NOTE_ADDED",
          summary: "Surgeon prefers text check-ins before OR days.",
          metaChips: ["Field note"],
        }),
      ],
      timeline: [],
    });

    expect(rows[0].activityTypeLabel).toBe("Note Added");
    expect(rows[0].summary).toContain("text check-ins");
    expect(rows[0].timestamp).toBeTruthy();
  });

  it("filters workflow audit events", () => {
    const rows = buildProviderActivityPreviewRows({
      feedItems: [
        feedItem({
          id: "x1",
          eventType: "PROVIDER_UPDATED",
          summary: "Provider record updated",
        }),
      ],
      timeline: [],
    });
    expect(rows).toHaveLength(0);
  });
});
