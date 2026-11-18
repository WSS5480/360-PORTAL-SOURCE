import { describe, expect, it } from "vitest";
import { buildProductSupportObservationTimelineEntries } from "./buildProductSupportObservationTimelineEntries";

describe("buildProductSupportObservationTimelineEntries", () => {
  it("includes voice notes and ai insights", () => {
    const entries = buildProductSupportObservationTimelineEntries(
      [
        {
          id: "n1",
          activity_type: "note",
          body: "Doctor asked about sizing.",
          created_at: "2026-06-04T12:00:00Z",
          metadata_json: {
            capture_mode: "voice",
            ai_extraction: {
              productSupport: {
                classificationLabel: "Provider Feedback",
                summary: "Doctor asked about sizing.",
              },
              observation: { entities: [] },
            },
          },
        },
      ],
      "Rep",
    );

    expect(entries.some((entry) => entry.kind === "voice_note")).toBe(true);
    expect(entries.some((entry) => entry.kind === "ai_insight")).toBe(true);
  });
});
