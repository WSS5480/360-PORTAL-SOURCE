import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveMissionBoardEvaluationPath } from "@/lib/surgical-sales/missionBoardEvaluationPathSave";

const mocks = vi.hoisted(() => ({
  contactSelect: vi.fn(),
  contactUpdate: vi.fn(),
  engagementSelect: vi.fn(),
  engagementUpdate: vi.fn(),
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
          update: (patch: Record<string, unknown>) => ({
            eq: () => mocks.contactUpdate(patch),
          }),
        };
      }
      if (table === "surgical_sales_engagements") {
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
      }
      if (table === "surgical_sales_admin_audit_log") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    },
  },
}));

vi.mock("@/lib/surgical-sales/contactManagement", () => ({
  repCanAccessContact: mocks.repCanAccessContact,
}));

describe("saveMissionBoardEvaluationPath", () => {
  beforeEach(() => {
    mocks.contactSelect.mockReset();
    mocks.contactUpdate.mockReset();
    mocks.engagementSelect.mockReset();
    mocks.engagementUpdate.mockReset();
    mocks.repCanAccessContact.mockReset();
    mocks.repCanAccessContact.mockResolvedValue(true);
  });

  it("saves the contact path even when engagement sync fails", async () => {
    mocks.contactSelect.mockResolvedValue({
      data: {
        id: "prov-1",
        role_type: "surgeon",
        provider_evaluation_path: "Product Trial",
      },
      error: null,
    });
    mocks.contactUpdate.mockResolvedValue({ error: null });
    mocks.engagementSelect.mockResolvedValue({
      data: [
        {
          id: "eng-1",
          engagement_type: "product_demo",
          status: "planned",
          title: "Product Evaluation",
          sales_rep_id: "rep-1",
        },
      ],
      error: null,
    });
    mocks.engagementUpdate.mockResolvedValue({
      error: { message: 'new row for relation "surgical_sales_engagements" violates check constraint' },
    });

    const result = await saveMissionBoardEvaluationPath({
      providerId: "prov-1",
      userId: "rep-1",
      evaluationPath: "Surgeon Education",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.evaluationPath).toBe("Surgeon Education");
    expect(result.data.engagementSynced).toBe(false);
    expect(result.data.engagementSyncWarning).toContain("check constraint");
    expect(mocks.contactUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_evaluation_path: "Surgeon Education",
      }),
    );
  });

  it("returns contact update errors", async () => {
    mocks.contactSelect.mockResolvedValue({
      data: { id: "prov-1", role_type: "surgeon" },
      error: null,
    });
    mocks.contactUpdate.mockResolvedValue({
      error: { message: 'column "provider_evaluation_path" does not exist' },
    });

    const result = await saveMissionBoardEvaluationPath({
      providerId: "prov-1",
      userId: "rep-1",
      evaluationPath: "360 Experience",
    });

    expect(result).toEqual({
      ok: false,
      status: 500,
      message:
        "Evaluation path columns are missing. Apply migration db/migrations/20260661_provider_evaluation_path.sql.",
    });
  });
});
