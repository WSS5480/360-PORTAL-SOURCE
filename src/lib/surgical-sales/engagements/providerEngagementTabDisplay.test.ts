import { describe, expect, it } from "vitest";
import {
  buildProviderEngagementTabRowModel,
  engagementNotesHaveTacticalDebrief,
  formatEngagementTabPrepStatus,
  partitionProviderEngagementsForTab,
  PROVIDER_ENGAGEMENT_TAB_OPEN_LABEL,
} from "./providerEngagementTabDisplay";
import type { ProviderEngagementSummary } from "./providerEngagementSummary";

function row(partial: Partial<ProviderEngagementSummary> & { id: string }): ProviderEngagementSummary {
  return {
    id: partial.id,
    engagement_type: partial.engagement_type ?? "intro_call",
    engagement_type_label: partial.engagement_type_label ?? "Intro Call",
    status: partial.status ?? "planned",
    status_label: partial.status_label ?? "Planned",
    pre_call_filled: partial.pre_call_filled ?? 0,
    pre_call_total: partial.pre_call_total ?? 5,
    pre_call_complete: partial.pre_call_complete ?? false,
    briefing_status: partial.briefing_status ?? partial.planning_status ?? "not_planned",
    briefing_status_label: partial.briefing_status_label ?? partial.planning_status_label ?? "Not Started",
    planning_status: partial.planning_status ?? partial.briefing_status ?? "not_planned",
    planning_status_label: partial.planning_status_label ?? partial.briefing_status_label ?? "Not Started",
    outcome_label: partial.outcome_label ?? "Planned",
    ...partial,
  };
}

describe("providerEngagementTabDisplay", () => {
  it("detects tactical debrief in notes", () => {
    expect(engagementNotesHaveTacticalDebrief("--- tactical debrief ---\nWhat happened:")).toBe(true);
    expect(engagementNotesHaveTacticalDebrief("met with scheduler")).toBe(false);
  });

  it("partitions legacy and completed-without-debrief into needs attention", () => {
    const parts = partitionProviderEngagementsForTab([
      row({ id: "u1", status: "planned" }),
      row({ id: "c1", status: "completed", status_label: "Completed" }),
      row({ id: "l1", is_legacy_draft: true }),
    ]);
    expect(parts.upcoming.map((e) => e.id)).toEqual(["u1"]);
    expect(parts.completed.map((e) => e.id)).toEqual([]);
    expect(parts.needsAttention.map((e) => e.id).sort()).toEqual(["c1", "l1"]);
  });

  it("builds index card model with Open to engagement detail only", () => {
    const model = buildProviderEngagementTabRowModel(
      row({ id: "e9", status: "in_progress", status_label: "Active" }),
      "p1",
    );
    expect(model.typeLabel).toBe("Intro Call");
    expect(model.statusLabel).toBe("Active");
    expect(model.prepStatusLabel).toBe(formatEngagementTabPrepStatus(model.row));
    expect(model.indexField.label).toBe("Status");
    expect(model.openHref).toBe("/portal/sales/engagements/e9");
    expect(model.openHref).not.toContain("/prepare");
    expect(model.openHref).not.toContain("/active");
    expect(PROVIDER_ENGAGEMENT_TAB_OPEN_LABEL).toBe("Open");
  });

  it("shows outcome on completed cards instead of preparation status", () => {
    const model = buildProviderEngagementTabRowModel(
      row({
        id: "e-done",
        status: "completed",
        status_label: "Debrief Needed",
        next_action: "Observation Approved",
      }),
      "p1",
    );
    expect(model.indexField.label).toBe("Status");
    expect(model.indexField.value).toBe("Debrief Needed");
    expect(formatEngagementTabPrepStatus(model.row)).toBe("Debrief Needed");
  });
});
