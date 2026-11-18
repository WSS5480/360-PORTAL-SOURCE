import { describe, expect, it, vi, beforeEach } from "vitest";
import { PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED } from "@/lib/surgical-sales/pathway/pathwayContactFlags";
import { deriveGatedPathwayStage } from "@/lib/surgical-sales/pathwayStageGates";
import {
  discoveryAccessReadyContact,
  productFitValidatedContact,
} from "@/lib/surgical-sales/salesPathwayTestFixtures";

const mocks = vi.hoisted(() => ({
  loadEngagement: vi.fn(),
  endEngagementCall: vi.fn(),
  loadActorDisplayName: vi.fn(),
  repCanAccessContact: vi.fn(),
  saveEvaluationPath: vi.fn(),
  contactSelect: vi.fn(),
  contactUpdate: vi.fn(),
  engagementUpdate: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "surgical_sales_contacts") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mocks.contactSelect,
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: () => mocks.contactUpdate(patch),
          }),
        };
      }
      if (table === "surgical_sales_engagements") {
        return {
          update: (patch: Record<string, unknown>) => ({
            eq: () => mocks.engagementUpdate(patch),
          }),
        };
      }
      return {};
    },
  },
}));

vi.mock("@/lib/surgical-sales/engagements/engagementAccess", () => ({
  loadEngagementForPortalActor: mocks.loadEngagement,
}));

vi.mock("@/lib/surgical-sales/engagements/endEngagementCall", () => ({
  endEngagementCallForActor: mocks.endEngagementCall,
}));

vi.mock("@/lib/surgical-sales/engagements/recordStartMissionOutcome", () => ({
  loadActorDisplayName: mocks.loadActorDisplayName,
}));

vi.mock("@/lib/surgical-sales/contactManagement", () => ({
  repCanAccessContact: mocks.repCanAccessContact,
}));

vi.mock("@/lib/surgical-sales/missionBoardEvaluationPathService", () => ({
  saveMissionBoardEvaluationPath: mocks.saveEvaluationPath,
}));

vi.mock("@/lib/surgical-sales/surgicalSalesCrmAudit", () => ({
  logSurgicalSalesCrmAudit: mocks.audit,
}));

vi.mock("@/lib/surgical-sales/missionBoardDebriefIntelligenceApply", () => ({
  applyMissionBoardDebriefIntelligenceFromNarrative: vi.fn().mockResolvedValue({ ok: false, message: "skipped in test" }),
}));

import { completeMissionBoardProviderDebrief } from "./missionBoardDebriefCompleteService";

const SAMPLE_DICTATION =
  "Provider confirmed the workflow issue matters and wants to explore a product trial on the next case.";

const PROVIDER_ID = "11111111-1111-4111-8111-111111111111";
const ENGAGEMENT_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";

function activeEngagement(overrides: Record<string, unknown> = {}) {
  return {
    id: ENGAGEMENT_ID,
    provider_id: PROVIDER_ID,
    engagement_type: "provider_debrief",
    status: "in_progress",
    debrief_completed: false,
    debrief_completed_at: null,
    notes: null,
    debrief_intelligence_snapshot: {
      start_mission: { opened_at: "2026-06-01T12:00:00.000Z", live_notes: "" },
    },
    ...overrides,
  };
}

