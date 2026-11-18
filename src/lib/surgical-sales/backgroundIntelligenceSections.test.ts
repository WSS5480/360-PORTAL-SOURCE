import { describe, expect, it } from "vitest";
import {
  buildAccessIntelligenceSection,
  buildBackgroundIntelligenceSections,
  filterPrimaryAlertLabels,
  isAdminPrimaryAlertLabel,
  adminGapBlocksActiveScheduledCase,
  ACCESS_INTELLIGENCE_FIELD_LABELS,
} from "./backgroundIntelligenceSections";
describe("backgroundIntelligenceSections", () => {
  it("detects admin primary alert labels", () => {
    expect(isAdminPrimaryAlertLabel("Scheduling owner unknown")).toBe(true);
    expect(isAdminPrimaryAlertLabel("Credentialing pathway incomplete")).toBe(true);
    expect(isAdminPrimaryAlertLabel("Complete debrief")).toBe(false);
  });

  it("filters admin labels unless an active scheduled case exists", () => {
    expect(
      filterPrimaryAlertLabels(["Scheduling owner unknown", "Debrief pending"], {}),
    ).toEqual(["Debrief pending"]);
    expect(
      filterPrimaryAlertLabels(["Scheduling owner unknown"], { recentCaseCount: 1 }),
    ).toEqual(["Scheduling owner unknown"]);
  });

  it("builds informational access intelligence summaries", () => {
    const section = buildAccessIntelligenceSection({
      contact: {
        provider_scheduling_contact: "Karen Smith — OR desk",
        provider_intelligence_field_metadata: {
          provider_scheduling_contact: {
            source_type: "engagement",
            source_label: "Intro call notes",
            updated_at: "2026-05-01T00:00:00.000Z",
          },
        },
      },
    });

    expect(section.title).toBe("Access status");
    expect(section.items.map((item) => item.label)).toEqual(
      Object.values(ACCESS_INTELLIGENCE_FIELD_LABELS),
    );
    const scheduler = section.items.find((item) => item.id === "scheduler");
    expect(scheduler?.summary).toMatch(/Karen/i);
    expect(scheduler?.confidence).toBeTruthy();
    expect(scheduler?.source).toBe("Intro call notes");

    const sections = buildBackgroundIntelligenceSections({
      contact: {
        provider_scheduling_contact: "Karen Smith — OR desk",
      },
    });
    expect(sections[0]?.id).toBe("access");
    expect(sections[0]?.title).toBe("Access status");
  });
  it("treats upcoming engagement as active scheduled field work", () => {
    expect(adminGapBlocksActiveScheduledCase({ upcomingEngagementCount: 1 })).toBe(true);
  });
});
