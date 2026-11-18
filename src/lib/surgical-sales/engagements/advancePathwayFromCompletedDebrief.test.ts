import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  contactSelect: vi.fn(),
  contactUpdate: vi.fn(),
  engagementSelect: vi.fn(),
  repCanAccessContact: vi.fn(),
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
          update: () => ({
            eq: () => mocks.contactUpdate(),
          }),
        };
      }
      if (table === "surgical_sales_engagements") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: mocks.engagementSelect,
              }),
            }),
          }),
        };
      }
      return {};
    },
  },
}));

vi.mock("@/lib/surgical-sales/contactManagement", () => ({
  repCanAccessContact: mocks.repCanAccessContact,
}));

vi.mock("@/lib/surgical-sales/missionBoardEvaluationPathSave", () => ({
  saveMissionBoardEvaluationPath: vi.fn(),
}));

vi.mock(
  "@/lib/surgical-sales/engagements/syncPostObservationProviderDebriefPathwayAdvance",
  () => ({
    resolveEvaluationPathFromDebriefNextStep: vi.fn(),
    syncPostObservationProviderDebriefPathwayAdvance: vi.fn(),
  }),
);

import { saveMissionBoardEvaluationPath } from "@/lib/surgical-sales/missionBoardEvaluationPathSave";
import {
  resolveEvaluationPathFromDebriefNextStep,
  syncPostObservationProviderDebriefPathwayAdvance,
} from "@/lib/surgical-sales/engagements/syncPostObservationProviderDebriefPathwayAdvance";
import { advancePathwayFromCompletedDebrief } from "@/lib/surgical-sales/engagements/advancePathwayFromCompletedDebrief";
import { DEBRIEF_NEXT_STEP_KEY } from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";

const PROVIDER_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const ENGAGEMENT_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.repCanAccessContact.mockResolvedValue(true);
  mocks.contactUpdate.mockResolvedValue({ error: null });
});

describe("advancePathwayFromCompletedDebrief", () => {
  it("returns already advanced when product fit is validated", async () => {
    mocks.contactSelect.mockResolvedValue({
      data: {
        id: PROVIDER_ID,
        role_type: "provider",
        provider_product_fit_validated: "yes",
        provider_evaluation_path: "Product Trial",
      },
      error: null,
    });

    const result = await advancePathwayFromCompletedDebrief({
      providerId: PROVIDER_ID,
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadyAdvanced).toBe(true);
      expect(result.evaluationPath).toBe("Product Trial");
    }
  });

  it("advances via sync when debrief snapshot recommends evaluation", async () => {
    mocks.contactSelect.mockResolvedValue({
      data: {
        id: PROVIDER_ID,
        role_type: "provider",
        provider_product_fit_validated: null,
      },
      error: null,
    });
    mocks.engagementSelect.mockResolvedValue({
      data: [
        {
          id: ENGAGEMENT_ID,
          engagement_type: "provider_debrief",
          status: "completed",
          debrief_completed: true,
          debrief_intelligence_snapshot: {
            [DEBRIEF_NEXT_STEP_KEY]: { recommendation: "evaluation" },
          },
          notes: "Confirmed product trial interest.",
        },
      ],
      error: null,
    });

    vi.mocked(resolveEvaluationPathFromDebriefNextStep).mockReturnValue("Product Trial");
    vi.mocked(syncPostObservationProviderDebriefPathwayAdvance).mockResolvedValue({
      advancedToEvaluation: true,
      evaluationPath: "Product Trial",
    });

    const result = await advancePathwayFromCompletedDebrief({
      providerId: PROVIDER_ID,
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.advancedToEvaluation).toBe(true);
      expect(result.evaluationPath).toBe("Product Trial");
    }
    expect(syncPostObservationProviderDebriefPathwayAdvance).toHaveBeenCalled();
  });

  it("falls back to explicit evaluation path when sync does not advance", async () => {
    mocks.contactSelect.mockResolvedValue({
      data: {
        id: PROVIDER_ID,
        role_type: "provider",
        provider_product_fit_validated: null,
      },
      error: null,
    });
    mocks.engagementSelect.mockResolvedValue({
      data: [
        {
          id: ENGAGEMENT_ID,
          engagement_type: "provider_debrief",
          status: "completed",
          debrief_completed: true,
          debrief_intelligence_snapshot: {},
          notes: "Ready for trial.",
        },
      ],
      error: null,
    });

    vi.mocked(resolveEvaluationPathFromDebriefNextStep).mockReturnValue(null);
    vi.mocked(syncPostObservationProviderDebriefPathwayAdvance).mockResolvedValue({
      advancedToEvaluation: false,
      evaluationPath: null,
    });
    vi.mocked(saveMissionBoardEvaluationPath).mockResolvedValue({
      ok: true,
      data: {
        evaluationPath: "360 Experience",
        engagementSynced: false,
        engagementSyncWarning: null,
      },
    });

    const result = await advancePathwayFromCompletedDebrief({
      providerId: PROVIDER_ID,
      userId: USER_ID,
      evaluationPath: "360 Experience",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.advancedToEvaluation).toBe(true);
      expect(result.evaluationPath).toBe("360 Experience");
    }
    expect(saveMissionBoardEvaluationPath).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: PROVIDER_ID,
        evaluationPath: "360 Experience",
      }),
    );
  });

  it("rejects when debrief is not complete", async () => {
    mocks.contactSelect.mockResolvedValue({
      data: {
        id: PROVIDER_ID,
        role_type: "provider",
        provider_product_fit_validated: null,
      },
      error: null,
    });
    mocks.engagementSelect.mockResolvedValue({
      data: [
        {
          id: ENGAGEMENT_ID,
          engagement_type: "provider_debrief",
          status: "planned",
          debrief_completed: false,
        },
      ],
      error: null,
    });

    const result = await advancePathwayFromCompletedDebrief({
      providerId: PROVIDER_ID,
      userId: USER_ID,
      evaluationPath: "Product Trial",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
    }
  });

  it("rejects when rep cannot access provider", async () => {
    mocks.contactSelect.mockResolvedValue({
      data: {
        id: PROVIDER_ID,
        role_type: "provider",
        provider_product_fit_validated: null,
      },
      error: null,
    });
    mocks.repCanAccessContact.mockResolvedValueOnce(false);

    const result = await advancePathwayFromCompletedDebrief({
      providerId: PROVIDER_ID,
      userId: USER_ID,
      evaluationPath: "Product Trial",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
  });
});
