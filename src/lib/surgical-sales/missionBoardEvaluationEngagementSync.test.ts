import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  evaluationPathToEngagementType,
  syncActiveEvaluationEngagementTypeForPath,
} from "@/lib/surgical-sales/missionBoardEvaluationEngagement";

const mocks = vi.hoisted(() => ({
  engagementSelect: vi.fn(),
  engagementUpdate: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== "surgical_sales_engagements") return {};
      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              in: () => ({
                order: () => ({
                  limit: mocks.engagementSelect,
                }),
              }),
            }),
          }),
        }),
        update: (patch: Record<string, unknown>) => ({
          eq: () => mocks.engagementUpdate(patch),
        }),
      };
    },
  },
}));

describe("evaluationPathToEngagementType", () => {
  it("maps evaluation paths to CRM engagement types", () => {
    expect(evaluationPathToEngagementType("360 Experience")).toBe("office_visit_360");
    expect(evaluationPathToEngagementType("Product Trial")).toBeNull();
    expect(evaluationPathToEngagementType("Surgeon Education")).toBe("peer_discussion");
  });

  it("returns null for additional observation", () => {
    expect(evaluationPathToEngagementType("Additional Observation")).toBeNull();
  });
});

describe("syncActiveEvaluationEngagementTypeForPath", () => {
  beforeEach(() => {
    mocks.engagementSelect.mockReset();
    mocks.engagementUpdate.mockReset();
  });

  it("updates a planned evaluation engagement when path changes", async () => {
    mocks.engagementSelect.mockResolvedValue({
      data: [
        {
          id: "eng-1",
          engagement_type: "product_demo",
          status: "planned",
          title: "Product Evaluation",
          updated_at: "2026-06-01T12:00:00Z",
        },
      ],
      error: null,
    });
    mocks.engagementUpdate.mockResolvedValue({ error: null });

    const result = await syncActiveEvaluationEngagementTypeForPath({
      providerId: "prov-1",
      userId: "rep-1",
      evaluationPath: "360 Experience",
    });

    expect(result).toEqual({
      ok: true,
      updated: true,
      engagementId: "eng-1",
      previousType: "product_demo",
      nextType: "office_visit_360",
    });
    expect(mocks.engagementUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        engagement_type: "office_visit_360",
        title: "360 Experience",
      }),
    );
  });

  it("skips when no active evaluation engagement exists", async () => {
    mocks.engagementSelect.mockResolvedValue({ data: [], error: null });

    const result = await syncActiveEvaluationEngagementTypeForPath({
      providerId: "prov-1",
      userId: "rep-1",
      evaluationPath: "360 Experience",
    });

    expect(result).toEqual({ ok: true, updated: false });
    expect(mocks.engagementUpdate).not.toHaveBeenCalled();
  });

  it("skips when engagement already matches the path", async () => {
    mocks.engagementSelect.mockResolvedValue({
      data: [
        {
          id: "eng-1",
          engagement_type: "office_visit_360",
          status: "planned",
          title: "360 Experience",
          updated_at: "2026-06-01T12:00:00Z",
        },
      ],
      error: null,
    });

    const result = await syncActiveEvaluationEngagementTypeForPath({
      providerId: "prov-1",
      userId: "rep-1",
      evaluationPath: "360 Experience",
    });

    expect(result).toEqual({ ok: true, updated: false });
    expect(mocks.engagementUpdate).not.toHaveBeenCalled();
  });
});
