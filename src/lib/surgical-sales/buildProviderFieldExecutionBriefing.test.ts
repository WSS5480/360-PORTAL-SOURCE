import { describe, expect, it } from "vitest";
import { buildProviderFieldExecutionBriefing } from "./buildProviderFieldExecutionBriefing";

describe("buildProviderFieldExecutionBriefing", () => {
  it("orders risk, mission, confirmations, contacts, and actions", () => {
    const nineMonthsAgo = new Date(Date.now() - 280 * 24 * 60 * 60 * 1000).toISOString();
    const briefing = buildProviderFieldExecutionBriefing({
      contact: {
        provider_procedure_focus: "hernia, bariatric",
        provider_observation_coordinator_contact: "Jane OR — ext 4421",
        provider_intelligence_field_metadata: {
          provider_procedure_focus: {
            validated_at: nineMonthsAgo,
            updated_at: nineMonthsAgo,
            source_type: "observation",
          },
        },
      },
      relatedContacts: [{ id: "c1", name: "Pat Nurse", role: "Clinical liaison", phone: "555-0100" }],
      newEngagementHref: "/engagements/new",
      intelligenceHref: "/providers/p1?tab=intelligence",
    });

    expect(briefing.operationalRisk).toBeTruthy();
    expect(briefing.nextMission).toBeTruthy();
    expect(briefing.confirmations.length).toBeGreaterThan(0);
    expect(briefing.contacts.some((c) => c.kind === "coordinator")).toBe(true);
    expect(briefing.actions.some((a) => a.primary)).toBe(true);
    expect(briefing.actions.some((a) => a.kind === "deploy_mission")).toBe(true);
  });
});
