import { describe, expect, it } from "vitest";
import { buildProviderOverviewExecutionCtas } from "./buildProviderOverviewExecutionCtas";
import { buildProviderOverviewMissionQuickActions } from "./buildProviderOverviewMissionQuickActions";
import {
  overviewActionUsesIntelligenceWorkflow,
  resolveOverviewFocusedModal,
} from "./providerOverviewFocusedActionRouting";

describe("providerOverviewFocusedActionRouting", () => {
  it("routes mission quick actions to focused modals except Field note capture", () => {
    const actions = buildProviderOverviewMissionQuickActions({
      intelligenceHref: "/portal/sales/providers/p1?tab=intelligence",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=p1",
      contact: {},
      stageId: "discovery",
      engagements: [],
    });
    const addIntel = actions.find((action) => action.id === "add_intelligence");
    expect(addIntel?.label).toBe("Field note");
    expect(addIntel?.href).toBeUndefined();
    expect(addIntel?.missionBoardShortcutId).toBe("dictate");
    expect(overviewActionUsesIntelligenceWorkflow(addIntel!)).toBe(false);
    expect(resolveOverviewFocusedModal(addIntel!)).toBeNull();

    for (const action of actions.filter((row) => row.id !== "add_intelligence" && row.id !== "schedule_intro_call")) {
      expect(resolveOverviewFocusedModal(action)).toBeTruthy();
      expect(action.href).toBeUndefined();
      expect(overviewActionUsesIntelligenceWorkflow(action)).toBe(false);
    }

    const supportContact = actions.find((action) => action.id === "add_support_contacts");
    expect(supportContact?.label).toBe("Add support contact");
    expect(resolveOverviewFocusedModal(supportContact!)).toBe("supportContacts");
  });

  it("routes phase quick actions away from discovery mapping hrefs", () => {
    const ctas = buildProviderOverviewExecutionCtas({
      contact: {},
      providerId: "p1",
      newEngagementHref: "/engagements/new",
      noteHref: "/note",
      intelligenceHref: "/intelligence",
    });

    for (const action of [...ctas.quickActions, ctas.primary]) {
      expect(overviewActionUsesIntelligenceWorkflow(action)).toBe(false);
      if (action.id === "add_scheduler") {
        expect(resolveOverviewFocusedModal(action)).toBe("scheduler");
      }
      if (action.id === "add_credentialing_note") {
        expect(resolveOverviewFocusedModal(action)).toBe("credentialing");
      }
    }
  });
});
