import { describe, expect, it } from "vitest";
import { buildObservationFeed, formatObservationFeedTime } from "./buildObservationFeed";

describe("buildObservationFeed", () => {
  it("returns note-only feed entries and ignores administrative activity", () => {
    const feed = buildObservationFeed([
      {
        id: "admin-1",
        activity_type: "case_created",
        body: "Case created",
        created_at: "2026-05-29T12:00:00.000Z",
      },
      {
        id: "admin-2",
        activity_type: "case_updated",
        body: "Case updated",
        created_at: "2026-05-29T12:05:00.000Z",
      },
      {
        id: "note-1",
        activity_type: "note",
        body: "Provider expressed frustration with fixation consistency.",
        created_at: "2026-05-29T13:00:00.000Z",
        metadata_json: {
          ai_extraction: {
            entities: [
              {
                type: "clinical_pain_signal",
                label: "Clinical Pain Point",
                value: "Provider expressed frustration with fixation consistency.",
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
    ]);

    expect(feed).toHaveLength(1);
    expect(feed[0]?.noteText).toBe("Provider expressed frustration with fixation consistency.");
    expect(feed[0]?.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "extracted_signal",
          label: "Extracted Signal",
          text: "Provider expressed frustration with fixation consistency.",
          confidence: "Medium",
        }),
        expect.objectContaining({
          kind: "product_signal",
          label: "Product Signal",
          text: "Potential ACSIS opportunity",
          confidence: "Medium",
        }),
      ]),
    );
  });

  it("maps entity types to learning-focused feed signal labels", () => {
    const feed = buildObservationFeed([
      {
        id: "note-2",
        activity_type: "note",
        body: "Competitor rep in room. Circulator mentioned turnover delays. Surgeon prefers low-profile scope.",
        created_at: "2026-05-29T14:00:00.000Z",
        metadata_json: {
          ai_extraction: {
            entities: [
              {
                type: "competitor_signal",
                label: "Competitor Signal",
                value: "Competitor rep in room",
                category: "Competitor Products",
                confidence: "High",
              },
              {
                type: "staff_signal",
                label: "Staff Observation",
                value: "Circulator mentioned turnover delays",
                category: "Staff Observations",
                confidence: "Medium",
              },
              {
                type: "provider_behavior_signal",
                label: "Provider Behavior",
                value: "Surgeon prefers low-profile scope",
                category: "Provider Behavior",
                confidence: "Medium",
              },
            ],
            primaryCategory: "Competitor Products",
            extractedAt: "2026-05-29T14:00:01.000Z",
            model: "rules",
          },
        },
      },
    ]);

    const labels = feed[0]?.signals.map((signal) => signal.label);
    expect(labels).toEqual(
      expect.arrayContaining(["Competitor Mention", "Staff Statement", "Provider Statement"]),
    );
  });

  it("sorts newest first and respects limit", () => {
    const feed = buildObservationFeed(
      [
        {
          id: "1",
          activity_type: "note",
          body: "First note",
          created_at: "2026-05-29T10:00:00.000Z",
        },
        {
          id: "2",
          activity_type: "note",
          body: "Second note",
          created_at: "2026-05-29T11:00:00.000Z",
        },
      ],
      1,
    );

    expect(feed).toHaveLength(1);
    expect(feed[0]?.noteText).toBe("Second note");
  });

  it("formats feed timestamps", () => {
    expect(formatObservationFeedTime("2026-05-29T14:02:00.000Z")).toMatch(/\d/);
  });
});
