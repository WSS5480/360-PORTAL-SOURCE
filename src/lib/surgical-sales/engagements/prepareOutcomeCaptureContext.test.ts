import { describe, expect, it } from "vitest";
import { buildPrepareOutcomeCaptureContext } from "./prepareOutcomeCaptureContext";

describe("prepareOutcomeCaptureContext", () => {
  it("emphasizes record outcome after scheduled time", () => {
    const past = new Date("2020-06-01T10:00:00Z").toISOString();
    const ctx = buildPrepareOutcomeCaptureContext(
      { status: "planned", scheduled_at: past },
      new Date("2025-01-01T12:00:00Z").getTime(),
    );
    expect(ctx.is_post_meeting).toBe(true);
    expect(ctx.emphasize_record_outcome).toBe(true);
    expect(ctx.capture_hint).toMatch(/fresh/i);
  });

  it("emphasizes when status is completed", () => {
    const ctx = buildPrepareOutcomeCaptureContext({
      status: "completed",
      notes: "Prior debrief",
      scheduled_at: "2030-01-01T10:00:00Z",
    });
    expect(ctx.emphasize_record_outcome).toBe(true);
    expect(ctx.capture_hint).toMatch(/on file/i);
  });

  it("marks debrief_completed when tactical debrief notes exist", () => {
    const ctx = buildPrepareOutcomeCaptureContext({
      status: "completed",
      notes: "--- tactical debrief ---\n\nWhat happened:\nMet with team",
      debrief_completed: true,
    });
    expect(ctx.debrief_completed).toBe(true);
  });
});
