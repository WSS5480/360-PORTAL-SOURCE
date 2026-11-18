import { describe, expect, it } from "vitest";
import { buildObservationIntelligenceTimeline } from "./buildObservationIntelligenceTimeline";

describe("buildObservationIntelligenceTimeline", () => {
  it("maps intelligence activities into narrative timeline events", () => {
    const timeline = buildObservationIntelligenceTimeline({
      activities: [
        {
          id: "intro-1",
          activity_type: "pre_call_plan_completed",
          body: "Provider mentioned increased abdominal wall reconstruction volume.",
          created_at: "2026-05-01T10:00:00.000Z",
        },
        {
          id: "approved-1",
          activity_type: "case_updated",
          body: "",
          created_at: "2026-05-10T10:00:00.000Z",
          metadata_json: {
            fields: ["case_date"],
            new_values: { case_date: "2026-05-29" },
          },
        },
        {
          id: "note-1",
          activity_type: "note",
          body: "Provider frustrated with current fixation consistency.",
          created_at: "2026-05-29T13:00:00.000Z",
          metadata_json: {
            ai_extraction: {
              entities: [
                {
                  type: "clinical_pain_signal",
                  label: "Clinical Pain Point",
                  value: "Provider frustrated with current fixation consistency.",
                  category: "Clinical Pain Points",
                  confidence: "Medium",
                },
                {
                  type: "product_signal",
                  label: "Product Signal",
                  value: "ACSIS may improve visualization",
                  category: "Product Fit Signals",
                  confidence: "Medium",
                },
              ],
              primaryCategory: "Clinical Pain Points",
              extractedAt: "2026-05-29T13:00:01.000Z",
              model: "rules",
            },
          },
        },
      ],
      caseRow: {
        observation_access_pathway: "Vendor badge via OR desk",
        updated_at: "2026-05-08T12:00:00.000Z",
      },
    });

    expect(timeline.some((event) => event.title === "Intro call completed")).toBe(true);
    expect(timeline.some((event) => event.detail.includes("abdominal wall reconstruction"))).toBe(true);
    expect(timeline.some((event) => event.title === "Access pathway captured")).toBe(true);
    expect(timeline.some((event) => event.detail.includes("May 29"))).toBe(true);
    expect(timeline.some((event) => event.title === "Observation note")).toBe(true);
    expect(timeline.some((event) => event.detail.includes("fixation consistency"))).toBe(true);
    expect(timeline.some((event) => event.title === "Signal extracted")).toBe(true);
    expect(timeline.some((event) => event.detail.includes("ACSIS interest noted"))).toBe(true);
    expect(timeline.some((event) => event.title === "Observation approved")).toBe(false);
  });

  it("ignores administrative system activity", () => {
    const timeline = buildObservationIntelligenceTimeline({
      activities: [
        {
          id: "admin-1",
          activity_type: "case_created",
          body: "Case created",
          created_at: "2026-05-01T10:00:00.000Z",
        },
        {
          id: "doc-1",
          activity_type: "document_uploaded",
          body: "Uploaded file",
          created_at: "2026-05-01T11:00:00.000Z",
        },
      ],
    });

    expect(timeline).toHaveLength(0);
  });

  it("respects limit and sorts newest first", () => {
    const timeline = buildObservationIntelligenceTimeline({
      activities: [
        {
          id: "1",
          activity_type: "note",
          body: "Older note",
          created_at: "2026-05-01T10:00:00.000Z",
        },
        {
          id: "2",
          activity_type: "note",
          body: "Newer note",
          created_at: "2026-05-02T10:00:00.000Z",
        },
      ],
      limit: 1,
    });

    expect(timeline).toHaveLength(1);
    expect(timeline[0]?.detail).toContain("Newer note");
  });
});
