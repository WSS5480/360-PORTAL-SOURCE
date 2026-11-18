import { describe, expect, it } from "vitest";
import { buildProviderRepPrimaryAction } from "./buildProviderRepPrimaryAction";
import type { ProviderEngagementSummary } from "./engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "./providerPlanningCompletion";

const PROVIDER_ID = "00000000-0000-4000-8000-000000000001";
const NEW_ENG = `/portal/sales/engagements/new?provider_id=${PROVIDER_ID}`;
const INTEL = `/portal/sales/providers/${PROVIDER_ID}?tab=intelligence`;
const CREATE_OPP = `/portal/sales/opportunities?new=1&surgeon_contact_id=${PROVIDER_ID}`;

function basePlanning(overrides: Partial<ProviderPlanningCompletion> = {}): ProviderPlanningCompletion {
  return {
    filled: 0,
    total: 20,
    percent: 0,
    status: "not_started",
    sections_complete: 0,
    sections_total: 6,
    sections: [
      {
        id: "clinical_workflow",
        label: "How does this provider operate clinically?",
        status: "not_started",
        filled: 0,
        total: 4,
        percent: 0,
        last_updated_at: null,
      },
    ],
    ...overrides,
  };
}

function plannedEngagement(partial: Partial<ProviderEngagementSummary> = {}): ProviderEngagementSummary {
  return {
    id: "eng-1",
    engagement_type: "intro_call",
    engagement_type_label: "Intro Call",
    status: "planned",
    status_label: "Planned",
    scheduled_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    pre_call_filled: 1,
    pre_call_total: 5,
    pre_call_complete: false,
    outcome_label: "Planned",
    ...partial,
  };
}

describe("buildProviderRepPrimaryAction", () => {
  it("recommends schedule intro call for new prospect with no engagements", () => {
    const action = buildProviderRepPrimaryAction({
      providerId: PROVIDER_ID,
      relationshipStage: "prospect",
      newEngagementHref: NEW_ENG,
      intelligenceHref: INTEL,
      engagements: [],
      planning: basePlanning(),
    });
    expect(action.label).toBe("Schedule intro call");
    expect(action.href).toContain("engagement_type=intro_call");
  });

  it("prioritizes prepare for upcoming meeting when pre-call is incomplete", () => {
    const action = buildProviderRepPrimaryAction({
      providerId: PROVIDER_ID,
      relationshipStage: "pre_call_planning",
      newEngagementHref: NEW_ENG,
      intelligenceHref: INTEL,
      engagements: [plannedEngagement()],
      planning: basePlanning({ status: "in_progress", percent: 30 }),
    });
    expect(action.label).toMatch(/prep/i);
    expect(action.href).toContain("/prepare");
  });

  it("recommends follow up after a recently completed engagement", () => {
    const recent = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const action = buildProviderRepPrimaryAction({
      providerId: PROVIDER_ID,
      relationshipStage: "engagement_active",
      newEngagementHref: NEW_ENG,
      intelligenceHref: INTEL,
      engagements: [
        {
          ...plannedEngagement(),
          id: "done-1",
          status: "completed",
          status_label: "Completed",
          updated_at: recent,
          organization_name: "Mercy General",
        },
      ],
      planning: basePlanning({ status: "in_progress", percent: 40 }),
    });
    expect(action.label).toBe("Follow up after recent engagement");
    expect(action.href).toContain("engagement_type=follow_up");
    expect(action.reason).toContain("Mercy General");
  });

  it("recommends capture procedural workflow intelligence when clinical picture is thin", () => {
    const action = buildProviderRepPrimaryAction({
      providerId: PROVIDER_ID,
      relationshipStage: "active_relationship",
      newEngagementHref: NEW_ENG,
      intelligenceHref: INTEL,
      engagements: [
        {
          ...plannedEngagement(),
          id: "done-2",
          status: "completed",
          status_label: "Completed",
          updated_at: new Date(Date.now() - 40 * 86_400_000).toISOString(),
        },
      ],
      planning: basePlanning({ status: "in_progress", percent: 25 }),
    });
    expect(action.label).toBe("Confirm procedure focus");
    expect(action.href).toContain("planning_section=clinical_workflow");
  });

  it("recommends advance product opportunity when pipeline initiative is active", () => {
    const action = buildProviderRepPrimaryAction({
      providerId: PROVIDER_ID,
      relationshipStage: "active_relationship",
      newEngagementHref: NEW_ENG,
      intelligenceHref: INTEL,
      engagements: [],
      planning: basePlanning({ status: "complete", percent: 90 }),
      opportunities: [
        {
          id: "opp-1",
          stage: "evaluation_active",
          product_line: "Hernia mesh",
          updated_at: new Date().toISOString(),
        },
      ],
    });
    expect(action.label).toBe("Advance evaluation");
    expect(action.href).toContain("/opportunities/opp-1");
  });

  it("recommends OR observation when observation is requested without a case", () => {
    const action = buildProviderRepPrimaryAction({
      providerId: PROVIDER_ID,
      relationshipStage: "observation_requested",
      newEngagementHref: NEW_ENG,
      intelligenceHref: INTEL,
      engagements: [],
      cases: [],
      planning: basePlanning({ status: "in_progress", percent: 50 }),
    });
    expect(action.label).toBe("Request OR observation");
    expect(action.href).toContain("engagement_type=observation_request");
  });
});
