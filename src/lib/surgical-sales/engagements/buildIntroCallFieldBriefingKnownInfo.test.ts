import { describe, expect, it } from "vitest";
import {
  buildIntroCallFieldBriefingKnownInfo,
  introCallKnownInfoHasContent,
} from "./buildIntroCallFieldBriefingKnownInfo";

describe("buildIntroCallFieldBriefingKnownInfo", () => {
  it("maps captured intelligence into reference rows", () => {
    const rows = buildIntroCallFieldBriefingKnownInfo({
      organizationName: "Test4 Hospital",
      locationLabel: "Austin, TX",
      specialty: "General Surgery",
      knownIntelligence: {
        bullets: [
          {
            key: "procedural_preferences",
            label: "Procedural preferences",
            value: "Robotic ventral hernia focus",
          },
          {
            key: "communication",
            label: "Communication style",
            value: "Karen coordinates scheduling",
          },
        ],
        last_key_insight: {
          body: "Observation approved pending credentialing.",
          at_label: "Jun 1",
          source_label: "Last touch",
          href: null,
        },
      },
      recentActivity: {
        items: [
          {
            id: "a1",
            kind: "engagement",
            icon: "◆",
            title: "Intro Call",
            at: "2026-06-01T12:00:00.000Z",
            at_label: "Jun 1",
            summary: "Follow up on credentialing",
            href: null,
          },
        ],
        timeline_href: "/portal/sales/providers/p1",
      },
      lastEngagementTitle: "Intro Call",
      lastEngagementDateLabel: "Jun 1",
    });

    expect(rows.find((r) => r.id === "hospital")?.value).toContain("Test4 Hospital");
    expect(rows.find((r) => r.id === "specialty")?.value).toBe("General Surgery");
    expect(rows.find((r) => r.id === "workflow_notes")?.value).toContain("Robotic ventral");
    expect(rows.find((r) => r.id === "support_contacts")?.value).toContain("Karen");
    expect(introCallKnownInfoHasContent(rows)).toBe(true);
  });
});