describe("completeMissionBoardProviderDebrief", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadActorDisplayName.mockResolvedValue("Rep User");
    mocks.repCanAccessContact.mockResolvedValue(true);
    mocks.contactSelect.mockResolvedValue({
      data: {
        id: PROVIDER_ID,
        organization_id: "org-1",
        account_id: null,
        created_by: null,
        created_by_user_id: null,
      },
      error: null,
    });
    mocks.contactUpdate.mockResolvedValue({ error: null });
    mocks.engagementUpdate.mockResolvedValue({ error: null });
    mocks.endEngagementCall.mockResolvedValue({
      ok: true,
      debrief_href: `/portal/sales/engagements/${ENGAGEMENT_ID}/debrief`,
    });
    mocks.saveEvaluationPath.mockResolvedValue({
      ok: true,
      data: { evaluationPath: "360 Experience" },
    });
    mocks.audit.mockResolvedValue(undefined);
  });

  it("allows pathway status bypass on scheduled debrief without starting the call", async () => {
    mocks.loadEngagement
      .mockResolvedValueOnce(activeEngagement({ status: "scheduled" }))
      .mockResolvedValueOnce(activeEngagement({ status: "completed" }));

    const result = await completeMissionBoardProviderDebrief({
      providerId: PROVIDER_ID,
      userId: USER_ID,
      engagementId: ENGAGEMENT_ID,
      outcomeId: "touch_success",
      opportunityResult: "unknown",
      dictation: SAMPLE_DICTATION,
      pathwayStatusBypass: true,
    });

    expect(result.ok).toBe(true);
    expect(mocks.endEngagementCall).not.toHaveBeenCalled();
    expect(mocks.engagementUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ debrief_completed: true, status: "completed" }),
    );
  });

  it("rejects completion when engagement is planned", async () => {
    mocks.loadEngagement.mockResolvedValue(activeEngagement({ status: "planned" }));

    const result = await completeMissionBoardProviderDebrief({
      providerId: PROVIDER_ID,
      userId: USER_ID,
      engagementId: ENGAGEMENT_ID,
      outcomeId: "touch_success",
      opportunityResult: "unknown",
      dictation: SAMPLE_DICTATION,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
    }
    expect(mocks.endEngagementCall).not.toHaveBeenCalled();
  });

  it("rejects duplicate completion when debrief is already completed", async () => {
    mocks.loadEngagement.mockResolvedValue(
      activeEngagement({ status: "completed", debrief_completed: true, notes: "--- tactical debrief ---" }),
    );

    const result = await completeMissionBoardProviderDebrief({
      providerId: PROVIDER_ID,
      userId: USER_ID,
      engagementId: ENGAGEMENT_ID,
      outcomeId: "touch_success",
      opportunityResult: "unknown",
      dictation: SAMPLE_DICTATION,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/already completed/i);
    }
  });

  it("completes with Opportunity Confirmed, validates product fit, and saves evaluation path", async () => {
    mocks.loadEngagement
      .mockResolvedValueOnce(activeEngagement())
      .mockResolvedValueOnce(activeEngagement({ status: "completed" }));

    const result = await completeMissionBoardProviderDebrief({
      providerId: PROVIDER_ID,
      userId: USER_ID,
      engagementId: ENGAGEMENT_ID,
      outcomeId: "touch_success",
      opportunityResult: "confirmed",
      evaluationPath: "360 Experience",
      dictation: SAMPLE_DICTATION,
      nextStep: "Schedule lab walkthrough next month.",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.advancedToEvaluation).toBe(true);
    }

    expect(mocks.endEngagementCall).toHaveBeenCalledWith(
      expect.objectContaining({
        engagementId: ENGAGEMENT_ID,
        outcomeId: "touch_success",
      }),
    );

    expect(mocks.contactUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        [PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED]: "yes",
      }),
    );

    expect(mocks.saveEvaluationPath).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: PROVIDER_ID,
        evaluationPath: "360 Experience",
      }),
    );

    expect(mocks.engagementUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        debrief_completed: true,
        status: "completed",
      }),
    );
  });

  it("completes with Opportunity Not Confirmed without validating product fit", async () => {
    mocks.loadEngagement
      .mockResolvedValueOnce(activeEngagement())
      .mockResolvedValueOnce(activeEngagement({ status: "completed" }));

    const result = await completeMissionBoardProviderDebrief({
      providerId: PROVIDER_ID,
      userId: USER_ID,
      engagementId: ENGAGEMENT_ID,
      outcomeId: "touch_no_progress",
      opportunityResult: "not_confirmed",
      dictation: "Provider said the issue is not meaningful for their team right now.",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.advancedToEvaluation).toBe(false);
    }

    expect(mocks.contactUpdate).not.toHaveBeenCalled();
    expect(mocks.saveEvaluationPath).not.toHaveBeenCalled();
    expect(mocks.engagementUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ debrief_completed: true }),
    );
  });

  it("completes without debrief notes when outcome fields are set", async () => {
    mocks.loadEngagement
      .mockResolvedValueOnce(activeEngagement({ status: "scheduled" }))
      .mockResolvedValueOnce(activeEngagement({ status: "completed" }));

    const result = await completeMissionBoardProviderDebrief({
      providerId: PROVIDER_ID,
      userId: USER_ID,
      engagementId: ENGAGEMENT_ID,
      outcomeId: "touch_success",
      opportunityResult: "unknown",
      dictation: "",
      pathwayStatusBypass: true,
    });

    expect(result.ok).toBe(true);
    expect(mocks.engagementUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ debrief_completed: true, status: "completed" }),
    );
  });

  it("requires evaluation path when opportunity is confirmed", async () => {
    mocks.loadEngagement.mockResolvedValue(activeEngagement());

    const result = await completeMissionBoardProviderDebrief({
      providerId: PROVIDER_ID,
      userId: USER_ID,
      engagementId: ENGAGEMENT_ID,
      outcomeId: "touch_success",
      opportunityResult: "confirmed",
      dictation: SAMPLE_DICTATION,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/evaluation path/i);
    }
  });
});

describe("pathway gates after Mission Board debrief complete", () => {
  it("moves provider to Evaluation only when debrief completed and product fit validated", () => {
    const observationCases = Array.from({ length: 5 }, (_, i) => ({
      id: `c${i}`,
      case_type: "observation",
      status: "completed",
    }));

    const debriefEngagement = {
      id: ENGAGEMENT_ID,
      engagement_type: "provider_debrief",
      status: "completed",
      debrief_completed: true,
    };

    expect(
      deriveGatedPathwayStage({
        contact: discoveryAccessReadyContact({
          provider_product_fit_validated: "no",
          provider_observation_sequence_complete: "yes",
        }),
        engagements: [debriefEngagement],
        cases: observationCases,
      }),
    ).toBe("debrief");

    expect(
      deriveGatedPathwayStage({
        contact: productFitValidatedContact({
          provider_observation_sequence_complete: "yes",
        }),
        engagements: [debriefEngagement],
        cases: observationCases,
      }),
    ).toBe("evaluation");
  });
});
