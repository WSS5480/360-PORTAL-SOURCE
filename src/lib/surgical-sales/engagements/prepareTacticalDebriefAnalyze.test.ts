import { describe, expect, it } from "vitest";
import {
  analyzeTacticalDebriefNarrative,
  buildTacticalDebriefAnalysis,
  formatTacticalDebriefNotes,
} from "./prepareTacticalDebriefAnalyze";

describe("prepareTacticalDebriefAnalyze", () => {
  it("extracts OR access and next-step signals from narrative", () => {
    const { insights, signal_count } = analyzeTacticalDebriefNarrative(
      "Met the OR coordinator — observation access path is clearer now. " +
        "They want a follow-up next week to lock the first case. " +
        "Champion is the PA who runs ventral hernia volume.",
    );
    expect(signal_count).toBeGreaterThanOrEqual(3);
    expect(insights.map((i) => i.category_id)).toContain("or_access");
    expect(insights.map((i) => i.category_id)).toContain("next_step_opportunity");
    expect(insights.map((i) => i.category_id)).toContain("new_stakeholders");
  });

  it("builds review sections and provider system updates", () => {
    const analysis = buildTacticalDebriefAnalysis(
      "Met the OR coordinator — observation access is clearer. Follow up next week. Champion is the PA.",
      { providerId: "p1", existingProviderFields: {} },
    );
    expect(analysis.sections.map((s) => s.id)).toContain("stakeholder_insights");
    expect(analysis.sections.map((s) => s.id)).toContain("suggested_system_updates");
    expect(analysis.log_update?.usesProviderIntelligence).toBe(true);
  });

  it("formats saved notes with narrative and structured bullets", () => {
    const { insights } = analyzeTacticalDebriefNarrative(
      "Credentialing blocker cleared. Interested in a workflow trial.",
    );
    const notes = formatTacticalDebriefNotes({
      narrative: "Quick debrief in the parking lot.",
      insights,
    });
    expect(notes).toMatch(/What happened:/);
    expect(notes).toMatch(/Operational intelligence captured/);
    expect(notes).not.toMatch(/Tactical debrief/);
    expect(notes).toMatch(/Blocker|interest|signal/i);
  });
});
